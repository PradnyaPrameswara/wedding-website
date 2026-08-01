import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const originalBase = 'http://127.0.0.1:4321';
const migratedBase = 'http://127.0.0.1:4322';
const widths = [375, 640, 768, 1024, 1280, 1440, 1920] as const;
const routes = [
  { name: 'home', original: '/index.html', migrated: '/' },
  { name: 'change-log', original: '/admin-page/change-log.html', migrated: '/admin-page/change-log/' },
  { name: 'licenses', original: '/admin-page/licenses.html', migrated: '/admin-page/licenses/' },
  { name: 'styleguide', original: '/admin-page/styleguide.html', migrated: '/admin-page/styleguide/' },
  { name: 'how-we-met', original: '/blog/how-we-met-knew-it-was-different.html', migrated: '/blog/how-we-met-knew-it-was-different/' },
  { name: 'favorite-photos', original: '/blog/our-favorite-engagement-photos.html', migrated: '/blog/our-favorite-engagement-photos/' },
  { name: 'demo-email', original: '/blog/demo@mail.com.html', migrated: '/blog/demo@mail.com/' },
  { name: 'phone', original: '/blog/(2346)-123-4567.html', migrated: '/blog/(2346)-123-4567/' },
] as const;

const homeSections = [
  ['header', '.header'],
  ['hero', '.hero'],
  ['couple', '.couple'],
  ['story', '.story'],
  ['events', '.big-day'],
  ['event-schedule', '.event'],
  ['rsvp', '.rsvp-wrap'],
  ['gift-registry', '.gift-registry'],
  ['blog', '.blog-02'],
  ['footer', '.footer'],
] as const;

const originalFontCss = `
@font-face { font-family: 'Allura'; src: url('/fonts/9oRPNYsQpS4zjuAPjA.ttf') format('truetype'); font-weight: 400; font-style: normal; }
@font-face { font-family: 'Gilda Display'; src: url('/fonts/t5tmIRoYMoaYG0WEOh7HwMeR7Tk.ttf') format('truetype'); font-weight: 400; font-style: normal; }
@font-face { font-family: 'Inter Tight'; src: url('/fonts/NGSnv5HMAFg6IuGlBNMjxJEL2VmU3NS7Z2mj6AiqXA.ttf') format('truetype'); font-weight: 400; font-style: normal; }
@font-face { font-family: 'Inter Tight'; src: url('/fonts/NGSnv5HMAFg6IuGlBNMjxJEL2VmU3NS7Z2mjDw-qXA.ttf') format('truetype'); font-weight: 500; font-style: normal; }
@font-face { font-family: 'Inter Tight'; src: url('/fonts/NGSnv5HMAFg6IuGlBNMjxJEL2VmU3NS7Z2mjPQ-qXA.ttf') format('truetype'); font-weight: 600; font-style: normal; }
@font-face { font-family: 'Inter Tight'; src: url('/fonts/NGSnv5HMAFg6IuGlBNMjxJEL2VmU3NS7Z2mjUQ-qXA.ttf') format('truetype'); font-weight: 700; font-style: normal; }
`;

const originalScripts = new Map([
  ['jquery-3.5.1.min.dc5e7f18c8.js', 'C:\\tmp\\sara-webflow-audit\\jquery-3.5.1.min.dc5e7f18c8.js'],
  ['webflow.schunk.36b8fb49256177c8.js', 'C:\\tmp\\sara-webflow-audit\\webflow.schunk.36b8fb49256177c8.js'],
  ['webflow.schunk.6f4d94d528e53508.js', 'C:\\tmp\\sara-webflow-audit\\webflow.schunk.6f4d94d528e53508.js'],
  ['webflow.schunk.b2d4fa44d0f47718.js', 'C:\\tmp\\sara-webflow-audit\\webflow.schunk.b2d4fa44d0f47718.js'],
  ['webflow.9b86497f.9287d4c862686f1c.js', 'C:\\tmp\\sara-webflow-audit\\webflow.9b86497f.9287d4c862686f1c.js'],
]);

