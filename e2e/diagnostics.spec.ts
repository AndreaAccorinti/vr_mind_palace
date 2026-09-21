import { expect, test, type Page } from '@playwright/test';

/**
 * The device-test instrumentation, end to end.
 *
 * This exercises the whole chain — frame sampler, recorder, summary, report
 * formatting, the repository, and the 2D page that shows the result — without a
 * headset. What it cannot check is the thing the instrumentation exists to
 * measure: real XR frame cadence. On desktop these are requestAnimationFrame
 * intervals, and the panel says so.
 */

async function openScene(page: Page) {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () => (await canvas.boundingBox())?.height ?? 0, { timeout: 10_000 })
    .toBeGreaterThan(300);
  await page.waitForTimeout(2500);
  return (await canvas.boundingBox())!;
}

/** Clicks a point in the canvas given as a fraction of its box. */
const clickAt = (page: Page, box: { x: number; y: number; width: number; height: number }) =>
  (fx: number, fy: number) => page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);

/** Turns the desktop view right, bringing the side panel into view. */
async function lookRight(page: Page, box: { x: number; y: number; width: number; height: number }) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 210, cy + 30, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(1200);
}

test('records a run and hands it back as text to paste', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const box = await openScene(page);
  const click = clickAt(page, box);

  // No run has been recorded yet.
  await expect(page.locator('.run__report')).toHaveCount(0);

  await click(0.385, 0.845); // Frame stats
  await lookRight(page, box);
  // Let the sampler gather more than the minimum before the run is keepable.
  await page.waitForTimeout(2500);
  await click(0.425, 0.562); // Save run

  const report = page.locator('.run__report');
  await expect(report).toBeVisible();
  const text = await report.innerText();

  // The figures that docs/QUEST-TEST.md asks for.
  expect(text).toContain('Samples:');
  expect(text).toContain('Mean interval:');
  expect(text).toContain('Median:');
  expect(text).toContain('p95:');
  expect(text).toContain('Max:');
  expect(text).toContain('Estimated dropped frames:');
  expect(text).toContain('Time to first frame:');

  // On desktop there is no XR session, so it must not imply one.
  expect(text).toContain('Mode: desktop');
  expect(text).toContain('Reported frame rate: not reported');
  expect(text).toContain('Dropped frames are inferred');
});

test('survives a reload, so the numbers outlive the session that made them', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const box = await openScene(page);
  const click = clickAt(page, box);

  await click(0.385, 0.845);
  await lookRight(page, box);
  await page.waitForTimeout(2500);
  await click(0.425, 0.562);

  const before = await page.locator('.run__report').innerText();
  await page.reload();
  // The point of persisting: take the headset off, reload, still have the run.
  await expect(page.locator('.run__report')).toBeVisible();
  expect(await page.locator('.run__report').innerText()).toBe(before);

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.locator('.run__report')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.run__report')).toHaveCount(0);
});
