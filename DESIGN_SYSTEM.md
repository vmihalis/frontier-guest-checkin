# Frontier Tower Design System

A modern, approachable design system for the Frontier Tower visitor management system that balances professional functionality with aesthetic appeal.

## Design Philosophy

**Form Meets Beauty** - Every element serves a purpose while maintaining visual elegance.
**Consistent Visual Language** - Cohesive color schemes and spacing across all components.
**Modern Workspace Aesthetic** - Clean, contemporary design suitable for a tech-forward environment.
**Touch-Optimized Interfaces** - Designed for kiosk and tablet deployment with proper touch targets.
**Accessibility First** - High contrast, clear hierarchy, and inclusive design principles.

## Color System

### Primary Palette
```css
--ft-white: #FFFFFF           /* Pure backgrounds */
--ft-gray-50: #F9FAFB         /* Light backgrounds */
--ft-gray-100: #F3F4F6        /* Subtle backgrounds */
--ft-gray-200: #E5E7EB        /* Borders, dividers */
--ft-gray-300: #D1D5DB        /* Input borders */
--ft-gray-400: #9CA3AF        /* Placeholders */
--ft-gray-500: #6B7280        /* Secondary buttons */
--ft-gray-600: #4B5563        /* Secondary text */
--ft-gray-700: #374151        /* Labels, medium emphasis */
--ft-gray-800: #1F2937        /* Primary text, headings */
--ft-gray-900: #111827        /* High emphasis text */
```

### Accent Colors
```css
--ft-blue-50: #EFF6FF          /* Light blue backgrounds */
--ft-blue-500: #3B82F6        /* Primary actions, focus states */
--ft-blue-600: #2563EB        /* Primary buttons */
--ft-blue-700: #1D4ED8        /* Primary button hover */

--ft-purple: #6B46C1          /* Frontier brand (logo color) */

--ft-red-50: #FEF2F2          /* Light error backgrounds */
--ft-red-200: #FECACA         /* Error borders */
--ft-red-500: #EF4444         /* Error text */
--ft-red-600: #DC2626         /* Error buttons, critical actions */
--ft-red-700: #B91C1C         /* Error button hover */
--ft-red-800: #991B1B         /* Dark error text */

--ft-green-50: #F0FDF4        /* Success backgrounds */
--ft-green-200: #BBF7D0       /* Success borders */
--ft-green-500: #22C55E       /* Success icons */
--ft-green-800: #166534       /* Success text */

--ft-yellow-600: #D97706      /* Warning states */
```

## Typography Scale

### Font Stack
```css
--ft-font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif;
--ft-font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', Consolas, monospace;
```

### Type Scale
```css
--ft-text-xs: 0.75rem     /* 12px - Captions, helper text */
--ft-text-sm: 0.875rem    /* 14px - Secondary text, labels */
--ft-text-base: 1rem      /* 16px - Body text */
--ft-text-lg: 1.125rem    /* 18px - Large body text */
--ft-text-xl: 1.25rem     /* 20px - Subheadings */
--ft-text-2xl: 1.5rem     /* 24px - Card titles */
--ft-text-3xl: 1.875rem   /* 30px - Page headers */
--ft-text-4xl: 2.25rem    /* 36px - Display text */
```

### Typography Hierarchy
```css
/* Page Headers */
h1: text-2xl to text-4xl, font-bold, text-gray-800

/* Section Headers */
h2: text-lg to text-xl, font-semibold, text-gray-800

/* Labels */
label: text-sm, font-medium, text-gray-700

/* Body Text */
p: text-sm to text-base, text-gray-600

/* Helper Text */
.helper: text-xs, text-gray-500
```

## Spacing System

### 4px Base Grid
```css
--ft-space-1: 0.25rem     /* 4px */
--ft-space-2: 0.5rem      /* 8px */
--ft-space-3: 0.75rem     /* 12px */
--ft-space-4: 1rem        /* 16px */
--ft-space-5: 1.25rem     /* 20px */
--ft-space-6: 1.5rem      /* 24px */
--ft-space-8: 2rem        /* 32px */
--ft-space-10: 2.5rem     /* 40px */
--ft-space-12: 3rem       /* 48px */
--ft-space-16: 4rem       /* 64px */
```

