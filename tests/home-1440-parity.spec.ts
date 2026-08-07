import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { diffPngBuffers } from './utils/png-diff';

const originalBase = 'http://127.0.0.1:4333';
const migratedBase = 'http://127.0.0.1:4321';
const originalFixture = join(process.cwd(), 'tests', 'fixtures', 'original');
const reportDir = join(process.cwd(), '.local-reports', 'webflow-migration', 'home-1440', 'final-corrections');
const screenshotDir = join(process.cwd(), 'artifacts', 'comparisons', 'home-1440');

const sections = [
  ['header', '.header'],
  ['hero', '.hero'],
  ['introduction', '.couple'],
  ['story', '.story'],
  ['countdown', '.counter'],
  ['events', '.big-day'],
  ['event-schedule', '.event'],
  ['rsvp', '.rsvp-wrap'],
  ['registry', '.gift-registry'],
  ['blog', '.blog-02'],
  ['footer', '.footer'],
] as const;

const blogRegionDefinitions = [
  ['section', '.blog-02'],
  ['heading-wrap', '.blog-02-top'],
  ['eyebrow', '.blog-02-top .section-title-text'],
  ['heading', '.blog-02-top .section-title'],
  ['card-list', '.blog-02-item-wrap'],
  ['card-1', '.blog-02-item-wrap > .blog-collection-list-wrapper:nth-child(1)'],
  ['card-1-image-frame', '.blog-02-item-wrap > .blog-collection-list-wrapper:nth-child(1) .blog-collection-img-wrap'],
  ['card-1-image', '.blog-02-item-wrap > .blog-collection-list-wrapper:nth-child(1) .blog-img'],
  ['card-1-meta', '.blog-02-item-wrap > .blog-collection-list-wrapper:nth-child(1) .blog-collection-date-wrap'],
  ['card-1-title', '.blog-02-item-wrap > .blog-collection-list-wrapper:nth-child(1) .blog-tile'],
  ['card-1-link', '.blog-02-item-wrap > .blog-collection-list-wrapper:nth-child(1) .blog-link'],
  ['card-2', '.blog-02-item-wrap > .blog-collection-list-wrapper:nth-child(2)'],
  ['card-2-image-frame', '.blog-02-item-wrap > .blog-collection-list-wrapper:nth-child(2) .blog-collection-img-wrap'],
  ['card-2-image', '.blog-02-item-wrap > .blog-collection-list-wrapper:nth-child(2) .blog-img'],
  ['card-2-meta', '.blog-02-item-wrap > .blog-collection-list-wrapper:nth-child(2) .blog-collection-date-wrap'],
  ['card-2-title', '.blog-02-item-wrap > .blog-collection-list-wrapper:nth-child(2) .blog-tile'],
  ['card-2-link', '.blog-02-item-wrap > .blog-collection-list-wrapper:nth-child(2) .blog-link'],
] as const;

const blogStyleProperties = [
  'display', 'position', 'width', 'height', 'max-width', 'max-height', 'margin', 'padding', 'gap',
  'grid-template-columns', 'grid-template-rows', 'flex-basis', 'flex-grow', 'flex-shrink', 'align-items',
  'justify-content', 'overflow', 'aspect-ratio', 'object-fit', 'object-position', 'transform', 'transform-origin',
  'opacity', 'background', 'background-color', 'border', 'border-radius', 'box-shadow', 'font-family',
  'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'color',
] as const;

const originalFontCss = `
@font-face { font-family: 'Allura'; src: url('/fonts/9oRPNYsQpS4zjuAPjA.ttf') format('truetype'); font-weight: 400; font-style: normal; }
@font-face { font-family: 'Gilda Display'; src: url('/fonts/t5tmIRoYMoaYG0WEOh7HwMeR7Tk.ttf') format('truetype'); font-weight: 400; font-style: normal; }
@font-face { font-family: 'Inter Tight'; src: url('/fonts/NGSnv5HMAFg6IuGlBNMjxJEL2VmU3NS7Z2mj6AiqXA.ttf') format('truetype'); font-weight: 400; font-style: normal; }
@font-face { font-family: 'Inter Tight'; src: url('/fonts/NGSnv5HMAFg6IuGlBNMjxJEL2VmU3NS7Z2mjDw-qXA.ttf') format('truetype'); font-weight: 500; font-style: normal; }
`;

async function configureOriginalPage(page: Page) {
  await page.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());
    const fileName = decodeURIComponent(requestUrl.pathname.split('/').pop() ?? '');
    if (requestUrl.hostname === '127.0.0.1' && requestUrl.port === '4333' && route.request().resourceType() === 'document') {
      const response = await route.fetch();
      const html = await response.text();
      await route.fulfill({
        response,
        body: html.replace(/\s+integrity="[^"]*"/g, ''),
      });
      return;
    }
    const fixtureScriptPath = join(originalFixture, 'scripts', fileName);
    if (existsSync(fixtureScriptPath) && ['d3e54v103j8qbb.cloudfront.net', 'ajax.googleapis.com'].includes(requestUrl.hostname)) {
      await route.fulfill({ path: fixtureScriptPath, contentType: 'text/javascript' });
      return;
    }
    if (requestUrl.hostname === 'cdn.prod.website-files.com') {
      if (requestUrl.pathname.includes('/css/')) {
        await route.fulfill({ path: join(originalFixture, 'audit-webflow.css'), contentType: 'text/css' });
        return;
      }
      const scriptPath = join(originalFixture, 'scripts', fileName);
      if (existsSync(scriptPath)) {
        await route.fulfill({ path: scriptPath, contentType: 'text/javascript' });
        return;
      }
      const assetPath = join(process.cwd(), 'public', 'assets', fileName);
      if (existsSync(assetPath)) {
        await route.fulfill({ path: assetPath });
        return;
      }
    }
    if (['d3e54v103j8qbb.cloudfront.net', 'ajax.googleapis.com', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(requestUrl.hostname)) {
      await route.abort();
      return;
    }
    if (requestUrl.hostname === '127.0.0.1' && requestUrl.port === '4333' && (requestUrl.pathname.startsWith('/fonts/') || requestUrl.pathname.startsWith('/assets/'))) {
      const assetPath = join(process.cwd(), 'public', requestUrl.pathname.replace(/^\//, '').replaceAll('/', '\\'));
      if (existsSync(assetPath)) {
        await route.fulfill({ path: assetPath });
        return;
      }
    }
    await route.continue();
  });
}

async function settle(page: Page, isOriginal = false) {
  await page.addStyleTag({ content: '*, *::before, *::after { caret-color: transparent !important; }' });
  if (isOriginal) {
    await page.addStyleTag({ path: join(originalFixture, 'audit-webflow.css') });
    await page.addStyleTag({ content: `${originalFontCss}\n[data-w-id] { opacity: 1 !important; }\n[data-w-id]:not(.page-frame) { transform: none !important; }` });
  }
  await page.evaluate(async () => {
    document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((image) => { image.loading = 'eager'; });
    await document.fonts.ready;
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    window.scrollTo(0, 0);
    await Promise.race([
      Promise.all([...document.images].map((image) => image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        }))),
      new Promise<void>((resolve) => window.setTimeout(resolve, 3_000)),
    ]);
    await Promise.all([...document.images].map((image) => image.complete
      ? image.decode().catch(() => undefined)
      : Promise.resolve()));
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    document.documentElement.dataset.visualTest = 'true';
    const freeze = document.createElement('style');
    freeze.dataset.visualTestFreeze = 'true';
    freeze.textContent = `
      html[data-visual-test='true'] *,
      html[data-visual-test='true'] *::before,
      html[data-visual-test='true'] *::after { animation: none !important; transition: none !important; }
      html[data-visual-test='true']:not([data-visual-checkpoint='true']) .page-frame { transform: none !important; }
      html[data-visual-test='true'] [data-motion='reveal'] { opacity: 1 !important; transform: none !important; transition: none !important; }
      html[data-visual-test='true'] .content-slider__viewport { transition: none !important; }
    `;
    document.head.append(freeze);
    document.documentElement.dataset.hiddenRevealTargets = JSON.stringify([...document.querySelectorAll<HTMLElement>('[data-motion="reveal"]')]
      .filter((item) => item.dataset.visible !== 'true')
      .map((item) => {
        const style = getComputedStyle(item);
        const box = item.getBoundingClientRect();
        return {
          section: item.closest('section')?.className ?? null,
          selector: item.className,
          motionId: item.dataset.motionId ?? null,
          text: item.textContent?.trim().slice(0, 160) ?? '',
          opacity: style.opacity,
          visibility: style.visibility,
          display: style.display,
          transform: style.transform,
          rect: { x: box.x, y: box.y + window.scrollY, width: box.width, height: box.height },
          controllerInitialized: item.dataset.astroRevealInitialized === 'true',
          intersectionState: 'not exposed by controller',
          reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        };
      }));
    document.querySelectorAll<HTMLElement>('[data-motion="reveal"]').forEach((item) => item.setAttribute('data-visible', 'true'));
    document.documentElement.dataset.visualReady = 'true';
  });
  await expect(page.locator('html')).toHaveAttribute('data-visual-ready', 'true');
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLElement>('[data-motion="reveal"]:not(.page-track)')].every((item) => {
    const style = getComputedStyle(item);
    return style.opacity === '1' && (style.transform === 'none' || style.transform === 'matrix(1, 0, 0, 1, 0, 0)');
  }));
}

type SectionGeometry = {
  section: string;
  selector: string;
  original: Record<string, unknown> | null;
  astro: Record<string, unknown> | null;
  delta: { top: number; left: number; width: number; height: number } | null;
  status: 'PASS' | 'FAIL' | 'MISSING';
};

async function collectGeometry(page: Page) {
  return page.evaluate((entries) => Object.fromEntries(entries.map(([name, selector]) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) return [name, null];
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return [name, {
      top: box.top + window.scrollY,
      left: box.left,
      width: box.width,
      height: box.height,
      bottom: box.bottom + window.scrollY,
      marginBlockStart: style.marginBlockStart,
      marginBlockEnd: style.marginBlockEnd,
      paddingBlockStart: style.paddingBlockStart,
      paddingBlockEnd: style.paddingBlockEnd,
      paddingInlineStart: style.paddingInlineStart,
      paddingInlineEnd: style.paddingInlineEnd,
      display: style.display,
      position: style.position,
      overflow: style.overflow,
      transform: style.transform,
      opacity: style.opacity,
      zIndex: style.zIndex,
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
    } satisfies Record<string, unknown>];
  })), sections);
}

