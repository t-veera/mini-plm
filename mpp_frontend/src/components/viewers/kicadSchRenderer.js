/*
 * Self-contained KiCad schematic (.kicad_sch) renderer.
 *
 * Parses the KiCad 6/7/8 S-expression schematic format and renders it to SVG,
 * visually approximating how the sheet looks inside KiCad's Eeschema editor.
 *
 * It has no external runtime dependencies (no CDN, no WebGL, no server-side
 * KiCad install) so it works anywhere the bundle runs. Modern .kicad_sch files
 * embed a (lib_symbols ...) block with the full graphics for every symbol used
 * on the sheet, so a single file is enough to draw everything.
 *
 * Exported:
 *   parseAndRender(text)          -> { ok, inner, viewBox:{x,y,w,h}, ... }
 *   renderToStandaloneSvg(text)   -> full <svg> string (used for tests/preview)
 *
 * The React wrapper renders <svg viewBox=...><g transform=pan/zoom>inner</g></svg>.
 */

/* ---- KiCad "classic" light theme colours ---- */
const C = {
  background: '#ffffff',
  grid: '#e5e5e5',
  wire: '#008000',
  bus: '#000084',
  junction: '#008000',
  noConnect: '#0000c4',
  outline: '#880000',   // component body outline (dark red)
  bodyFill: '#ffffc2',  // "background" fill (pale yellow)
  pin: '#880000',
  pinName: '#004a4a',
  pinNumber: '#880000',
  reference: '#008484',
  value: '#008484',
  fields: '#840084',
  label: '#000000',
  glabel: '#880000',
  hlabel: '#880000',
  text: '#000000',
  sheet: '#880000',
  sheetFill: '#ffffee',
};

/* Default stroke widths (mm) */
const W_WIRE = 0.1524;
const W_BUS = 0.3048;
const W_PIN = 0.1524;
const W_OUTLINE = 0.254;

/* ============================================================= *
 *  S-expression tokenizer + parser
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
      i++; // closing quote
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
      if (t === '(') {
        list.push(parseList());
      } else if (t === ')') {
        i++;
        return list;
      } else {
        i++;
        if (typeof t === 'object' && 'str' in t) {
          // wrap quoted strings so we never mistake them for symbols/numbers
          list.push(new String(t.str)); // eslint-disable-line no-new-wrappers
        } else {
          const a = t.atom;
          list.push(NUM_RE.test(a) ? Number(a) : a);
        }
      }
    }
    return list;
  }

  while (i < tokens.length && tokens[i] !== '(') i++;
  if (i >= tokens.length) throw new Error('No S-expression found');
  return parseList();
}

/* ---- tree helpers ---- */
const isList = (x) => Array.isArray(x);
const subLists = (node) => (isList(node) ? node.filter(isList) : []);
const findChild = (node, tag) => subLists(node).find((c) => c[0] === tag);
const findChildren = (node, tag) => subLists(node).filter((c) => c[0] === tag);
// scalar (non-list) args after the tag
const scalars = (node) => (isList(node) ? node.slice(1).filter((x) => !isList(x)) : []);
// plain string value of a scalar (handles String wrapper + numbers)
const str = (v) => (v == null ? '' : String(v));
const num = (v, d = 0) => {
  const f = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(f) ? f : d;
};

/* get (at x y [angle]) as {x,y,a} */
function getAt(node) {
  const at = findChild(node, 'at');
  if (!at) return null;
  return { x: num(at[1]), y: num(at[2]), a: num(at[3], 0) };
}

/* stroke width from an (stroke (width w) ...) child */
function strokeWidth(node, def) {
  const s = findChild(node, 'stroke');
  if (s) {
    const w = findChild(s, 'width');
    if (w && num(w[1]) > 0) return num(w[1]);
  }
  return def;
}

/* fill type: 'none' | 'outline' | 'background' */
function fillType(node) {
  const f = findChild(node, 'fill');
  if (!f) return 'none';
  const t = findChild(f, 'type');
  return t ? str(t[1]) : 'none';
}

function effects(node) {
  const e = findChild(node, 'effects');
  const out = { size: 1.27, hide: false, justify: [], bold: false, italic: false };
  if (!e) return out;
  if (scalars(e).map(str).includes('hide')) out.hide = true;
  const hideChild = findChild(e, 'hide'); // KiCad 8: (hide yes)
  if (hideChild && str(hideChild[1]) !== 'no') out.hide = true;
  const font = findChild(e, 'font');
  if (font) {
    const size = findChild(font, 'size');
    if (size) out.size = num(size[1], 1.27) || 1.27;
    if (scalars(font).map(str).includes('bold')) out.bold = true;
    if (scalars(font).map(str).includes('italic')) out.italic = true;
  }
  const j = findChild(e, 'justify');
  if (j) out.justify = scalars(j).map(str);
  return out;
}

