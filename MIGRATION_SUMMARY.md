# Migration summary

## Completed in this parity pass

- Registered the original Allura, Gilda Display, and Inter Tight font files with exact weight/style mappings.
- Restored the original `h1`–`h6` contract after Tailwind preflight so source CSS variables control typography again.
- Added deterministic native reveal behavior with source IX2 delay mapping, scroll fallback, reduced-motion support, and CTA hover rotation.
- Added native accessible slider initialization for source Webflow slider markup: arrows, dots, keyboard, pointer swipe, autoplay, and pause behavior.
- Corrected mobile-navigation mojibake and added a 500ms accessible open/close transition.
- Added the two CSS background assets that were missing from the initial capture and rewired the compatibility CSS to local paths.
- Added Playwright dual-server capture and runtime tests covering all eight routes at all seven required widths.
- Audited the complete local font contract, disabled synthetic font generation at the document root, and added RSVP parity regression/capture coverage at all seven required widths.
- Confirmed the RSVP section was already preserved by the source-body loader and built output; restored trustworthy original-fixture screenshots by injecting the captured CSS after its SRI-protected CDN link and routing local `/assets/*` requests.
- Re-audited the reported omission: source document order is `Counting Down to “I Do”` → event wrapper → RSVP → gift registry. The existing Astro output preserves that hierarchy, so no duplicate RSVP markup was added.
- Added explicit RSVP/countdown boundary evidence to the migration inventory and parity report, including the distinction between the original comment URL (`:5500`) and the Astro test fixture (`:4322`).
- Fixed live-route RSVP visibility: excluded `.page-track` from generic reveal initialization, restored native vertical-to-horizontal page-frame motion, added `data-rsvp-section`, and added a live `localhost:4321` visibility/screenshot test.
- Audited live browser comment targets against original computed styles; nav, story label, and event typography already match, so no visual font override was introduced. Added live comparison coverage to prevent font drift.

## Architecture

- `src/layouts/SourceLayout.astro`: document shell, metadata, favicon, global styles, shared mobile navigation, and browser script.
- `src/lib/source-page.ts`: typed source-body loader and local asset URL rewrite.
- `src/styles/global.css`: local font faces, source tokens, preflight-safe heading declarations, motion states, and small shared mobile styles.
- `src/components/interactive/MobileNavigation.tsx`: minimal hydrated React state surface.
- `src/components/ui/button.tsx`: shadcn-style CVA primitive customized for the original border treatment.
- `public/scripts/site.js`: framework-independent reveal, slider, and form initialization.
- `tests/visual-parity.spec.ts`: dual-server screenshot matrix, geometry capture, route smoke, and interaction checks.

## React and shadcn/ui

- React component: `MobileNavigation`, because open/close state and keyboard semantics are genuinely interactive. It uses `useState` only.
- shadcn primitive: `Button`, used by mobile navigation through a source-matching CVA variant.
- No `useEffect`, `useLayoutEffect`, jQuery, class components, CommonJS, or Webflow runtime dependency is shipped by Astro.

## Removed legacy behavior

- Removed rendered Webflow/jQuery/WebFont scripts from Astro output.
- Kept original HTML/CSS/JS only as local source/audit inputs and browser-baseline fixtures.
- Replaced the prior no-op global source-ready script with a small declarative, event-driven native module.

## Remaining limitations

- The large captured Webflow stylesheet remains active as a temporary compatibility layer; it has not yet been fully translated into component-owned Tailwind styles.
- Exact continuous story `a-2` scroll-linked motion and every original IX2 timeline are documented but not fully reproduced.
- Page-frame motion now runs through a small native scroll initializer; exact Webflow easing/timing remains approximate.
- Screenshots are captured and representative crops were inspected, but no numeric image-diff threshold is reported; parity statuses remain `MINOR DIFFERENCE` where measured geometry differs.
- RSVP submission remains a native browser form only; no remote Webflow endpoint or successful submission state is claimed.
