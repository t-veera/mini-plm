import React from 'react';
import styles from '../constants/styles';

// Catches render/runtime errors from its subtree so a single misbehaving preview
// (e.g. a huge spreadsheet or a malformed file) shows an inline message instead of
// blanking the entire app and forcing a full page reload.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Preview crashed:', error, info);
  }

  componentDidUpdate(prevProps) {
    // Clear the error when the caller swaps in different content (e.g. a new file),
    // so recovering is as simple as selecting another file.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return this.props.fallback || (
        <div style={{ height: '100%', borderRadius: '8px', border: `1px solid ${styles.colors.border}`, padding: '1rem', color: styles.colors.text.muted }}>
          <p style={{ color: styles.colors.danger, marginBottom: '0.5rem' }}>This file couldn't be previewed.</p>
          <p style={{ fontSize: '0.85rem' }}>{String(this.state.error.message || this.state.error)}</p>
          <p style={{ fontSize: '0.85rem' }}>You can still download it, or select another file.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