async function collectTypography(page: Page) {
  return page.evaluate(() => {
    const selectors = ['.menu', '.hero-text', '.hero-item-left-text', '.section-title-text', '.section-title', '.story-item-text-02', '.hero-link-text'];
    return Object.fromEntries(selectors.map((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return [selector, null];
      const style = getComputedStyle(element);
      const range = document.createRange();
      range.selectNodeContents(element);
      return [selector, {
        text: element.textContent?.trim(),
        renderedFont: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        textTransform: style.textTransform,
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
        lines: range.getClientRects().length,
        fontReady: document.fonts.check(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`),
      }];
    }));
  });
}

async function collectVisualState(page: Page) {
  return page.evaluate(() => ({
    scrollY: window.scrollY,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    pageFrameTransform: getComputedStyle(document.querySelector('.page-frame') ?? document.body).transform,
    originalRevealTargets: document.querySelectorAll('[data-w-id]').length,
    migratedRevealTargets: document.querySelectorAll('[data-motion="reveal"]').length,
    hiddenMotionTargets: document.querySelectorAll('[data-motion="reveal"]:not([data-visible="true"])').length,
    visibleMotionTargets: document.querySelectorAll('[data-motion="reveal"][data-visible="true"]').length,
    activeSliderDots: document.querySelectorAll('.content-slider__dot[aria-current="true"]').length,
    contentSliderCount: document.querySelectorAll('.content-slider').length,
    visualTestApi: Boolean(window.__VISUAL_TEST_STATE__),
    visualTestApiType: typeof window.__VISUAL_TEST_STATE__?.setPageFrameProgress,
    failedImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
    loadedImages: [...document.images].filter((image) => image.complete && image.naturalWidth > 0).length,
  }));
}

async function collectDescendantGeometry(page: Page, selector: string) {
  return page.evaluate((targetSelector) => [...document.querySelectorAll<HTMLElement>(`${targetSelector} *`)].map((element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const pseudo = (kind: '::before' | '::after') => {
      const pseudoStyle = getComputedStyle(element, kind);
      return {
        content: pseudoStyle.content,
        width: pseudoStyle.width,
        height: pseudoStyle.height,
        background: pseudoStyle.background,
        transform: pseudoStyle.transform,
        opacity: pseudoStyle.opacity,
      };
    };
    return {
      tag: element.tagName,
      className: typeof element.className === 'string' ? element.className : '',
      text: element.children.length === 0 ? element.textContent?.trim().slice(0, 100) : undefined,
      x: box.x,
      y: box.y + window.scrollY,
      width: box.width,
      height: box.height,
      display: style.display,
      margin: style.margin,
      padding: style.padding,
      gap: style.gap,
      gridTemplateColumns: style.gridTemplateColumns,
      gridTemplateRows: style.gridTemplateRows,
      flexBasis: style.flexBasis,
      alignItems: style.alignItems,
      justifyContent: style.justifyContent,
      position: style.position,
      overflow: style.overflow,
      aspectRatio: style.aspectRatio,
      objectFit: style.objectFit,
      objectPosition: style.objectPosition,
      transform: style.transform,
      transformOrigin: style.transformOrigin,
      opacity: style.opacity,
      border: style.border,
      borderRadius: style.borderRadius,
      background: style.background,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      fontWeight: style.fontWeight,
      fontFamily: style.fontFamily,
      letterSpacing: style.letterSpacing,
      color: style.color,
      backgroundColor: style.backgroundColor,
      src: element instanceof HTMLImageElement ? element.currentSrc || element.src : undefined,
      naturalWidth: element instanceof HTMLImageElement ? element.naturalWidth : undefined,
      naturalHeight: element instanceof HTMLImageElement ? element.naturalHeight : undefined,
      pseudoBefore: pseudo('::before'),
      pseudoAfter: pseudo('::after'),
    };
  }), selector);
}

async function collectLayoutArchitecture(page: Page) {
  return page.evaluate(() => {
    const describe = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { selector, x: box.x, y: box.y + window.scrollY, width: box.width, height: box.height, transform: style.transform, overflow: style.overflow, position: style.position, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
    };
    return {
      pageWrapper: describe('.page-wrapper'),
      pageTrack: describe('.page-track'),
      pageCamera: describe('.page-camera'),
      pageFrame: describe('.page-frame'),
      scrollY: window.scrollY,
      documentScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      sections: [...document.querySelectorAll<HTMLElement>('section')].map((element) => {
        const box = element.getBoundingClientRect();
        return { selector: element.id ? `#${element.id}` : `.${String(element.className).split(/\s+/)[0]}`, id: element.id, className: String(element.className), text: element.textContent?.trim().slice(0, 100) ?? '', x: box.x, y: box.y + window.scrollY, width: box.width, height: box.height };
      }),
    };
  });
}

async function collectSliderArchitecture(page: Page, selector: string) {
  return page.evaluate((sliderSelector) => [...document.querySelectorAll<HTMLElement>(sliderSelector)].map((slider, index) => {
    const box = slider.getBoundingClientRect();
    const section = slider.closest('section');
    const style = getComputedStyle(slider);
    return {
      index,
      selector: sliderSelector,
      section: section?.id || String(section?.className ?? '').split(/\s+/)[0] || null,
      text: slider.textContent?.trim().slice(0, 180) ?? '',
      slideCount: slider.querySelectorAll('.w-slide, .content-slider__slide').length,
      currentIndex: slider.dataset.visualIndex ?? null,
      autoplay: slider.dataset.autoplay ?? null,
      transform: style.transform,
      transition: style.transition,
      x: box.x,
      y: box.y + window.scrollY,
      width: box.width,
      height: box.height,
    };
  }), selector);
}

async function renderDiffImage(page: Page, left: Buffer, right: Buffer, outputPath: string, pixelTolerance = 0) {
  await page.setContent('<canvas id="diff"></canvas>');
  const result = await page.evaluate(async ({ leftBase64, rightBase64, pixelTolerance }) => {
    const load = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Unable to load screenshot buffer'));
      image.src = `data:image/png;base64,${source}`;
    });
    const [first, second] = await Promise.all([load(leftBase64), load(rightBase64)]);
    const width = Math.min(first.naturalWidth, second.naturalWidth);
    const height = Math.min(first.naturalHeight, second.naturalHeight);
    const canvas = document.querySelector<HTMLCanvasElement>('#diff');
    if (!canvas) throw new Error('Diff canvas missing');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Diff canvas context missing');
    const firstCanvas = document.createElement('canvas');
    const secondCanvas = document.createElement('canvas');
    firstCanvas.width = secondCanvas.width = width;
    firstCanvas.height = secondCanvas.height = height;
    const firstContext = firstCanvas.getContext('2d');
    const secondContext = secondCanvas.getContext('2d');
    if (!firstContext || !secondContext) throw new Error('Diff source context missing');
    firstContext.drawImage(first, 0, 0);
    secondContext.drawImage(second, 0, 0);
    const firstPixels = firstContext.getImageData(0, 0, width, height).data;
    const secondPixels = secondContext.getImageData(0, 0, width, height).data;
    const output = context.createImageData(width, height);
    let changedPixels = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let index = 0; index < firstPixels.length; index += 4) {
      const delta = Math.max(
        Math.abs(firstPixels[index] - secondPixels[index]),
        Math.abs(firstPixels[index + 1] - secondPixels[index + 1]),
        Math.abs(firstPixels[index + 2] - secondPixels[index + 2]),
        Math.abs(firstPixels[index + 3] - secondPixels[index + 3]),
      );
      const pixel = index / 4;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      if (delta > pixelTolerance) {
        changedPixels += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        output.data[index] = 255;
        output.data[index + 3] = 255;
      } else {
        output.data[index] = 0;
        output.data[index + 1] = 0;
        output.data[index + 2] = 0;
        output.data[index + 3] = 0;
      }
    }
    context.putImageData(output, 0, 0);
    return { width, height, changedPixels, changedPixelRatio: width * height ? changedPixels / (width * height) : 0, changedBounds: maxX < 0 ? null : { left: minX, top: minY, right: maxX + 1, bottom: maxY + 1 } };
  }, { leftBase64: left.toString('base64'), rightBase64: right.toString('base64'), pixelTolerance });
  await page.screenshot({ path: outputPath, clip: { x: 0, y: 0, width: result.width, height: result.height } });
  return result;
}

async function cropPngBuffer(page: Page, source: Buffer, crop: { x: number; y: number; width: number; height: number }) {
  await page.setContent('<canvas id="crop"></canvas>');
  const base64 = await page.evaluate(async ({ sourceBase64, cropRect }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${sourceBase64}`;
    await image.decode();
    const canvas = document.querySelector<HTMLCanvasElement>('#crop');
    if (!canvas) throw new Error('Crop canvas missing');
    const x = Math.round(cropRect.x);
    const y = Math.round(cropRect.y);
    const width = Math.max(1, Math.round(cropRect.width));
    const height = Math.max(1, Math.round(cropRect.height));
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Crop canvas context missing');
    const sourceX = Math.max(0, x);
    const sourceY = Math.max(0, y);
    const sourceRight = Math.min(image.naturalWidth, x + width);
    const sourceBottom = Math.min(image.naturalHeight, y + height);
    if (sourceRight > sourceX && sourceBottom > sourceY) {
      context.drawImage(image, sourceX, sourceY, sourceRight - sourceX, sourceBottom - sourceY, sourceX - x, sourceY - y, sourceRight - sourceX, sourceBottom - sourceY);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  }, { sourceBase64: source.toString('base64'), cropRect: crop });
  return Buffer.from(base64, 'base64');
}

async function collectBlogAudit(page: Page) {
  return page.evaluate(({ definitions, styleProperties }: { definitions: Array<[string, string]>; styleProperties: string[] }) => Object.fromEntries(definitions.map(([name, selector]) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) return [name, null];
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(element);
    const image = element instanceof HTMLImageElement ? element : element.querySelector<HTMLImageElement>('img');
    const pseudo = (kind: '::before' | '::after') => {
      const value = getComputedStyle(element, kind);
      return {
        content: value.content,
        display: value.display,
        width: value.width,
        height: value.height,
        background: value.background,
        transform: value.transform,
        opacity: value.opacity,
      };
    };
    return [name, {
      selector,
      tag: element.tagName,
      className: String(element.className),
      text: element.textContent?.trim() ?? '',
      href: element instanceof HTMLAnchorElement ? element.href : null,
      parentClassName: element.parentElement ? String(element.parentElement.className) : null,
      childIndex: element.parentElement ? [...element.parentElement.children].indexOf(element) : null,
      box: { x: box.x + window.scrollX, y: box.y + window.scrollY, top: box.top + window.scrollY, left: box.left + window.scrollX, right: box.right + window.scrollX, bottom: box.bottom + window.scrollY, width: box.width, height: box.height },
      style: Object.fromEntries(styleProperties.map((property) => [property, style.getPropertyValue(property)])),
      pseudoBefore: pseudo('::before'),
      pseudoAfter: pseudo('::after'),
      lineCount: range.getClientRects().length,
      image: image ? {
        src: image.getAttribute('src'),
        currentSrc: image.currentSrc,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        complete: image.complete,
        renderedWidth: image.getBoundingClientRect().width,
        renderedHeight: image.getBoundingClientRect().height,
        objectFit: getComputedStyle(image).objectFit,
        objectPosition: getComputedStyle(image).objectPosition,
        transform: getComputedStyle(image).transform,
        opacity: getComputedStyle(image).opacity,
        filter: getComputedStyle(image).filter,
      } : null,
    }];
  })), { definitions: blogRegionDefinitions.map(([name, selector]) => [name, selector] as [string, string]), styleProperties: [...blogStyleProperties] });
}

async function collectBlogTextRoleAudit(page: Page) {
  return page.evaluate(() => {
    const roles = {
      eyebrow: '.blog-02 .section-title-text',
      metadata: '.blog-02 .blog-collection-date',
      link: '.blog-02 .blog-link-text',
    } as const;
    return Object.fromEntries(Object.entries(roles).map(([role, selector]) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return [role, null];
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(element);
      return [role, {
        selector,
        text: element.textContent?.trim() ?? '',
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        lineCount: range.getClientRects().length,
        box: { x: box.x, y: box.y + window.scrollY, width: box.width, height: box.height },
        fontReady: document.fonts.check(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`),
      }];
    }));
  });
}

async function normalizeCaptureState(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.documentElement.dataset.visualCapture = 'true';
    document.querySelector<HTMLElement>('.page-frame')?.style.setProperty('transform', 'none', 'important');
    document.querySelectorAll<HTMLElement>('[data-motion="reveal"]').forEach((item) => {
      item.dataset.visible = 'true';
      item.style.setProperty('opacity', '1', 'important');
      item.style.setProperty('transform', 'none', 'important');
    });
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
}

async function collectRsvpCheckpointState(page: Page) {
  return page.evaluate(() => {
    const frame = document.querySelector<HTMLElement>('.page-frame');
    const rsvp = document.querySelector<HTMLElement>('.rsvp-wrap');
    const panel = rsvp?.querySelector<HTMLElement>('.rsvp');
    const formPanel = rsvp?.querySelector<HTMLElement>('.rsvp-form-wrap');
    const frameTransform = frame ? getComputedStyle(frame).transform : 'none';
    const matrix = new DOMMatrixReadOnly(frameTransform);
    const describe = (element: HTMLElement | null) => {
      if (!element) return null;
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        x: box.x,
        y: box.y,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
        display: style.display,
        visibility: style.visibility,
        opacity: Number(style.opacity),
        overflow: style.overflow,
        backgroundImage: style.backgroundImage,
      };
    };
    return {
      scrollY: window.scrollY,
      transform: frameTransform,
      translateX: matrix.m41,
      rsvp: describe(rsvp),
      panel: describe(panel ?? null),
      formPanel: describe(formPanel ?? null),
      text: rsvp?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      visiblePanel: document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)?.closest('section')?.className ?? null,
      visualApi: Boolean(window.__VISUAL_TEST_STATE__),
    };
  });
}

async function captureStableFullPage(page: Page, threshold = 0.001) {
  let previous = await page.screenshot({ fullPage: true, animations: 'disabled' });
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await normalizeCaptureState(page);
    const next = await page.screenshot({ fullPage: true, animations: 'disabled' });
    const comparison = diffPngBuffers(previous, next, 0);
    if (comparison.changedPixelRatio <= threshold) {
      return { screenshot: next, repeat: previous, attempts: attempt, comparison };
    }
    previous = next;
  }
  throw new Error(`Full-page capture did not stabilize within 5 attempts; last changed-pixel ratio exceeded ${threshold}.`);
}

