# Visual parity report

## Evidence boundary

The original Webflow HTML/CSS/assets remain the source of truth. Browser evidence is now available through Playwright:

- Original fixture: `http://127.0.0.1:4321` with the captured Webflow stylesheet, local original assets, local original fonts, and locally routed audit Webflow bundles.
- Migrated fixture: `http://127.0.0.1:4322` served by Astro.
- Captures: `artifacts/original`, `artifacts/migrated`, and `artifacts/comparisons`.
- Live route: `http://localhost:4321/`, Astro dev server bound to `0.0.0.0:4321`; fresh capture: `artifacts/live/astro-4321-rsvp-viewport-1440.png`.
- Full-page captures: 8 routes × 7 widths × 2 implementations = 112 screenshots.
- Home section crops: header, hero, couple, story, events, schedule, RSVP, registry, blog, footer at 375px and 1440px.
- Geometry/font snapshot: `artifacts/comparisons/geometry.json`.

## Typography audit

The original stylesheet defines three families: `Gilda Display` for h1–h6 and display headings, `Allura` for script accents, and `Inter Tight` for body, captions, buttons, labels, navigation, and form controls. Astro now registers the captured local files in `src/styles/global.css` with `font-display: swap`, explicit normal/italic Inter Tight weights 300–700, regular Allura/Gilda files, and `font-synthesis: none` on `html`.

| Source role | Original selector/token | Family | Size | Weight/style | Line-height | Letter-spacing | Astro status |
|---|---|---|---:|---|---|---|---|
| Hero title | `.hero-text`, `--_size---h1--*` | Gilda Display | 128px desktop; 180px at 1920; 100px tablet; 50px tiny mobile | 400 normal | 88% | 0px | Matched; heading contract is restated after Tailwind preflight |
| Section headings | `h2`, `.section-title`, `--_size---h2--*` | Gilda Display | 88px base; source responsive tokens | 400 normal | 97% | 0px | Matched against local original CSS |
| Script accents | `.couple-team-wrap-text`, `.gift-registry-text`, `--_typography---heading-font-two` | Allura | selector-specific source token | 400 normal | selector-specific | selector-specific | Local regular source file registered; no synthetic variants |
| Body/editorial | `p`, `.story-item-text-02`, `--_size---p1-body--*` | Inter Tight | 16px | 400 normal | 155% / 24.8px | -0.32px | Matched |
| Button/nav | `.menu`, `.message`, `--_size---button--*` | Inter Tight | 18px | 500 normal | 145% | 0px | Matched |
| RSVP controls | `.cta-form-input.three`, placeholder | Inter Tight | 16px below 768; 18px from 768 | 400 normal | 155% | source token / browser-normalized control spacing | Matched at all seven required widths |
| Small RSVP note | `.rsvp-item-text`, `--_size---font-size-12` | Inter Tight | 12px | 400 normal | source default | source default | Matched |

Browser proof: the RSVP test compares original and migrated computed family, size, weight, style, line-height, letter-spacing, colors, background presence, and geometry at 375, 640, 768, 1024, 1280, 1440, and 1920px. It also stores paired RSVP crops under `artifacts/comparisons/rsvp/<width>/`.

The fixture applies a deterministic final-state override to original `[data-w-id]` elements for static screenshot comparison. This avoids the original inline `opacity:0` state making screenshots dependent on Webflow runtime timing. Animation behavior is separately covered by source inspection and migrated runtime tests.

## Section comparison inventory

### RSVP restoration audit

| Route | Section | Original selector | Migrated component | Typography difference | Size difference | Spacing difference | Animation difference | Responsive difference | Required correction |
|---|---|---|---|---|---|---|---|---|---|
| `/` | Countdown boundary | `.counter`, `.counter-text` | Source body in `SourceLayout` | None in captured font contract | Source order preserved | `.counter` remains before `.page-track` | Source counter reveal remains covered by shared observer | Source breakpoints preserved | None |
| `/` | Event transition | `.page-track > .page-camera > .page-frame > .event` | Source body in `SourceLayout` | None identified | Wrapper hierarchy preserved | Event remains immediately before RSVP | Event item reveals and native slider retained | Source slider breakpoint preserved | None |
| `/` | RSVP | `#rsvp`, `.rsvp-wrap`, `.rsvp` | Source body in `SourceLayout` | None at tested widths | Computed geometry matches source at 375/640/768/1024/1280/1440/1920 | Form, field, button, and deadline spacing match source contract | No RSVP-specific `data-w-id`; shared source behavior retained | Source 479/767/991/1440/1920 rules preserved | No duplicate restoration required |
| `/` | Registry boundary | `#gift-2`, `.gift-registry` | Source body in `SourceLayout` | None identified | Follows RSVP in source order | RSVP wrapper closes before registry starts | Registry reveals retained | Source breakpoints preserved | None |