/* ============================================================= *
 *  SVG emission helpers (with bounding-box tracking)
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
  return {
    parts,
    grow,
    push: (s) => parts.push(s),
    bbox: () => ({ minX, minY, maxX, maxY }),
  };
}

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const f = (n) => (Math.round(n * 1000) / 1000).toString();

function line(sink, x1, y1, x2, y2, color, width) {
  sink.grow(x1, y1, width);
  sink.grow(x2, y2, width);
  sink.push(
    `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${color}" stroke-width="${f(
      width
    )}" stroke-linecap="round"/>`
  );
}

function polyline(sink, pts, color, width, fill) {
  if (!pts.length) return;
  pts.forEach((p) => sink.grow(p[0], p[1], width));
  const d = pts.map((p) => `${f(p[0])},${f(p[1])}`).join(' ');
  const tag = fill && fill !== 'none' ? 'polygon' : 'polyline';
  const fillColor = fill === 'background' ? C.bodyFill : fill === 'outline' ? color : 'none';
  sink.push(
    `<${tag} points="${d}" fill="${fillColor}" stroke="${color}" stroke-width="${f(
      width
    )}" stroke-linejoin="round" stroke-linecap="round"/>`
  );
}

function circle(sink, cx, cy, r, color, width, fill) {
  sink.grow(cx, cy, r + width);
  const fillColor = fill === 'background' ? C.bodyFill : fill === 'outline' ? color : 'none';
  sink.push(
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fillColor}" stroke="${color}" stroke-width="${f(
      width
    )}"/>`
  );
}

function text(sink, s, x, y, opts = {}) {
  const { color = C.text, size = 1.27, baseline = 'middle', bold = false, italic = false } = opts;
  if (s == null || s === '' || s === '~') return;
  // KiCad never draws text upside-down: angles in [90,270) are folded back and
  // the justification is flipped instead, keeping glyphs readable.
  let angle = (((opts.angle || 0) % 360) + 360) % 360;
  let anchor = opts.anchor || 'middle';
  const flip = (a) => (a === 'start' ? 'end' : a === 'end' ? 'start' : a);
  if (angle > 90 && angle < 270) {
    angle = (angle + 180) % 360;
    anchor = flip(anchor);
  }
  const lines = String(s).split('\n');
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  // rough bbox so text participates in auto-fit
  const w = longest * size * 0.62;
  sink.grow(x, y, Math.max(size, w / 2));
  sink.grow(x, y + lines.length * size * 1.2);
  const transform = angle ? ` transform="rotate(${f(-angle)} ${f(x)} ${f(y)})"` : '';
  const body =
    lines.length > 1
      ? lines
          .map((ln, k) => `<tspan x="${f(x)}" dy="${k === 0 ? '0' : f(size * 1.2)}">${esc(ln)}</tspan>`)
          .join('')
      : esc(s);
  sink.push(
    `<text x="${f(x)}" y="${f(y)}" fill="${color}" font-family="'DejaVu Sans','Helvetica',sans-serif" font-size="${f(
      size
    )}" text-anchor="${anchor}" dominant-baseline="${baseline}"${
      bold ? ' font-weight="bold"' : ''
    }${italic ? ' font-style="italic"' : ''}${transform}>${body}</text>`
  );
}

function anchorFromJustify(j) {
  if (j.includes('left')) return 'start';
  if (j.includes('right')) return 'end';
  return 'middle';
}
function baselineFromJustify(j) {
  if (j.includes('top')) return 'text-before-edge';
  if (j.includes('bottom')) return 'text-after-edge';
  return 'middle';
}

/* ============================================================= *
 *  Library symbol extraction
 * ============================================================= */

