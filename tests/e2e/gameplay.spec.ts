import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

async function expectCommonGameplaySurface(page: Page) {
  const screen = page.getByTestId('v3-match-screen');
  const scene = page.locator('.v3-scene-host canvas');
  const movement = page.getByTestId('v3-movement-pad');
  const action = page.getByRole('button', { name: 'ACTION' });
  const dive = page.getByRole('button', { name: 'DIVE' });
  const jump = page.getByRole('button', { name: 'JUMP' });
  const attack = page.getByTestId('v3-attack-pad');

  await expect(screen).toBeVisible();
  await expect(scene).toBeVisible();
  await expect(movement).toBeVisible();
  await expect(action).toBeVisible();
  await expect(dive).toBeVisible();
  await expect(jump).toBeVisible();
  await expect(attack).toBeVisible();
  await expect(page.getByText('VOLLEYBALL')).toBeVisible();
  await expect(page.getByText('GAMEPLAY V3')).toHaveCount(0);

  return { movement, action, dive, jump, attack };
}

async function captureAuditFrame(page: Page, testInfo: TestInfo, scenario: string) {
  await page.screenshot({
    path: `test-results/gameplay-visual-audit/${testInfo.project.name}-${scenario}.png`,
    fullPage: true,
  });
}

async function readRuntimeDebug(page: Page) {
  const screen = page.getByTestId('v3-match-screen');
  return screen.evaluate((element) => ({
    time: element.getAttribute('data-v3-time'),
    controlledX: element.getAttribute('data-v3-controlled-x'),
    controlledZ: element.getAttribute('data-v3-controlled-z'),
    landingX: element.getAttribute('data-v3-landing-x'),
    landingZ: element.getAttribute('data-v3-landing-z'),
    bufferedAction: element.getAttribute('data-v3-buffered-action'),
    lastEvent: element.getAttribute('data-v3-last-event'),
    phase: element.getAttribute('data-v3-rally-phase'),
  }));
}

