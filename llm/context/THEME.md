# Visibible Design System

A restrained, native-like design system optimized for web-first development with future mobile portability.

## Philosophy

- Typography-first, minimal decoration
- Restrained neutral palette with one accent color
- Mobile-first layout that scales to desktop
- 44px minimum touch targets
- Gentle, purposeful motion

---

## Design Tokens

### Colors

```
background        #ffffff / #0a0a0a (dark)
surface           #f5f5f5 / #171717 (dark)
foreground        #171717 / #ededed (dark)
muted             #737373 / #a3a3a3 (dark)
divider           #e5e5e5 / #262626 (dark)
accent            #2563eb (blue-600)
accent-hover      #1d4ed8 (blue-700)
accent-text       #ffffff
error             #dc2626
success           #16a34a
```

### Spacing

Use 4px base unit with consistent steps:

```
--space-xs    4px
--space-sm    8px
--space-md    16px
--space-lg    24px
--space-xl    32px
--space-2xl   48px
```

### Typography

Two fonts only: Geist Sans (body) + Geist Mono (code).

Font size tokens (CSS variables):
```
--text-title-lg   24px
--text-title      20px
--text-body       16px
--text-body-sm    14px
--text-caption    12px
```

Recommended pairings (not tokenized - apply via Tailwind classes):
```
title-lg    24px / font-bold (700) / leading-tight (1.2)
title       20px / font-semibold (600) / leading-snug (1.3)
body        16px / font-normal (400) / leading-normal (1.5)
body-sm     14px / font-normal (400) / leading-normal (1.5)
caption     12px / font-normal (400) / leading-snug (1.4)
```

### Border Radius

```
--radius-sm    6px
--radius-md    12px
--radius-lg    16px
--radius-full  9999px (pills, avatars)
```

### Shadows

Use sparingly. Flat by default.

```
--shadow-sm    0 1px 2px rgba(0,0,0,0.05)
--shadow-md    0 4px 12px rgba(0,0,0,0.08)
```

### Motion

Fast and gentle. Animate position/opacity only.

```
--motion-fast    150ms ease-out
--motion-base    200ms ease-out
```

---

## Layout Principles

### Mobile-First Structure

```
┌─────────────────────┐
│    Title Bar        │  ← Sticky, 56px height
├─────────────────────┤
│                     │
│    Content          │  ← Scrollable, single column
│                     │
├─────────────────────┤
│    Action Bar       │  ← Optional sticky bottom
└─────────────────────┘
```

### Desktop Split View (768px+)

```
┌──────────┬──────────────────┐
│          │                  │
│   List   │     Detail       │
│  (320px) │    (flex-1)      │
│          │                  │
└──────────┴──────────────────┘
```

### Safe Areas

- Top bar: 56px sticky header
- Bottom bar: 64px for primary actions/navigation
- Content padding: 16px horizontal (mobile), 24px (desktop)

---

## Component Patterns

### Buttons

Three tiers with clear states:

| Type      | Style                          | Use Case           |
|-----------|--------------------------------|--------------------|
| Primary   | Accent bg, white text, rounded | Main actions       |
| Secondary | Border, text color, rounded    | Alternative actions|
| Tertiary  | Text only, no border           | Cancel, dismiss    |

States: default, hover, pressed (scale 0.98), disabled (50% opacity), loading (spinner).

### Form Inputs

- Height: 44px minimum
- Border: 1px divider color
- Focus: 2px accent ring
- Validation: inline error text below, red border on error
- Placeholder: muted color, helpful text

### Lists (Grouped)

iOS Settings-style grouped sections:

```
┌─────────────────────────────┐
│ SECTION HEADER              │  ← Caption, muted, uppercase
├─────────────────────────────┤
│ Row item                  → │  ← 44px min height
├─────────────────────────────┤
│ Row item                  → │
└─────────────────────────────┘
```

- Hairline dividers (1px, divider color)
- Chevron for navigation rows
- Padding: 16px horizontal

### Navigation

**Tab Bar** (3-5 items max):
- 64px height
- Icon + label for each
- Accent color for active state

**Title Bar**:
- 56px height
- Back button left, title center, action right
- Large title variant: 32px title that shrinks on scroll

### Modals & Sheets

- **Bottom Sheet** (mobile): slides up, rounded top corners, drag handle
- **Dialog** (desktop): centered, max-width 480px, subtle shadow
- Backdrop: black 50% opacity
- Motion: 200ms ease-out

### Toasts

- Bottom center, 16px from edge
- Auto-dismiss 3-4 seconds
- Icon + short message
- Non-blocking

### Loading States

Prefer skeleton loaders over spinners:

```
┌─────────────────────────────┐
│ ████████████                │  ← Pulsing gray bars
│ ██████████████████          │
│ ██████████                  │
└─────────────────────────────┘
```

---

## Accessibility

- Touch targets: 44x44px minimum
- Focus visible: 2px accent ring
- Color contrast: 4.5:1 minimum for text
- No hover-only interactions
- Reduced motion: respect `prefers-reduced-motion`

---

## Icons

We use **Lucide React** (`lucide-react`) for icons.

- Style: Simple outline, 1.5-2px stroke (matches Lucide's default)
- Size: 20px (inline), 24px (standalone)
- Color: Inherit from text via `currentColor`
- Always pair with labels for primary actions

### Usage

```tsx
import { ChevronLeft, Search, Send } from "lucide-react";

// Inline icon (20px)
<ChevronLeft size={20} strokeWidth={1.5} />

// Standalone icon (24px)
<Search size={24} strokeWidth={1.5} />

// With custom stroke
<Send size={20} strokeWidth={2} />
```

### Common Icons

| Purpose | Icon |
|---------|------|
| Navigation back | `ChevronLeft` |
| Navigation forward | `ChevronRight` |
| Expand/collapse | `ChevronUp`, `ChevronDown` |
| Search | `Search` |
| Book navigation | `BookOpen` |
| Send message | `Send` |
| Info | `Info` |
| Loading | `Loader2` (with `animate-spin`) |

---

## Anti-Patterns (Avoid)

- Heavy gradients or patterns
- Multiple accent colors
- Decorative typography
- Bouncy/playful animations
- Hover-only interactions
- Tiny touch targets
- Dense information layouts

---

## Tailwind Integration

Tokens are defined as CSS custom properties in `src/app/globals.css` and bridged to Tailwind via `@theme inline` (Tailwind v4). There is no `tailwind.config.js` file.

See `llm/implementation/THEME_IMPLEMENTATION.md` for component patterns and usage examples.