function buildLibSymbols(root) {
  const libNode = findChild(root, 'lib_symbols');
  const map = {};
  if (!libNode) return map;
  for (const sym of findChildren(libNode, 'symbol')) {
    const name = str(sym[1]);
    const entry = {
      name,
      isPower: findChildren(sym, 'power').length > 0,
      hideNumbers: false,
      hideNames: false,
      units: [], // { unit, graphics:[nodes], pins:[nodes] }
    };
    const pn = findChild(sym, 'pin_numbers');
    if (pn && scalars(pn).map(str).includes('hide')) entry.hideNumbers = true;
    const pnames = findChild(sym, 'pin_names');
    if (pnames && scalars(pnames).map(str).includes('hide')) entry.hideNames = true;

    for (const sub of findChildren(sym, 'symbol')) {
      const subName = str(sub[1]); // e.g. "R_0_1" -> unit 0, style 1
      const m = subName.match(/_(\d+)_(\d+)$/);
      const unit = m ? parseInt(m[1], 10) : 0;
      const graphics = [];
      const pins = [];
      for (const item of subLists(sub)) {
        if (['rectangle', 'polyline', 'circle', 'arc', 'bezier', 'text'].includes(item[0]))
          graphics.push(item);
        else if (item[0] === 'pin') pins.push(item);
      }
      entry.units.push({ unit, graphics, pins });
    }
    map[name] = entry;
  }
  return map;
}

/* ============================================================= *
 *  Geometry transform for a symbol instance
 * ============================================================= */

function makeTransform(px, py, angleDeg, mirror) {
  const a = ((angleDeg || 0) * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return (x, y) => {
    let lx = x;
    let ly = y;
    if (mirror === 'y') lx = -lx; // mirror about Y axis
    if (mirror === 'x') ly = -ly; // mirror about X axis
    const rx = lx * cos - ly * sin;
    const ry = lx * sin + ly * cos;
    // library is Y-up; schematic screen is Y-down
    return [px + rx, py - ry];
  };
}

/* center of the circle through 3 points (for arcs); null if collinear */
function circleFrom3(p1, p2, p3) {
  const ax = p1[0];
  const ay = p1[1];
  const bx = p2[0];
  const by = p2[1];
  const cx = p3[0];
  const cy = p3[1];
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-9) return null;
  const ux =
    ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy =
    ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  return [ux, uy];
}

