import typography from '../styles/typography';

const styles = {
  colors: {
    dark: '#171B24',
    darkAlt: '#1F2937',
    border: '#374151',
    transparent: 'rgba(241, 245, 244, 0.24)',
    primary: '#6B7280',
    secondary: '#9CA3AF',
    warning: '#D97706',
    success: '#059669',
    danger: '#DC2626',
    iteration: 'rgb(94, 254, 194)',
    stage: '#ffc107',
    text: {
      light: '#F3F4F6',
      muted: '#9CA3AF',
      dark: '#1F2937'
    }
  },
  fonts: {
    family: typography.primary,
    size: {
      xs: '0.75rem',
      sm: '0.85rem',
      md: '1rem',
      lg: '1.25rem'
    },
    weight: {
      normal: 400,
      medium: 500,
      bold: 700
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  borderRadius: {
    sm: '3px',
    md: '4px',
    lg: '6px'
  }
};

export default styles;