## Component Specifications

### Buttons
```css
/* Primary Button */
.btn-primary {
  background: var(--ft-blue-600);
  color: var(--ft-white);
  padding: 8px 16px; /* py-2 px-4 */
  border-radius: 8px; /* rounded-lg */
  font-weight: 500; /* font-medium */
  font-size: 0.875rem; /* text-sm */
  border: none;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.btn-primary:hover {
  background: var(--ft-blue-700);
}

/* Secondary Button */
.btn-secondary {
  background: var(--ft-gray-500);
  color: var(--ft-white);
  /* Same padding and border-radius as primary */
}

.btn-secondary:hover {
  background: var(--ft-gray-600);
}

/* Destructive Button */
.btn-destructive {
  background: var(--ft-red-600);
  color: var(--ft-white);
}

.btn-destructive:hover {
  background: var(--ft-red-700);
}
```

### Form Elements
```css
/* Input Fields */
.input {
  background: var(--ft-white);
  border: 1px solid var(--ft-gray-300);
  border-radius: 8px; /* rounded-lg */
  padding: 12px; /* p-3 */
  font-size: 0.875rem; /* text-sm */
}

.input:focus {
  border-color: var(--ft-blue-500);
  outline: 2px solid var(--ft-blue-500);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--ft-blue-500);
}

/* Error State */
.input.error {
  border-color: var(--ft-red-500);
  box-shadow: 0 0 0 2px var(--ft-red-200);
}

/* Labels */
.label {
  font-weight: 500; /* font-medium */
  color: var(--ft-gray-700);
  font-size: 0.875rem; /* text-sm */
  margin-bottom: 8px; /* mb-2 */
}

/* Required Indicator */
.required {
  color: var(--ft-red-500);
}
```

### Cards & Containers
```css
/* Card Component */
.card {
  background: var(--ft-white);
  border: 1px solid var(--ft-gray-300);
  border-radius: 12px; /* rounded-lg */
  box-shadow: 
    0 1px 3px 0 rgb(0 0 0 / 0.1),
    0 1px 2px -1px rgb(0 0 0 / 0.1);
  padding: 24px; /* p-6 */
}

/* Modal/Dialog */
.modal {
  background: var(--ft-white);
  border: 1px solid var(--ft-gray-300);
  border-radius: 12px; /* rounded-lg */
  box-shadow: 
    0 20px 25px -5px rgb(0 0 0 / 0.1),
    0 8px 10px -6px rgb(0 0 0 / 0.1);
  max-width: 512px; /* max-w-lg */
  padding: 24px; /* p-6 */
}
```

### Status Indicators
```css
/* Success State */
.status-success {
  background: var(--ft-green-50);
  border: 1px solid var(--ft-green-200);
  border-radius: 8px; /* rounded-lg */
  color: var(--ft-green-800);
  padding: 16px; /* p-4 */
}

/* Error State */
.status-error {
  background: var(--ft-red-50);
  border: 1px solid var(--ft-red-200);
  border-radius: 8px; /* rounded-lg */
  color: var(--ft-red-800);
  padding: 16px; /* p-4 */
}

/* Warning State */
.status-warning {
  background: var(--ft-red-50);
  border: 1px solid var(--ft-red-200);
  border-radius: 8px; /* rounded-lg */
  color: var(--ft-red-800);
  padding: 16px; /* p-4 */
}

/* Info/Notice */
.status-info {
  background: var(--ft-blue-50);
  border-left: 4px solid var(--ft-blue-400);
  border-radius: 0 8px 8px 0; /* rounded-r-lg */
  color: var(--ft-blue-800);
  padding: 16px; /* p-4 */
}
```

### Loading States
```css
/* Spinner */
.spinner {
  width: 48px; /* w-12 */
  height: 48px; /* h-12 */
  border: 2px solid transparent;
  border-bottom: 2px solid var(--ft-blue-600);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Small Spinner */
.spinner-sm {
  width: 24px; /* w-6 */
  height: 24px; /* h-6 */
  border-width: 2px;
}
```