/* sample an arc (start->mid->end) into a polyline of screen points */
function arcPoints(start, mid, end) {
  const center = circleFrom3(start, mid, end);
  if (!center) return [start, mid, end];
  const [cx, cy] = center;
  const r = Math.hypot(start[0] - cx, start[1] - cy);
  let a0 = Math.atan2(start[1] - cy, start[0] - cx);
  let am = Math.atan2(mid[1] - cy, mid[0] - cx);
  let a1 = Math.atan2(end[1] - cy, end[0] - cx);
  const norm = (t) => {
    while (t < 0) t += 2 * Math.PI;
    while (t >= 2 * Math.PI) t -= 2 * Math.PI;
    return t;
  };
  a0 = norm(a0);
  am = norm(am);
  a1 = norm(a1);
  // decide sweep direction that passes through mid
  let start2end = norm(a1 - a0);
  let start2mid = norm(am - a0);
  let ccw = start2mid <= start2end;
  let sweep = ccw ? start2end : start2end - 2 * Math.PI;
  const steps = Math.max(6, Math.ceil(Math.abs(sweep) / (Math.PI / 24)));
  const pts = [];
  for (let k = 0; k <= steps; k++) {
    const t = a0 + (sweep * k) / steps;
    pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  return pts;
}

/* ============================================================= *
 *  Draw one symbol graphic item (already have transform tf)
 * ============================================================= */

function drawGraphic(sink, item, tf, color) {
  const tag = item[0];
  const w = strokeWidth(item, W_OUTLINE);
  const fill = fillType(item);
  if (tag === 'rectangle') {
    const s = findChild(item, 'start');
    const e = findChild(item, 'end');
    if (!s || !e) return;
    const x1 = num(s[1]);
    const y1 = num(s[2]);
    const x2 = num(e[1]);
    const y2 = num(e[2]);
    const corners = [tf(x1, y1), tf(x2, y1), tf(x2, y2), tf(x1, y2)];
    polyline(sink, corners.concat([corners[0]]), color, w, fill);
  } else if (tag === 'polyline' || tag === 'bezier') {
    const ptsNode = findChild(item, 'pts');
    if (!ptsNode) return;
    const pts = findChildren(ptsNode, 'xy').map((p) => tf(num(p[1]), num(p[2])));
    polyline(sink, pts, color, w, fill);
  } else if (tag === 'circle') {
    const cNode = findChild(item, 'center');
    const rNode = findChild(item, 'radius');
    if (!cNode || !rNode) return;
    const c = tf(num(cNode[1]), num(cNode[2]));
    circle(sink, c[0], c[1], num(rNode[1]), color, w, fill);
  } else if (tag === 'arc') {
    const s = findChild(item, 'start');
    const m = findChild(item, 'mid');
    const e = findChild(item, 'end');
    if (!s || !m || !e) return;
    const pts = arcPoints(tf(num(s[1]), num(s[2])), tf(num(m[1]), num(m[2])), tf(num(e[1]), num(e[2])));
    polyline(sink, pts, color, w, fill);
  } else if (tag === 'text') {
    const s = str(item[1]);
    const at = getAt(item);
    const ef = effects(item);
    if (at && !ef.hide) {
      const p = tf(at.x, at.y);
      text(sink, s, p[0], p[1], { color, size: ef.size, bold: ef.bold, italic: ef.italic });
    }
  }
}

/* draw a pin (line + optional number/name) */
function drawPin(sink, pin, tf, entry) {
  const at = getAt(pin);
  if (!at) return;
  const length = num(findChild(pin, 'length') ? findChild(pin, 'length')[1] : 0, 0);
  const rad = (at.a * Math.PI) / 180;
  const tip = [at.x, at.y];
  const bodyEnd = [at.x + length * Math.cos(rad), at.y + length * Math.sin(rad)];
  const tScreen = tf(tip[0], tip[1]);
  const bScreen = tf(bodyEnd[0], bodyEnd[1]);
  const hidden = scalars(pin).map(str).includes('hide');
  if (!hidden) line(sink, tScreen[0], tScreen[1], bScreen[0], bScreen[1], C.pin, W_PIN);

  // pin number: near the middle of the pin line, offset a touch
  if (!entry.hideNumbers && !hidden) {
    const numNode = findChild(pin, 'number');
    const numTxt = numNode ? str(numNode[1]) : '';
    if (numTxt && numTxt !== '~') {
      const mx = (tScreen[0] + bScreen[0]) / 2;
      const my = (tScreen[1] + bScreen[1]) / 2;
      const dx = bScreen[0] - tScreen[0];
      const dy = bScreen[1] - tScreen[1];
      const len = Math.hypot(dx, dy) || 1;
      // perpendicular offset
      const ox = (-dy / len) * 0.9;
      const oy = (dx / len) * 0.9;
      text(sink, numTxt, mx + ox, my + oy, { color: C.pinNumber, size: 1.0, anchor: 'middle' });
    }
  }
  // pin name: just past the body end, toward the symbol centre
  if (!entry.hideNames && !hidden) {
    const nameNode = findChild(pin, 'name');
    const nameTxt = nameNode ? str(nameNode[1]) : '';
    if (nameTxt && nameTxt !== '~') {
      const dx = bScreen[0] - tScreen[0];
      const dy = bScreen[1] - tScreen[1];
      const len = Math.hypot(dx, dy) || 1;
      const nx = bScreen[0] + (dx / len) * 0.6;
      const ny = bScreen[1] + (dy / len) * 0.6;
      // anchor away from the tip
      const anchor = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'start' : 'end') : 'middle';
      text(sink, nameTxt, nx, ny, { color: C.pinName, size: 1.1, anchor });
    }
  }
}

/* ============================================================= *
 *  Draw a symbol instance
 * ============================================================= */

function drawSymbolInstance(sink, inst, libs) {
  const libIdNode = findChild(inst, 'lib_id');
  const libId = libIdNode ? str(libIdNode[1]) : '';
  const at = getAt(inst) || { x: 0, y: 0, a: 0 };
  const mirrorNode = findChild(inst, 'mirror');
  const mirror = mirrorNode ? str(mirrorNode[1]) : null;
  const unitNode = findChild(inst, 'unit');
  const unit = unitNode ? num(unitNode[1], 1) : 1;
  const tf = makeTransform(at.x, at.y, at.a, mirror);

  const entry = libs[libId];
  if (!entry) {
    // Unknown symbol: draw a placeholder box so the sheet still reads
    const c = tf(0, 0);
    sink.push(
      `<rect x="${f(c[0] - 5)}" y="${f(c[1] - 5)}" width="10" height="10" fill="${C.bodyFill}" stroke="${
        C.outline
      }" stroke-width="0.2" stroke-dasharray="0.6 0.6"/>`
    );
    sink.grow(c[0], c[1], 6);
    text(sink, libId, c[0], c[1], { color: C.outline, size: 1.0 });
  } else {
    for (const u of entry.units) {
      if (u.unit !== 0 && u.unit !== unit) continue;
      for (const g of u.graphics) drawGraphic(sink, g, tf, C.outline);
      for (const p of u.pins) drawPin(sink, p, tf, entry);
    }
  }

  // instance property fields (absolute schematic coords)
  for (const prop of findChildren(inst, 'property')) {
    const key = str(prop[1]);
    const val = str(prop[2]);
    const ef = effects(prop);
    const pAt = getAt(prop);
    if (ef.hide || !pAt || val === '' || val === '~') continue;
    let color = C.fields;
    if (key === 'Reference') color = C.reference;
    else if (key === 'Value') color = C.value;
    text(sink, val, pAt.x, pAt.y, {
      color,
      size: ef.size,
      anchor: anchorFromJustify(ef.justify),
      baseline: baselineFromJustify(ef.justify),
      angle: pAt.a,
      bold: ef.bold,
      italic: ef.italic,
    });
  }
}

