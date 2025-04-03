import { act as reactDomAct } from 'react-dom/test-utils';

// Polyfill React.act if it doesn't exist
if (typeof window !== 'undefined') {
  if (!window.React) {
    window.React = {};
  }
  if (!window.React.act) {
    window.React.act = reactDomAct;
  }
}