async function configureOriginalPage(page: Page) {
  await page.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());
    const fileName = decodeURIComponent(requestUrl.pathname.split('/').pop() ?? '');

    if (requestUrl.hostname === 'cdn.prod.website-files.com') {
      if (requestUrl.pathname.includes('/css/')) {
        await route.fulfill({ path: join(process.cwd(), 'audit-webflow.css'), contentType: 'text/css' });
        return;
      }
      const scriptPath = originalScripts.get(fileName);
      if (scriptPath) {
        await route.fulfill({ path: scriptPath, contentType: 'text/javascript' });
        return;
      }
      const assetPath = join(process.cwd(), 'public', 'assets', fileName);
      if (existsSync(assetPath)) {
        await route.fulfill({ path: assetPath });
        return;
      }
    }

    if (requestUrl.hostname === 'd3e54v103j8qbb.cloudfront.net' || requestUrl.hostname === 'ajax.googleapis.com' || requestUrl.hostname === 'fonts.googleapis.com' || requestUrl.hostname === 'fonts.gstatic.com') {
      await route.abort();
      return;
    }

    if (requestUrl.hostname === '127.0.0.1' && requestUrl.port === '4321' && requestUrl.pathname.startsWith('/fonts/')) {
      const fontPath = join(process.cwd(), 'public', requestUrl.pathname.replace(/^\//, '').replaceAll('/', '\\'));
      if (existsSync(fontPath)) {
        await route.fulfill({ path: fontPath });
        return;
      }
    }

    if (requestUrl.hostname === '127.0.0.1' && requestUrl.port === '4321' && requestUrl.pathname.startsWith('/assets/')) {
      const assetPath = join(process.cwd(), 'public', requestUrl.pathname.replace(/^\//, '').replaceAll('/', '\\'));
      if (existsSync(assetPath)) {
        await route.fulfill({ path: assetPath });
        return;
      }
    }

    await route.continue();
  });
}

async function settlePage(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(async () => {
    await document.fonts.ready;
    const criticalImages = [...document.images].filter((image) => image.loading !== 'lazy');
    await Promise.race([Promise.all(criticalImages.map((image) => image.complete
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      }))), new Promise<void>((resolve) => window.setTimeout(resolve, 3_000))]);
  });
  await page.waitForTimeout(1_200);
}

async function revealFullPage(page: Page) {
  const viewportHeight = page.viewportSize()?.height ?? 1000;
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < pageHeight; y += Math.max(200, viewportHeight - 120)) {
    await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), y);
    await page.waitForTimeout(100);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1_100);
}

async function capturePage(page: Page, url: string, outputPath: string, isOriginal = false) {
  if (isOriginal) await configureOriginalPage(page);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (isOriginal) {
    await page.addStyleTag({ path: join(process.cwd(), 'audit-webflow.css') });
    await page.addStyleTag({ content: originalFontCss });
    await page.addStyleTag({ content: '[data-w-id] { opacity: 1 !important; transform: none !important; }' });
  }
  await settlePage(page);
  await revealFullPage(page);
  await mkdir(outputPath, { recursive: true });
  return page.screenshot({ path: join(outputPath, 'full-page.png'), fullPage: true });
}

test('capture original and migrated routes at every required viewport', async ({ browser }) => {
  test.setTimeout(1_800_000);
  const geometry: Record<string, unknown> = {};

  for (const route of routes) {
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      const original = await context.newPage();
      const migrated = await context.newPage();
      const originalPath = join('artifacts', 'original', route.name, String(width));
      const migratedPath = join('artifacts', 'migrated', route.name, String(width));

      await capturePage(original, `${originalBase}${route.original}`, originalPath, true);
      await capturePage(migrated, `${migratedBase}${route.migrated}`, migratedPath);

      if (route.name === 'home') {
        for (const [sectionName, selector] of homeSections) {
          for (const [pageName, page] of [['original', original], ['migrated', migrated]] as const) {
            const section = page.locator(selector);
            if (await section.count()) {
              const sectionPath = join('artifacts', 'comparisons', 'home', String(width));
              await mkdir(sectionPath, { recursive: true });
              await section.first().screenshot({
                path: join(sectionPath, `${pageName}-${sectionName}.png`),
              });
            }
          }
        }

        geometry[`${width}-original`] = await original.evaluate(() => {
          const selectors = ['body', '.header', '.hero', '.hero-text', '.hero-img-right', '.couple', '.story', '.big-day', '.event', '.footer'];
          return Object.fromEntries(selectors.map((selector) => {
            const element = document.querySelector(selector);
            if (!element) return [selector, null];
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            return [selector, {
              rect: { x: box.x, y: box.y, width: box.width, height: box.height },
              fontFamily: style.fontFamily,
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
              lineHeight: style.lineHeight,
              letterSpacing: style.letterSpacing,
            }];
          }));
        });
        geometry[`${width}-migrated`] = await migrated.evaluate(() => {
          const selectors = ['body', '.header', '.hero', '.hero-text', '.hero-img-right', '.couple', '.story', '.big-day', '.event', '.footer'];
          return Object.fromEntries(selectors.map((selector) => {
            const element = document.querySelector(selector);
            if (!element) return [selector, null];
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            return [selector, {
              rect: { x: box.x, y: box.y, width: box.width, height: box.height },
              fontFamily: style.fontFamily,
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
              lineHeight: style.lineHeight,
              letterSpacing: style.letterSpacing,
            }];
          }));
        });
      }

      await context.close();
    }
  }

  await mkdir('artifacts/comparisons', { recursive: true });
  await writeFile(
    'artifacts/comparisons/geometry.json',
    JSON.stringify(geometry, null, 2),
    'utf8',
  );
});

