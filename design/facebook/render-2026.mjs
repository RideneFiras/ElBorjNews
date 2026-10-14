// Renders the October 2026 Facebook kit (navy look): node design/facebook/render-2026.mjs
// (from the repo root). Add "phone" first to refresh the screenshot of the live site.
import { chromium } from '@playwright/test';
const dir = process.cwd() + '/design/facebook/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });

if (process.argv.includes('phone')) {
  // The real homepage on a phone, for the poster's phone frame (trackers blocked: not a reader).
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  await ctx.route('**/api/t**', (r) => r.abort());
  const p = await ctx.newPage();
  await p.goto('https://borj.tn/ar', { waitUntil: 'networkidle' });
  await p.screenshot({ path: `${dir}site-phone.png` });
  await ctx.close();
}

for (const [name, w, h] of [['profile-2026', 1080, 1080], ['cover-2026', 1640, 624], ['announce-2026', 1080, 1350], ['share-2026', 1200, 630]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(`file://${dir}${name}.html?still`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const guide = await p.$('#g');
  if (guide) {
    await p.screenshot({ path: `${dir}${name}-guide.png` }); // with crop guides (review only)
    await guide.evaluate((el) => el.remove());
  }
  await p.screenshot({ path: `${dir}${name}.png` }); // the file to upload
}
await b.close();
