// LevelUp Solo Design System - Design Tokens
export const designTokens = {
  colors: {
    primary: '#6366F1',      // Refined Primary Blue-Purple
    accent: '#8B5CF6',       // Complementary Purple
    
    // Grayscale Neutrals
    white: '#FFFFFF',
    gray50: '#F8FAFC',
    gray100: '#F1F5F9',
    gray200: '#E2E8F0',
    gray300: '#CBD5E1',
    gray400: '#94A3B8',
    gray500: '#64748B',
    gray600: '#475569',
    gray700: '#334155',
    gray800: '#1E293B',
    gray900: '#0F172A',
    
    // Semantic Colors
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#06B6D4',
  },
  
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.2',
      normal: '1.5',
      relaxed: '1.6',
    },
  },
  
  spacing: {
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
  },
  
  borderRadius: {
    sm: '0.5rem',   // 8px
    base: '0.75rem', // 12px
    lg: '1rem',     // 16px
    xl: '1.5rem',   // 24px
    full: '9999px',
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
};

export const componentTokens = {
  button: {
    primary: {
      background: `linear-gradient(135deg, ${designTokens.colors.primary} 0%, ${designTokens.colors.accent} 100%)`,
      color: designTokens.colors.white,
      borderRadius: designTokens.borderRadius.base,
      padding: `${designTokens.spacing[3]} ${designTokens.spacing[4]}`,
      fontSize: designTokens.typography.fontSize.sm,
      fontWeight: designTokens.typography.fontWeight.medium,
      boxShadow: designTokens.shadows.base,
    },
    secondary: {
      background: designTokens.colors.gray100,
      color: designTokens.colors.gray800,
      border: `1px solid ${designTokens.colors.gray200}`,
      borderRadius: designTokens.borderRadius.base,
      padding: `${designTokens.spacing[3]} ${designTokens.spacing[4]}`,
      fontSize: designTokens.typography.fontSize.sm,
      fontWeight: designTokens.typography.fontWeight.medium,
      boxShadow: designTokens.shadows.sm,
    },
    ghost: {
      background: 'transparent',
      color: designTokens.colors.gray700,
      border: '1px solid transparent',
      borderRadius: designTokens.borderRadius.base,
      padding: `${designTokens.spacing[3]} ${designTokens.spacing[4]}`,
      fontSize: designTokens.typography.fontSize.sm,
      fontWeight: designTokens.typography.fontWeight.medium,
    },
  },
  
  card: {
    background: designTokens.colors.white,
    border: `1px solid ${designTokens.colors.gray200}`,
    borderRadius: designTokens.borderRadius.base,
    boxShadow: designTokens.shadows.sm,
    padding: designTokens.spacing[6],
  },
  
  input: {
    background: designTokens.colors.white,
    border: `1px solid ${designTokens.colors.gray200}`,
    borderRadius: designTokens.borderRadius.sm,
    padding: designTokens.spacing[3],
    fontSize: designTokens.typography.fontSize.sm,
    color: designTokens.colors.gray800,
    focusBorderColor: designTokens.colors.primary,
    focusBoxShadow: `0 0 0 3px ${designTokens.colors.primary}1A`, // 10% opacity
  },
};