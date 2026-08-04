import React, { useEffect, useRef, useState } from 'react';
import { THEMES, DEFAULT_THEME, cssVar } from '../../styles/themes';
import { useTheme } from '../../context/ThemeContext';
import tokens from '../../constants/styles';

const MONO = "Consolas, 'Courier New', 'DejaVu Sans Mono', monospace";

/** Unique per mounted diagram - mermaid keys its temporary DOM nodes by this id. */
let instanceCount = 0;

/**
 * Undo the viewer's prose styling inside the diagram.
 *
 * Mermaid puts label text in a <p> nested inside the node's <span>, and the viewer
 * styles `.md-viewer p` with a colour and font size. A declaration applied directly to
 * an element beats an inherited one even when the inherited one is !important, so the
 * <p> wins over the colour mermaid set on the <span> - which repaints every label in
 * the viewer's text colour and makes diagrams that set their own fills unreadable.
 * Resetting the font size matters just as much: mermaid measures each label before the
 * SVG is mounted, so a size change afterwards leaves the text no longer fitting its box.
 *
 * Scoped to the rendered SVG only, so the error fallback still gets the code-block
 * treatment from the viewer's stylesheet.
 */
const RESET_CSS = `
  .mp-mermaid p, .mp-mermaid strong, .mp-mermaid em {
    color: inherit; font-size: inherit; line-height: inherit; margin: 0;
  }
`;

/**
 * Resolve the `--mp-*` tokens to the literal colours currently painted on <html>.
 *
 * Mermaid derives some colours arithmetically from these, so it needs real values -
 * handing it `var(--mp-dark)` strings produces broken output rather than an error.
 * Falls back to the default palette only if a property is somehow unset.
 */
function readPalette() {
  const computed = getComputedStyle(document.documentElement);
  const read = (key) => computed.getPropertyValue(cssVar(key)).trim() || THEMES[DEFAULT_THEME][key];

  return {
    background: read('dark'),
    primaryColor: read('darkAlt'),
    primaryTextColor: read('text'),
    primaryBorderColor: read('border'),
    // The colour the viewer's <style> block already gives links.
    lineColor: read('iteration'),
    textColor: read('text'),
  };
}

/** Mermaid leaves these behind on a parse error; without this they accumulate on <body>. */
function removeStrayNodes(id) {
  [`d${id}`, id].forEach((strayId) => {
    const node = document.getElementById(strayId);
    if (node) node.remove();
  });
}

/**
 * Render one mermaid source string as an SVG.
 *
 * Mermaid is loaded on demand rather than imported at the top level: it is a large
 * dependency and most sessions never open a markdown file at all.
 */
function MermaidDiagram({ code }) {
  const { theme } = useTheme();
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = `mermaid-${(instanceCount += 1)}`;

  useEffect(() => {
    let isCancelled = false;
    const id = idRef.current;

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;
        if (isCancelled) return;

        // Read the palette after the await, never before. On a theme change this
        // component's effect runs ahead of ThemeProvider's - child effects flush
        // first - so the custom properties are only current once that synchronous
        // flush has finished, which the dynamic import guarantees we are past.
        //
        // `base` is the theme that lets themeVariables through unmodified; with
        // `dark` mermaid's own defaults override half of them.
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          securityLevel: 'strict',
          fontFamily: MONO,
          themeVariables: readPalette(),
        });

        const { svg: rendered } = await mermaid.render(id, code);
        if (isCancelled) return;
        setSvg(rendered);
        setError(null);
      } catch (err) {
        removeStrayNodes(id);
        if (isCancelled) return;
        setSvg('');
        setError(err && err.message ? err.message.split('\n')[0] : 'Could not render diagram');
      }
    }

    render();
    return () => {
      isCancelled = true;
      removeStrayNodes(id);
    };
  }, [code, theme]);

  // A malformed diagram degrades to the code block the reader would have seen anyway.
  if (error) {
    return (
      <>
        <pre style={styles.pre}>{code}</pre>
        <p style={styles.error}>Diagram could not be rendered: {error}</p>
      </>
    );
  }

  if (!svg) return <p style={styles.loading}>Rendering diagram…</p>;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: RESET_CSS }} />
      <div className="mp-mermaid" style={styles.diagram} dangerouslySetInnerHTML={{ __html: svg }} />
    </>
  );
}

// styles.pre mirrors the MarkdownViewer treatment so the fallback is indistinguishable
// from an ordinary fence.
const styles = {
  diagram: { margin: '0.8rem 0', overflowX: 'auto' },
  pre: { background: tokens.colors.darkAlt, padding: '1rem', borderRadius: '6px', overflow: 'auto', margin: '0.8rem 0', fontFamily: MONO, border: `1px solid ${tokens.colors.border}` },
  error: { color: tokens.colors.text.muted, fontSize: '12px', margin: '-0.4rem 0 0.8rem' },
  loading: { color: tokens.colors.text.muted, fontSize: '13px', margin: '0.8rem 0' },
};

export default MermaidDiagram;
