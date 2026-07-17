/*
 * Self-contained KiCad PCB (.kicad_pcb) renderer.
 *
 * Parses the KiCad 6/7/8/9 S-expression board format and renders a top-down
 * composite of the board to SVG, approximating KiCad's PCB editor view: board
 * outline (Edge.Cuts), copper zones/tracks, pads with drills, vias, and
 * silkscreen. No external runtime dependencies.
 *
 * Exports:
 *   parseAndRenderPcb(text)        -> { ok, inner, viewBox, stats, background }
 *   renderPcbToStandaloneSvg(text) -> full <svg> string (tests/preview)
 */

/* ---- KiCad-style dark PCB theme ---- */
const BG = '#12161c';
const LAYER_COLORS = {
  'Edge.Cuts': '#e8c84a',
  'F.Cu': '#c83434',
  'B.Cu': '#4d7fc4',
  'In1.Cu': '#c2c200',
  'In2.Cu': '#c200c2',
  'F.SilkS': '#e6e6e6',
  'B.SilkS': '#9aa0a6',
  'F.Fab': '#af7c3c',
  'B.Fab': '#7d5a2c',
};
const PAD_TH = '#caa63a'; // through-hole pad (copper)
const VIA = '#caa63a';
const DRILL = BG; // punched hole shows the board background

/* copper layers rendered under silk; which layers we draw at all */
const RENDER_LAYERS = new Set([
  'Edge.Cuts',
  'F.Cu',
  'B.Cu',
  'In1.Cu',
  'In2.Cu',
  'F.SilkS',
  'B.SilkS',
]);

/* ============================================================= *
 *  S-expression tokenizer + parser (self-contained)
 * ============================================================= */

function tokenize(s) {
  const tokens = [];
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    if (c === '(' || c === ')') {
      tokens.push(c);
      i++;
    } else if (c === '"') {
      let str = '';
      i++;
      while (i < n && s[i] !== '"') {
        if (s[i] === '\\' && i + 1 < n) {
          const nx = s[i + 1];
          str += nx === 'n' ? '\n' : nx === 't' ? '\t' : nx;
          i += 2;
        } else {
          str += s[i];
          i++;
        }
      }
      i++;
      tokens.push({ str });
    } else if (/\s/.test(c)) {
      i++;
    } else {
      let atom = '';
      while (i < n && !/\s/.test(s[i]) && s[i] !== '(' && s[i] !== ')' && s[i] !== '"') {
        atom += s[i];
        i++;
      }
      tokens.push({ atom });
    }
  }
  return tokens;
}

const NUM_RE = /^-?\d+(\.\d+)?([eE]-?\d+)?$/;

function parse(text) {
  const tokens = tokenize(text);
  let i = 0;
  function parseList() {
    i++; // consume '('
    const list = [];
    while (i < tokens.length) {
      const t = tokens[i];
      if (t === '(') list.push(parseList());
      else if (t === ')') {
        i++;
        return list;
      } else {
        i++;
        if (typeof t === 'object' && 'str' in t) list.push(new String(t.str)); // eslint-disable-line no-new-wrappers
        else list.push(NUM_RE.test(t.atom) ? Number(t.atom) : t.atom);
      }
    }
    return list;
  }
  while (i < tokens.length && tokens[i] !== '(') i++;
  if (i >= tokens.length) throw new Error('No S-expression found');
  return parseList();
}

const isList = (x) => Array.isArray(x);
const subLists = (node) => (isList(node) ? node.filter(isList) : []);
const findChild = (node, tag) => subLists(node).find((c) => c[0] === tag);
const findChildren = (node, tag) => subLists(node).filter((c) => c[0] === tag);
const scalars = (node) => (isList(node) ? node.slice(1).filter((x) => !isList(x)) : []);
const str = (v) => (v == null ? '' : String(v));
const num = (v, d = 0) => {
  const f = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(f) ? f : d;
};