async function locatorCenter(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error('expected control to have a bounding box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

async function waitForGameTime(page: Page, minimum: number, timeout = 2_000) {
  const screen = page.getByTestId('v3-match-screen');
  await expect
    .poll(async () => Number(await screen.getAttribute('data-v3-time')), { timeout })
    .toBeGreaterThanOrEqual(minimum);
}

test('production gameplay stays readable and separated on smartphone landscape', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  await page.goto('/?v3audit=initial');

  const { movement, action, dive, jump, attack } = await expectCommonGameplaySurface(page);
  const score = page.locator('.v3-score');

  await expect(page.getByText('DEFENSE READ')).toBeVisible();
  await expect(score).toHaveAttribute('aria-label', 'PLAYER 0 CPU 0');

  await page.waitForTimeout(500);
  await expect(score).toHaveAttribute('aria-label', 'PLAYER 0 CPU 0');
  await expect(page.getByText('DEFENSE READ')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);

  const movementBox = await movement.boundingBox();
  const actionBox = await action.boundingBox();
  const diveBox = await dive.boundingBox();
  const jumpBox = await jump.boundingBox();
  const attackBox = await attack.boundingBox();
  const viewport = page.viewportSize();

  expect(movementBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  expect(diveBox).not.toBeNull();
  expect(jumpBox).not.toBeNull();
  expect(attackBox).not.toBeNull();
  expect(viewport).not.toBeNull();

  if (movementBox && actionBox && diveBox && jumpBox && attackBox && viewport) {
    expect(movementBox.width).toBeGreaterThanOrEqual(110);
    expect(movementBox.height).toBeGreaterThanOrEqual(110);
    expect(actionBox.width).toBeGreaterThanOrEqual(56);
    expect(diveBox.width).toBeGreaterThanOrEqual(56);
    expect(jumpBox.height).toBeGreaterThanOrEqual(100);
    expect(attackBox.width).toBeGreaterThanOrEqual(135);
    expect(attackBox.height).toBeGreaterThanOrEqual(100);

    const movementRight = movementBox.x + movementBox.width;
    const actionsLeft = Math.min(actionBox.x, diveBox.x, jumpBox.x, attackBox.x);
    expect(actionsLeft - movementRight).toBeGreaterThanOrEqual(40);

    expect(movementBox.y + movementBox.height).toBeLessThanOrEqual(viewport.height - 6);
    expect(attackBox.x + attackBox.width).toBeLessThanOrEqual(viewport.width - 8);
    expect(attackBox.y + attackBox.height).toBeLessThanOrEqual(viewport.height - 6);
  }

  await captureAuditFrame(page, testInfo, 'initial');
});

const actionAuditCases = [
  { name: 'receive', phase: 'SET BUILDUP' },
  { name: 'set', phase: 'ATTACK APPROACH' },
  { name: 'spike', phase: 'ATTACK AIRBORNE' },
] as const;

for (const scenario of actionAuditCases) {
  test(`action audit frame: ${scenario.name}`, async ({ page }, testInfo) => {
    test.setTimeout(45_000);
    await page.goto(`/?v3audit=${scenario.name}`);
    const { jump, attack } = await expectCommonGameplaySurface(page);

    await expect(page.getByText(scenario.phase)).toBeVisible();
    await expect(page.locator('.v3-score')).toHaveAttribute('aria-label', 'PLAYER 0 CPU 0');

    if (scenario.name === 'set') {
      await expect(jump).toBeEnabled();
    }
    if (scenario.name === 'spike') {
      await expect(attack).toHaveClass(/is-ready/);
    }

    // Simulation remains frozen while the articulated character pose has time
    // to reach a readable action frame.
    await page.waitForTimeout(320);
    await expect(page.getByText(scenario.phase)).toBeVisible();
    await captureAuditFrame(page, testInfo, scenario.name);
  });
}

test('live touch controls complete a full receive-set-jump-spike rally', async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto('/');

  const screen = page.getByTestId('v3-match-screen');
  const movement = page.getByTestId('v3-movement-pad');
  const action = page.getByRole('button', { name: 'ACTION' });
  const jump = page.getByRole('button', { name: 'JUMP' });
  const attack = page.getByTestId('v3-attack-pad');
  const score = page.locator('.v3-score');

  await expect(page.getByText('DEFENSE READ')).toBeVisible();
  await expect(score).toHaveAttribute('aria-label', 'PLAYER 0 CPU 0');

  // Resolve all control coordinates while the new startup-readiness window is
  // holding the first rally at t=0. Timing-sensitive taps later use raw touch
  // coordinates instead of Locator.click(), which can consume >1 game second.
  const movementCenter = await locatorCenter(movement);
  const actionCenter = await locatorCenter(action);
  const jumpCenter = await locatorCenter(jump);
  const attackCenter = await locatorCenter(attack);
  const cdp = await page.context().newCDPSession(page);

  try {
    // The first rally must still be untouched when controls are ready.
    expect((await readRuntimeDebug(page)).lastEvent).not.toBe('POINT');

    await expect(page.getByText('APPROACH_READ')).toBeVisible({ timeout: 3_000 });

    const beforeMove = await readRuntimeDebug(page);
    const beforeZ = Number(beforeMove.controlledZ);

    // Real touch drag on the 2D stick: seed 73 lands ~0.6m in front of HINA.
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: movementCenter.x, y: movementCenter.y, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: movementCenter.x, y: movementCenter.y - 48, id: 1 }],
    });
    await page.waitForTimeout(160);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(90);

    const afterMove = await readRuntimeDebug(page);
    expect(Number(afterMove.controlledZ)).toBeGreaterThan(beforeZ + 0.25);
    expect(afterMove.lastEvent).not.toBe('POINT');

    await expect(page.getByText('FLIGHT_CONFIRMED')).toBeVisible({ timeout: 1_500 });

    // Contact is t=1.95. Tapping near t=1.62 leaves the 450ms input buffer
    // active through contact while producing a normal GOOD/PERFECT receive.
    await waitForGameTime(page, 1.62, 1_500);
    await page.touchscreen.tap(actionCenter.x, actionCenter.y);
    await expect(page.getByText('RECEIVE PREP')).toBeVisible({ timeout: 300 });
    await expect(page.getByText('SET BUILDUP')).toBeVisible({ timeout: 700 });
    expect((await readRuntimeDebug(page)).lastEvent).toBe('RECEIVE');

    // REN sets automatically, then control moves to KAI. Ideal jump is t=2.95.
    await expect(page.getByText('ATTACK APPROACH')).toBeVisible({ timeout: 900 });
    await expect(jump).toBeEnabled();
    await waitForGameTime(page, 2.84, 900);
    await page.touchscreen.tap(jumpCenter.x, jumpCenter.y);
    await expect(page.getByText('ATTACK AIRBORNE')).toBeVisible({ timeout: 350 });
    await expect(attack).toHaveClass(/is-ready/);

    // Real upward touch swipe = POWER. Successful seed-73 attack must score and
    // reset into the next defensive read, proving the complete screen input path.
    const attackStartY = attackCenter.box.y + attackCenter.box.height * 0.72;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: attackCenter.x, y: attackStartY, id: 2 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: attackCenter.x, y: attackStartY - 90, id: 2 }],
    });
    await page.waitForTimeout(32);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    await expect(score).toHaveAttribute('aria-label', 'PLAYER 1 CPU 0', { timeout: 500 });
    await expect(page.getByText('DEFENSE READ')).toBeVisible();
    await expect(screen).toHaveAttribute('data-v3-last-event', 'ATTACK');
  } finally {
    await cdp.detach();
  }
});
