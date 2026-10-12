/** @type {import('tailwindcss').Config} */
module.exports = {
content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'], theme: { extend: { // ============================================================ // COLOR PALETTE - Anti-Slop Design System // ============================================================ colors: { // Background bg: { DEFAULT: '#FAFAFA', // Off-white (main background) card: '#FFFFFF',    // Pure white (cards) muted: '#F5F5F5',   // Slightly darker for sections },

```
// Text
text: {
  DEFAULT: '#111111', // Almost black (main text)
  secondary: '#555555', // Secondary text
  muted: '#888888',   // Muted text
  inverse: '#FFFFFF', // White text on dark bg
},
```

```
// Accent colors (use sparingly)
accent: {
  red: '#991B1B',     // Merah Bata (primary accent)
  blue: '#1E3A8A',    // Biru Navy (secondary accent)
},
```

```
// Status colors
status: {
  draft: '#6B7280',       // Gray
  in_progress: '#D97706', // Amber
  completed: '#059669',   // Emerald
  archived: '#9CA3AF',    // Light gray
},
```

```
  // Border
  border: {
    DEFAULT: '#E5E5E5', // Light gray border
    strong: '#111111',  // Strong border (for emphasis)
  },
},
```

```
// ============================================================
// TYPOGRAPHY
// ============================================================
fontFamily: {
  sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
  mono: ['JetBrains Mono', 'Roboto Mono', 'monospace'],
},
```

```
fontSize: {
  // Base sizes
  'xs': ['0.75rem', { lineHeight: '1rem' }],      // 12px
  'sm': ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
  'base': ['1rem', { lineHeight: '1.5rem' }],     // 16px
  'lg': ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
  'xl': ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
  '2xl': ['1.5rem', { lineHeight: '2rem' }],      // 24px
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
```

```
  // Mobile-optimized (min 16px for inputs to prevent iOS zoom)
  'input': ['1rem', { lineHeight: '1.5rem' }],    // 16px minimum
},
```

```
fontWeight: {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800', // For headings
},
```

```
// ============================================================
// BORDER RADIUS - Anti-Slop (Sharp corners)
// ============================================================
borderRadius: {
  'none': '0',
  'sm': '2px',      // Minimal rounding (max allowed)
  'DEFAULT': '2px', // Override default
  // NO rounded-lg, rounded-xl, rounded-full
},
```

```
// ============================================================
// SPACING - Consistent rhythm
// ============================================================
spacing: {
  '0': '0',
  '1': '0.25rem',   // 4px
  '2': '0.5rem',    // 8px
  '3': '0.75rem',   // 12px
  '4': '1rem',      // 16px
  '5': '1.25rem',   // 20px
  '6': '1.5rem',    // 24px
  '8': '2rem',      // 32px
  '10': '2.5rem',   // 40px
  '12': '3rem',     // 48px
  '16': '4rem',     // 64px
  '20': '5rem',     // 80px
},
```

```
// ============================================================
// SHADOWS - Minimal/None (Anti-Slop)
// ============================================================
boxShadow: {
  'none': 'none',
  'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)', // Very subtle
  // NO shadow-lg, shadow-xl, etc.
},
```

```
// ============================================================
// TRANSITIONS - Micro-interactions
// ============================================================
transitionDuration: {
  '200': '200ms', // Standard micro-interaction
  '300': '300ms',
},
```

```
transitionTimingFunction: {
  'ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)', // Smooth ease-out
},
```

```
// ============================================================
// MIN HEIGHT - Mobile UX (touch-friendly)
// ============================================================
minHeight: {
  'touch': '48px', // Minimum touch target
  'button': '48px', // Button height
},
```

// ============================================================ // CONTAINER - Max width // ============================================================ container: { center: true, padding: { DEFAULT: '1rem',    // 16px mobile sm: '1.5rem',       // 24px tablet lg: '2rem',         // 32px desktop }, screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1200px', // Max width }, }, }, },

  plugins: [
// Custom plugin untuk utilities Anti-Slop function({ addUtilities, theme }) { const newUtilities = { // ============================================================ // BORDER UTILITIES // ============================================================ '.border-thick': { borderWidth: '4px', borderStyle: 'solid', borderColor: theme('colors.border.strong'), }, '.border-thick-red': { borderWidth: '4px', borderStyle: 'solid', borderColor: theme('colors.accent.red'), }, '.border-thick-blue': { borderWidth: '4px', borderStyle: 'solid', borderColor: theme('colors.accent.blue'), },

```
// ============================================================
// BUTTON UTILITIES
// ============================================================
'.btn-primary': {
  backgroundColor: theme('colors.text.DEFAULT'),
  color: theme('colors.text.inverse'),
  minHeight: theme('minHeight.button'),
  paddingLeft: theme('spacing.6'),
  paddingRight: theme('spacing.6'),
  paddingTop: theme('spacing.3'),
  paddingBottom: theme('spacing.3'),
  fontWeight: theme('fontWeight.semibold'),
  borderRadius: theme('borderRadius.sm'),
  transition: 'opacity 200ms ease-out',
  '&:hover': {
    opacity: '0.9',
  },
  '&:active': {
    opacity: '0.8',
  },
},
```

```
'.btn-secondary': {
  backgroundColor: 'transparent',
  color: theme('colors.text.DEFAULT'),
  border: `2px solid ${theme('colors.border.strong')}`,
  minHeight: theme('minHeight.button'),
  paddingLeft: theme('spacing.6'),
  paddingRight: theme('spacing.6'),
  paddingTop: theme('spacing.3'),
  paddingBottom: theme('spacing.3'),
  fontWeight: theme('fontWeight.semibold'),
  borderRadius: theme('borderRadius.sm'),
  transition: 'background-color 200ms ease-out',
  '&:hover': {
    backgroundColor: theme('colors.bg.muted'),
  },
},
```

```
'.btn-accent-red': {
  backgroundColor: theme('colors.accent.red'),
  color: theme('colors.text.inverse'),
  minHeight: theme('minHeight.button'),
  paddingLeft: theme('spacing.6'),
  paddingRight: theme('spacing.6'),
  paddingTop: theme('spacing.3'),
  paddingBottom: theme('spacing.3'),
  fontWeight: theme('fontWeight.semibold'),
  borderRadius: theme('borderRadius.sm'),
  transition: 'opacity 200ms ease-out',
  '&:hover': {
    opacity: '0.9',
  },
},
```

```
// ============================================================
// CARD UTILITIES
// ============================================================
'.card-event': {
  backgroundColor: theme('colors.bg.card'),
  borderLeft: `4px solid ${theme('colors.border.strong')}`,
  padding: theme('spacing.4'),
  borderRadius: theme('borderRadius.sm'),
  transition: 'transform 200ms ease-out',
  '&:hover': {
    transform: 'translateY(-2px)',
  },
},
```

```
'.card-event-draft': {
  borderLeftColor: theme('colors.status.draft'),
},
'.card-event-in-progress': {
  borderLeftColor: theme('colors.status.in_progress'),
},
'.card-event-completed': {
  borderLeftColor: theme('colors.status.completed'),
},
'.card-event-archived': {
  borderLeftColor: theme('colors.status.archived'),
},
```

```
// ============================================================
// CHECKBOX UTILITIES
// ============================================================
'.checkbox-custom': {
  width: '24px',
  height: '24px',
  minWidth: '24px',
  border: `2px solid ${theme('colors.border.strong')}`,
  borderRadius: theme('borderRadius.sm'),
  backgroundColor: theme('colors.bg.card'),
  cursor: 'pointer',
  transition: 'all 200ms ease-out',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
},
```

```
'.checkbox-custom-checked': {
  backgroundColor: theme('colors.text.DEFAULT'),
  borderColor: theme('colors.text.DEFAULT'),
  '&::after': {
    content: '"✓"',
    color: theme('colors.text.inverse'),
    fontSize: '16px',
    fontWeight: theme('fontWeight.bold'),
  },
},
```

```
// ============================================================
// PROGRESS BAR UTILITIES
// ============================================================
'.progress-bar': {
  height: '8px',
  backgroundColor: theme('colors.bg.muted'),
  borderRadius: theme('borderRadius.sm'),
  overflow: 'hidden',
},
```

```
'.progress-bar-fill': {
  height: '100%',
  transition: 'width 300ms ease-out',
},
```

```
'.progress-low': {
  backgroundColor: theme('colors.accent.red'),
},
'.progress-medium': {
  backgroundColor: theme('colors.status.in_progress'),
},
'.progress-high': {
  backgroundColor: theme('colors.status.completed'),
},
```

```
// ============================================================
// TYPOGRAPHY UTILITIES
// ============================================================
'.heading-xl': {
  fontSize: theme('fontSize.3xl'),
  fontWeight: theme('fontWeight.extrabold'),
  lineHeight: '1.2',
  color: theme('colors.text.DEFAULT'),
},
```

```
'.heading-lg': {
  fontSize: theme('fontSize.2xl'),
  fontWeight: theme('fontWeight.extrabold'),
  lineHeight: '1.3',
  color: theme('colors.text.DEFAULT'),
},
```

```
'.heading-md': {
  fontSize: theme('fontSize.xl'),
  fontWeight: theme('fontWeight.bold'),
  lineHeight: '1.4',
  color: theme('colors.text.DEFAULT'),
},
```

```
'.data-mono': {
  fontFamily: theme('fontFamily.mono'),
  fontSize: theme('fontSize.sm'),
  fontWeight: theme('fontWeight.medium'),
},
```

```
// ============================================================
// BADGE UTILITIES
// ============================================================
'.badge': {
  display: 'inline-flex',
  alignItems: 'center',
  paddingLeft: theme('spacing.2'),
  paddingRight: theme('spacing.2'),
  paddingTop: theme('spacing.1'),
  paddingBottom: theme('spacing.1'),
  fontSize: theme('fontSize.xs'),
  fontWeight: theme('fontWeight.semibold'),
  borderRadius: theme('borderRadius.sm'),
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
},
```

```
'.badge-draft': {
  backgroundColor: theme('colors.bg.muted'),
  color: theme('colors.status.draft'),
},
'.badge-in-progress': {
  backgroundColor: '#FEF3C7',
  color: theme('colors.status.in_progress'),
},
'.badge-completed': {
  backgroundColor: '#D1FAE5',
  color: theme('colors.status.completed'),
},
'.badge-archived': {
  backgroundColor: theme('colors.bg.muted'),
  color: theme('colors.status.archived'),
},
```

```
// ============================================================
// MOBILE UX UTILITIES
// ============================================================
'.touch-target': {
  minHeight: theme('minHeight.touch'),
  minWidth: theme('minHeight.touch'),
},
```

```
'.input-mobile': {
  fontSize: theme('fontSize.input'), // 16px min to prevent iOS zoom
  minHeight: theme('minHeight.touch'),
  paddingLeft: theme('spacing.3'),
  paddingRight: theme('spacing.3'),
  border: `1px solid ${theme('colors.border.DEFAULT')}`,
  borderRadius: theme('borderRadius.sm'),
  backgroundColor: theme('colors.bg.card'),
  '&:focus': {
    outline: 'none',
    borderColor: theme('colors.text.DEFAULT'),
    borderWidth: '2px',
  },
},
```

```
// ============================================================
// ANIMATION UTILITIES
// ============================================================
'.fade-in': {
  animation: 'fadeIn 200ms ease-out',
},
```

```
'@keyframes fadeIn': {
  from: {
    opacity: '0',
  },
  to: {
    opacity: '1',
  },
},
```

```
'.slide-up': {
  animation: 'slideUp 200ms ease-out',
},
```

```
  '@keyframes slideUp': {
    from: {
      opacity: '0',
      transform: 'translateY(10px)',
    },
    to: {
      opacity: '1',
      transform: 'translateY(0)',
    },
  },
};
```

      addUtilities(newUtilities, ['responsive', 'hover']);
    },
  ],
};
