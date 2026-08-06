# Webflow cleanup report

## Root cause

The migration initially rendered source HTML through `SourceLayout.astro` and `source-page.ts`, keeping the Webflow export as production markup and relying on `audit-webflow.css`. That made the build functional but left legacy selectors, source loaders, runtime metadata, and port/fixture ambiguity in the shipped architecture.

## Cleanup completed

- Replaced source-body loading with eight explicit Astro page components.
- Added shared `SiteLayout.astro` and removed `SourceLayout.astro` and `src/lib/source-page.ts`.
- Moved original HTML, CSS, scripts, and runtime inputs to `tests/fixtures/original/`.
- Removed production jQuery/Webflow runtime files and references.
- Replaced production `data-w-id` hooks with semantic `data-motion` hooks.
- Replaced slider hooks with semantic `content-slider` hooks and a native controller.
- Retained React mobile navigation exactly as requested.
- Kept local Gilda Display, Inter Tight 300, and Allura font roles.
- Added live tests for RSVP visibility and comment-target typography.

## Remnants intentionally retained

| Remnant | Location | Reason |
|---|---|---|
| Webflow HTML/CSS/runtime strings | `tests/fixtures/original/` | Original source of truth for differential browser tests only. |
| `[data-w-id]` in test code | `tests/` | Fixture animation inspection and deterministic original screenshot override. |
| Tailwind `w-11` | `src/components/ui/button.tsx` | Width utility in the retained React mobile navigation; not a Webflow class. |
| Source-derived visual values | `src/styles/site.css` | Exact output preservation; stylesheet remains owned production CSS, not imported Webflow CSS. |

No Webflow runtime dependency, jQuery, `Webflow.require`, `Webflow.push`, `webflow.js`, or `w-mod-js` is shipped by Astro.

## Architecture impact

Static content is now Astro-owned. Only mobile navigation is hydrated React. Slider, reveal, form, and page-frame behavior are framework-independent browser controllers. No React effects were added.

## Visual parity

The required screenshot matrix was captured for all 8 routes at 7 widths. Runtime checks pass for all-route rendering, RSVP visibility/geometry/content, typography targets, and native interaction contracts. Exact pixel-diff and continuous IX2 timing parity remain unclaimed; see `VISUAL_PARITY_REPORT.md`.

## Validation

Latest direct checks:

- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm astro check`: PASS (0 errors, 0 warnings, 0 hints).
- `pnpm build`: PASS (8 routes).
- `pnpm exec playwright test tests/live-rsvp.spec.ts`: PASS.
- `pnpm exec playwright test tests/live-comment-parity.spec.ts`: PASS.
- `pnpm exec playwright test tests/explicit-architecture.spec.ts`: PASS.
- `pnpm exec playwright test tests/visual-parity.spec.ts --grep-invert "capture original and migrated routes at every required viewport"`: PASS (7 tests).
- `pnpm exec playwright test tests/visual-parity.spec.ts --grep "capture original and migrated routes at every required viewport"`: PASS (1 test, 13.4 minutes).
- aggregate `pnpm exec playwright test --config=playwright.config.ts`: TIMEOUT at 15 minutes after the capture and first six tests passed; no assertion failure was reported before timeout.
- `git diff --check`: PASS with normal LF/CRLF conversion warnings only.
