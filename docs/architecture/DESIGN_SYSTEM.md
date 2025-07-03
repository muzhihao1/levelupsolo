# LevelUp Solo Design System

## Overview
A comprehensive design system for LevelUp Solo that ensures consistent visual identity and user experience across all components and pages.

## Color Palette

### Primary Colors
- **Primary Blue-Purple**: `#6366F1` (HSL: 250 84% 54%)
  - Used for primary actions, focus states, and brand elements
- **Accent Purple**: `#8B5CF6` (HSL: 263 70% 50%)
  - Used for secondary actions, highlights, and complementary elements

### Grayscale Neutrals
- **White**: `#FFFFFF` - Background, cards
- **Gray 50**: `#F8FAFC` - Light backgrounds, muted areas
- **Gray 100**: `#F1F5F9` - Subtle backgrounds
- **Gray 200**: `#E2E8F0` - Borders, dividers
- **Gray 300**: `#CBD5E1` - Disabled states
- **Gray 400**: `#94A3B8` - Placeholder text
- **Gray 500**: `#64748B` - Secondary text
- **Gray 600**: `#475569` - Body text
- **Gray 700**: `#334155` - Headings
- **Gray 800**: `#1E293B` - Primary text (light mode)
- **Gray 900**: `#0F172A` - Dark backgrounds

### Semantic Colors
- **Success**: `#10B981` - Success states, confirmations
- **Warning**: `#F59E0B` - Warnings, cautions
- **Danger**: `#EF4444` - Errors, destructive actions
- **Info**: `#06B6D4` - Information, neutral alerts

## Typography

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### Type Scale
- **5xl**: 48px (3rem) - Hero headings
- **4xl**: 36px (2.25rem) - Page headings (H1)
- **3xl**: 30px (1.875rem) - Section headings (H2)
- **2xl**: 24px (1.5rem) - Subsection headings (H3)
- **xl**: 20px (1.25rem) - Card titles (H4)
- **lg**: 18px (1.125rem) - Large body text (H5)
- **base**: 16px (1rem) - Body text (H6, p)
- **sm**: 14px (0.875rem) - Small text, captions
- **xs**: 12px (0.75rem) - Labels, metadata

### Font Weights
- **Normal**: 400 - Body text
- **Medium**: 500 - Buttons, emphasis
- **Semibold**: 600 - Headings, labels
- **Bold**: 700 - Major headings

### Line Heights
- **Tight**: 1.2 - Large headings
- **Normal**: 1.5 - Headings
- **Relaxed**: 1.6 - Body text

## Spacing Scale
Based on 4px grid system:
- **1**: 4px - Tight spacing
- **2**: 8px - Small spacing
- **3**: 12px - Medium spacing
- **4**: 16px - Standard spacing
- **6**: 24px - Large spacing
- **8**: 32px - Extra large spacing
- **12**: 48px - Section spacing
- **16**: 64px - Page spacing
- **20**: 80px - Large sections
- **24**: 96px - Major sections

## Border Radius
- **Small**: 8px - Inputs, small buttons
- **Base**: 12px - Cards, buttons
- **Large**: 16px - Large cards
- **XL**: 24px - Hero elements
- **Full**: 9999px - Pills, avatars

## Shadows
- **Small**: Subtle elevation for inputs
- **Base**: Standard card elevation
- **Medium**: Elevated cards, dropdowns
- **Large**: Modals, major elevations
- **XL**: Maximum elevation for overlays

## Component Standards

### Buttons

#### Primary Button
```css
background: linear-gradient(135deg, #6A0DAD 0%, #9370DB 100%);
color: white;
padding: 12px 16px;
border-radius: 12px;
font-size: 14px;
font-weight: 500;
box-shadow: 0 1px 3px rgba(0,0,0,0.1);
```

#### Secondary Button
```css
background: #F8FAFC;
color: #1E293B;
border: 1px solid #E2E8F0;
padding: 12px 16px;
border-radius: 12px;
font-size: 14px;
font-weight: 500;
box-shadow: 0 1px 2px rgba(0,0,0,0.05);
```

#### Ghost Button
```css
background: transparent;
color: #334155;
border: 1px solid transparent;
padding: 12px 16px;
border-radius: 12px;
font-size: 14px;
font-weight: 500;
```

### Cards
```css
background: white;
border: 1px solid #E2E8F0;
border-radius: 12px;
box-shadow: 0 1px 2px rgba(0,0,0,0.05);
padding: 24px;
```

### Form Inputs
```css
background: white;
border: 1px solid #E2E8F0;
border-radius: 8px;
padding: 12px;
font-size: 14px;
color: #1E293B;
```

#### Focus State
```css
border-color: #6A0DAD;
box-shadow: 0 0 0 3px rgba(106, 13, 173, 0.1);
outline: none;
```

## Dark Mode Support
All components support dark mode with appropriate color variations:
- Backgrounds shift to dark grays
- Text inverts to light colors
- Borders adjust to appropriate contrast
- Primary and accent colors remain consistent

## Usage Guidelines

### Do's
- Use the primary purple for main actions and brand elements
- Apply consistent spacing using the 4px grid system
- Use appropriate typography hierarchy for content structure
- Maintain consistent border radius across similar components
- Apply proper shadow elevation for visual hierarchy

### Don'ts
- Don't use colors outside the defined palette
- Don't use arbitrary spacing values
- Don't mix different border radius values on similar components
- Don't ignore the typography scale for headings and body text
- Don't use inconsistent button styles for similar actions

## Implementation
All design tokens are implemented in:
- `client/src/index.css` - CSS custom properties
- `client/src/lib/design-tokens.ts` - JavaScript/TypeScript constants
- Tailwind CSS configuration for utility classes