## Layout Principles

### Container Widths
- **Mobile**: 100% with 16px margins
- **Tablet**: 640px max-width, centered
- **Desktop**: 768px max-width, centered  
- **Kiosk**: 1024px max-width for touch interfaces

### Spacing Patterns
- **Card padding**: 24px (p-6)
- **Section spacing**: 32px (space-y-8)
- **Form field spacing**: 24px (space-y-6)
- **Button groups**: 12px gaps (gap-3)
- **Content margins**: 16px minimum on mobile

## Brand Elements

### Logo Usage
- **Primary**: Purple background (#6B46C1) with white "ft" text
- **Minimum size**: 48px height for touch interfaces
- **Clear space**: Minimum 16px on all sides
- **Monospace alternative**: For technical contexts

### Visual Hierarchy
- **Use soft shadows** for depth and layering
- **Rounded corners** for approachable, modern feel
- **Consistent spacing** for visual rhythm
- **Color coding** for functional states (success, error, warning)

## Animation & Interactions

### Micro-interactions
```css
/* Button Hover */
.btn {
  transition: all 0.15s ease-out;
}

/* Focus States */
.interactive:focus {
  outline: 2px solid var(--ft-blue-500);
  outline-offset: 2px;
}

/* Loading States */
.loading {
  opacity: 0.6;
  pointer-events: none;
}
```

### Animation Principles
- **Duration**: 150ms for micro-interactions
- **Easing**: ease-out for most transitions
- **Functional only**: All animations serve a purpose
- **Respect motion preferences**: Use `prefers-reduced-motion`

## Accessibility Standards

### Contrast Requirements
- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text**: Minimum 3:1 contrast ratio
- **Interactive elements**: Clear focus indicators

### Touch Targets
- **Minimum size**: 44px × 44px for touch interfaces
- **Spacing**: 8px minimum between touch targets
- **Clear boundaries**: Visible button areas

### Form Accessibility
- **Labels**: Always associated with form controls
- **Error states**: Clear visual and text indicators
- **Required fields**: Marked with asterisk and color
- **Helper text**: Descriptive placeholder and help text

## Implementation Guidelines

### CSS Custom Properties
```css
:root {
  /* Core colors */
  --ft-white: #ffffff;
  --ft-gray-50: #f9fafb;
  --ft-gray-100: #f3f4f6;
  --ft-gray-800: #1f2937;
  
  /* Brand colors */
  --ft-purple: #6b46c1;
  --ft-blue-500: #3b82f6;
  --ft-blue-600: #2563eb;
  
  /* Status colors */
  --ft-red-600: #dc2626;
  --ft-green-500: #22c55e;
  
  /* Typography */
  --ft-font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}
```

### Tailwind CSS Classes
The design system is implemented using Tailwind CSS utility classes:

```html
<!-- Primary Button -->
<button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">
  
<!-- Card -->
<div class="bg-white border border-gray-300 rounded-lg shadow-lg p-6">

<!-- Input -->
<input class="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500">

<!-- Error State -->
<div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
```

## Component Library

### Core Components
- **Button**: Primary, secondary, destructive variants
- **Input**: Text, password, with error states
- **Textarea**: Multi-line input with proper sizing
- **Card**: Container with shadow and border
- **Modal/Dialog**: Overlay component for critical actions
- **Alert/Status**: Success, error, warning, info states
- **Spinner**: Loading indicators in multiple sizes

### Design Tokens
All components use consistent design tokens for:
- **Colors**: Semantic color names (primary, error, success)
- **Spacing**: 4px base grid system
- **Typography**: Consistent font sizes and weights
- **Borders**: Consistent border radius and weights
- **Shadows**: Layered shadow system for depth

---

*This design system provides a foundation for building beautiful, accessible, and consistent interfaces for Frontier Tower's visitor management system. It balances professional functionality with modern aesthetic appeal, creating an interface that feels at home in a contemporary workspace environment.*