| Route | Section | Original selector | Migrated component | Typography difference | Size difference | Spacing difference | Animation difference | Responsive difference | Required correction |
|---|---|---|---|---|---|---|---|---|---|
| `/` | Header | `.header`, `.navbar-2` | `SourceLayout` + raw source header | Local Allura/Gilda/Inter Tight now registered; menu remains source CSS | Header geometry matches at desktop; mobile React toggle is 44px | Mobile toggle is an added fixed control | Native menu transition replaces Webflow menu | 991px mobile mode preserved | Compare menu open/close crop at 375/640 |
| `/` | Hero | `.hero`, `.hero-text`, `.hero-img-right` | Source body in `SourceLayout` | Tailwind preflight had collapsed headings to 16px; restored source `h1` contract | Corrected 128px desktop / 50px tiny scale; section height still differs in measured geometry | Source layout retained | IO reveal + 1s outQuart-like CSS transition; CTA 500ms rotateX hover | Source 479/767/991/1440/1920 rules preserved | Tune remaining hero vertical offsets after final crop review |
| `/` | Couple | `.couple`, `.couple-team-wrap`, `.slider._02` | Source body + native slider initializer | Source font variables now win over preflight | Source and migrated section heights differ at mobile | Source padding retained; slider adds track state | IO reveals; native autoplay/arrows/swipe | Mobile slider is initialized below 480px | Verify second slide and autoplay timing against source |
| `/` | Story | `.story`, `.story-item-wrap-two`, `.slider._02` | Source body + native slider initializer | Gilda/Inter Tight source values restored | Desktop section height matches at 1280/1440; mobile differs | Source CSS remains authoritative | IO reveals; slider transition 500ms ease | Mobile slider state is functional | Validate all three mobile slides and scroll-linked source action |
| `/` | Events | `.big-day`, `.big-day-item-wrap` | Source body | Source heading/body tokens restored | Measured mobile section height remains different | Source grid/padding retained | IO reveals | 3-column to stacked behavior retained | Adjust only after section crop comparison |
| `/` | Schedule | `.event`, `.w-slider` | Source body + native slider initializer | Source typography restored | Track width/height source CSS retained | Source gaps retained | Native dots/autoplay/arrow/keyboard behavior | Mobile slider behavior covered | Test every event slide state |
| `/` | RSVP | `.rsvp-wrap`, `.cta-form` | Fresh original/migrated computed font contract matches | Fresh geometry matches at all required widths; local background resolves | Form and responsive spacing match source | No source RSVP reveal target; native submit class retained | Native browser validation retained | PASS for structure, typography, geometry, and local asset rendering; no remote submission claimed |
| `/` | Registry/blog/footer | `.gift-registry`, `.blog-02`, `.footer` | Source body + native slider initializer | Source typography restored | Footer and registry still show measured height differences at some widths | Source spacing retained | IO reveals; footer image transforms and hover CTA CSS | Source breakpoints retained | Compare footer image animation and 1920 crop |
| `/blog/*` | Detail content | `.blog-single`, `.blog-single-wrap` | Source body in `SourceLayout` | Local font files match source family names | Source CSS retained; no route-specific redesign | Source spacing retained | IO reveal on `data-w-id` content | Source breakpoints retained | Inspect long-form mobile wrap at 375/640 |
| `/admin-page/*` | Utility page | `.page-title`, page-specific section selectors | Source body in `SourceLayout` | Local fonts and source heading declarations | Source dimensions retained | Source spacing retained | Source has no material custom interaction | Source breakpoints retained | Keep as static parity routes |

## Screenshot results

