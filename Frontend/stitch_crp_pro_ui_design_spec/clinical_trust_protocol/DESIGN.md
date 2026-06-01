---
name: Clinical Trust Protocol
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3e494a'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6e797a'
  outline-variant: '#bdc9ca'
  surface-tint: '#006972'
  primary: '#00626a'
  on-primary: '#ffffff'
  primary-container: '#0e7c86'
  on-primary-container: '#ddfbff'
  inverse-primary: '#7cd4df'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#6c23dd'
  on-tertiary: '#ffffff'
  tertiary-container: '#8646f7'
  on-tertiary-container: '#faf2ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#98f0fb'
  primary-fixed-dim: '#7cd4df'
  on-primary-fixed: '#001f23'
  on-primary-fixed-variant: '#004f56'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#eaddff'
  tertiary-fixed-dim: '#d2bbff'
  on-tertiary-fixed: '#25005a'
  on-tertiary-fixed-variant: '#5a00c6'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  max-width-content: 1280px
---

## Brand & Style
The design system is engineered for the high-stakes environment of clinical trials, prioritizing clarity, calm, and unwavering reliability. The brand personality is "Clinical Excellence"—it avoids unnecessary decoration in favor of functional precision that reduces cognitive load for both stressed patients and busy clinical staff.

The aesthetic follows a **Corporate / Modern** style with a focus on **Minimalism**. It utilizes expansive white space to create a "sterile but warm" environment, ensuring that critical medical data remains the focal point. Visual cues are deliberate and reassuring, using soft transitions and a systematic approach to information density to evoke an emotional response of security and professional oversight.

## Colors
The palette is rooted in "Medical Teal," a hue specifically chosen for its association with health, hygiene, and calm. This is supported by a functional spectrum of status colors that provide immediate, unambiguous feedback.

- **Primary (Medical Teal):** Used for primary actions, active navigation states, and brand reinforcement.
- **Secondary (Blue):** Reserved for interactive accents and high-priority information links.
- **Surface & Background:** A clean White (#FFFFFF) is used for content cards, while the Surface (#F8FAFC) provides a subtle contrast for the application background to reduce eye strain during long sessions.
- **Semantic Colors:** Status colors (Green, Red, Amber, Purple) must be used consistently to indicate trial eligibility and patient stages, always maintaining a 4.5:1 contrast ratio against their respective backgrounds.

## Typography
Inter is the sole typeface for this design system, chosen for its exceptional legibility in data-heavy interfaces and its neutral, systematic tone. 

The type scale emphasizes **Body-LG (18px)** for patient-facing content to ensure maximum readability for diverse demographics. For staff dashboards, **Body-MD (16px)** serves as the standard to allow for higher information density without sacrificing clarity. All labels use a medium weight to distinguish them from data values. Headlines are tight and assertive, using slight negative letter-spacing to maintain a modern, authoritative feel.

## Layout & Spacing
The design system employs a **Fluid Grid** for mobile patient views and a **Fixed Sidebar Shell** for desktop staff dashboards.

- **Staff Dashboard (Desktop):** Utilizes a 280px fixed left sidebar with a fluid content area. Internal content uses a 12-column grid with 24px gutters.
- **Patient View (Mobile-First):** Focuses on a single-column stack. Margins are set to 16px to maximize screen real estate while ensuring "touch-safe" zones of at least 44px for all interactive elements.
- **Spacing Logic:** All spacing is derived from a 4px base unit. Use `lg` (24px) for padding between logical sections and `md` (16px) for internal card padding.

## Elevation & Depth
Hierarchy is established through **Tonal Layers** supplemented by **Ambient Shadows**.

- **Level 0 (Background):** #F8FAFC. The base layer for the entire application.
- **Level 1 (Cards/Surface):** #FFFFFF. Used for primary content containers. These use a very soft, diffused shadow (0px 4px 12px rgba(15, 23, 42, 0.05)) to appear slightly lifted from the background.
- **Level 2 (Modals/Popovers):** Higher elevation with a more pronounced shadow (0px 12px 24px rgba(15, 23, 42, 0.1)) to focus user attention and indicate temporary interaction.
- **Outlines:** Use a 1px border (#E2E8F0) on Level 1 elements to define boundaries in high-glare environments, ensuring structural clarity even if shadows are not rendered clearly on lower-end displays.

## Shapes
The shape language is **Soft**, striking a balance between the precision of clinical software and the approachability of a patient-centric tool.

- **Standard Radius:** 8px (0.5rem) is the default for all cards, input fields, and primary containers.
- **Large Radius:** 12px (0.75rem) is used for larger layout containers or feature sections.
- **Full Radius (Pill):** Reserved exclusively for status badges, tags, and search bars to distinguish them from primary action buttons.

## Components
Consistent component behavior is vital for maintaining the "Trustworthy" brand pillar.

- **Buttons:** Primary buttons use the Medical Teal background with White text. Hover states should darken the teal by 10%. Secondary buttons use a Teal outline with a transparent background.
- **Status Badges:** Always pill-shaped. They use a "Subtle-Fill" pattern: a light background version of the status color (e.g., 10% opacity) with high-contrast bold text of the same hue.
- **Input Fields:** 8px rounded corners with a 1px border (#CBD5E1). On focus, the border transitions to Primary Teal with a 2px soft glow. Every field must be accompanied by a top-aligned `label-md`.
- **Cards:** White background, 8px radius, and Level 1 shadow. Cards should include a consistent header section with 16px bottom padding to separate titles from content.
- **Lists:** Data rows should have a minimum height of 56px to ensure generous touch targets. Use subtle dividers (#F1F5F9) rather than heavy borders.
- **Progress Indicators:** Linear stepped progress bars for multi-stage patient enrollment to reduce anxiety by showing the "end of the tunnel."