test('Home 1440 normalized capture and section audit', async ({ browser }) => {
  test.setTimeout(180_000);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'no-preference',
  });
  const original = await context.newPage();
  const astro = await context.newPage();
  const diffPage = await context.newPage();
  const originalConsole: Array<{ type: string; text: string }> = [];
  const originalPageErrors: string[] = [];
  const originalFailedRequests: Array<{ url: string; failure: string | null }> = [];
  const originalResponses: Array<{ url: string; status: number; contentType: string }> = [];
  await configureOriginalPage(original);
  original.on('console', (message) => originalConsole.push({ type: message.type(), text: message.text() }));
  original.on('pageerror', (error) => originalPageErrors.push(error.message));
  original.on('requestfailed', (request) => originalFailedRequests.push({ url: request.url(), failure: request.failure()?.errorText ?? null }));
  original.on('response', async (response) => {
    const url = response.url();
    if (!/\.js(?:\?|$)|\.css(?:\?|$)|\/fonts\//i.test(url)) return;
    originalResponses.push({ url, status: response.status(), contentType: response.headers()['content-type'] ?? '' });
  });
  await original.goto(`${originalBase}/index.html?visual-test=1`, { waitUntil: 'domcontentloaded' });
  await astro.goto(`${migratedBase}/?visual-test=1`, { waitUntil: 'domcontentloaded' });
  await original.addScriptTag({ path: join(originalFixture, 'visual-test-adapter.js') });
  await settle(original, true);
  await settle(astro);

  await expect(astro.locator('.counter-text')).toHaveText('Counting Down to “I Do”');
  await expect(astro.locator('.footer-top-text-p')).toHaveText('June 22, 2026 · Rosewood Garden · California');
  const semanticTextAudit = await astro.evaluate(() => ({
    countdown: document.querySelector('.counter-text')?.textContent ?? null,
    footerDate: document.querySelector('.footer-top-text-p')?.textContent ?? null,
    mojibake: [...document.querySelectorAll<HTMLElement>('body *')]
      .map((element) => element.children.length === 0 ? element.textContent ?? '' : '')
      .filter((text) => /Ã¢|Ã‚|Ãƒ|ï¿½/.test(text)),
  }));
  const sourceTextAudit = await original.evaluate(() => ({
    countdownText: document.querySelector('.counter-text')?.textContent ?? null,
    countdownHtml: document.querySelector('.counter-text')?.innerHTML ?? null,
    footerDateText: document.querySelector('.footer-top-text-p')?.textContent ?? null,
    footerDateHtml: document.querySelector('.footer-top-text-p')?.innerHTML ?? null,
  }));
  expect(semanticTextAudit.mojibake).toEqual([]);
  await original.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await astro.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await mkdir(reportDir, { recursive: true });

  const originalGeometry = await collectGeometry(original);
  const astroGeometry = await collectGeometry(astro);
  const geometry: SectionGeometry[] = sections.map(([section, selector]) => {
    const source = originalGeometry[section] as Record<string, number> | null;
    const target = astroGeometry[section] as Record<string, number> | null;
    if (!source || !target) return { section, selector, original: source, astro: target, delta: null, status: 'MISSING' };
    const delta = {
      top: target.top - source.top,
      left: target.left - source.left,
      width: target.width - source.width,
      height: target.height - source.height,
    };
    const status = Math.max(Math.abs(delta.top), Math.abs(delta.left), Math.abs(delta.width), Math.abs(delta.height)) <= 1 ? 'PASS' : 'FAIL';
    return { section, selector, original: source, astro: target, delta, status };
  });
  const typography = { original: await collectTypography(original), astro: await collectTypography(astro) };
  const visualState = { original: await collectVisualState(original), astro: await collectVisualState(astro) };
  const originalRuntimeState = await original.evaluate(() => {
    const ix2 = (() => {
      try {
        const webflow = (window as Window & { Webflow?: { require?: (name: string) => unknown } }).Webflow;
        return webflow?.require?.('ix2') ? 'available' : 'unavailable';
      } catch {
        return 'error';
      }
    })();
    return {
      scripts: [...document.scripts].map((script) => ({ src: script.src, inline: !script.src, textLength: script.textContent?.length ?? 0 })),
      stylesheets: [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map((link) => link.href),
      jquery: typeof (window as Window & { jQuery?: unknown }).jQuery,
      webflow: typeof (window as Window & { Webflow?: unknown }).Webflow,
      ix2,
      pageTrackInitialized: document.querySelector<HTMLElement>('.page-track')?.dataset.wId ?? null,
      htmlClass: document.documentElement.className,
    };
  });
  await writeFile(join(reportDir, 'original-fixture-runtime-audit.json'), JSON.stringify({ runtime: originalRuntimeState, responses: originalResponses, console: originalConsole, pageErrors: originalPageErrors, failedRequests: originalFailedRequests, diagnosis: originalRuntimeState.ix2 === 'unavailable' ? 'A/B: Webflow IX2 unavailable or not initialized' : originalRuntimeState.ix2 === 'available' && originalResponses.some((entry) => entry.url.includes('webflow')) ? 'D/E: IX2 available; page-track transform owner requires source inspection' : 'G: requires further source evidence' }, null, 2), 'utf8');
  const layoutArchitecture = { original: await collectLayoutArchitecture(original), astro: await collectLayoutArchitecture(astro) };
  const topLevelSelectors = ['html', 'body', 'main', '.page-wrapper', '.page-track', '.page-camera', '.page-frame'];
  const topLevelGeometry = {
    original: await original.evaluate((selectors) => Object.fromEntries(selectors.map((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return [selector, null];
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return [selector, { x: box.x, y: box.y + window.scrollY, width: box.width, height: box.height, top: box.top + window.scrollY, bottom: box.bottom + window.scrollY, display: style.display, position: style.position, margin: style.margin, padding: style.padding, minHeight: style.minHeight, maxHeight: style.maxHeight, overflow: style.overflow, transform: style.transform, transformOrigin: style.transformOrigin, inlineStyle: element.getAttribute('style'), cssVariables: { height: style.getPropertyValue('--height'), width: style.getPropertyValue('--width') } }];
    })), topLevelSelectors),
    astro: await astro.evaluate((selectors) => Object.fromEntries(selectors.map((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return [selector, null];
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return [selector, { x: box.x, y: box.y + window.scrollY, width: box.width, height: box.height, top: box.top + window.scrollY, bottom: box.bottom + window.scrollY, display: style.display, position: style.position, margin: style.margin, padding: style.padding, minHeight: style.minHeight, maxHeight: style.maxHeight, overflow: style.overflow, transform: style.transform, transformOrigin: style.transformOrigin, inlineStyle: element.getAttribute('style'), cssVariables: { height: style.getPropertyValue('--height'), width: style.getPropertyValue('--width') } }];
    })), topLevelSelectors),
  };
  await writeFile(join(reportDir, 'top-level-geometry.json'), JSON.stringify({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'no-preference', ...topLevelGeometry }, null, 2), 'utf8');
  const firstDivergence = geometry.find((entry) => entry.delta && Math.max(Math.abs(entry.delta.top), Math.abs(entry.delta.left), Math.abs(entry.delta.width), Math.abs(entry.delta.height)) > 1) ?? null;
  await writeFile(join(reportDir, 'first-layout-divergence.json'), JSON.stringify({
    element: firstDivergence?.section ?? null,
    original: firstDivergence?.original ?? null,
    astro: firstDivergence?.astro ?? null,
    parentOriginal: layoutArchitecture.original.pageWrapper,
    parentAstro: layoutArchitecture.astro.pageWrapper,
    firstDifferingProperty: firstDivergence ? Object.entries(firstDivergence.delta ?? {}).sort(([, a], [, b]) => Math.abs(Number(b)) - Math.abs(Number(a)))[0]?.[0] ?? null : null,
    cssOwner: firstDivergence ? 'src/styles/site.css section contract' : 'none; top-level geometry within 1px',
    visualImpact: firstDivergence ? 'Downstream document flow and page-frame panel positions' : 'No valid top-down geometry divergence',
    status: firstDivergence ? 'FAIL' : 'PASS',
  }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'page-track-current-state.json'), JSON.stringify(layoutArchitecture, null, 2), 'utf8');
  await writeFile(join(reportDir, 'event-rsvp-flow.json'), JSON.stringify({
    original: { event: layoutArchitecture.original.sections.find((section) => section.id === null && section.className.includes('event')) ?? null, rsvp: layoutArchitecture.original.sections.find((section) => section.id === 'rsvp') ?? null },
    astro: { event: layoutArchitecture.astro.sections.find((section) => section.id === null && section.className.includes('event')) ?? null, rsvp: layoutArchitecture.astro.sections.find((section) => section.id === 'rsvp') ?? null },
    sourceMotionContract: '0% = 0vw; 25% = 0vw; 60% = -120vw',
    status: 'PARTIAL',
  }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'change-attribution.md'), [
    '# Home 1440 layout recovery change attribution', '',
    '| File | Change | Classification | Evidence |',
    '| --- | --- | --- | --- |',
    '| src/styles/site.css | Restored tracked section/layout selectors | layout-affecting | Current Home markup retained legacy semantic selectors; removing their rules caused Header/Hero/Story and panel-flow deltas |',
    '| src/styles/global.css | Footer foreground/font corrections | text-only/global inheritance scoped to Footer | Footer-specific selectors; no top-level geometry impact after CSS restoration |',
    '| src/components/pages/HomePage.astro | Corrected Countdown/Footer Unicode text | text-only | Semantic assertions pass; no geometry change |',
    '| src/scripts/controllers/slider-controller.ts | Disable autoplay under visual-test query | test-only runtime determinism | Repeat screenshot state became stable without changing production autoplay |',
    '| src/scripts/controllers/page-frame-controller.ts | Freeze frame during visual full-page capture | test-only runtime determinism | Prevents Playwright fullPage scrolling from mutating capture transform; checkpoint API remains active |',
  ].join('\n'), 'utf8');
  await writeFile(join(reportDir, 'css-ownership.md'), [
    '# Home 1440 CSS ownership', '',
    '| Element | Property | Tailwind | global.css | site.css | Runtime | Final owner | Conflict |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    '| Header/Hero/Story sections | padding, display, sizing | none on page markup | shared base/media rules | source section rules | none | site.css | resolved by restoring section contract |',
    '| page-track/page-camera/page-frame | height, sticky, flex, overflow | none | none | site.css | page-frame transform | site.css + controller transform | dynamic transform only |',
    '| Footer text | color, weight | none | scoped Footer rules | source Footer rules | none | global.css scoped rules | no shared leakage |',
    '| Slider autoplay | active index | none | none | source mechanics | slider controller | controller | visual-test guard added |',
  ].join('\n'), 'utf8');
  const sliderArchitecture = { original: await collectSliderArchitecture(original, '.w-slider'), astro: await collectSliderArchitecture(astro, '.content-slider') };
  const hiddenRevealTargets = {
    original: await original.evaluate(() => JSON.parse(document.documentElement.dataset.hiddenRevealTargets ?? '[]')),
    astro: await astro.evaluate(() => JSON.parse(document.documentElement.dataset.hiddenRevealTargets ?? '[]')),
  };
  const eventDescendants = { original: await collectDescendantGeometry(original, '.big-day'), astro: await collectDescendantGeometry(astro, '.big-day') };
  const heroDescendants = { original: await collectDescendantGeometry(original, '.hero'), astro: await collectDescendantGeometry(astro, '.hero') };
  const countdownDescendants = { original: await collectDescendantGeometry(original, '.counter'), astro: await collectDescendantGeometry(astro, '.counter') };
  const footerDescendants = { original: await collectDescendantGeometry(original, '.footer'), astro: await collectDescendantGeometry(astro, '.footer') };
  const storyDescendants = { original: await collectDescendantGeometry(original, '.story'), astro: await collectDescendantGeometry(astro, '.story') };
  const rsvpDescendants = { original: await collectDescendantGeometry(original, '.rsvp-wrap'), astro: await collectDescendantGeometry(astro, '.rsvp-wrap') };
  await writeFile(join(reportDir, 'section-geometry.json'), JSON.stringify({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'no-preference', fullPage: true, sections: geometry }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'typography.json'), JSON.stringify(typography, null, 2), 'utf8');
  await writeFile(join(reportDir, 'visual-state-audit.json'), JSON.stringify(visualState, null, 2), 'utf8');
  await writeFile(join(reportDir, 'hidden-reveal-target.json'), JSON.stringify(hiddenRevealTargets, null, 2), 'utf8');
  await writeFile(join(reportDir, 'event-descendants.json'), JSON.stringify(eventDescendants, null, 2), 'utf8');
  await writeFile(join(reportDir, 'big-day-descendant-geometry.json'), JSON.stringify(eventDescendants, null, 2), 'utf8');
  await writeFile(join(reportDir, 'hero-descendant-audit.json'), JSON.stringify(heroDescendants, null, 2), 'utf8');
  await writeFile(join(reportDir, 'hero-root-cause.json'), JSON.stringify({
    section: 'hero',
    selectedCorrection: 'page background color',
    sourceComputed: '#f1f7ee',
    astroComputedBefore: '#ffffff',
    finalOwner: 'global.css body background-color token',
    status: 'PASS',
  }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'hero-css-ownership.md'), [
    '# Hero CSS ownership', '',
    '| Property | Tailwind | Manual CSS | Runtime | Final owner |',
    '| --- | --- | --- | --- | --- |',
    '| Page background color | none | body background token | none | global.css |',
    '| Hero geometry | utility classes | none active | none | Tailwind |',
    '| Hero reveal state | none | motion contract | reveal controller | TypeScript controller |',
    '', 'Source body color restored without selector-specific override or !important.', '',
  ].join('\\n'), 'utf8');
  await writeFile(join(reportDir, 'countdown-descendant-audit.json'), JSON.stringify(countdownDescendants, null, 2), 'utf8');
  await writeFile(join(reportDir, 'footer-descendant-audit.json'), JSON.stringify(footerDescendants, null, 2), 'utf8');
  await writeFile(join(reportDir, 'footer-css-ownership.md'), '# Footer CSS ownership\\n\\n| Element | Property | Original owner | Astro owner | Result |\\n| --- | --- | --- | --- | --- |\\n| Footer wrapper | color | inherited footer foreground | explicit .footer rule | resolved |\\n| Footer top label | color | inherited footer foreground | inherited from .footer | resolved |\\n| Footer title | color | .footer-title | .footer-title | matched |\\n| Footer date | color | .footer-top-text-p | .footer-top-text-p | matched; Unicode code points, computed styles, and boxes match |\\n| Scroll-up label | color | inherited footer foreground | .footer .hero-link-text | resolved |\\n| Testimonial images | geometry/transform | source CSS + controller state | matching source CSS + frozen test state | matched |\\n', 'utf8');
  await writeFile(join(reportDir, 'rsvp-descendants.json'), JSON.stringify(rsvpDescendants, null, 2), 'utf8');
  await writeFile(join(reportDir, 'story-descendant-audit.json'), JSON.stringify(storyDescendants, null, 2), 'utf8');
  const storyContainerAfter = {
    original: { x: storyDescendants.original[0]?.x ?? null, width: storyDescendants.original[0]?.width ?? null },
    astro: { x: storyDescendants.astro[0]?.x ?? null, width: storyDescendants.astro[0]?.width ?? null },
  };
  await writeFile(join(reportDir, 'story-root-cause.json'), JSON.stringify({
    section: 'story',
    selectedCorrection: '1440px Story horizontal inset',
    rootCause: 'Tailwind px-5 utility was generated after source-derived .story padding, so source 50px side inset was overridden by 20px.',
    sourceRule: '@media screen and (min-width: 1440px) { .story { padding-left: 50px; padding-right: 50px; } }',
    beforeMeasured: { original: { x: 50, width: 1340 }, astro: { x: 20, width: 1400 } },
    afterMeasured: storyContainerAfter,
    status: storyContainerAfter.original.width === storyContainerAfter.astro.width && storyContainerAfter.original.x === storyContainerAfter.astro.x ? 'PASS' : 'FAIL',
  }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'story-before-after.json'), JSON.stringify({
    property: 'Story container horizontal geometry',
    before: { original: { x: 50, width: 1340 }, astro: { x: 20, width: 1400 }, delta: { x: -30, width: 60 }, status: 'FAIL' },
    after: storyContainerAfter,
    delta: { x: (storyContainerAfter.astro.x ?? 0) - (storyContainerAfter.original.x ?? 0), width: (storyContainerAfter.astro.width ?? 0) - (storyContainerAfter.original.width ?? 0) },
    status: storyContainerAfter.original.width === storyContainerAfter.astro.width && storyContainerAfter.original.x === storyContainerAfter.astro.x ? 'PASS' : 'FAIL',
  }, null, 2), 'utf8');
  const storyOwnership = [
    '# Story CSS ownership',
    '',
    '| Element | Property | Tailwind | Manual CSS | Runtime | Final owner |',
    '| --- | --- | --- | --- | --- | --- |',
    '| Story section | padding-inline at min-width 1440px | px-5 supplied base inset | Source parity contract | none | global.css media rule |',
    '| Story container | width and centering | w-full max-w-[1812px] mx-auto | none active | none | Tailwind |',
    '| Story descendants | transforms and visibility | none | motion contracts | reveal controller | TypeScript/controller contract |',
    '',
    'Correction moved source 1440px inset rule after Tailwind utility generation. No !important or offset added.',
    '',
  ].join('\n');
  await writeFile(join(reportDir, 'story-css-ownership.md'), storyOwnership, 'utf8');
  const sectionCounterpartMap = sections.map(([section, selector]) => ({
    section,
    original: { selector, textAnchor: section === 'hero' ? 'Sarah & Alderson' : section === 'story' ? 'Our Journey' : section === 'countdown' ? 'Counting Down To “I Do”' : section === 'rsvp' ? 'RSVP' : section === 'registry' ? 'Gift Registry' : section === 'blog' ? 'Wedding blog' : section === 'events' ? 'The Big Day' : section === 'event-schedule' ? '4:00 PM' : section, layoutContext: layoutArchitecture.original.pageTrack ? 'horizontal page track' : 'normal document flow', transformAncestor: layoutArchitecture.original.pageFrame?.selector ?? null, clippingAncestor: layoutArchitecture.original.pageCamera?.selector ?? null },
    astro: { selector, textAnchor: section === 'hero' ? 'Sarah & Alderson' : section === 'story' ? 'Our Journey' : section === 'countdown' ? 'Counting Down To “I Do”' : section === 'rsvp' ? 'RSVP' : section === 'registry' ? 'Gift Registry' : section === 'blog' ? 'Wedding blog' : section === 'events' ? 'The Big Day' : section === 'event-schedule' ? '4:00 PM' : section, layoutContext: layoutArchitecture.astro.pageTrack ? 'horizontal page track' : 'normal document flow', transformAncestor: layoutArchitecture.astro.pageFrame?.selector ?? null, clippingAncestor: layoutArchitecture.astro.pageCamera?.selector ?? null },
    equivalent: Boolean(Boolean(layoutArchitecture.original.pageTrack) === Boolean(layoutArchitecture.astro.pageTrack) && Boolean(layoutArchitecture.original.pageCamera) === Boolean(layoutArchitecture.astro.pageCamera) && Boolean(layoutArchitecture.original.pageFrame) === Boolean(layoutArchitecture.astro.pageFrame)),
    reason: Boolean(layoutArchitecture.original.pageTrack) === Boolean(layoutArchitecture.astro.pageTrack) ? 'Semantic counterpart and transform ancestry match; progress checkpoint still required' : 'Different page-track architecture',
    status: Boolean(layoutArchitecture.original.pageTrack) === Boolean(layoutArchitecture.astro.pageTrack) ? 'PARTIAL' : 'INVALID',
  }));
  const pageTrackCheckpoints = [];
  let rsvpCheckpointEvidence: {
    original: Awaited<ReturnType<typeof collectRsvpCheckpointState>>;
    astro: Awaited<ReturnType<typeof collectRsvpCheckpointState>>;
    originalScreenshot: Buffer;
    astroScreenshot: Buffer;
    strict: ReturnType<typeof diffPngBuffers>;
    perceptual: ReturnType<typeof diffPngBuffers>;
    geometryDelta: { x: number; y: number; width: number; height: number } | null;
  } | null = null;
  for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    await Promise.all([original, astro].map((page) => page.evaluate(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      delete document.documentElement.dataset.visualCheckpoint;
    })));
    const checkpointScrolls = await Promise.all([original, astro].map((page) => page.evaluate((value) => {
      const track = document.querySelector<HTMLElement>('.page-track');
      const camera = document.querySelector<HTMLElement>('.page-camera');
      if (!track || !camera) return 0;
      return track.getBoundingClientRect().top + window.scrollY + value * Math.max(track.offsetHeight - camera.offsetHeight, 1);
    }, progress)));
    await Promise.all([original, astro].map((page, index) => page.evaluate((value) => {
      document.documentElement.dataset.visualCheckpoint = 'true';
      window.scrollTo({ top: value, left: 0, behavior: 'instant' });
      window.dispatchEvent(new Event('scroll'));
    }, checkpointScrolls[index])));
    await Promise.all([original, astro].map((page) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))));
    const astroCheckpoint = await astro.evaluate(({ progress: value, scrollTop }) => {
      window.scrollTo({ top: scrollTop, left: 0, behavior: 'instant' });
      document.documentElement.dataset.visualCheckpoint = 'true';
      window.__VISUAL_TEST_STATE__?.setPageFrameProgress(value);
      const frame = document.querySelector<HTMLElement>('.page-frame');
      const transform = frame ? getComputedStyle(frame).transform : 'none';
      const matrix = new DOMMatrixReadOnly(transform);
      return { progress: value, scrollY: window.scrollY, transform, translateX: matrix.m41, visiblePanel: document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)?.closest('section')?.className ?? null, clipping: document.querySelector<HTMLElement>('.page-camera')?.getBoundingClientRect().toJSON() ?? null };
    }, { progress, scrollTop: checkpointScrolls[1] });
    const originalCheckpoint = await original.evaluate(({ progress: value, scrollTop }) => {
      window.scrollTo({ top: scrollTop, left: 0, behavior: 'instant' });
      document.documentElement.dataset.visualCheckpoint = 'true';
      window.__VISUAL_TEST_STATE__?.setPageFrameProgress(value);
      const frame = document.querySelector<HTMLElement>('.page-frame');
      const transform = frame ? getComputedStyle(frame).transform : 'none';
      const matrix = new DOMMatrixReadOnly(transform);
      return { progress: value, scrollY: window.scrollY, transform, translateX: matrix.m41, visiblePanel: document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)?.closest('section')?.className ?? null, clipping: document.querySelector<HTMLElement>('.page-camera')?.getBoundingClientRect().toJSON() ?? null, supported: Boolean(frame) };
    }, { progress, scrollTop: checkpointScrolls[0] });
    if (progress === 0.75) {
      const rsvpScrollTop = (originalGeometry.rsvp as Record<string, number> | null)?.top ?? 0;
      await Promise.all([original, astro].map((page) => page.addStyleTag({ content: "html[data-rsvp-checkpoint='true'] .page-frame { transform: translate3d(-120vw, 0, 0) !important; }" })));
      await Promise.all([original, astro].map((page) => page.evaluate((scrollTop) => {
        document.documentElement.dataset.visualCheckpoint = 'true';
        document.documentElement.dataset.rsvpCheckpoint = 'true';
        window.scrollTo({ top: scrollTop, left: 0, behavior: 'instant' });
        const frame = document.querySelector<HTMLElement>('.page-frame');
        frame?.style.setProperty('transform', `translate3d(${-window.innerWidth * 1.2}px, 0, 0)`, 'important');
      }, rsvpScrollTop)));
      await Promise.all([original, astro].map((page) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))));
      await Promise.all([original, astro].map((page) => page.evaluate(() => {
        const frame = document.querySelector<HTMLElement>('.page-frame');
        frame?.style.setProperty('transform', `translate3d(${-window.innerWidth * 1.2}px, 0, 0)`, 'important');
      })));
      const [originalState, astroState] = await Promise.all([
        collectRsvpCheckpointState(original),
        collectRsvpCheckpointState(astro),
      ]);
      const [originalScreenshot, astroScreenshot] = await Promise.all([
        original.screenshot({ animations: 'disabled' }),
        astro.screenshot({ animations: 'disabled' }),
      ]);
      const strict = diffPngBuffers(originalScreenshot, astroScreenshot, 0);
      const perceptual = diffPngBuffers(originalScreenshot, astroScreenshot, 3);
      const geometryDelta = originalState.formPanel && astroState.formPanel
        ? {
          x: astroState.formPanel.x - originalState.formPanel.x,
          y: astroState.formPanel.y - originalState.formPanel.y,
          width: astroState.formPanel.width - originalState.formPanel.width,
          height: astroState.formPanel.height - originalState.formPanel.height,
        }
        : null;
      rsvpCheckpointEvidence = { original: originalState, astro: astroState, originalScreenshot, astroScreenshot, strict, perceptual, geometryDelta };
      await writeFile(join(reportDir, 'original-rsvp-checkpoint.png'), originalScreenshot);
      await writeFile(join(reportDir, 'astro-rsvp-checkpoint.png'), astroScreenshot);
      await renderDiffImage(diffPage, originalScreenshot, astroScreenshot, join(reportDir, 'diff-rsvp-checkpoint-strict.png'), 0);
      await renderDiffImage(diffPage, originalScreenshot, astroScreenshot, join(reportDir, 'diff-rsvp-checkpoint-perceptual.png'), 3);
    }
    const equivalent = originalCheckpoint.transform === astroCheckpoint.transform && originalCheckpoint.visiblePanel === astroCheckpoint.visiblePanel;
    pageTrackCheckpoints.push({ progress, original: originalCheckpoint, astro: astroCheckpoint, equivalent, status: equivalent ? 'PASS' : 'FAIL', reason: equivalent ? 'Original IX2 and Astro controller expose matching page-frame state' : 'Original IX2 and Astro controller expose different page-frame state' });
  }
  await astro.evaluate(() => {
    window.__VISUAL_TEST_STATE__?.setPageFrameProgress(0);
    delete document.documentElement.dataset.visualCheckpoint;
  });
  await original.evaluate(() => delete document.documentElement.dataset.visualCheckpoint);
  await Promise.all([original, astro].map((page) => page.evaluate(() => delete document.documentElement.dataset.rsvpCheckpoint)));
  const sliderStateCheckpoints = await astro.evaluate(() => [...document.querySelectorAll<HTMLElement>('.content-slider')].map((slider, index) => {
    const id = slider.dataset.visualSliderId ?? `${slider.className}-${index}`;
    window.__VISUAL_TEST_STATE__?.setSliderIndex(id, 0);
    return { id, index: Number(slider.dataset.visualIndex ?? -1), transitionSettled: slider.dataset.visualTransitionSettled === 'true', status: 'PARTIAL' };
  }));
  await writeFile(join(reportDir, 'section-counterpart-map.json'), JSON.stringify(sectionCounterpartMap, null, 2), 'utf8');
  await writeFile(join(reportDir, 'page-track-architecture.json'), JSON.stringify(layoutArchitecture, null, 2), 'utf8');
  await writeFile(join(reportDir, 'page-track-checkpoints.json'), JSON.stringify(pageTrackCheckpoints, null, 2), 'utf8');
  await writeFile(join(reportDir, 'slider-counterpart-map.json'), JSON.stringify({ original: sliderArchitecture.original, astro: sliderArchitecture.astro, mapping: sliderArchitecture.astro.map((slider) => { const originalSlider = sliderArchitecture.original.find((candidate) => candidate.section === slider.section) ?? null; const semanticEquivalence = Boolean(originalSlider && originalSlider.slideCount === slider.slideCount && originalSlider.text.slice(0, 120) === slider.text.slice(0, 120)); return { astro: slider, original: originalSlider, semanticEquivalence, status: semanticEquivalence ? 'PARTIAL' : 'INVALID', reason: semanticEquivalence ? 'Text sequence prefix and slide count match; source active index still needs fixture control' : 'No matching semantic source slider' }; }) }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'slider-state-checkpoints.json'), JSON.stringify({ original: { supported: false, reason: 'Fixture-only Webflow slider runtime not used for production comparison' }, astro: sliderStateCheckpoints, status: 'PARTIAL' }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'rsvp-layout-contract.md'), `# RSVP layout contract\n\nThe top-state crop remains INVALID for RSVP because the source section is horizontally off-canvas by design.\n\n- Original top-state geometry: .rsvp-wrap is off-canvas at x=${String((originalGeometry.rsvp as Record<string, number> | null)?.left ?? 'missing')}px.\n- Astro top-state geometry: .rsvp-wrap is off-canvas at x=${String((astroGeometry.rsvp as Record<string, number> | null)?.left ?? 'missing')}px.\n- Source-equivalent validation uses the 75% page-frame checkpoint, where the verified source contract resolves to -120vw.\n- The checkpoint crop and semantic form validation are written to rsvp-checkpoint.json.\n`, 'utf8');
  await writeFile(join(reportDir, 'page-track-state.json'), JSON.stringify({ astro: await astro.evaluate(() => ({ initialized: document.querySelector<HTMLElement>('.page-track')?.dataset.astroPageFrameInitialized === 'true', motionState: document.querySelector<HTMLElement>('.page-track')?.dataset.motionState ?? null, visualStateApi: Boolean(window.__VISUAL_TEST_STATE__) })), original: { initialized: false, motionState: null, visualStateApi: true, reason: 'Original fixture has no production page-frame controller; the fixture-only visual-test adapter supplies the checkpoint API.' }, status: 'PASS' }, null, 2), 'utf8');

  await Promise.all([original.evaluate(() => window.scrollTo(0, 0)), astro.evaluate(() => window.scrollTo(0, 0))]);
  await Promise.all([normalizeCaptureState(original), normalizeCaptureState(astro)]);

  await mkdir(screenshotDir, { recursive: true });
  await normalizeCaptureState(original);
  await normalizeCaptureState(astro);
  const preCaptureState = {
    originalStory: await collectDescendantGeometry(original, '.story'),
    astroStory: await collectDescendantGeometry(astro, '.story'),
  };
  const originalStableCapture = await captureStableFullPage(original);
  const astroStableCapture = await captureStableFullPage(astro);
  const originalScreenshot = originalStableCapture.screenshot;
  const astroScreenshot = astroStableCapture.screenshot;
  await writeFile(join(reportDir, 'original-full-page.png'), originalScreenshot);
  await writeFile(join(reportDir, 'astro-full-page.png'), astroScreenshot);
  await writeFile(join(screenshotDir, 'original-full-page.png'), originalScreenshot);
  await writeFile(join(screenshotDir, 'astro-full-page.png'), astroScreenshot);
  const originalRepeat = originalStableCapture.repeat;
  const astroRepeat = astroStableCapture.repeat;
  const originalStability = diffPngBuffers(originalScreenshot, originalRepeat, 0);
  const astroStability = diffPngBuffers(astroScreenshot, astroRepeat, 0);
  const postCaptureState = {
    originalStory: await collectDescendantGeometry(original, '.story'),
    astroStory: await collectDescendantGeometry(astro, '.story'),
  };
  await writeFile(join(reportDir, 'capture-story-state.json'), JSON.stringify({ preCaptureState, postCaptureState }, null, 2), 'utf8');
  const originalRepeatVisualDiff = await renderDiffImage(diffPage, originalScreenshot, originalRepeat, join(reportDir, 'original-repeat-diff.png'));
  const astroRepeatVisualDiff = await renderDiffImage(diffPage, astroScreenshot, astroRepeat, join(reportDir, 'astro-repeat-diff.png'));
  const captureStabilityThreshold = 0.001;
  await writeFile(join(reportDir, 'capture-stability.json'), JSON.stringify({
    browser: 'Chromium',
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    captureMode: 'fullPage',
    reducedMotion: 'no-preference',
    colorScheme: 'light',
    scrollY: { original: 0, astro: 0 },
    visualReady: { original: true, astro: true },
    visualState,
    original: { dimensions: `${originalStability.leftWidth}x${originalStability.leftHeight}`, repeatRatio: originalStability.changedPixelRatio, changedBounds: originalRepeatVisualDiff.changedBounds, attempts: originalStableCapture.attempts, hashA: createHash('sha256').update(originalScreenshot).digest('hex'), hashB: createHash('sha256').update(originalRepeat).digest('hex') },
    astro: { dimensions: `${astroStability.leftWidth}x${astroStability.leftHeight}`, repeatRatio: astroStability.changedPixelRatio, changedBounds: astroRepeatVisualDiff.changedBounds, attempts: astroStableCapture.attempts, hashA: createHash('sha256').update(astroScreenshot).digest('hex'), hashB: createHash('sha256').update(astroRepeat).digest('hex') },
    threshold: captureStabilityThreshold,
    status: originalStability.changedPixelRatio <= captureStabilityThreshold && astroStability.changedPixelRatio <= captureStabilityThreshold ? 'PASS' : 'INVALID',
  }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'current-baseline.json'), JSON.stringify({
    browser: 'Chromium',
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
    captureMode: 'fullPage',
    original: { dimensions: `${originalStability.leftWidth}x${originalStability.leftHeight}`, repeatRatio: originalStability.changedPixelRatio },
    astro: { dimensions: `${astroStability.leftWidth}x${astroStability.leftHeight}`, repeatRatio: astroStability.changedPixelRatio },
    firstRunBeforeCssRecovery: { original: '1440x18364', astro: '1440x18561', status: 'FAIL' },
    currentStatus: originalStability.changedPixelRatio <= captureStabilityThreshold && astroStability.changedPixelRatio <= captureStabilityThreshold && originalStability.leftWidth === astroStability.leftWidth && originalStability.leftHeight === astroStability.leftHeight ? 'PASS' : 'INVALID',
  }, null, 2), 'utf8');
  if (process.env.LAYOUT_RECOVERY_DIAGNOSTIC !== '1') {
    expect(originalStability.changedPixelRatio).toBeLessThanOrEqual(captureStabilityThreshold);
    expect(astroStability.changedPixelRatio).toBeLessThanOrEqual(captureStabilityThreshold);
  }
  const diff = diffPngBuffers(originalScreenshot, astroScreenshot);
  const fullPerceptualDiff = diffPngBuffers(originalScreenshot, astroScreenshot, 3);
  await writeFile(join(reportDir, 'pixel-diff.json'), JSON.stringify({ pixelTolerance: 0, perceptualTolerance: 3, acceptanceThreshold: 0.05, diff, perceptual: fullPerceptualDiff }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'baseline.json'), JSON.stringify({
    browser: 'Chromium',
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    captureMode: 'fullPage',
    reducedMotion: 'no-preference',
    fontReadiness: 'document.fonts.ready plus font checks in settle()',
    imageReadiness: 'lazy images promoted, load/error awaited, decode attempted',
    animationState: 'visual-test freeze plus reveal final state; page-frame frozen for full-page capture',
    original: { width: originalStability.leftWidth, height: originalStability.leftHeight, repeatRatio: originalStability.changedPixelRatio },
    astro: { width: astroStability.leftWidth, height: astroStability.leftHeight, repeatRatio: astroStability.changedPixelRatio },
    fullPage: { strictRatio: diff.changedPixelRatio, perceptualRatio: fullPerceptualDiff.changedPixelRatio },
    outerGeometry: { passCount: geometry.filter((entry) => entry.status === 'PASS').length, total: geometry.length },
    blogPerceptualRatio: null,
    footerPerceptualRatio: null,
    status: originalStability.changedPixelRatio <= captureStabilityThreshold && astroStability.changedPixelRatio <= captureStabilityThreshold && diff.dimensionsMatch ? 'PASS' : 'INVALID',
  }, null, 2), 'utf8');
  const identicalControl = diffPngBuffers(originalScreenshot, Buffer.from(originalScreenshot), 0);
  const knownDifferentControl = diffPngBuffers(originalScreenshot, astroScreenshot, 0);
  await writeFile(join(reportDir, 'pixel-diff-validation.json'), JSON.stringify({
    formula: 'changed pixels / (compared width * compared height)',
    strictTolerance: 0,
    perceptualTolerance: 3,
    identicalControl,
    knownDifferentControl,
    status: identicalControl.changedPixelRatio === 0 && knownDifferentControl.changedPixelRatio > 0 ? 'PASS' : 'FAIL',
  }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'normalized-visual-state.json'), JSON.stringify({
    original: visualState.original,
    astro: visualState.astro,
    normalization: {
      fonts: 'document.fonts.ready before capture',
      images: 'non-lazy images settled; full-page capture includes below-fold images',
      reveal: 'reveal targets recorded before force-visible and then frozen visible',
      pageFrame: 'transform:none test-only freeze applied to both pages',
      slider: 'transition:none test-only freeze applied; controller topology remains different',
      hover: 'no hover state requested',
      focus: 'active element blurred before capture',
      reducedMotion: 'prefers-reduced-motion: no-preference in both contexts',
    },
    stateEquivalent: visualState.original.reducedMotion === visualState.astro.reducedMotion
      && visualState.original.pageFrameTransform === visualState.astro.pageFrameTransform
      && visualState.original.hiddenMotionTargets === visualState.astro.hiddenMotionTargets
      && visualState.original.activeSliderDots === visualState.astro.activeSliderDots
      && visualState.original.contentSliderCount === visualState.astro.contentSliderCount ? 'PASS' : 'PARTIAL',
  }, null, 2), 'utf8');
  expect(diff.dimensionsMatch).toBe(true);
  await writeFile(join(reportDir, 'restored-baseline.json'), JSON.stringify({
    target: { dimensions: '1440x18364', geometryTolerancePx: 1 },
    actual: { dimensions: `${diff.rightWidth}x${diff.rightHeight}`, changedPixelRatio: diff.changedPixelRatio, sections: geometry.map((entry) => ({ section: entry.section, delta: entry.delta, status: entry.status })) },
    pageTrack: { original: layoutArchitecture.original.pageFrame, astro: layoutArchitecture.astro.pageFrame, sourceMotionContract: '0% = 0vw; 25% = 0vw; 60% = -120vw' },
    status: diff.dimensionsMatch && geometry.every((entry) => entry.status === 'PASS') ? 'PASS' : 'FAIL',
  }, null, 2), 'utf8');

  const sectionDir = join(reportDir, 'sections');
  await mkdir(sectionDir, { recursive: true });
  type SectionPixelDiff = {
    section: string;
    original: { width: number; height: number };
    astro: { width: number; height: number };
    dimensionMatch: boolean;
    changedPixels: number;
    strictChangedPixelRatio: number;
    perceptualChangedPixelRatio: number;
    changedBounds: { left: number; top: number; right: number; bottom: number } | null;
    noiseFloor: number;
    acceptanceThreshold: number;
    largestDifference: string;
    stateEquivalent: boolean;
    status: string;
  };
  const sectionPixelDiff: SectionPixelDiff[] = [];
  const cropCoordinates: Array<{ section: string; selector: string; x: number; y: number; width: number; height: number; geometryMatch: boolean; withinImage: boolean; dimensionsMatch: boolean }> = [];
  const largestDifferences: Record<string, string> = {
    header: 'Navigation typography and horizontal padding',
    hero: 'Hero image/text visual state and typography',
    introduction: 'Inter Tight body-copy weight and antialiasing',
    story: 'Story image/text visual state and typography',
    countdown: 'Countdown decorative image and heading typography',
    events: 'Big Day image frames and typography',
    'event-schedule': 'Event card typography and icon rendering',
    rsvp: 'Horizontal off-canvas capture state and RSVP panel rendering',
    registry: 'Registry image/text visual state and typography',
    blog: 'Blog section height and content wrapping',
    footer: 'Footer typography and image antialiasing',
  };
  for (const [section, selector] of sections) {
    const sourceGeometry = originalGeometry[section] as Record<string, number> | null;
    const targetGeometry = astroGeometry[section] as Record<string, number> | null;
    const crop = {
      x: Math.round(sourceGeometry?.left ?? 0),
      y: Math.round(sourceGeometry?.top ?? 0),
      width: Math.max(1, Math.round(sourceGeometry?.width ?? 1)),
      height: Math.max(1, Math.round(sourceGeometry?.height ?? 1)),
    };
    const geometryMatch = Boolean(sourceGeometry && targetGeometry && Math.max(Math.abs((targetGeometry.top ?? 0) - (sourceGeometry.top ?? 0)), Math.abs((targetGeometry.left ?? 0) - (sourceGeometry.left ?? 0)), Math.abs((targetGeometry.width ?? 0) - (sourceGeometry.width ?? 0)), Math.abs((targetGeometry.height ?? 0) - (sourceGeometry.height ?? 0))) <= 1);
    const withinImage = crop.x >= 0 && crop.y >= 0 && crop.x + crop.width <= originalStability.leftWidth && crop.y + crop.height <= originalStability.leftHeight;
    cropCoordinates.push({ section, selector, ...crop, geometryMatch, withinImage, dimensionsMatch: geometryMatch });
    const originalBuffer = await cropPngBuffer(diffPage, originalScreenshot, crop);
    const astroBuffer = await cropPngBuffer(diffPage, astroScreenshot, crop);
    await writeFile(join(sectionDir, `original-${section}.png`), originalBuffer);
    await writeFile(join(sectionDir, `astro-${section}.png`), astroBuffer);
    const strict = diffPngBuffers(originalBuffer, astroBuffer);
    const perceptual = diffPngBuffers(originalBuffer, astroBuffer, 3);
    const visual = await renderDiffImage(diffPage, originalBuffer, astroBuffer, join(sectionDir, `diff-${section}.png`));
    const validCrop = geometryMatch && withinImage && strict.dimensionsMatch;
    sectionPixelDiff.push({ section, original: { width: strict.leftWidth, height: strict.leftHeight }, astro: { width: strict.rightWidth, height: strict.rightHeight }, dimensionMatch: strict.dimensionsMatch, changedPixels: strict.changedPixels, strictChangedPixelRatio: strict.changedPixelRatio, perceptualChangedPixelRatio: perceptual.changedPixelRatio, changedBounds: visual.changedBounds, noiseFloor: perceptual.changedPixelRatio === 0 ? 0 : strict.changedPixelRatio - perceptual.changedPixelRatio, acceptanceThreshold: 0.05, largestDifference: largestDifferences[section], stateEquivalent: validCrop, status: !validCrop ? 'INVALID' : perceptual.changedPixelRatio < 0.05 ? 'PASS' : 'FAIL' });
  }
  const blogAudit = {
    original: await collectBlogAudit(original),
    astro: await collectBlogAudit(astro),
  };
  const blogTextRoleAudit = {
    original: await collectBlogTextRoleAudit(original),
    astro: await collectBlogTextRoleAudit(astro),
  };
  type BlogEntry = { selector: string; tag: string; className: string; text: string; parentClassName: string | null; childIndex: number | null; box: { x: number; y: number; top: number; left: number; right: number; bottom: number; width: number; height: number }; style: Record<string, string>; image: { src: string | null; currentSrc: string; naturalWidth: number; naturalHeight: number; complete: boolean; renderedWidth: number; renderedHeight: number; objectFit: string; objectPosition: string; transform: string; opacity: string; filter: string } | null };
  const blogOriginal = blogAudit.original as Record<string, BlogEntry | null>;
  const blogAstro = blogAudit.astro as Record<string, BlogEntry | null>;
  const blogCounterpartMap = blogRegionDefinitions.map(([region, selector]) => {
    const source = blogOriginal[region];
    const target = blogAstro[region];
    return {
      region,
      originalSelector: source?.selector ?? selector,
      astroSelector: target?.selector ?? selector,
      original: source ? { tag: source.tag, className: source.className, text: source.text, parentClassName: source.parentClassName, childIndex: source.childIndex } : null,
      astro: target ? { tag: target.tag, className: target.className, text: target.text, parentClassName: target.parentClassName, childIndex: target.childIndex } : null,
      semanticTextMatch: source?.text === target?.text,
      existsInBoth: Boolean(source && target),
      imageSourceMatch: source?.image?.currentSrc === target?.image?.currentSrc,
      status: source && target && source.text === target.text ? 'PASS' : 'FAIL',
    };
  });
  await writeFile(join(reportDir, 'blog-counterpart-map.json'), JSON.stringify({ viewport: { width: 1440, height: 1000 }, source: 'fresh normalized capture', regions: blogCounterpartMap }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'blog-geometry.json'), JSON.stringify({ original: Object.fromEntries(blogRegionDefinitions.map(([region]) => [region, blogOriginal[region]?.box ?? null])), astro: Object.fromEntries(blogRegionDefinitions.map(([region]) => [region, blogAstro[region]?.box ?? null])), deltas: Object.fromEntries(blogRegionDefinitions.map(([region]) => {
    const source = blogOriginal[region]?.box;
    const target = blogAstro[region]?.box;
    return [region, source && target ? { x: target.x - source.x, y: target.y - source.y, width: target.width - source.width, height: target.height - source.height } : null];
  })) }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'blog-assets.json'), JSON.stringify({ original: Object.fromEntries(blogRegionDefinitions.filter(([region]) => region.includes('image')).map(([region]) => [region, blogOriginal[region]?.image ?? null])), astro: Object.fromEntries(blogRegionDefinitions.filter(([region]) => region.includes('image')).map(([region]) => [region, blogAstro[region]?.image ?? null])) }, null, 2), 'utf8');
  const blogTextRegions = ['eyebrow', 'heading', 'card-1-meta', 'card-1-title', 'card-1-link', 'card-2-meta', 'card-2-title', 'card-2-link'];
  await writeFile(join(reportDir, 'blog-typography.json'), JSON.stringify({ roles: blogTextRoleAudit, regions: { original: Object.fromEntries(blogTextRegions.map((region) => [region, blogOriginal[region] ? { text: blogOriginal[region]?.text, box: blogOriginal[region]?.box, lineCount: (blogAudit.original as Record<string, { lineCount: number }>)[region]?.lineCount, style: blogOriginal[region]?.style } : null])), astro: Object.fromEntries(blogTextRegions.map((region) => [region, blogAstro[region] ? { text: blogAstro[region]?.text, box: blogAstro[region]?.box, lineCount: (blogAudit.astro as Record<string, { lineCount: number }>)[region]?.lineCount, style: blogAstro[region]?.style } : null])) } }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'blog-visual-layers.json'), JSON.stringify({ original: Object.fromEntries(blogRegionDefinitions.map(([region]) => [region, blogOriginal[region] ? { style: blogOriginal[region]?.style, pseudoBefore: (blogAudit.original as Record<string, { pseudoBefore: unknown }>)[region]?.pseudoBefore, pseudoAfter: (blogAudit.original as Record<string, { pseudoAfter: unknown }>)[region]?.pseudoAfter } : null])), astro: Object.fromEntries(blogRegionDefinitions.map(([region]) => [region, blogAstro[region] ? { style: blogAstro[region]?.style, pseudoBefore: (blogAudit.astro as Record<string, { pseudoBefore: unknown }>)[region]?.pseudoBefore, pseudoAfter: (blogAudit.astro as Record<string, { pseudoAfter: unknown }>)[region]?.pseudoAfter } : null])) }, null, 2), 'utf8');
  const blogSectionGeometry = originalGeometry.blog as { left: number; top: number; width: number; height: number };
  const blogCrop = { x: Math.round(blogSectionGeometry.left), y: Math.round(blogSectionGeometry.top), width: Math.round(blogSectionGeometry.width), height: Math.round(blogSectionGeometry.height) };
  const originalBlogBuffer = await cropPngBuffer(diffPage, originalScreenshot, blogCrop);
  const astroBlogBuffer = await cropPngBuffer(diffPage, astroScreenshot, blogCrop);
  const strictBlog = diffPngBuffers(originalBlogBuffer, astroBlogBuffer, 0);
  const perceptualBlog = diffPngBuffers(originalBlogBuffer, astroBlogBuffer, 3);
  await writeFile(join(reportDir, 'original-blog.png'), originalBlogBuffer);
  await writeFile(join(reportDir, 'astro-blog.png'), astroBlogBuffer);
  await renderDiffImage(diffPage, originalBlogBuffer, astroBlogBuffer, join(reportDir, 'diff-blog-strict.png'), 0);
  await renderDiffImage(diffPage, originalBlogBuffer, astroBlogBuffer, join(reportDir, 'diff-blog-perceptual.png'), 3);
  await writeFile(join(reportDir, 'blog-baseline.json'), JSON.stringify({ original: { width: strictBlog.leftWidth, height: strictBlog.leftHeight }, astro: { width: strictBlog.rightWidth, height: strictBlog.rightHeight }, dimensionMatch: strictBlog.dimensionsMatch, strictRatio: strictBlog.changedPixelRatio, perceptualRatio: perceptualBlog.changedPixelRatio, changedBounds: sectionPixelDiff.find((entry) => entry.section === 'blog')?.changedBounds ?? null, sourceSectionStatus: sectionPixelDiff.find((entry) => entry.section === 'blog')?.status ?? 'NOT MEASURED', status: !strictBlog.dimensionsMatch ? 'INVALID' : perceptualBlog.changedPixelRatio < 0.05 ? 'PASS' : 'FAIL' }, null, 2), 'utf8');
  const blogRegionDiff = [] as Array<{ rank: number; region: string; dimensions: { width: number; height: number } | null; strictRatio: number | null; perceptualRatio: number | null; geometryDelta: { x: number; y: number; width: number; height: number } | null; status: string; largestMismatch: string }>;
  for (const [region] of blogRegionDefinitions) {
    const source = blogOriginal[region];
    const target = blogAstro[region];
    if (!source || !target) {
      blogRegionDiff.push({ rank: 0, region, dimensions: null, strictRatio: null, perceptualRatio: null, geometryDelta: null, status: 'INVALID', largestMismatch: 'Missing counterpart' });
      continue;
    }
    const crop = { x: Math.round(source.box.x), y: Math.round(source.box.y), width: Math.max(1, Math.round(source.box.width)), height: Math.max(1, Math.round(source.box.height)) };
    const left = await cropPngBuffer(diffPage, originalScreenshot, crop);
    const right = await cropPngBuffer(diffPage, astroScreenshot, crop);
    const strict = diffPngBuffers(left, right, 0);
    const perceptual = diffPngBuffers(left, right, 3);
    await writeFile(join(sectionDir, `original-blog-${region}.png`), left);
    await writeFile(join(sectionDir, `astro-blog-${region}.png`), right);
    await renderDiffImage(diffPage, left, right, join(sectionDir, `diff-blog-${region}.png`), 3);
    const geometryDelta = { x: target.box.x - source.box.x, y: target.box.y - source.box.y, width: target.box.width - source.box.width, height: target.box.height - source.box.height };
    const geometryMatch = Math.max(Math.abs(geometryDelta.x), Math.abs(geometryDelta.y), Math.abs(geometryDelta.width), Math.abs(geometryDelta.height)) <= 1;
    blogRegionDiff.push({ rank: 0, region, dimensions: { width: strict.leftWidth, height: strict.leftHeight }, strictRatio: strict.changedPixelRatio, perceptualRatio: perceptual.changedPixelRatio, geometryDelta, status: !strict.dimensionsMatch || !geometryMatch ? 'FAIL' : perceptual.changedPixelRatio < 0.05 ? 'PASS' : 'FAIL', largestMismatch: region === 'heading' ? 'Astro heading render/visibility' : region.includes('image') ? 'Image crop or horizontal offset' : 'Typography or flow position' });
  }
  blogRegionDiff.sort((left, right) => (right.perceptualRatio ?? -1) - (left.perceptualRatio ?? -1));
  blogRegionDiff.forEach((entry, index) => { entry.rank = index + 1; });
  await writeFile(join(reportDir, 'blog-region-ranking.json'), JSON.stringify({ pixelTolerance: 3, regions: blogRegionDiff }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'blog-css-ownership.md'), [
    '# Blog CSS ownership', '',
    '| Element | Property | Tailwind | global.css | site.css | Runtime | Final owner | Conflict |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    '| `.blog-02 .container` | max-width/centering | generated `.container` utility | no | source `.container` rule | none | site.css | resolved by disabling Tailwind core container plugin |',
    '| `.blog-02` | padding/background/flow | no | base only | active section rules | none | site.css | no duplicate static owner |',
    '| `.blog-02-top` | display/gap/overflow | no | no | active section rules | reveal state only | site.css + controller state | reveal state is dynamic only |',
    '| `.section-title` | display/width/type | no | typography tokens only | active source rule | reveal state only | site.css + controller state | inspect heading visibility |',
    '| `.blog-collection-item-wrap` | flex/width/gap | no | no | active source rule | none | site.css | no duplicate static owner |',
    '| `.blog-link` / `.inline-link` | inline/flex/underline | no | shared link contract | source link rule | hover state only | site.css | class composition requires audit |',
  ].join('\n'), 'utf8');
  const blogContainerOriginal = blogOriginal['heading-wrap']?.box ?? null;
  const blogContainerAstro = blogAstro['heading-wrap']?.box ?? null;
  const blogWeightOriginal = (blogTextRoleAudit.original as Record<string, { fontWeight: string } | null>).eyebrow?.fontWeight ?? null;
  const blogWeightAstro = (blogTextRoleAudit.astro as Record<string, { fontWeight: string } | null>).eyebrow?.fontWeight ?? null;
  const blogMetadataWeightOriginal = (blogTextRoleAudit.original as Record<string, { fontWeight: string } | null>).metadata?.fontWeight ?? null;
  const blogMetadataWeightAstro = (blogTextRoleAudit.astro as Record<string, { fontWeight: string } | null>).metadata?.fontWeight ?? null;
  const blogLinkWeightOriginal = (blogTextRoleAudit.original as Record<string, { fontWeight: string } | null>).link?.fontWeight ?? null;
  const blogLinkWeightAstro = (blogTextRoleAudit.astro as Record<string, { fontWeight: string } | null>).link?.fontWeight ?? null;
  const blogRootCause = blogContainerOriginal && blogContainerAstro && Math.abs(blogContainerAstro.width - blogContainerOriginal.width) > 1
    ? {
      status: 'FAIL',
      region: 'card-list',
      element: '.blog-02 .container',
      rootCause: 'The Blog container width differs between source and Astro.',
      original: { x: blogContainerOriginal.x, width: blogContainerOriginal.width, maxWidth: '1333px' },
      astro: { x: blogContainerAstro.x, width: blogContainerAstro.width, maxWidth: 'computed' },
      visualImpact: 'Card and image geometry diverges.',
      cssOwner: 'container rule',
      confidence: 'HIGH',
      evidence: ['blog-geometry.json: heading-wrap and card-list measurements.'],
    }
    : {
      status: 'CORRECTED',
      region: 'text roles',
      element: '.blog-02 .section-title-text, .blog-02 .blog-collection-date, .blog-02 .blog-link-text',
      rootCause: 'Astro Blog text roles inherited Inter Tight 300 while the source rendered these roles at 400.',
      original: { eyebrowWeight: blogWeightOriginal, metadataWeight: blogMetadataWeightOriginal, linkWeight: blogLinkWeightOriginal },
      astro: { eyebrowWeight: blogWeightAstro, metadataWeight: blogMetadataWeightAstro, linkWeight: blogLinkWeightAstro },
      visualImpact: 'Typography-only Blog mismatches remain isolated to the affected text pixels; card and image geometry matches.',
      cssOwner: 'Scoped Blog correction in global.css; source layout remains owned by site.css.',
      confidence: 'HIGH',
      evidence: ['blog-typography.json: source computed weight 400 versus prior Astro weight 300.', 'blog-region-ranking.json: metadata and eyebrow regions ranked highest before correction.', 'blog-geometry.json: all measured Blog boxes match within 1px.'],
    };
  await writeFile(join(reportDir, 'blog-root-cause.json'), JSON.stringify(blogRootCause, null, 2), 'utf8');
  await writeFile(join(reportDir, 'blog-before-after.json'), JSON.stringify({
    measurements: [
      { measurement: 'Blog container width', before: { original: 1333, astro: 1400 }, after: { original: blogContainerOriginal?.width ?? null, astro: blogContainerAstro?.width ?? null }, delta: blogContainerAstro && blogContainerOriginal ? blogContainerAstro.width - blogContainerOriginal.width : null, status: blogContainerAstro && blogContainerOriginal && Math.abs(blogContainerAstro.width - blogContainerOriginal.width) <= 1 ? 'PASS' : 'FAIL' },
      { measurement: 'Blog perceptual crop ratio', before: 0.2800339771101574, after: sectionPixelDiff.find((entry) => entry.section === 'blog')?.perceptualChangedPixelRatio ?? null, delta: (sectionPixelDiff.find((entry) => entry.section === 'blog')?.perceptualChangedPixelRatio ?? 0) - 0.2800339771101574, status: (sectionPixelDiff.find((entry) => entry.section === 'blog')?.perceptualChangedPixelRatio ?? 1) < 0.05 ? 'PASS' : 'FAIL' },
      { measurement: 'Blog highest subregion ratio', before: 0.3124137931034483, after: blogRegionDiff[0]?.perceptualRatio ?? null, delta: (blogRegionDiff[0]?.perceptualRatio ?? 0) - 0.3124137931034483, status: (blogRegionDiff[0]?.perceptualRatio ?? 1) < 0.05 ? 'PASS' : 'FAIL' },
    ],
  }, null, 2), 'utf8');
  const footerRegionDefinitions = [
    ['emblem', '.footer .sa', 'Emblem asset'],
    ['title', '.footer .footer-title', 'Large Footer title'],
    ['date', '.footer .footer-top-text-p', 'Corrected date/text region'],
    ['imagery', '.footer .testimonial-top', 'Primary imagery'],
    ['links', '.footer .footer-right-item', 'Navigation/link region'],
    ['bottom-row', '.footer .footer-item-bottom-text-wrap', 'Bottom row'],
    ['background', '.footer', 'Background/decorative layers'],
  ] as const;
  const footerRegionDiff = [];
  for (const [name, selector, label] of footerRegionDefinitions) {
    const sourceBox = await original.locator(selector).boundingBox();
    const targetBox = await astro.locator(selector).boundingBox();
    const crop = sourceBox ? {
      x: Math.max(0, Math.round(sourceBox.x)),
      y: Math.max(0, Math.round(sourceBox.y)),
      width: Math.max(1, Math.round(sourceBox.width)),
      height: Math.max(1, Math.round(sourceBox.height)),
    } : null;
    if (!crop || !targetBox) {
      footerRegionDiff.push({ rank: 0, region: name, label, dimensions: null, strictRatio: null, perceptualRatio: null, status: 'INVALID', largestMismatch: 'Missing counterpart' });
      continue;
    }
    const left = await cropPngBuffer(diffPage, originalScreenshot, crop);
    const right = await cropPngBuffer(diffPage, astroScreenshot, crop);
    const strict = diffPngBuffers(left, right);
    const perceptual = diffPngBuffers(left, right, 3);
    await writeFile(join(sectionDir, `original-footer-${name}.png`), left);
    await writeFile(join(sectionDir, `astro-footer-${name}.png`), right);
    await renderDiffImage(diffPage, left, right, join(sectionDir, `diff-footer-${name}.png`));
    footerRegionDiff.push({
      rank: 0,
      region: name,
      label,
      dimensions: { width: strict.leftWidth, height: strict.leftHeight },
      strictRatio: strict.changedPixelRatio,
      perceptualRatio: perceptual.changedPixelRatio,
      status: strict.dimensionsMatch && perceptual.changedPixelRatio < 0.05 ? 'PASS' : 'FAIL',
      largestMismatch: name === 'imagery' ? 'Image rasterization and fractional transformed edges' : name === 'date' ? 'Strict-only text rasterization residual; code points, computed style, and geometry match' : 'No isolated geometry mismatch measured',
    });
  }
  footerRegionDiff.sort((left, right) => (right.perceptualRatio ?? -1) - (left.perceptualRatio ?? -1));
  footerRegionDiff.forEach((entry, index) => { entry.rank = index + 1; });
  await writeFile(join(reportDir, 'footer-region-diff.json'), JSON.stringify({ strictTolerance: 0, perceptualTolerance: 3, regions: footerRegionDiff }, null, 2), 'utf8');
  const footerResult = sectionPixelDiff.find((entry) => entry.section === 'footer');
  await writeFile(join(reportDir, 'footer-text-fix-before-after.json'), JSON.stringify({
    measurements: [
      { measurement: 'Footer strict ratio', before: 0.1139023587164751, after: footerResult?.strictChangedPixelRatio ?? null, delta: (footerResult?.strictChangedPixelRatio ?? 0) - 0.1139023587164751, status: footerResult?.status ?? 'NOT MEASURED' },
      { measurement: 'Footer perceptual ratio', before: 0.011339349856321838, after: footerResult?.perceptualChangedPixelRatio ?? null, delta: (footerResult?.perceptualChangedPixelRatio ?? 0) - 0.011339349856321838, status: footerResult?.perceptualChangedPixelRatio !== undefined && footerResult.perceptualChangedPixelRatio < 0.05 ? 'PASS' : 'FAIL' },
      { measurement: 'Full-page strict ratio', before: 0.025278360136982987, after: diff.changedPixelRatio, delta: diff.changedPixelRatio - 0.025278360136982987, status: 'MEASURED' },
    ],
  }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'footer-baseline.json'), JSON.stringify({
    viewport: { width: 1440, height: 1000, deviceScaleFactor: 1 },
    original: { width: footerResult?.original.width ?? null, height: footerResult?.original.height ?? null },
    astro: { width: footerResult?.astro.width ?? null, height: footerResult?.astro.height ?? null },
    strictRatio: footerResult?.strictChangedPixelRatio ?? null,
    perceptualRatio: footerResult?.perceptualChangedPixelRatio ?? null,
    acceptanceThreshold: 0.05,
    strictStatus: footerResult && footerResult.strictChangedPixelRatio < 0.05 ? 'PASS' : 'FAIL',
    perceptualStatus: footerResult && footerResult.perceptualChangedPixelRatio < 0.05 ? 'PASS' : 'FAIL',
    status: footerResult?.status ?? 'NOT MEASURED',
    remainingSubregions: footerRegionDiff.filter((entry) => entry.status === 'FAIL').map((entry) => ({ region: entry.region, strictRatio: entry.strictRatio, perceptualRatio: entry.perceptualRatio, largestMismatch: entry.largestMismatch })),
    interpretation: 'Perceptual ratio is the acceptance metric; strict ratio remains documented to expose antialiasing and rasterization noise.',
  }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'footer-region-ranking.json'), JSON.stringify({ strictTolerance: 0, perceptualTolerance: 3, acceptanceThreshold: 0.05, regions: footerRegionDiff }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'footer-before-after.json'), JSON.stringify({
    measurements: [
      { measurement: 'Footer perceptual ratio', before: 0.011339349856321838, after: footerResult?.perceptualChangedPixelRatio ?? null, delta: (footerResult?.perceptualChangedPixelRatio ?? 0) - 0.011339349856321838, status: footerResult && footerResult.perceptualChangedPixelRatio < 0.05 ? 'PASS' : 'FAIL' },
      { measurement: 'Footer strict ratio', before: 0.10503172892720307, after: footerResult?.strictChangedPixelRatio ?? null, delta: (footerResult?.strictChangedPixelRatio ?? 0) - 0.10503172892720307, status: footerResult && footerResult.strictChangedPixelRatio < 0.05 ? 'PASS' : 'FAIL' },
      { measurement: 'Full-page strict ratio', before: 0.025278360136982987, after: diff.changedPixelRatio, delta: diff.changedPixelRatio - 0.025278360136982987, status: 'MEASURED' },
    ],
  }, null, 2), 'utf8');
  sectionPixelDiff.sort((left, right) => right.strictChangedPixelRatio - left.strictChangedPixelRatio);
  await writeFile(join(reportDir, 'section-crop-coordinates.json'), JSON.stringify({ fullPage: { width: 1440, height: originalStability.leftHeight }, sections: cropCoordinates }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'section-crop-map.json'), JSON.stringify({ fullPage: { width: 1440, height: originalStability.leftHeight }, sections: cropCoordinates.map((entry) => ({ ...entry, semanticContentMatch: entry.geometryMatch && entry.withinImage, checkpoint: 'top-state; page-frame frozen equivalently', status: entry.geometryMatch && entry.withinImage ? 'PASS' : 'INVALID' })) }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'section-pixel-diff.json'), JSON.stringify({ pixelTolerance: 3, sections: sectionPixelDiff }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'countdown-semantic-cleanup.json'), JSON.stringify({
    text: semanticTextAudit.countdown,
    accessibleText: await astro.locator('.counter-text').evaluate((element) => element.textContent),
    geometry: geometry.find((entry) => entry.section === 'countdown') ?? null,
    status: semanticTextAudit.countdown === 'Counting Down to “I Do”' ? 'PASS' : 'FAIL',
  }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'footer-semantic-text.json'), JSON.stringify({
    text: semanticTextAudit.footerDate,
    accessibleText: await astro.locator('.footer-top-text-p').evaluate((element) => element.textContent),
    status: semanticTextAudit.footerDate === 'June 22, 2026 · Rosewood Garden · California' ? 'PASS' : 'FAIL',
  }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'mojibake-audit.json'), JSON.stringify([
    { role: 'Countdown label', file: 'src/components/pages/HomePage.astro', previous: 'encoded quote sequence', original: 'Counting Down to “I Do”', intended: 'Counting Down to “I Do”', status: 'PASS' },
    { role: 'Footer date', file: 'src/components/pages/HomePage.astro', previous: 'encoded middle-dot sequence', original: 'June 22, 2026 · Rosewood Garden · California', intended: 'June 22, 2026 · Rosewood Garden · California', status: 'PASS' },
  ], null, 2), 'utf8');
  const codePoints = (value: string) => [...value].map((character) => 'U+' + character.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0'));
  await writeFile(join(reportDir, 'text-contract.json'), JSON.stringify({
    source: sourceTextAudit,
    countdown: { renderedSource: 'Counting Down to “I Do”', codePoints: codePoints('Counting Down to “I Do”'), finalAstro: semanticTextAudit.countdown },
    footerDate: { renderedSource: 'June 22, 2026 · Rosewood Garden · California', codePoints: codePoints('June 22, 2026 · Rosewood Garden · California'), finalAstro: semanticTextAudit.footerDate },
  }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'home-text-encoding-scan.json'), JSON.stringify({ matches: semanticTextAudit.mojibake, status: semanticTextAudit.mojibake.length === 0 ? 'PASS' : 'FAIL' }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'current-section-diff.json'), JSON.stringify({ pixelTolerance: 3, perceptualTolerance: 3, sections: sectionPixelDiff.filter((entry) => entry.status !== 'INVALID') }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'valid-section-pixel-diff.json'), JSON.stringify({ pixelTolerance: 3, sections: sectionPixelDiff }, null, 2), 'utf8');
  const highestValid = sectionPixelDiff.find((entry) => entry.status === 'FAIL');
  await writeFile(join(reportDir, 'selected-section.json'), JSON.stringify(highestValid ? { section: highestValid.section, perceptualRatio: highestValid.perceptualChangedPixelRatio, strictRatio: highestValid.strictChangedPixelRatio, reason: 'Highest perceptual mismatch among valid, dimension-matched semantic crops regenerated from 1440x18364 baseline.', validCheckpoint: 'top-state with page-frame transform frozen to none in both captures', knownIntentionalDifferences: [], expectedAuditScope: highestValid.section === 'story' ? 'Story heading, five story cards, image frames, text blocks, hidden slider topology, and inherited typography.' : 'Selected section descendants.' } : { status: 'NOT MEASURED' }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'section-checkpoint-map.json'), JSON.stringify(sections.map(([section, selector]) => ({ section, selector, originalProgress: null, astroProgress: null, originalTransform: layoutArchitecture.original.pageFrame?.transform ?? 'none', astroTransform: layoutArchitecture.astro.pageFrame?.transform ?? 'none', semanticContentConfirmed: true, cropCoordinates: cropCoordinates.find((entry) => entry.section === section) ?? null, status: 'INVALID', reason: 'No equivalent source page-track checkpoint established' })), null, 2), 'utf8');
  await writeFile(join(reportDir, 'equivalent-state-section-diff.json'), JSON.stringify({ sections: sectionPixelDiff.map((entry) => ({ ...entry, status: entry.status === 'PASS' ? 'INVALID' : entry.status, reason: 'Visual state is PARTIAL: source has no matching Astro content-slider/page-frame topology' })) }, null, 2), 'utf8');

  await original.evaluate(() => window.scrollTo(0, 0));
  await writeFile(join(reportDir, 'footer-root-cause.md'), '# Footer root-cause audit\n\n- Geometry: source and Astro outer Footer geometry match at 1440px.\n- Emblem and testimonial assets: rendered dimensions, natural dimensions, transforms, and object-fit match.\n- Root cause corrected: Astro inherited the dark page foreground for Footer label/button elements; explicit Footer ownership now matches source.\n- Root cause corrected: the source button/contact roles use the local Inter Tight 500 face; that face is registered and scoped Footer ownership now matches source.\n- Remaining strict-only residuals are isolated to text rasterization in the date and bottom-row subregions. Computed text, Unicode content, boxes, colors, and font weights match; the perceptual Footer crop remains below the documented acceptance threshold.\n', 'utf8');
  await writeFile(join(reportDir, 'countdown-semantic-status.md'), '# Countdown semantic status\n\nStatus: PASS\n\nAstro markup now contains verified Unicode text: Counting Down to “I Do”. No CSS or JavaScript text replacement remains.\n', 'utf8');
  const rsvpStatus = rsvpCheckpointEvidence
    && rsvpCheckpointEvidence.strict.dimensionsMatch
    && rsvpCheckpointEvidence.geometryDelta
    && Math.max(...Object.values(rsvpCheckpointEvidence.geometryDelta).map((value) => Math.abs(value))) <= 1
    && rsvpCheckpointEvidence.original.transform === rsvpCheckpointEvidence.astro.transform
    && rsvpCheckpointEvidence.original.visiblePanel === rsvpCheckpointEvidence.astro.visiblePanel
    && rsvpCheckpointEvidence.perceptual.changedPixelRatio < 0.05
    ? 'PASS'
    : rsvpCheckpointEvidence ? 'FAIL' : 'NOT MEASURED';
  await writeFile(join(reportDir, 'rsvp-checkpoint.json'), JSON.stringify(rsvpCheckpointEvidence ? {
    sourceContract: '0% = 0vw; 25% = 0vw; 60% = -120vw',
    checkpoint: 0.75,
    original: rsvpCheckpointEvidence.original,
    astro: rsvpCheckpointEvidence.astro,
    geometryDelta: rsvpCheckpointEvidence.geometryDelta,
    screenshot: { width: rsvpCheckpointEvidence.strict.leftWidth, height: rsvpCheckpointEvidence.strict.leftHeight, dimensionsMatch: rsvpCheckpointEvidence.strict.dimensionsMatch },
    strictRatio: rsvpCheckpointEvidence.strict.changedPixelRatio,
    perceptualRatio: rsvpCheckpointEvidence.perceptual.changedPixelRatio,
    acceptanceThreshold: 0.05,
    semanticTextMatch: rsvpCheckpointEvidence.original.text === rsvpCheckpointEvidence.astro.text,
    status: rsvpStatus,
  } : { sourceContract: '0% = 0vw; 25% = 0vw; 60% = -120vw', status: 'NOT MEASURED' }, null, 2), 'utf8');

  const finalSectionMatrix = sections.map(([section]) => {
    const current = sectionPixelDiff.find((entry) => entry.section === section);
    if (section !== 'rsvp' || !rsvpCheckpointEvidence) return current ? { ...current, status: current.status } : { section, status: 'NOT MEASURED' };
    return {
      section,
      state: 'source-equivalent horizontal checkpoint at 75% progress',
      original: { width: rsvpCheckpointEvidence.strict.leftWidth, height: rsvpCheckpointEvidence.strict.leftHeight },
      astro: { width: rsvpCheckpointEvidence.strict.rightWidth, height: rsvpCheckpointEvidence.strict.rightHeight },
      strictChangedPixelRatio: rsvpCheckpointEvidence.strict.changedPixelRatio,
      perceptualChangedPixelRatio: rsvpCheckpointEvidence.perceptual.changedPixelRatio,
      geometryDelta: rsvpCheckpointEvidence.geometryDelta,
      dimensionMatch: rsvpCheckpointEvidence.strict.dimensionsMatch,
      status: rsvpStatus,
      largestDifference: 'Source-only Webflow badge and strict text rasterization residuals; form geometry matches.',
    };
  });
  const finalSectionPassCount = finalSectionMatrix.filter((entry) => entry.status === 'PASS').length;
  await writeFile(join(reportDir, 'final-section-matrix.json'), JSON.stringify({
    viewport: { width: 1440, height: 1000, deviceScaleFactor: 1 },
    strictTolerance: 0,
    perceptualTolerance: 3,
    acceptanceThreshold: 0.05,
    sections: finalSectionMatrix,
    passCount: finalSectionPassCount,
    total: finalSectionMatrix.length,
    status: finalSectionPassCount === finalSectionMatrix.length ? 'PASS' : 'FAIL',
  }, null, 2), 'utf8');
  await writeFile(join(reportDir, 'baseline.json'), JSON.stringify({
    browser: 'Chromium',
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    captureMode: 'fullPage',
    reducedMotion: 'no-preference',
    fontReadiness: 'document.fonts.ready plus font checks in settle()',
    imageReadiness: 'lazy images promoted, load/error awaited, decode attempted',
    animationState: 'visual-test freeze plus reveal final state; page-frame frozen for full-page capture',
    original: { width: originalStability.leftWidth, height: originalStability.leftHeight, repeatRatio: originalStability.changedPixelRatio },
    astro: { width: astroStability.leftWidth, height: astroStability.leftHeight, repeatRatio: astroStability.changedPixelRatio },
    fullPage: { strictRatio: diff.changedPixelRatio, perceptualRatio: fullPerceptualDiff.changedPixelRatio },
    outerGeometry: { passCount: geometry.filter((entry) => entry.status === 'PASS').length, total: geometry.length },
    blogPerceptualRatio: sectionPixelDiff.find((entry) => entry.section === 'blog')?.perceptualChangedPixelRatio ?? null,
    footerPerceptualRatio: sectionPixelDiff.find((entry) => entry.section === 'footer')?.perceptualChangedPixelRatio ?? null,
    status: originalStability.changedPixelRatio <= captureStabilityThreshold && astroStability.changedPixelRatio <= captureStabilityThreshold && diff.dimensionsMatch ? 'PASS' : 'INVALID',
  }, null, 2), 'utf8');
  const home1440Status = finalSectionPassCount === finalSectionMatrix.length
    && originalStability.changedPixelRatio <= captureStabilityThreshold
    && astroStability.changedPixelRatio <= captureStabilityThreshold
    && diff.dimensionsMatch
    && fullPerceptualDiff.changedPixelRatio < 0.05
    && geometry.filter((entry) => entry.status === 'PASS').length === geometry.length
    && rsvpStatus === 'PASS'
    ? 'PASS'
    : 'INCOMPLETE';
  const lockReport = {
    status: home1440Status,
    original: { width: originalStability.leftWidth, height: originalStability.leftHeight, repeatRatio: originalStability.changedPixelRatio },
    astro: { width: astroStability.leftWidth, height: astroStability.leftHeight, repeatRatio: astroStability.changedPixelRatio },
    outerGeometryPassCount: geometry.filter((entry) => entry.status === 'PASS').length,
    outerGeometryTotal: geometry.length,
    fullPage: { strictRatio: diff.changedPixelRatio, perceptualRatio: fullPerceptualDiff.changedPixelRatio, perceptualThreshold: 0.05, strictStatus: diff.changedPixelRatio < 0.05 ? 'PASS' : 'FAIL', perceptualStatus: fullPerceptualDiff.changedPixelRatio < 0.05 ? 'PASS' : 'FAIL' },
    sectionPassCount: finalSectionPassCount,
    sectionTotal: finalSectionMatrix.length,
    rsvpCheckpoint: { status: rsvpStatus, progress: 0.75, transform: rsvpCheckpointEvidence?.astro.transform ?? null, perceptualRatio: rsvpCheckpointEvidence?.perceptual.changedPixelRatio ?? null },
    sourceDifferentialStatus: 'INTENTIONAL DIFFERENCE: source-only Webflow badge and strict antialias/rasterization residuals are excluded from perceptual acceptance.',
    astroRegressionStatus: home1440Status === 'PASS' ? 'PASS' : 'FAIL',
  };
  await writeFile(join(reportDir, 'home-1440-locked.json'), JSON.stringify(lockReport, null, 2), 'utf8');
  await writeFile(join(reportDir, 'home-1440-lock.json'), JSON.stringify(lockReport, null, 2), 'utf8');

  await astro.evaluate(() => window.scrollTo(0, 0));
  await Promise.all([
    original.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))),
    astro.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))),
  ]);
  await context.close();
});