Each cell means both original and migrated full-page screenshots were captured at the listed viewport. `MINOR DIFFERENCE` is intentional: captures exist and representative crops were inspected, but measured section-height differences and unverified pixel-diff thresholds remain. No cell is called pixel-perfect.

| Route | 375 | 640 | 768 | 1024 | 1280 | 1440 | 1920 |
|---|---|---|---|---|---|---|---|
| `/` | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE |
| `/blog/how-we-met-knew-it-was-different/` | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE |
| `/blog/our-favorite-engagement-photos/` | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE |
| `/blog/demo@mail.com/` | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE |
| `/blog/(2346)-123-4567/` | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE |
| `/admin-page/licenses/` | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE |
| `/admin-page/styleguide/` | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE |
| `/admin-page/change-log/` | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE | MINOR DIFFERENCE |

## Browser interaction evidence

- Live RSVP visibility: PASS. Fresh Playwright run against `http://localhost:4321/` confirmed display block, visible state, opacity 1, width 1728px, height 1000px, RSVP panel height 889px, complete form content, and no console/page errors.
- Live root cause: two servers shared port 4321 across IPv4/IPv6, then generic reveal CSS targeted structural `.page-track`. Its opacity/transform plus sticky `.page-camera` clipping made RSVP appear absent. `.page-track` is now excluded from generic reveals, and native vertical scroll drives horizontal frame translation.
- Fresh screenshot visibly contains RSVP background, translucent panel, SA emblem, title, fields, button, and deadline: `artifacts/live/astro-4321-rsvp-viewport-1440.png`.
- Comment target font audit: PASS. Live original/Astro comparison test confirms exact computed typography for navigation, story label, event time, event title, and event description. No font replacement was made because current local Allura/Gilda Display/Inter Tight mapping already matches source.
- Event animation contract: source Webflow `slideInBottom` uses opacity `0` plus `translateY(100px)` to opacity `1` plus `translateY(0)`, `1000ms`, `outQuart`; Astro uses the same initial/final state and duration through shared CSS/IntersectionObserver initialization. Story/event comments must be captured after reveal completion.

- Mobile navigation: PASS. Toggle opens/closes, uses corrected `×`/`☰` glyphs, preserves `aria-expanded`, and keeps closed links out of tab order.
- Reveal: PASS. A migrated reveal target reaches `data-visible="true"` and computed opacity `1`; transformed hero CTA targets are caught by the scroll fallback.
- Slider: PASS for the exercised mobile slider. Native arrows, dots, autoplay pause-on-hover/focus, keyboard activation, and pointer swipe are implemented; all four source slider structures initialize without Webflow runtime.
- Route smoke: PASS. All eight migrated routes return successful documents with no browser console or failed-resource errors after the two missing CSS assets were added locally.
- Targeted Playwright tests: PASS (mobile navigation/slider/reveal, desktop typography, original baseline routing, and all-route smoke each pass when run separately).
- RSVP regression: PASS. The section exists in the built Astro HTML, exposes the original five controls and submit value, matches source computed typography/geometry at all seven required widths, and produced paired original/migrated crops.
- Original fixture correction: Playwright now injects the captured CSS after navigation and routes `/assets/*` to `public/assets`; this bypasses the captured stylesheet’s original SRI hash while preserving the source CSS and assets used for comparison.
- Full capture matrix: PASS. The 8-route × 7-viewport original/migrated capture test completed successfully in 13.8 minutes after the fixture correction.

## Known remaining differences

- There is no automated pixel-diff threshold yet; screenshots are captured and representative crops were visually inspected, while geometry data is recorded for correction.
- The complete capture test is intentionally slow (13.8 minutes in this Windows checkout); its successful run is recorded separately from the shorter interaction tests.
- Section heights differ measurably on several mobile widths because the existing source-body/compatibility architecture still inherits some preflight and layout interaction differences.
- Original Webflow IX2 timing and the `a-2` continuous page-frame scroll action were inspected from the downloaded configuration but are not reproduced as a GSAP timeline. The migrated implementation covers one-time reveals and native sliders only.
- Compatibility CSS remains active. Its two CSS background URLs are now local; the remaining stylesheet is still a temporary source-preservation layer.