function getAt(node) {
  const at = findChild(node, 'at');
  if (!at) return null;
  return { x: num(at[1]), y: num(at[2]), a: num(at[3], 0) };
}
function layerOf(node) {
  const l = findChild(node, 'layer');
  return l ? str(l[1]) : '';
}
function strokeWidth(node, def) {
  const s = findChild(node, 'stroke');
  if (s) {
    const w = findChild(s, 'width');
    if (w && num(w[1]) >= 0) return num(w[1]);
  }
  const w = findChild(node, 'width');
  if (w && num(w[1]) >= 0) return num(w[1]);
  return def;
}

/* ============================================================= *
 *  SVG sink
 * ============================================================= */

function makeSink() {
  const parts = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = (x, y, pad = 0) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x - pad);
    minY = Math.min(minY, y - pad);
    maxX = Math.max(maxX, x + pad);
    maxY = Math.max(maxY, y + pad);
  };
  return { parts, grow, push: (s) => parts.push(s), bbox: () => ({ minX, minY, maxX, maxY }) };
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f = (n) => (Math.round(n * 1000) / 1000).toString();

function polyline(sink, pts, color, width, filled, opacity) {
  if (!pts.length) return;
  pts.forEach((p) => sink.grow(p[0], p[1], width));
  const d = pts.map((p) => `${f(p[0])},${f(p[1])}`).join(' ');
  const tag = filled ? 'polygon' : 'polyline';
  const fill = filled ? color : 'none';
  const op = opacity != null ? ` fill-opacity="${opacity}"` : '';
  sink.push(
    `<${tag} points="${d}" fill="${fill}"${op} stroke="${color}" stroke-width="${f(
      Math.max(width, 0.01)
    )}" stroke-linejoin="round" stroke-linecap="round"/>`
  );
}

function seg(sink, x1, y1, x2, y2, color, width) {
  sink.grow(x1, y1, width);
  sink.grow(x2, y2, width);
  sink.push(
    `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${color}" stroke-width="${f(
      Math.max(width, 0.05)
    )}" stroke-linecap="round"/>`
  );
}

function circ(sink, cx, cy, r, color, width, filled) {
  sink.grow(cx, cy, r + (width || 0));
  sink.push(
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${filled ? color : 'none'}" stroke="${
      width ? color : 'none'
    }" stroke-width="${f(width || 0)}"/>`
  );
}

function text(sink, s, x, y, size, color, angle) {
  if (s == null || s === '' || s === '~') return;
  const lines = String(s).split('\n');
  let a = (((angle || 0) % 360) + 360) % 360;
  if (a > 90 && a < 270) a = (a + 180) % 360;
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  sink.grow(x, y, Math.max(size, (longest * size * 0.6) / 2));
  const tr = a ? ` transform="rotate(${f(-a)} ${f(x)} ${f(y)})"` : '';
  const body =
    lines.length > 1
      ? lines.map((ln, k) => `<tspan x="${f(x)}" dy="${k === 0 ? '0' : f(size * 1.2)}">${esc(ln)}</tspan>`).join('')
      : esc(s);
  sink.push(
    `<text x="${f(x)}" y="${f(y)}" fill="${color}" font-family="'DejaVu Sans','Helvetica',sans-serif" font-size="${f(
      size
    )}" text-anchor="middle" dominant-baseline="middle"${tr}>${body}</text>`
  );
}

/* ============================================================= *
 *  Geometry helpers
 * ============================================================= */

function makeTransform(fx, fy, rotDeg, mirror) {
  // KiCad PCB space is Y-down; footprint rotation is CCW-positive on screen,
  // which is a negative angle in Y-down math.
  const a = (-(rotDeg || 0) * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return (x, y) => {
    let lx = mirror ? -x : x;
    const ly = y;
    return [fx + (lx * cos - ly * sin), fy + (lx * sin + ly * cos)];
  };
}

const identity = (x, y) => [x, y];

function circleFrom3(p1, p2, p3) {
  const [ax, ay] = p1;
  const [bx, by] = p2;
  const [cx, cy] = p3;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-9) return null;
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  return [ux, uy];
}

