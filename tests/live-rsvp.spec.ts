import { expect, test } from '@playwright/test';

test('live Astro home renders visible RSVP panel on localhost:4321', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  const rsvp = page.locator('[data-rsvp-section]');
  await expect(rsvp).toBeAttached();
  await page.evaluate(() => {
    const track = document.querySelector<HTMLElement>('.page-track');
    if (!track) throw new Error('Missing page-track');
    window.scrollTo({ top: track.offsetTop + window.innerHeight, behavior: 'instant' });
  });
  await page.waitForTimeout(250);
  await expect(rsvp).toBeVisible();

  const state = await rsvp.evaluate((element) => {
    const ancestors: Array<Record<string, unknown>> = [];
    let current: HTMLElement | null = element as HTMLElement;
    while (current) {
      const style = getComputedStyle(current);
      const rect = current.getBoundingClientRect();
      ancestors.push({
        tag: current.tagName.toLowerCase(),
        id: current.id,
        className: current.className,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        height: style.height,
        maxHeight: style.maxHeight,
        overflow: style.overflow,
        position: style.position,
        zIndex: style.zIndex,
        transform: style.transform,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      });
      current = current.parentElement;
    }
    const style = getComputedStyle(element as HTMLElement);
    const rect = (element as HTMLElement).getBoundingClientRect();
    const panel = element.querySelector<HTMLElement>('.rsvp');
    const panelRect = panel?.getBoundingClientRect();
    return {
      display: style.display,
      visibility: style.visibility,
      opacity: Number(style.opacity),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      panelRect: panelRect ? { x: panelRect.x, y: panelRect.y, width: panelRect.width, height: panelRect.height } : null,
      text: element.textContent?.replace(/\s+/g, ' ').trim(),
      ancestors,
    };
  });
  console.log(JSON.stringify(state, null, 2));

  expect(state.display).not.toBe('none');
  expect(state.visibility).not.toBe('hidden');
  expect(state.opacity).toBeGreaterThan(0);
  expect(state.rect.width).toBeGreaterThan(300);
  expect(state.rect.height).toBeGreaterThan(300);
  expect(state.rect.y).toBeGreaterThanOrEqual(0);
  expect(state.rect.y).toBeLessThan(1000);
  const pageTrack = state.ancestors.find((ancestor) => ancestor.className === 'page-track');
  expect(pageTrack?.opacity).toBe('1');
  expect(pageTrack?.transform).toBe('none');
  expect(state.text).toContain('RSVP');
  await expect(rsvp.locator('input[type="submit"]')).toHaveValue('Submit RSVP');
  expect(state.text).toContain('Kindly Respond');
  expect(consoleErrors).toEqual([]);

  await page.screenshot({ path: 'artifacts/live/astro-4321-rsvp-viewport-1440.png' });
  await rsvp.locator('.rsvp').screenshot({ path: 'artifacts/live/astro-4321-rsvp-panel-1440.png' });
  await page.screenshot({ path: 'artifacts/live/astro-4321-rsvp-1440.png', fullPage: true });
});