/* ============================================================= *
 *  Schematic-level items
 * ============================================================= */

function drawWireLike(sink, node, color, width) {
  const ptsNode = findChild(node, 'pts');
  if (!ptsNode) return;
  const pts = findChildren(ptsNode, 'xy').map((p) => [num(p[1]), num(p[2])]);
  polyline(sink, pts, color, strokeWidth(node, width), 'none');
}

function drawJunction(sink, node) {
  const at = getAt(node);
  if (!at) return;
  const dNode = findChild(node, 'diameter');
  const d = dNode && num(dNode[1]) > 0 ? num(dNode[1]) : 0.9144;
  circle(sink, at.x, at.y, d / 2, C.junction, 0, 'outline');
}

function drawNoConnect(sink, node) {
  const at = getAt(node);
  if (!at) return;
  const s = 0.635;
  line(sink, at.x - s, at.y - s, at.x + s, at.y + s, C.noConnect, W_WIRE * 1.5);
  line(sink, at.x - s, at.y + s, at.x + s, at.y - s, C.noConnect, W_WIRE * 1.5);
}

function drawLabel(sink, node, color) {
  const s = str(node[1]);
  const at = getAt(node);
  if (!at) return;
  const ef = effects(node);
  // KiCad anchors the label text next to its attach point; nudge it up a hair
  text(sink, s, at.x, at.y - 0.3, {
    color,
    size: ef.size,
    anchor: 'start',
    baseline: 'text-after-edge',
    angle: at.a,
  });
}

function drawGlobalLabel(sink, node, color) {
  const s = str(node[1]);
  const at = getAt(node);
  if (!at) return;
  const ef = effects(node);
  const h = ef.size * 1.4;
  const w = s.length * ef.size * 0.62 + h;
  // simple hexagon flag pointing left, text inside
  const pts = [
    [at.x, at.y],
    [at.x + h * 0.5, at.y - h * 0.5],
    [at.x + w, at.y - h * 0.5],
    [at.x + w, at.y + h * 0.5],
    [at.x + h * 0.5, at.y + h * 0.5],
    [at.x, at.y],
  ].map((p) => rotAround(p, at.x, at.y, at.a));
  polyline(sink, pts, color, W_WIRE, 'none');
  const tp = rotAround([at.x + h * 0.6, at.y], at.x, at.y, at.a);
  text(sink, s, tp[0], tp[1], { color, size: ef.size, anchor: 'start', baseline: 'middle', angle: at.a });
}

