# Visual parity report

## Test servers

- Original fixture: `http://127.0.0.1:4323/index.html`, served from `tests/fixtures/original/`.
- Migrated Astro: `http://localhost:4321/`, served by the Astro dev server.
- The user's browser-facing `localhost:4321` now serves the migrated application; the original fixture is isolated on `:4323` for comparison.

## Screenshot evidence

Full-page pairs were captured for all 8 routes at 375, 640, 768, 1024, 1280, 1440, and 1920px: 56 original + 56 migrated images. Locations:

- `artifacts/original/<route>/<width>/full-page.png`
- `artifacts/migrated/<route>/<width>/full-page.png`
- `artifacts/comparisons/geometry.json`
- `artifacts/validation/explicit-home-rsvp-1440.png`
- `artifacts/live/astro-4321-rsvp-viewport-1440.png`

No numeric pixel-diff threshold is claimed. `MINOR DIFFERENCE` means capture evidence exists, but exact pixel equality or continuous animation timing is not proven.

## Section comparison inventory

| Route | Section | Original selector | Astro owner | Typography | Geometry | Animation | Responsive | Status |
|---|---|---|---|---|---|---|---|---|
| `/` | Header | `.header`, `.navbar-2` | `HomePage.astro` + `MobileNavigation.tsx` | local font roles retained | source contract retained | native menu transition | source breakpoint retained | MINOR DIFFERENCE |
| `/` | Hero | `.hero` | `HomePage.astro` | Gilda/Inter Tight tokens retained | source-derived layout retained | reveal + CTA hover | source breakpoints retained | MINOR DIFFERENCE |
| `/` | Couple/story sliders | `.w-slider` | `HomePage.astro` + `site.js` | source roles retained | native track contract | arrows/dots/swipe/autoplay | mobile slider initialized | MINOR DIFFERENCE |
| `/` | Countdown → event | `.counter` → `.event` | `HomePage.astro` | computed typography checked | order preserved | page-frame/native reveal | source breakpoints retained | PASS structure |
| `/` | RSVP | `#rsvp`, `.rsvp` | `HomePage.astro` | fonts and Inter Tight weight 300 checked | visible, non-zero panel and fields | native form/reveal contract | all required widths captured | PASS runtime |
| `/` | Registry/blog/footer | `.gift-registry`, `.blog-02`, `.footer` | `HomePage.astro` | local roles retained | source-derived layout | native reveal/slider hooks | source breakpoints retained | MINOR DIFFERENCE |
| `/blog/*` | Detail content | `.blog-single` | route page component | local roles retained | source layout retained | shared reveal | source breakpoints retained | MINOR DIFFERENCE |
| `/admin-page/*` | Utility pages | page-specific source selectors | route page component | local roles retained | source layout retained | no material custom interaction | source breakpoints retained | PASS route smoke |

## Route × viewport capture status

| Route | 375 | 640 | 768 | 1024 | 1280 | 1440 | 1920 |
|---|---|---|---|---|---|---|---|
| `/` | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE |
| `/blog/how-we-met-knew-it-was-different/` | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE |
| `/blog/our-favorite-engagement-photos/` | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE |
| `/blog/demo@mail.com/` | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE |
| `/blog/(2346)-123-4567/` | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE |
| `/admin-page/licenses/` | PASS route smoke | PASS route smoke | PASS route smoke | PASS route smoke | PASS route smoke | PASS route smoke | PASS route smoke |
| `/admin-page/styleguide/` | PASS route smoke | PASS route smoke | PASS route smoke | PASS route smoke | PASS route smoke | PASS route smoke | PASS route smoke |
| `/admin-page/change-log/` | PASS route smoke | PASS route smoke | PASS route smoke | PASS route smoke | PASS route smoke | PASS route smoke | PASS route smoke |

## Runtime evidence

- RSVP Playwright test: PASS. `toBeVisible`, attached, width >300, height >300, visible ancestors, opacity >0, full content, and fresh screenshot all pass.
- Live typography comparison: PASS for navigation, story label, event time/title/text, including Inter Tight weight 300 in migrated output.
- Explicit architecture test: PASS for all 8 routes and the running RSVP section.
- Full screenshot matrix: PASS in the isolated capture test (112 screenshots, 13.4 minutes). The exact aggregate command times out at 15 minutes after its capture and first six tests; the seven remaining visual tests pass separately.

## Remaining differences

No pixel-perfect claim is made. Remaining verified risks are numeric pixel diff absence, possible geometry differences in long mobile sections, and incomplete proof of continuous IX2 timing parity. The original Webflow runtime is intentionally not shipped.
