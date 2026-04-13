# Design System Documentation: The High-End Authentication Experience

## 1. Overview & Creative North Star
### Creative North Star: "The Serene Guardian"
Traditional authentication flows often feel like an interrogation—rigid, cold, and transactional. This design system rejects that clinical approach in favor of **The Serene Guardian**. This aesthetic balances the authoritative security of deep indigos with the inviting warmth of soft, layered surfaces.

To break the "template" look, we move away from centered, boxed-in layouts. Instead, we embrace **intentional asymmetry** and **editorial pacing**. Think of the UI as a high-end digital lobby: expansive whitespace, high-contrast typography scales, and overlapping elements that suggest depth and architectural intent. We are not just building a login form; we are designing a moment of transition that feels secure, premium, and effortless.

---

## 2. Colors
Our palette is rooted in a professional spectrum of deep blues and soft indigos, designed to evoke immediate trust.

*   **Primary Hub:** The `primary` (#4956b4) is our anchor. It should be used sparingly for high-impact actions. 
*   **Neutral Depth:** We utilize the `surface` and `surface-container` tokens to build a sophisticated environment.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders for sectioning or containment. Traditional lines create visual "noise" that cheapens the experience. Instead, define boundaries through background color shifts. A `surface-container-low` section sitting on a `surface` background creates a natural, soft-edge boundary that feels modern and expensive.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the `surface-container` tiers (Lowest to Highest) to create "nested" depth:
1.  **Base Layer:** `surface` (#fbf8fe)
2.  **Sectioning:** `surface-container-low` (#f5f2fb)
3.  **Interactive Elements/Cards:** `surface-container-lowest` (#ffffff) for maximum "pop" and clarity.

### The "Glass & Gradient" Rule
To add "soul" to the professional palette, use a subtle linear gradient for main CTAs, transitioning from `primary` (#4956b4) to `primary_container` (#8c99fc). For floating elements (like an "Experience Support" popover), apply **Glassmorphism**: use a semi-transparent `surface_container_lowest` with a `backdrop-blur` of 12px-20px to integrate the element into the environment.

---

## 3. Typography
We use **Manrope** across all levels. It is a crisp, modern sans-serif that balances geometric precision with a friendly, humanist touch.

*   **Display & Headline:** Use `display-md` (2.75rem) or `headline-lg` (2rem) for welcome messages. These should be set with tight tracking (-0.02em) to feel like a premium editorial header.
*   **Body & Labels:** Use `body-md` (0.875rem) for instructional text. The `label-md` (0.75rem) should be used for form labels, often set in All Caps with slightly increased letter-spacing (+0.05em) to convey an authoritative, organized feel.
*   **The Hierarchy Goal:** By pairing a large, bold `headline-sm` with a tiny, spaced-out `label-sm`, we create a "High-Contrast" hierarchy that signals luxury and intentionality.

---

## 4. Elevation & Depth
In this design system, depth is earned through **Tonal Layering**, not structural lines.

*   **The Layering Principle:** Achieve lift by stacking. A card using `surface-container-lowest` placed on a `surface-container` background creates a soft, natural elevation without the need for heavy shadows.
*   **Ambient Shadows:** When a floating effect is required (e.g., a focused input or a modal), use "Ambient Shadows." These must be extra-diffused. 
    *   *Specs:* Blur: 32px-64px, Opacity: 4%-6%.
    *   *Color:* Use a tinted version of `on-surface` (#31323b) to mimic natural light.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, it must be a "Ghost Border." Use the `outline-variant` (#b2b1bc) at **15% opacity**. Never use 100% opaque borders.
*   **Glassmorphism:** Use `surface-tint` at low opacities with high blur values for secondary floating containers to maintain a sense of "lightness."

---

## 5. Components

### Input Fields
*   **Structure:** No heavy containers. Use a "Ghost Border" or a subtle `surface-container-highest` background.
*   **Corners:** Use `md` (0.375rem) for a balance of "crisp" and "friendly."
*   **State:** On focus, the border should transition to a 1.5px `primary` line, but the background should remain clean.

### Buttons
*   **Primary:** A gradient from `primary` (#4956b4) to `primary_dim` (#3d4aa7). Roundedness: `md` (0.375rem).
*   **Secondary:** No background. Use `label-md` typography with the `primary` color.
*   **Sizing:** Generous vertical padding (12px-16px) to give the interaction a "grand" feel.

### Cards & Lists
*   **Strict Rule:** Forbid the use of divider lines.
*   **Separation:** Use vertical white space from the spacing scale (e.g., 24px or 32px) or a subtle shift from `surface-container-low` to `surface-container-high` to separate content blocks.

### Authentication Specific: The "Success" State
*   Instead of a simple checkmark, use a layered "Success Glass" component. Use `primary_container` with a backdrop blur and `on_primary_container` text to signal a secure, completed entry.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace Asymmetry:** Place the login form on the right 1/3 of the screen with a large, beautiful `headline-lg` statement on the left 2/3 for a true editorial feel.
*   **Use Subtle Micro-interactions:** Buttons should have a slight "lift" (soft ambient shadow) on hover, rather than just a color change.
*   **Respect the "Breathe" Room:** If you think there is enough whitespace, add 8px more. Premium design requires air.

### Don't:
*   **Don't use 100% Black:** Always use `on-surface` (#31323b) for text to maintain the soft, indigo-tinted professional atmosphere.
*   **Don't use standard "Alert Red":** Use our specific `error` (#a8364b) and `error_container` (#f97386) tokens for a more sophisticated, less alarming notification.
*   **Don't use "Full" Roundedness:** Avoid the pill shape (9999px) for buttons unless it's a small chip. Stick to `md` (0.375rem) or `lg` (0.5rem) to keep the "crisp" professional aesthetic.