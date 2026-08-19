---
version: "alpha"
name: "Aether - Quantum Compute Architectures"
description: "Aether Quantum Dashboard Section is designed for demonstrating application workflows and interface hierarchy. Key features include clear information density, modular panels, and interface rhythm. It is suitable for product showcases, admin panels, and analytics experiences."
colors:
  primary: "#4B67A0"
  secondary: "#FFFFFF"
  tertiary: "#6D47AE"
  neutral: "#FFFFFF"
  background: "#FFFFFF"
  surface: "#000000"
  text-primary: "#FFFFFF"
  text-secondary: "#000000"
  border: "#E5E7EB"
  accent: "#4B67A0"
typography:
  display-lg:
    fontFamily: "Geist"
    fontSize: "80px"
    fontWeight: 300
    lineHeight: "84px"
    letterSpacing: "-0.05em"
  body-md:
    fontFamily: "Geist"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
rounded:
  md: "0px"
spacing:
  base: "4px"
  sm: "2px"
  md: "4px"
  lg: "6px"
  xl: "8px"
  gap: "8px"
  card-padding: "12px"
  section-padding: "24px"
components:
  button-link:
    textColor: "{colors.secondary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "0px"
---

## Overview

- **Composition cues:**
  - Layout: Flex
  - Content Width: Full Bleed
  - Framing: Open
  - Grid: Minimal

## Colors

The color system uses dark mode with #4B67A0 as the main accent and #FFFFFF as the neutral foundation.

- **Primary (#4B67A0):** Main accent and emphasis color.
- **Secondary (#FFFFFF):** Supporting accent for secondary emphasis.
- **Tertiary (#6D47AE):** Reserved accent for supporting contrast moments.
- **Neutral (#FFFFFF):** Neutral foundation for backgrounds, surfaces, and supporting chrome.

- **Usage:** Background: #FFFFFF; Surface: #000000; Text Primary: #FFFFFF; Text Secondary: #000000; Border: #E5E7EB; Accent: #4B67A0

## Typography

Typography relies on Geist across display, body, and utility text.

- **Display (`display-lg`):** Geist, 80px, weight 300, line-height 84px, letter-spacing -0.05em.
- **Body (`body-md`):** Geist, 14px, weight 500, line-height 20px.

## Layout

Layout follows a flex composition with reusable spacing tokens. Preserve the flex, full bleed structural frame before changing ornament or component styling. Use 4px as the base rhythm and let larger gaps step up from that cadence instead of introducing unrelated spacing values.

Treat the page as a flex / full bleed composition, and keep that framing stable when adding or remixing sections.

- **Layout type:** Flex
- **Content width:** Full Bleed
- **Base unit:** 4px
- **Scale:** 2px, 4px, 6px, 8px, 12px, 16px, 20px, 24px
- **Section padding:** 24px, 48px, 52px, 96px
- **Card padding:** 12px
- **Gaps:** 8px, 24px, 32px

## Elevation & Depth

Depth is communicated through elevated, border contrast, and reusable shadow or blur treatments. Keep those recipes consistent across hero panels, cards, and controls so the page reads as one material system.

Surfaces should read as elevated first, with borders, shadows, and blur only reinforcing that material choice.

- **Surface style:** Elevated
- **Borders:** 0.67px #FFFFFF; 0.67px #E5E7EB
- **Shadows:** rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 2px 4px 0px inset; rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px; rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px

### Techniques
- **Gradient border shell:** Use a thin gradient border shell around the main card. Wrap the surface in an outer shell with 4px padding and a 6px radius. Drive the shell with none so the edge reads like premium depth instead of a flat stroke. Keep the actual stroke understated so the gradient shell remains the hero edge treatment. Inset the real content surface inside the wrapper with a slightly smaller radius so the gradient only appears as a hairline frame.

## Shapes

Shapes rely on a tight radius system anchored by 2px and scaled across cards, buttons, and supporting surfaces. Icon geometry should stay compatible with that soft-to-controlled silhouette.

Use the radius family intentionally: larger surfaces can open up, but controls and badges should stay within the same rounded DNA instead of inventing sharper or pill-only exceptions.

- **Corner radii:** 2px, 3px, 4px, 6px, 9999px
- **Icon treatment:** Linear
- **Icon sets:** Solar

## Components

Anchor interactions to the detected button styles.

### Buttons
- **Links:** text #FFFFFF, radius 0px, padding 0px, border 0px solid rgb(229, 231, 235).

### Iconography
- **Treatment:** Linear.
- **Sets:** Solar.

## Do's and Don'ts

Use these constraints to keep future generations aligned with the current system instead of drifting into adjacent styles.

### Do
- Do use the primary palette as the main accent for emphasis and action states.
- Do keep spacing aligned to the detected 4px rhythm.
- Do reuse the Elevated surface treatment consistently across cards and controls.
- Do keep corner radii within the detected 2px, 3px, 4px, 6px, 9999px family.

### Don't
- Don't introduce extra accent colors outside the core palette roles unless the page needs a new semantic state.
- Don't mix unrelated shadow or blur recipes that break the current depth system.
- Don't exceed the detected moderate motion intensity without a deliberate reason.

## Motion

Motion feels controlled and interface-led across text, layout, and section transitions. Timing clusters around 150ms and 300ms. Easing favors ease and cubic-bezier(0.4. Hover behavior focuses on text and opacity changes. Scroll choreography uses GSAP ScrollTrigger for section reveals and pacing.

**Motion Level:** moderate

**Durations:** 150ms, 300ms

**Easings:** ease, cubic-bezier(0.4, 0, 0.2, 1)

**Hover Patterns:** text, opacity, shadow

**Scroll Patterns:** gsap-scrolltrigger
