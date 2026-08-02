import { expect, test } from '@playwright/test';

const readContract = async (url: string, original = false) => {
  const browserPage = await (await import('@playwright/test')).chromium.launch({ headless: true });
  const page = await browserPage.newPage({ viewport: { width: 1304, height: 1396 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  if (original) {
    await page.addStyleTag({ path: 'audit-webflow.css' });
    await page.addStyleTag({ content: `
      @font-face { font-family: 'Allura'; src: url('/fonts/9oRPNYsQpS4zjuAPjA.ttf') format('truetype'); font-weight: 400; }
      @font-face { font-family: 'Gilda Display'; src: url('/fonts/t5tmIRoYMoaYG0WEOh7HwMeR7Tk.ttf') format('truetype'); font-weight: 400; }
      @font-face { font-family: 'Inter Tight'; src: url('/fonts/NGSnv5HMAFg6IuGlBNMjxJEL2VmU3NS7Z2mj6AiqXA.ttf') format('truetype'); font-weight: 400; }
    ` });
  }
  const result = await page.evaluate(() => {
    const read = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        selector,
        text: element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80),
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        textTransform: style.textTransform,
        opacity: style.opacity,
        transform: style.transform,
        display: style.display,
      };
    };
    return {
      nav: read('.menu'),
      storyLabel: read('.story-top .section-title-text'),
      eventTime: read('.event-time'),
      eventTitle: read('.event-title'),
      eventText: read('.event-item-text'),
      pageTrack: read('.page-track'),
    };
  });
  console.log(url, JSON.stringify(result, null, 2));
  await browserPage.close();
  return result;
};

test('compare live comment targets', async () => {
  const original = await readContract('http://127.0.0.1:5500/index.html', true);
  const migrated = await readContract('http://localhost:4321/');
  for (const selector of ['nav', 'storyLabel', 'eventTime', 'eventTitle', 'eventText'] as const) {
    expect(migrated[selector]?.fontFamily, selector).toBe(original[selector]?.fontFamily);
    expect(migrated[selector]?.fontSize, selector).toBe(original[selector]?.fontSize);
    expect(migrated[selector]?.fontWeight, selector).toBe(original[selector]?.fontWeight);
    expect(migrated[selector]?.lineHeight, selector).toBe(original[selector]?.lineHeight);
    expect(migrated[selector]?.letterSpacing, selector).toBe(original[selector]?.letterSpacing);
    expect(migrated[selector]?.textTransform, selector).toBe(original[selector]?.textTransform);
  }
});
