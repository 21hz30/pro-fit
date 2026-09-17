---
name: Pro-fit Athletic Architecture
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#444650'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#757682'
  outline-variant: '#c5c6d2'
  surface-tint: '#435b9f'
  primary: '#00113a'
  on-primary: '#ffffff'
  primary-container: '#002366'
  on-primary-container: '#758dd5'
  inverse-primary: '#b3c5ff'
  secondary: '#af2800'
  on-secondary: '#ffffff'
  secondary-container: '#db3400'
  on-secondary-container: '#fffbff'
  tertiary: '#131515'
  on-tertiary: '#ffffff'
  tertiary-container: '#272929'
  on-tertiary-container: '#8f9090'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#00174a'
  on-primary-fixed-variant: '#2a4386'
  secondary-fixed: '#ffdad2'
  secondary-fixed-dim: '#ffb4a2'
  on-secondary-fixed: '#3c0700'
  on-secondary-fixed-variant: '#891d00'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 72px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.1'
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.1em
  mono-data:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.0'
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  grid-margin: 32px
  grid-gutter: 24px
  border-width: 2px
---

## Brand & Style

The design system is rooted in the "Athletic Architecture" philosophy—a fusion of **Neo-Brutalism** and **Bauhaus** principles. It targets high-performance athletes and fitness professionals who value precision, structural integrity, and clarity over decorative fluff.

The emotional response should be one of **ordered energy**. The UI uses heavy strokes, rigid geometry, and intentional asymmetry to create a sense of movement and "unbreakable" strength. By stripping away soft shadows and gradients in favor of raw borders and flat planes, the interface mirrors the physical environment of a high-end, functional training facility: industrial, purposeful, and high-contrast.

## Colors

This design system utilizes a high-contrast palette to drive focus and urgency. 

- **Primary (Deep Blue):** Used for structural elements, primary branding, and "heavy" UI components like headers and sidebars. It represents stability and professional depth.
- **Secondary (Kinetic Orange):** An aggressive, high-visibility accent used exclusively for primary actions (CTAs), active states, and critical performance alerts.
- **Surface (Canvas):** A stark white (#FFFFFF) or very light grey (#F0F0F0) background to ensure maximum legibility for data-heavy views.
- **Ink (Neutral):** A deep charcoal (#1A1A1A) used for typography and the mandatory 2px or 3px borders that define the Neo-Brutalist aesthetic.

## Typography

The typography is powered exclusively by **Space Grotesk**. Its geometric quirks and technical feel align perfectly with the Bauhaus aesthetic.

- **Headlines:** Use tight tracking and heavy weights. For Display and H1 levels, utilize "optical kerning" to make characters feel physically locked together.
- **Body:** Maintain generous line height (1.5–1.6) to offset the technical rigidity of the typeface, ensuring long-form workout descriptions remain readable.
- **Data Points:** Use the medium weight for numerical values (reps, sets, weight) to give them a distinct visual "thump" against descriptive text.
- **Case Usage:** Use All-Caps for labels and category tags to reinforce the structural, architectural feel.

## Layout & Spacing

The layout is governed by a **strict 12-column fixed-fluid hybrid grid**. 

- **The Hard Edge:** Every container must align to the grid. In place of soft padding, use explicit "border-boxes."
- **Rhythm:** All spacing follows a base-4 scale. Gutters are kept wide (24px) to allow the heavy borders of components "room to breathe" without visual clutter.
- **Mobile Adaptivity:** On mobile devices, the 12-column grid collapses to a 4-column layout. Margins shrink to 16px, but the border-width remains constant at 2px to maintain the "sturdy" brand feel.
- **Composition:** Avoid centered layouts. Use left-aligned, asymmetrical compositions to create a sense of forward momentum.

## Elevation & Depth

This design system rejects traditional shadows. Depth is achieved through **Hard-Edge Offsets** (Neo-Brutalism):

1.  **Level 0 (Floor):** The base background color.
2.  **Level 1 (Card/Surface):** Flat white surface with a 2px solid Deep Blue border. No shadow.
3.  **Level 2 (Interaction):** When hovered or active, elements "lift" by showing a solid color offset—a 4px or 8px block shadow of the Secondary color (#FF3E00) or Primary color (#002366) behind the element.
4.  **Tonal Stacking:** Use the Primary Deep Blue as a background for "Heavy" sections (like a sidebar), placing white-bordered cards on top to create immediate visual hierarchy.

## Shapes

The shape language is strictly **Geometric and Sharp (0px)**. 

- **Hard Corners:** No border-radius is permitted. This reinforces the "architectural" and "engineered" feel of the fitness app.
- **Strict Geometry:** Use 45-degree or 90-degree angles for any decorative flourishes.
- **The "Punch-Out":** Icons and graphical elements should be encased in square or rectangular containers with thick borders, rather than floating freely.

## Components

- **Buttons:** Rectangular with a 2px Deep Blue border. Primary buttons use the Kinetic Orange background with white text. On hover, the button shifts -4px horizontally and -4px vertically, revealing a solid Deep Blue "shadow" block underneath.
- **Input Fields:** Stark white background, 2px Deep Blue border. Labels are always All-Caps and positioned outside/above the field. Focus state changes the border color to Kinetic Orange.
- **Cards:** White containers with a 2px Deep Blue border. Use a "Header" strip in Deep Blue for card titles to create strong vertical separation.
- **Chips/Tags:** Small rectangular boxes with a 1px border. No rounded corners. Status chips (e.g., "Complete") use high-contrast fills like Deep Blue with White text.
- **Progress Bars:** Dual-tone blocks. The background is a light grey box, and the progress fill is a solid Kinetic Orange block. No rounded caps or gradients.
- **Data Lists:** Use heavy horizontal rules (2px) between items. Avoid vertical lines within lists unless necessary for complex data tables.