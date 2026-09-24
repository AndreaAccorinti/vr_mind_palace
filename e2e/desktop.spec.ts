import { expect, test, type Page } from '@playwright/test';

/**
 * Desktop browser checks against the production build.
 *
 * Scope: the entry page, the desktop fallback, and the hosting guarantees that
 * are easy to lose by accident. These say nothing about immersive behaviour —
 * Playwright has no WebXR device, so controller input, comfort, spatial
 * readability and frame pacing stay physical-device checks in docs/QUEST-TEST.md.
 */

/** The canvas is sized by a resize observer, so wait for it rather than assume. */
async function sizedCanvas(page: Page) {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () => (await canvas.boundingBox())?.height ?? 0, { timeout: 10_000 })
    .toBeGreaterThan(300);
  return canvas;
}

test('reports capability honestly instead of claiming VR support', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Loci' })).toBeVisible();

  // Headless Chromium exposes `navigator.xr` but offers no immersive device, so
  // the page must distinguish that from "this browser has no WebXR at all" and
  // must not enable an Enter VR button that would only fail.
  const enter = page.getByRole('button', { name: /Enter VR/ });
  await expect(enter).toBeVisible();
  await expect(enter).toBeDisabled();

  const status = page.locator('.entry__status');
  await expect(status).toContainText(
    /No immersive VR here|No WebXR in this browser|Needs a secure address|Support check did not finish/,
  );
  // Whichever state it is, the user is pointed at something that works.
  await expect(status).toContainText(/desktop view|Quest Browser|https/i);
});

test('renders the desktop 3D view', async ({ page }) => {
  await page.goto('/');
  const canvas = await sizedCanvas(page);
  const box = await canvas.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(400);
  await expect(page.getByText('Preparing the room…')).toBeHidden();
});

test('actually draws the room rather than a blank frame', async ({ page }) => {
  await page.goto('/');
  const canvas = await sizedCanvas(page);
  // Give the render loop and the SDF text atlas a moment to settle.
  await page.waitForTimeout(2500);
  const shot = await canvas.screenshot();
  // A uniform frame compresses to a few kilobytes; a drawn room does not.
  expect(shot.byteLength).toBeGreaterThan(20_000);
});

test('serves controller models from this origin, not a CDN', async ({ page }) => {
  // Regression guard: the library default fetches these from jsdelivr, which
  // would make a headset depend on a third-party host at session start.
  await page.goto('/');
  for (const path of [
    '/webxr-profiles/profilesList.json',
    '/webxr-profiles/meta-quest-touch-plus/left.glb',
    '/webxr-profiles/meta-quest-touch-plus/right.glb',
    '/webxr-profiles/generic-hand/left.glb',
  ]) {
    expect((await page.request.get(path)).status(), path).toBe(200);
  }
});

test('every advertised controller profile is actually served', async ({ page }) => {
  // The defect this guards against was silent on the device: a 404 here makes
  // @pmndrs/xr drop the controller without registering it, so the headset shows
  // no ray, no model and no selection, and nothing in the app says why.
  await page.goto('/');
  const listing: Record<string, { path: string }> = await (
    await page.request.get('/webxr-profiles/profilesList.json')
  ).json();

  expect(Object.keys(listing).length).toBeGreaterThan(0);

  for (const [id, entry] of Object.entries(listing)) {
    const profile = await page.request.get(`/webxr-profiles/${entry.path}`);
    expect(profile.status(), `${id} -> ${entry.path}`).toBe(200);

    // The profile names the model files; those must be served too.
    const parsed: { layouts: Record<string, { assetPath: string }> } = await profile.json();
    const dir = entry.path.split('/')[0];
    for (const layout of Object.values(parsed.layouts)) {
      const asset = await page.request.get(`/webxr-profiles/${dir}/${layout.assetPath}`);
      expect(asset.status(), `${id} -> ${layout.assetPath}`).toBe(200);
    }
  }
});

test('makes no third-party network requests', async ({ page }) => {
  const external: string[] = [];
  const isLocal = (url: string) => {
    if (url.startsWith('blob:') || url.startsWith('data:')) return true;
    const { hostname } = new URL(url);
    return hostname === '127.0.0.1' || hostname === 'localhost';
  };
  page.on('request', (request) => {
    if (!isLocal(request.url())) external.push(request.url());
  });
  await page.goto('/');
  await page.waitForTimeout(3000);
  expect(external).toEqual([]);
});

test('loads spatial fonts in a format the text renderer can parse', async ({ page }) => {
  // troika throws on WOFF2 and leaves every label blank, which is invisible
  // from the outside; the console error is the only signal.
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.waitForTimeout(3000);
  expect(errors.filter((text) => /font/i.test(text))).toEqual([]);
  expect(errors).toEqual([]);
});

test('single-page routing falls back to the app shell', async ({ page }) => {
  // The hosting config sets an SPA fallback; a deep link must not 404.
  const response = await page.goto('/palace/some-deep-link');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Loci' })).toBeVisible();
});
