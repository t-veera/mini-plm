import typography from './typography';

/**
 * App-wide CSS, including the Bootstrap overrides.
 *
 * Every colour here is a CSS custom property, so this string is written to the document
 * once and never needs re-injecting when the theme changes - the variables underneath it
 * change instead. That is also what makes Bootstrap's hardcoded `.bg-dark` / `.text-light`
 * / `.table-dark` classes follow the theme without editing the components that use them.
 */
const globalStyles = `
  * { max-width: 100% !important; box-sizing: border-box !important; font-family: ${typography.primary} !important; }
  .excel-scroll-container, .excel-scroll-container * { max-width: none !important; overflow-x: auto !important; }

  body, html {
    overflow-x: hidden !important;
    width: 100% !important;
    max-width: 100vw !important;
    background-color: var(--mp-dark) !important;
    color: var(--mp-text) !important;
  }

  .container-fluid { padding-left: 0 !important; padding-right: 0 !important; }

  /* Bootstrap's dark utilities, re-pointed at the active theme. */
  .bg-dark { background-color: var(--mp-dark) !important; }
  .text-light { color: var(--mp-text) !important; }
  .text-muted { color: var(--mp-text-muted) !important; }
  .table-dark { background-color: var(--mp-dark) !important; color: var(--mp-text) !important; }
  .toast { background-color: var(--mp-dark-alt) !important; color: var(--mp-text) !important; border: 1px solid var(--mp-border) !important; }

  /* Bootstrap 5 paints table cells through its own custom properties, and
     variant="dark" pins --bs-table-color to white. Overriding \`color\` on .table alone
     does nothing, because .table > :not(caption) > * > * re-applies --bs-table-color to
     every cell - so the variables themselves have to be re-pointed. */
  .table, .table-dark {
    --bs-table-color: var(--mp-text);
    --bs-table-bg: var(--mp-dark);
    --bs-table-border-color: var(--mp-border);
    --bs-table-striped-color: var(--mp-text);
    --bs-table-striped-bg: var(--mp-hover);
    --bs-table-hover-color: var(--mp-text);
    --bs-table-hover-bg: var(--mp-hover);
    --bs-table-active-color: var(--mp-text);
    --bs-table-active-bg: var(--mp-hover);
  }
  .table {
    font-size: 0.85rem !important;
    cursor: pointer !important;
    background-color: var(--mp-dark) !important;
    color: var(--mp-text) !important;
  }
  .table th, .table td { background-color: var(--mp-dark) !important; border-color: var(--mp-border) !important; }
  .table-hover > tbody > tr:hover > * { background-color: var(--mp-hover) !important; }
  .file-table > :not(caption) > * > * { padding: 0.55rem 0.5rem !important; border-bottom: 1px solid var(--mp-border) !important; }
  .file-table > tbody > tr:last-child > * { border-bottom: none !important; }

  .form-control, .form-select {
    background-color: var(--mp-dark-alt) !important;
    color: var(--mp-text) !important;
    border: 1px solid var(--mp-border) !important;
  }
  .form-control::placeholder { color: var(--mp-text-muted) !important; }

  .product-select { background-color: transparent !important; border: none !important; box-shadow: none !important; }
  .product-select:hover { background-color: var(--mp-dark-alt) !important; }

  .rev-select { color: var(--mp-text-muted) !important; background-color: transparent !important; border: 1px solid var(--mp-border) !important; }
  .rev-select:hover { color: var(--mp-text) !important; background-color: var(--mp-dark-alt) !important; }

  .selected-file-row td { background-color: var(--mp-primary-soft) !important; }
  .context-menu-item:hover { background-color: var(--mp-dark-alt) !important; }

  select { appearance: none !important; -webkit-appearance: none !important; -moz-appearance: none !important; background-image: none !important; }
`;

export default globalStyles;
