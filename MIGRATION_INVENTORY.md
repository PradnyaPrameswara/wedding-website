# Migration inventory

## Routes

- `/` home wedding landing page.
- `/blog/how-we-met-knew-it-was-different/` and `/blog/our-favorite-engagement-photos/` blog detail pages.
- `/blog/demo@mail.com/` and `/blog/(2346)-123-4567/` exported CMS/contact artifacts.
- `/admin-page/licenses/`, `/admin-page/styleguide/`, `/admin-page/change-log/` utility pages.

## Shared implementation

- `src/layouts/SourceLayout.astro`: document shell, metadata, favicon, global CSS, and shared browser script.
- `src/lib/source-page.ts`: typed source-body loader, local CDN asset rewriting, inline animation-style removal, and script removal.
- `src/components/interactive/MobileNavigation.tsx`: only hydrated React surface; local `useState`, no effects.
- `src/components/ui/button.tsx`: shadcn-style CVA button primitive.
- `public/scripts/site.js`: IntersectionObserver/scroll fallback reveals, native sliders, hover-compatible form behavior.
- `public/assets`: original visual assets, including CSS backgrounds `shap.svg` and `rsvp-bg.avif`.
- `public/fonts`: exact original Allura, Gilda Display, and Inter Tight files.

## RSVP Section Inventory

- Route: `/` only; source order is after `.event` and before `.gift-registry`.
- Original selectors: `#rsvp`, `.rsvp-wrap`, `.rsvp`, `.esvp-row`, `.rsvp-form-wrap`, `.rsvp-form-top`, `.cta-form-wrap-two`, `.cta-form`, `.input-wrap`, `.cta-form-input.three`, `.rsvp-item-wrap`, `.rsvp-btn-wrap`, `.message`, `.success-message-2`, and `.error-msg`.
- Astro ownership: the existing `SourceLayout` source-body loader preserves this original static markup; no duplicate RSVP component was introduced.
- Fields: `name`, `email`, `field` (1–4 guests), `What-Will-You-Be-Attending`, `Meal-Preferences`, and `Submit RSVP`.
- Assets: `.rsvp` uses `6976f56fd413908ad411638a_rsvp-bg.avif`; `.rsvp-logo` uses the original `sa-02.avif`; `.btn-bg` remains the original button asset.
- Responsive source contract: 375px `rsvp` 375×746 with a 355×626 form; 640px 640×700 with a 600×674 form; 768px 922×750 with a 660×736 form; 1024px and wider 889px RSVP height with a 660×761 form. Fresh original/migrated geometry is recorded in `artifacts/comparisons/rsvp/geometry.json`.
- Typography contract: form controls use Inter Tight, weight 400; 16px/24.8px below 768px and 18px/27.9px from 768px upward. The heading uses Gilda Display, source h2 token values, weight 400.
- Interaction: native required-field/email validation and submit class behavior are retained. Webflow’s remote form runtime is not shipped; no successful network submission is claimed.
- Animation: RSVP has no source `data-w-id` reveal target. The surrounding page retains the shared reveal system, reduced-motion behavior, and source hover treatment for the button artwork.
- Diagnosis: the reported missing RSVP column was stale in this checkout. The section already existed in the source-body loader and built HTML; the correction was baseline-fixture asset/CSS routing plus browser regression coverage, not duplicate markup.

## Animation inventory

| Route | Target | Trigger | Initial state | Final state | Duration/easing | Mobile | Reduced motion |
|---|---|---|---|---|---|---|---|
| `/` and shared pages | `[data-w-id]` content | IntersectionObserver plus scroll fallback | opacity 0, translateY(100px) | opacity 1, transform none | 1000ms, cubic-bezier outQuart approximation; source delays mapped per IX2 id | Same observer; source breakpoints remain | Immediate visible state; no transition |
| `/` | Hero CTA `.btn-bg` | Hover/focus-within | rotateX(0deg) | rotateX(180deg) | 500ms ease | Same | Reduced-motion transition disabled |
| `/` | Footer testimonial images | Scroll reveal state | source IX2 offsets retained in inventory; local base transforms | centered with source rotations | 500ms ease | Same CSS state | Reduced-motion transition disabled |
| `/` | `.w-slider` instances | Arrow, dot, keyboard, pointer swipe, autoplay | first slide | selected slide | source `data-duration=500`, `data-delay=4000`, ease | Native slider is active at source mobile slider widths | Autoplay disabled |
| all routes | Mobile navigation | Button click | closed, opacity 0, translated -8px | open, opacity 1, translated 0 | 500ms ease | Only shown below 991px | Reduced-motion transition disabled |
| source-only reference | Story `a-2` page-frame action | Scroll progress | x 0vw | x -120vw at source keyframe 60 | source action duration 500 | Not yet reproduced | N/A |
| source-only reference | Footer `a-3` image action | Scroll/IX2 action | per-image x offsets | x 0 with source rotations | source duration 500 | Not yet independently asserted | N/A |

## Breakpoints

- Source breakpoints: 479px, 767px, 991px, 1440px, 1920px.
- Source container widths: `.container` 1333px, `.container.two` 1812px, `.container.three` 1108px, `.container.four` 1808px.
- Browser capture widths: 375px, 640px, 768px, 1024px, 1280px, 1440px, 1920px.

## Risks

- `audit-webflow.css` remains a compatibility layer and is not yet decomposed into component-owned Tailwind styles.
- Full Webflow IX2 `a-2` continuous scroll and exact runtime timing are documented but not fully reproduced.
- There is no committed Git metadata in this mounted checkout, so Git diff validation is unavailable.