function rotAround(p, cx, cy, angleDeg) {
  if (!angleDeg) return p;
  const a = (angleDeg * Math.PI) / 180;
  const dx = p[0] - cx;
  const dy = p[1] - cy;
  // screen space (Y-down): positive angle rotates clockwise on screen; match KiCad
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

function drawText(sink, node) {
  const s = str(node[1]);
  const at = getAt(node);
  if (!at) return;
  const ef = effects(node);
  if (ef.hide) return;
  text(sink, s, at.x, at.y, {
    color: C.text,
    size: ef.size,
    anchor: anchorFromJustify(ef.justify),
    baseline: 'middle',
    angle: at.a,
    bold: ef.bold,
    italic: ef.italic,
  });
}

function drawSheet(sink, node) {
  const at = getAt(node);
  const sizeNode = findChild(node, 'size');
  if (!at || !sizeNode) return;
  const w = num(sizeNode[1]);
  const h = num(sizeNode[2]);
  sink.grow(at.x, at.y);
  sink.grow(at.x + w, at.y + h);
  sink.push(
    `<rect x="${f(at.x)}" y="${f(at.y)}" width="${f(w)}" height="${f(h)}" fill="${C.sheetFill}" stroke="${
      C.sheet
    }" stroke-width="0.3048"/>`
  );
  // sheet name / file fields
  for (const prop of findChildren(node, 'property')) {
    const val = str(prop[2]);
    const pAt = getAt(prop);
    const ef = effects(prop);
    if (pAt && !ef.hide && val) text(sink, val, pAt.x, pAt.y, { color: C.sheet, size: ef.size, anchor: 'start' });
  }
  // hierarchical pins on the sheet border
  for (const sp of findChildren(node, 'pin')) {
    const pAt = getAt(sp);
    const nm = str(sp[1]);
    if (pAt && nm) text(sink, nm, pAt.x, pAt.y, { color: C.hlabel, size: 1.27, anchor: 'middle' });
  }
}

/* ============================================================= *
 *  Top-level render
 * ============================================================= */

function looksLikeLegacy(text) {
  return /^\s*EESchema\s+Schematic\s+File/i.test(text) || /^\s*LIBS:/m.test(text);
}

export function parseAndRender(rawText) {
  const text = String(rawText || '');
  if (!/\(\s*kicad_sch/i.test(text)) {
    return {
      ok: false,
      legacy: looksLikeLegacy(text),
      reason: looksLikeLegacy(text)
        ? 'This is a legacy (pre-v6) Eeschema .sch file. Graphical rendering supports the modern .kicad_sch format.'
        : 'File does not look like a KiCad schematic (.kicad_sch).',
      raw: text,
    };
  }

  let root;
  try {
    root = parse(text);
  } catch (e) {
    return { ok: false, reason: `Could not parse schematic: ${e.message}`, raw: text };
  }
  if (!isList(root) || root[0] !== 'kicad_sch') {
    return { ok: false, reason: 'Unexpected file structure (missing kicad_sch root).', raw: text };
  }

  const libs = buildLibSymbols(root);
  const sink = makeSink();

  // Draw order roughly matches KiCad: wires/buses, then symbols, then labels on top.
  for (const w of findChildren(root, 'bus')) drawWireLike(sink, w, C.bus, W_BUS);
  for (const w of findChildren(root, 'wire')) drawWireLike(sink, w, C.wire, W_WIRE);
  for (const s of findChildren(root, 'sheet')) drawSheet(sink, s);
  for (const inst of findChildren(root, 'symbol')) drawSymbolInstance(sink, inst, libs);
  for (const j of findChildren(root, 'junction')) drawJunction(sink, j);
  for (const nc of findChildren(root, 'no_connect')) drawNoConnect(sink, nc);
  for (const l of findChildren(root, 'label')) drawLabel(sink, l, C.label);
  for (const l of findChildren(root, 'global_label')) drawGlobalLabel(sink, l, C.glabel);
  for (const l of findChildren(root, 'hierarchical_label')) drawGlobalLabel(sink, l, C.hlabel);
  for (const t of findChildren(root, 'text')) drawText(sink, t);

  let { minX, minY, maxX, maxY } = sink.bbox();
  if (!Number.isFinite(minX)) {
    return { ok: false, reason: 'Schematic is empty (nothing to draw).', raw: text };
  }
  const pad = 5;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  const vb = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };

  // count some stats for the caller/UI
  const stats = {
    symbols: findChildren(root, 'symbol').length,
    wires: findChildren(root, 'wire').length,
    labels:
      findChildren(root, 'label').length +
      findChildren(root, 'global_label').length +
      findChildren(root, 'hierarchical_label').length,
    sheets: findChildren(root, 'sheet').length,
  };

  return { ok: true, inner: sink.parts.join('\n'), viewBox: vb, stats, background: C.background };
}

export function renderToStandaloneSvg(rawText) {
  const r = parseAndRender(rawText);
  if (!r.ok) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="200"><rect width="100%" height="100%" fill="#fff"/><text x="20" y="40" font-family="sans-serif" font-size="14" fill="#a00">${esc(
      r.reason
    )}</text></svg>`;
  }
  const { x, y, w, h } = r.viewBox;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(x)} ${f(y)} ${f(w)} ${f(
    h
  )}" width="${f(w)}" height="${f(h)}"><rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(
    h
  )}" fill="${r.background}"/>${r.inner}</svg>`;
}

export default parseAndRender;