test('migrated mobile navigation, slider, and reveal behavior are interactive', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 1000 });
  await page.goto(`${migratedBase}/`, { waitUntil: 'domcontentloaded' });
  await settlePage(page);

  const toggle = page.locator('.astro-mobile-nav__toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).not.toContainText('Ã');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#astro-mobile-nav-menu')).toHaveAttribute('data-open', 'true');
  await expect(page.locator('#astro-mobile-nav-menu a').first()).toBeVisible();

  const slider = page.locator('.w-slider').first();
  await expect(slider.locator('.astro-slider-dot')).toHaveCount(2);
  await slider.locator('.w-slider-arrow-right').click();
  await expect(slider.locator('.astro-slider-dot[aria-current="true"]')).toHaveCount(1);

  const reveal = page.locator('[data-w-id]').first();
  await expect(reveal).toHaveAttribute('data-visible', 'true');
  await expect.poll(() => reveal.evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
});

test('migrated desktop heading retains the source typography scale', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${migratedBase}/`, { waitUntil: 'domcontentloaded' });
  await settlePage(page);
  await revealFullPage(page);
  await expect.poll(() => page.locator('.hero-text').evaluate((element) => getComputedStyle(element).fontSize)).toBe('128px');
  await expect.poll(() => page.locator('.hero-text').evaluate((element) => getComputedStyle(element).fontFamily)).toContain('Gilda Display');
  const hiddenHeroItems = await page.locator('.hero [data-w-id]:not([data-visible="true"])').evaluateAll((elements) => elements.map((element) => ({ tag: element.tagName, className: element.className })));
  expect(hiddenHeroItems).toEqual([]);
  await page.locator('.hero').screenshot({ path: join('artifacts', 'validation', 'migrated-home-hero-1440.png') });
});

test('original baseline serves local Webflow CSS, fonts, assets, and runtime', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await capturePage(page, `${originalBase}/index.html`, join('artifacts', 'validation', 'original-home'), true);
  await expect(page.locator('.hero-img-right')).toHaveJSProperty('complete', true);
  await expect.poll(() => page.locator('.hero-img-right').evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
  await expect.poll(() => page.locator('body').evaluate((element) => getComputedStyle(element).fontFamily)).toContain('Inter Tight');
  await context.close();
});

test('all migrated routes return usable documents without browser console errors', async ({ browser }) => {
  for (const route of routes) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('requestfailed', (request) => errors.push(`${request.url()} :: ${request.failure()?.errorText ?? 'request failed'}`));
    const response = await page.goto(`${migratedBase}${route.migrated}`, { waitUntil: 'domcontentloaded' });
    expect(response?.ok(), route.name).toBeTruthy();
    await settlePage(page);
    expect(errors, route.name).toEqual([]);
    await context.close();
  }
});

test('RSVP section preserves the original structure, form contract, and computed typography', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const original = await context.newPage();
  const migrated = await context.newPage();

  await configureOriginalPage(original);
  await original.goto(`${originalBase}/index.html`, { waitUntil: 'domcontentloaded' });
  await original.addStyleTag({ path: join(process.cwd(), 'audit-webflow.css') });
  await original.addStyleTag({ content: originalFontCss });
  await settlePage(original);

  await migrated.goto(`${migratedBase}/`, { waitUntil: 'domcontentloaded' });
  await settlePage(migrated);

  const readRsvpContract = async (page: Page) => page.evaluate(() => {
    const form = document.querySelector<HTMLFormElement>('#email-form');
    const element = document.querySelector<HTMLElement>('.rsvp-form-wrap');
    const field = document.querySelector<HTMLElement>('.cta-form-input.three');
    const heading = document.querySelector<HTMLElement>('.rsvp-form-top h2');
    if (!form || !element || !field || !heading) throw new Error('RSVP contract is incomplete');

    const readStyle = (target: HTMLElement) => {
      const style = getComputedStyle(target);
      const rect = target.getBoundingClientRect();
      return {
        rect: { width: Math.round(rect.width), height: Math.round(rect.height) },
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        textTransform: style.textTransform,
      };
    };

    return {
      sectionVisible: Boolean(document.querySelector<HTMLElement>('#rsvp')?.offsetHeight),
      fieldIds: [...form.querySelectorAll<HTMLInputElement | HTMLSelectElement>('.cta-form-input')].map((input) => input.id),
      fieldCount: form.querySelectorAll('.cta-form-input').length,
      submitValue: form.querySelector<HTMLInputElement>('input[type="submit"]')?.value,
      logoSrc: document.querySelector<HTMLImageElement>('.rsvp-logo')?.getAttribute('src'),
      backgroundImage: getComputedStyle(document.querySelector<HTMLElement>('.rsvp')!).backgroundImage,
      formWrap: readStyle(element),
      field: readStyle(field),
      heading: readStyle(heading),
    };
  });

  const originalContract = await readRsvpContract(original);
  const migratedContract = await readRsvpContract(migrated);

  expect(migratedContract.sectionVisible).toBe(true);
  expect(migratedContract.fieldIds).toEqual(['name', 'email', 'field', 'What-Will-You-Be-Attending', 'Meal-Preferences']);
  expect(migratedContract.fieldCount).toBe(5);
  expect(migratedContract.submitValue).toBe('Submit RSVP');
  expect(migratedContract.logoSrc).toContain('/assets/6976f8e10ddc628c2e002910_2f07efc57c842d3392db48b920423bdf_sa-02.avif');
  expect(migratedContract.backgroundImage).toContain('/assets/6976f56fd413908ad411638a_rsvp-bg.avif');
  expect(migratedContract.formWrap).toEqual(originalContract.formWrap);
  expect(migratedContract.field).toEqual(originalContract.field);
  expect(migratedContract.heading).toEqual(originalContract.heading);

  await mkdir(join('artifacts', 'validation', 'rsvp'), { recursive: true });
  await original.locator('.rsvp-wrap').screenshot({ path: join('artifacts', 'validation', 'rsvp', 'original-1440.png') });
  await migrated.locator('.rsvp-wrap').screenshot({ path: join('artifacts', 'validation', 'rsvp', 'migrated-1440.png') });
  await context.close();
});

test('RSVP section matches the source at every required viewport', async ({ browser }) => {
  test.setTimeout(180_000);
  const snapshots: Record<string, unknown> = {};

  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const original = await context.newPage();
    const migrated = await context.newPage();

    await configureOriginalPage(original);
    await original.goto(`${originalBase}/index.html`, { waitUntil: 'domcontentloaded' });
    await original.addStyleTag({ path: join(process.cwd(), 'audit-webflow.css') });
    await original.addStyleTag({ content: originalFontCss });
    await settlePage(original);

    await migrated.goto(`${migratedBase}/`, { waitUntil: 'domcontentloaded' });
    await settlePage(migrated);

    const readLayout = async (page: Page) => page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('.rsvp-wrap');
      const rsvp = document.querySelector<HTMLElement>('.rsvp');
      const formWrap = document.querySelector<HTMLElement>('.rsvp-form-wrap');
      const field = document.querySelector<HTMLElement>('.cta-form-input.three');
      const heading = document.querySelector<HTMLElement>('.rsvp-form-top h2');
      if (!section || !rsvp || !formWrap || !field || !heading) throw new Error('RSVP layout is incomplete');
      const readBox = (element: HTMLElement) => {
        const box = element.getBoundingClientRect();
        return { width: Math.round(box.width), height: Math.round(box.height) };
      };
      const fieldStyle = getComputedStyle(field);
      const formStyle = getComputedStyle(formWrap);
      const headingStyle = getComputedStyle(heading);
      return {
        section: readBox(section),
        rsvp: readBox(rsvp),
        formWrap: readBox(formWrap),
        field: {
          fontFamily: fieldStyle.fontFamily,
          fontSize: fieldStyle.fontSize,
          fontWeight: fieldStyle.fontWeight,
          lineHeight: fieldStyle.lineHeight,
          letterSpacing: fieldStyle.letterSpacing,
        },
        visual: {
          formBackgroundColor: formStyle.backgroundColor,
          formOpacity: formStyle.opacity,
          headingColor: headingStyle.color,
          fieldColor: fieldStyle.color,
          rsvpBackgroundImage: Boolean(getComputedStyle(rsvp).backgroundImage && getComputedStyle(rsvp).backgroundImage !== 'none'),
        },
      };
    });

    const originalLayout = await readLayout(original);
    const migratedLayout = await readLayout(migrated);
    expect(migratedLayout, `${width}px`).toEqual(originalLayout);
    expect(await migrated.locator('#email-form').isVisible(), `${width}px form`).toBe(true);

    const output = join('artifacts', 'comparisons', 'rsvp', String(width));
    await mkdir(output, { recursive: true });
    await original.locator('.rsvp-wrap').screenshot({ path: join(output, 'original.png') });
    await migrated.locator('.rsvp-wrap').screenshot({ path: join(output, 'migrated.png') });
    snapshots[String(width)] = { original: originalLayout, migrated: migratedLayout };
    await context.close();
  }

  await mkdir(join('artifacts', 'comparisons', 'rsvp'), { recursive: true });
  await writeFile(join('artifacts', 'comparisons', 'rsvp', 'geometry.json'), JSON.stringify(snapshots, null, 2), 'utf8');
});
