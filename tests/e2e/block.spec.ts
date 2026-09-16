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
    landingX: Number(element.getAttribute('data-v3-landing-x')),
    landingZ: Number(element.getAttribute('data-v3-landing-z')),
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

async function moveQuickBlockerLeft(page: Page, seconds: number) {
  const movement = page.getByTestId('v3-movement-pad');
  const movementBox = await movement.boundingBox();
  if (!movementBox) throw new Error('movement pad has no bounding box');
  const centerX = movementBox.x + movementBox.width / 2;
  const centerY = movementBox.y + movementBox.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX - 64, centerY);
  await advanceManualRally(page, seconds);
  await page.mouse.up();
}

async function pressBlock(page: Page) {
  const block = page.getByRole('button', { name: 'BLOCK' });
  const blockBox = await block.boundingBox();
  if (!blockBox) throw new Error('BLOCK button has no bounding box');
  await page.touchscreen.tap(
    blockBox.x + blockBox.width / 2,
    blockBox.y + blockBox.height / 2,
  );
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
  await pressBlock(page);
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

test('a glancing block produces a slower shallow TOUCH cover ball', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  await page.goto('/?v3e2e=manual&v3seed=72');

  const screen = page.getByTestId('v3-match-screen');
  await expect(page.getByText('BLOCK READ')).toBeVisible();

  // Move only partway into the lane: enough to contact, not enough to stuff.
  await moveQuickBlockerLeft(page, 0.12);
  const partial = await runtimeDebug(page);
  const lateralError = Math.abs(partial.controlledX - partial.blockLaneX);
  expect(lateralError).toBeGreaterThan(0.45);
  expect(lateralError).toBeLessThan(0.8);

  await advanceManualRally(page, 0.73);
  await pressBlock(page);
  await advanceManualRally(page, 0.12);

  await expect(screen).toHaveAttribute('data-v3-last-event', 'BLOCK');
  await expect(page.getByText('COVER READ')).toBeVisible();
  await expect(page.getByText('TOUCH · HINA COVER')).toBeVisible();
  const afterTouch = await runtimeDebug(page);
  expect(afterTouch.landingZ).toBeGreaterThan(-4.5);
  await expect(page.locator('.v3-score')).toHaveAttribute('aria-label', 'PLAYER 0 CPU 0');

  await advanceManualRally(page, 0.2);
  await captureBlockFrame(page, testInfo, 'touch-cover');
});

test('an outside-hand block produces a fast lateral DEFLECT cover ball', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  await page.goto('/?v3e2e=manual&v3seed=72');

  const screen = page.getByTestId('v3-match-screen');
  await expect(page.getByText('BLOCK READ')).toBeVisible();

  // Barely close the lane so the ball clips the outside hand and kicks wide.
  await moveQuickBlockerLeft(page, 0.05);
  const outside = await runtimeDebug(page);
  const lateralError = Math.abs(outside.controlledX - outside.blockLaneX);
  expect(lateralError).toBeGreaterThan(0.8);
  expect(lateralError).toBeLessThan(1.2);

  await advanceManualRally(page, 0.8);
  await pressBlock(page);
  await advanceManualRally(page, 0.12);

  await expect(screen).toHaveAttribute('data-v3-last-event', 'BLOCK');
  await expect(page.getByText('COVER READ')).toBeVisible();
  await expect(page.getByText('DEFLECT · HINA COVER')).toBeVisible();
  const afterDeflect = await runtimeDebug(page);
  expect(Math.abs(afterDeflect.landingX - 1.744)).toBeGreaterThan(1.25);
  await expect(page.locator('.v3-score')).toHaveAttribute('aria-label', 'PLAYER 0 CPU 0');

  await advanceManualRally(page, 0.2);
  await captureBlockFrame(page, testInfo, 'deflect-cover');
});