function arcPoints(start, mid, end) {
  const c = circleFrom3(start, mid, end);
  if (!c) return [start, mid, end];
  const [cx, cy] = c;
  const r = Math.hypot(start[0] - cx, start[1] - cy);
  const norm = (t) => {
    while (t < 0) t += 2 * Math.PI;
    while (t >= 2 * Math.PI) t -= 2 * Math.PI;
    return t;
  };
  const a0 = norm(Math.atan2(start[1] - cy, start[0] - cx));
  const am = norm(Math.atan2(mid[1] - cy, mid[0] - cx));
  const a1 = norm(Math.atan2(end[1] - cy, end[0] - cx));
  const s2e = norm(a1 - a0);
  const s2m = norm(am - a0);
  const sweep = s2m <= s2e ? s2e : s2e - 2 * Math.PI;
  const steps = Math.max(6, Math.ceil((Math.abs(sweep) / (Math.PI / 2)) * 12));
  const pts = [];
  for (let k = 0; k <= steps; k++) {
    const t = a0 + (sweep * k) / steps;
    pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  return pts;
}

/* grow a bbox from an Edge.Cuts graphic item (for fitting the view to the board) */
function growEdgeFromItem(item, tf, grow) {
  const tag = item[0];
  if (tag.endsWith('_line') || tag.endsWith('_rect')) {
    const s = findChild(item, 'start');
    const e = findChild(item, 'end');
    if (s && e) {
      const a = tf(num(s[1]), num(s[2]));
      const b = tf(num(e[1]), num(e[2]));
      grow(a[0], a[1]);
      grow(b[0], b[1]);
      if (tag.endsWith('_rect')) {
        const c = tf(num(e[1]), num(s[2]));
        const d = tf(num(s[1]), num(e[2]));
        grow(c[0], c[1]);
        grow(d[0], d[1]);
      }
    }
  } else if (tag.endsWith('_circle')) {
    const c = findChild(item, 'center');
    const e = findChild(item, 'end');
    if (c && e) {
      const r = Math.hypot(num(e[1]) - num(c[1]), num(e[2]) - num(c[2]));
      const cc = tf(num(c[1]), num(c[2]));
      grow(cc[0] - r, cc[1] - r);
      grow(cc[0] + r, cc[1] + r);
    }
  } else if (tag.endsWith('_arc')) {
    const s = findChild(item, 'start');
    const m = findChild(item, 'mid');
    const e = findChild(item, 'end');
    if (s && m && e)
      arcPoints(tf(num(s[1]), num(s[2])), tf(num(m[1]), num(m[2])), tf(num(e[1]), num(e[2]))).forEach((p) =>
        grow(p[0], p[1])
      );
  } else if (tag.endsWith('_poly')) {
    const pn = findChild(item, 'pts');
    if (pn) findChildren(pn, 'xy').forEach((p) => { const q = tf(num(p[1]), num(p[2])); grow(q[0], q[1]); });
  }
}

/* bbox of everything on the Edge.Cuts layer (top-level + inside footprints) */
function computeEdgeBbox(root) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  for (const tag of ['gr_line', 'gr_arc', 'gr_circle', 'gr_rect', 'gr_poly']) {
    for (const g of findChildren(root, tag)) if (layerOf(g) === 'Edge.Cuts') growEdgeFromItem(g, identity, grow);
  }
  for (const fpn of findChildren(root, 'footprint')) {
    const fat = getAt(fpn) || { x: 0, y: 0, a: 0 };
    const tf = makeTransform(fat.x, fat.y, fat.a, layerOf(fpn).startsWith('B.'));
    for (const tag of ['fp_line', 'fp_arc', 'fp_circle', 'fp_rect', 'fp_poly']) {
      for (const g of findChildren(fpn, tag)) if (layerOf(g) === 'Edge.Cuts') growEdgeFromItem(g, tf, grow);
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

/* rotate a local point by absolute angle (screen CCW-positive -> Y-down) */
function rot(px, py, degrees) {
  const a = (-(degrees || 0) * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return [px * cos - py * sin, px * sin + py * cos];
}

/* ============================================================= *
 *  Drawing: graphic primitives (fp_* and gr_*)
 * ============================================================= */

function drawGraphic(sink, item, tf, colorOverride) {
  const tag = item[0];
  const layer = layerOf(item);
  if (layer && !RENDER_LAYERS.has(layer) && !colorOverride) return;
  const color = colorOverride || LAYER_COLORS[layer] || '#888';
  const w = strokeWidth(item, 0.12);
  const filled = (() => {
    const fl = findChild(item, 'fill');
    if (!fl) return false;
    const v = str(fl[1]);
    return v === 'yes' || v === 'solid' || (findChild(fl, 'type') && str(findChild(fl, 'type')[1]) === 'solid');
  })();

  if (tag === 'fp_line' || tag === 'gr_line') {
    const s = findChild(item, 'start');
    const e = findChild(item, 'end');
    if (!s || !e) return;
    const a = tf(num(s[1]), num(s[2]));
    const b = tf(num(e[1]), num(e[2]));
    seg(sink, a[0], a[1], b[0], b[1], color, w);
  } else if (tag === 'fp_rect' || tag === 'gr_rect') {
    const s = findChild(item, 'start');
    const e = findChild(item, 'end');
    if (!s || !e) return;
    const x1 = num(s[1]);
    const y1 = num(s[2]);
    const x2 = num(e[1]);
    const y2 = num(e[2]);
    const pts = [tf(x1, y1), tf(x2, y1), tf(x2, y2), tf(x1, y2), tf(x1, y1)];
    polyline(sink, pts, color, w, filled, filled ? 0.6 : null);
  } else if (tag === 'fp_circle' || tag === 'gr_circle') {
    const c = findChild(item, 'center');
    const e = findChild(item, 'end');
    if (!c || !e) return;
    const cc = tf(num(c[1]), num(c[2]));
    const r = Math.hypot(num(e[1]) - num(c[1]), num(e[2]) - num(c[2]));
    circ(sink, cc[0], cc[1], r, color, w, false);
  } else if (tag === 'fp_arc' || tag === 'gr_arc') {
    const s = findChild(item, 'start');
    const m = findChild(item, 'mid');
    const e = findChild(item, 'end');
    if (!s || !m || !e) return;
    const pts = arcPoints(tf(num(s[1]), num(s[2])), tf(num(m[1]), num(m[2])), tf(num(e[1]), num(e[2])));
    polyline(sink, pts, color, w, false, null);
  } else if (tag === 'fp_poly' || tag === 'gr_poly') {
    const ptsNode = findChild(item, 'pts');
    if (!ptsNode) return;
    const pts = findChildren(ptsNode, 'xy').map((p) => tf(num(p[1]), num(p[2])));
    polyline(sink, pts, color, w, filled, filled ? 0.75 : null);
  }
}

/* pad within a footprint (tf = footprint transform) */
function drawPad(sink, pad, tf, mirror) {
  const at = getAt(pad);
  if (!at) return;
  const shape = str(pad[3]);
  const type = str(pad[2]);
  const sizeNode = findChild(pad, 'size');
  const sx = sizeNode ? num(sizeNode[1]) : 1;
  const sy = sizeNode ? num(sizeNode[2], sx) : sx;
  const layers = findChild(pad, 'layers');
  const layerStrs = layers ? scalars(layers).map(str) : [];
  const onFront = layerStrs.some((l) => l.startsWith('F.') || l.startsWith('*'));
  const onBack = layerStrs.some((l) => l.startsWith('B.') || l.startsWith('*'));
  let color;
  if (type === 'thru_hole' || type === 'np_thru_hole') color = PAD_TH;
  else color = onFront ? LAYER_COLORS['F.Cu'] : onBack ? LAYER_COLORS['B.Cu'] : PAD_TH;

  const center = tf(at.x, at.y);
  // pad orientation: the pad's own angle already accounts for footprint rotation
  const padAngle = at.a;

  if (shape === 'circle') {
    circ(sink, center[0], center[1], sx / 2, color, 0, true);
  } else {
    // rect / roundrect / oval / trapezoid -> oriented rectangle (oval gets rounded ends visually via rx)
    const hw = sx / 2;
    const hh = sy / 2;
    const corners = [
      [-hw, -hh],
      [hw, -hh],
      [hw, hh],
      [-hw, hh],
    ].map(([lx, ly]) => {
      const mx = mirror ? -lx : lx;
      const [rx, ry] = rot(mx, ly, padAngle);
      return [center[0] + rx, center[1] + ry];
    });
    polyline(sink, corners.concat([corners[0]]), color, 0.01, true, null);
  }

  // drill hole
  const drill = findChild(pad, 'drill');
  if (drill) {
    // (drill d) or (drill oval dx dy) — approximate with the first numeric
    const nums = scalars(drill).filter((v) => typeof v === 'number');
    const dd = nums.length ? nums[0] : 0;
    if (dd > 0) circ(sink, center[0], center[1], dd / 2, DRILL, 0, true);
  }
}

/* ============================================================= *
 *  Top-level
 * ============================================================= */

export function parseAndRenderPcb(rawText) {
  const textStr = String(rawText || '');
  if (!/\(\s*kicad_pcb/i.test(textStr)) {
    return { ok: false, reason: 'File does not look like a KiCad board (.kicad_pcb).', raw: textStr };
  }
  let root;
  try {
    root = parse(textStr);
  } catch (e) {
    return { ok: false, reason: `Could not parse board: ${e.message}`, raw: textStr };
  }
  if (!isList(root) || root[0] !== 'kicad_pcb') {
    return { ok: false, reason: 'Unexpected file structure (missing kicad_pcb root).', raw: textStr };
  }

  const sink = makeSink();

  // 1) copper zones (fills) first, underneath everything
  for (const zone of findChildren(root, 'zone')) {
    const layer = layerOf(zone) || (findChild(zone, 'layers') ? str(scalars(findChild(zone, 'layers'))[0]) : '');
    for (const fp of findChildren(zone, 'filled_polygon')) {
      const flayer = layerOf(fp) || layer;
      const color = LAYER_COLORS[flayer] || '#666';
      const ptsNode = findChild(fp, 'pts');
      if (!ptsNode) continue;
      const pts = findChildren(ptsNode, 'xy').map((p) => [num(p[1]), num(p[2])]);
      polyline(sink, pts, color, 0.01, true, 0.28);
    }
  }

  // 2) tracks (segments) + arc tracks
  for (const s of findChildren(root, 'segment')) {
    const layer = layerOf(s);
    if (!RENDER_LAYERS.has(layer)) continue;
    const a = findChild(s, 'start');
    const b = findChild(s, 'end');
    if (!a || !b) continue;
    seg(sink, num(a[1]), num(a[2]), num(b[1]), num(b[2]), LAYER_COLORS[layer] || '#888', strokeWidth(s, 0.2));
  }
  for (const s of findChildren(root, 'arc')) {
    const layer = layerOf(s);
    if (!RENDER_LAYERS.has(layer)) continue;
    const a = findChild(s, 'start');
    const m = findChild(s, 'mid');
    const b = findChild(s, 'end');
    if (!a || !m || !b) continue;
    const pts = arcPoints([num(a[1]), num(a[2])], [num(m[1]), num(m[2])], [num(b[1]), num(b[2])]);
    polyline(sink, pts, LAYER_COLORS[layer] || '#888', strokeWidth(s, 0.2), false, null);
  }

  // 3) board graphics (Edge.Cuts, gr_text, etc.)
  for (const tag of ['gr_line', 'gr_arc', 'gr_circle', 'gr_rect', 'gr_poly']) {
    for (const g of findChildren(root, tag)) drawGraphic(sink, g, identity, null);
  }

  // 4) footprints: graphics + pads + reference
  for (const fpn of findChildren(root, 'footprint')) {
    const fat = getAt(fpn) || { x: 0, y: 0, a: 0 };
    const fpLayer = layerOf(fpn);
    const mirror = fpLayer.startsWith('B.');
    const tf = makeTransform(fat.x, fat.y, fat.a, mirror);
    // graphics
    for (const tag of ['fp_line', 'fp_arc', 'fp_circle', 'fp_rect', 'fp_poly']) {
      for (const g of findChildren(fpn, tag)) drawGraphic(sink, g, tf, null);
    }
    // pads
    for (const pad of findChildren(fpn, 'pad')) drawPad(sink, pad, tf, mirror);
    // reference designator (on silk, not hidden)
    for (const prop of findChildren(fpn, 'property')) {
      if (str(prop[1]) !== 'Reference') continue;
      if (findChild(prop, 'hide') && str(findChild(prop, 'hide')[1]) !== 'no') continue;
      const pat = getAt(prop);
      const layer = layerOf(prop);
      if (!pat || !RENDER_LAYERS.has(layer)) continue;
      const font = findChild(findChild(prop, 'effects') || [], 'font');
      const sz = font && findChild(font, 'size') ? num(findChild(font, 'size')[1], 1) : 1;
      const p = tf(pat.x, pat.y);
      text(sink, str(prop[2]), p[0], p[1], sz, LAYER_COLORS[layer] || '#e6e6e6', fat.a + pat.a);
    }
  }

  // 5) vias on top
  for (const via of findChildren(root, 'via')) {
    const at = getAt(via);
    if (!at) continue;
    const sizeNode = findChild(via, 'size');
    const r = sizeNode ? num(sizeNode[1]) / 2 : 0.4;
    circ(sink, at.x, at.y, r, VIA, 0, true);
    const drill = findChild(via, 'drill');
    if (drill) circ(sink, at.x, at.y, num(drill[1]) / 2, DRILL, 0, true);
  }

  // 6) standalone board text
  for (const t of findChildren(root, 'gr_text')) {
    const layer = layerOf(t);
    const at = getAt(t);
    if (!at) continue;
    const color = LAYER_COLORS[layer] || '#8fa';
    const font = findChild(findChild(t, 'effects') || [], 'font');
    const sz = font && findChild(font, 'size') ? num(findChild(font, 'size')[1], 1) : 1;
    text(sink, str(t[1]), at.x, at.y, sz, color, at.a);
  }

  // Prefer fitting the view to the board outline (Edge.Cuts); free-floating
  // fab notes are often placed far outside the board and would otherwise
  // shrink it to a sliver. Fall back to full content extent if no outline.
  const edge = computeEdgeBbox(root);
  let minX;
  let minY;
  let maxX;
  let maxY;
  if (edge) {
    ({ minX, minY, maxX, maxY } = edge);
  } else {
    ({ minX, minY, maxX, maxY } = sink.bbox());
  }
  if (!Number.isFinite(minX)) return { ok: false, reason: 'Board is empty (nothing to draw).', raw: textStr };
  const pad = 3;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;

  const stats = {
    footprints: findChildren(root, 'footprint').length,
    pads: findChildren(root, 'footprint').reduce((n, fp) => n + findChildren(fp, 'pad').length, 0),
    tracks: findChildren(root, 'segment').length + findChildren(root, 'arc').length,
    vias: findChildren(root, 'via').length,
    zones: findChildren(root, 'zone').length,
  };

  return {
    ok: true,
    inner: sink.parts.join('\n'),
    viewBox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    stats,
    background: BG,
  };
}

export function renderPcbToStandaloneSvg(rawText) {
  const r = parseAndRenderPcb(rawText);
  if (!r.ok) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="200"><rect width="100%" height="100%" fill="${BG}"/><text x="20" y="40" font-family="sans-serif" font-size="14" fill="#e88">${esc(
      r.reason
    )}</text></svg>`;
  }
  const { x, y, w, h } = r.viewBox;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(x)} ${f(y)} ${f(w)} ${f(h)}" width="${f(
    w
  )}" height="${f(h)}"><rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${BG}"/>${r.inner}</svg>`;
}

export default parseAndRenderPcb;
