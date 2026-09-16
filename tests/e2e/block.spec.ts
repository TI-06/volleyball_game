import { expect, test, type Page, type TestInfo } from '@playwright/test';

async function advanceManualRally(page: Page, seconds: number) {
  await page.evaluate((advanceSeconds) => {
    window.dispatchEvent(new CustomEvent('v3:e2e-advance', { detail: advanceSeconds }));
  }, seconds);
}

async function runtimeDebug(page: Page) {
  return page.getByTestId('v3-match-screen').evaluate((element) => ({
    time: Number(element.getAttribute('data-v3-time')),
    controlledX: Number(element.getAttribute('data-v3-controlled-x')),
    blockLaneX: Number(element.getAttribute('data-v3-block-lane-x')),
    defenseKind: element.getAttribute('data-v3-defense-kind'),
    bufferedAction: element.getAttribute('data-v3-buffered-action'),
    lastEvent: element.getAttribute('data-v3-last-event'),
  }));
}

async function captureBlockFrame(page: Page, testInfo: TestInfo, frame: string) {
  await page.screenshot({
    path: `test-results/gameplay-visual-audit/${testInfo.project.name}-${frame}.png`,
    fullPage: true,
  });
}

test('live controls align KAI and stuff a quick attack', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  await page.goto('/?v3e2e=manual&v3seed=72');

  const screen = page.getByTestId('v3-match-screen');
  const movement = page.getByTestId('v3-movement-pad');
  const action = page.getByRole('button', { name: 'ACTION' });
  const dive = page.getByRole('button', { name: 'DIVE' });
  const block = page.getByRole('button', { name: 'BLOCK' });
  const score = page.locator('.v3-score');

  await expect(page.getByText('BLOCK READ')).toBeVisible();
  await expect(screen).toHaveAttribute('data-v3-defense-kind', 'BLOCK');
  await expect(action).toBeDisabled();
  await expect(dive).toBeDisabled();
  await expect(block).toBeEnabled();
  await expect(score).toHaveAttribute('aria-label', 'PLAYER 0 CPU 0');

  const before = await runtimeDebug(page);
  expect(before.controlledX).toBeGreaterThan(before.blockLaneX + 1);

  const movementBox = await movement.boundingBox();
  expect(movementBox).not.toBeNull();
  if (!movementBox) return;

  const centerX = movementBox.x + movementBox.width / 2;
  const centerY = movementBox.y + movementBox.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX - 64, centerY);
  await advanceManualRally(page, 0.24);
  await page.mouse.up();

  const aligned = await runtimeDebug(page);
  expect(Math.abs(aligned.controlledX - aligned.blockLaneX)).toBeLessThan(0.08);

  // Opponent contact is at 0.95 s. Buffer BLOCK around 0.10 s early so the
  // result depends on anticipation and lateral alignment rather than a prompt.
  await advanceManualRally(page, 0.61);
  const blockBox = await block.boundingBox();
  if (!blockBox) throw new Error('BLOCK button has no bounding box');
  await page.touchscreen.tap(
    blockBox.x + blockBox.width / 2,
    blockBox.y + blockBox.height / 2,
  );
  await advanceManualRally(page, 0.02);
  await expect(screen).toHaveAttribute('data-v3-buffered-action', 'JUMP_BLOCK');
  await captureBlockFrame(page, testInfo, 'block-takeoff');

  await advanceManualRally(page, 0.1);
  await expect(score).toHaveAttribute('aria-label', 'PLAYER 1 CPU 0');
  await expect(screen).toHaveAttribute('data-v3-last-event', 'BLOCK');
  await expect(page.getByTestId('v3-point-feedback')).toContainText('POINT!');
  await expect(page.getByTestId('v3-point-feedback')).toContainText('STUFF BLOCK');

  await captureBlockFrame(page, testInfo, 'stuff-block');
});

test('a missed quick block hands live control to HINA and the rally continues', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  await page.goto('/?v3e2e=manual&v3seed=72');

  const screen = page.getByTestId('v3-match-screen');
  const action = page.getByRole('button', { name: 'ACTION' });
  const dive = page.getByRole('button', { name: 'DIVE' });
  const score = page.locator('.v3-score');

  await expect(page.getByText('BLOCK READ')).toBeVisible();
  await expect(page.getByRole('button', { name: 'BLOCK' })).toBeEnabled();

  // Do not press BLOCK. Once the quick attack clears KAI, the same rally must
  // switch to HINA's cover read instead of awarding the CPU a point.
  await advanceManualRally(page, 1.0);
  await expect(screen).toHaveAttribute('data-v3-defense-kind', 'RECEIVE');
  await expect(screen).toHaveAttribute('data-v3-last-event', 'BLOCK');
  await expect(page.getByText('COVER READ')).toBeVisible();
  await expect(page.getByText('MISS · HINA COVER')).toBeVisible();
  await expect(action).toBeEnabled();
  await expect(dive).toBeEnabled();
  await expect(page.getByRole('button', { name: 'JUMP' })).toBeDisabled();
  await expect(score).toHaveAttribute('aria-label', 'PLAYER 0 CPU 0');
  await captureBlockFrame(page, testInfo, 'block-cover');

  // The follow-up ball is intentionally reachable without hidden auto-aim.
  // Buffer HINA's receive early and prove that the rally reaches the set.
  await advanceManualRally(page, 0.61);
  const actionBox = await action.boundingBox();
  if (!actionBox) throw new Error('ACTION button has no bounding box');
  await page.touchscreen.tap(
    actionBox.x + actionBox.width / 2,
    actionBox.y + actionBox.height / 2,
  );
  await advanceManualRally(page, 0.02);
  await expect(page.getByText('RECEIVE PREP')).toBeVisible();

  await advanceManualRally(page, 0.36);
  await expect(screen).toHaveAttribute('data-v3-last-event', 'RECEIVE');
  await expect(page.getByText('SET BUILDUP')).toBeVisible();
  await expect(score).toHaveAttribute('aria-label', 'PLAYER 0 CPU 0');
});