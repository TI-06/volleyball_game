import { expect, test, type Page, type TestInfo } from '@playwright/test';

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

async function advanceManualRally(page: Page, seconds: number) {
  await page.evaluate((advanceSeconds) => {
    window.dispatchEvent(new CustomEvent('v3:e2e-advance', { detail: advanceSeconds }));
  }, seconds);
}

async function readLiveControlCenters(page: Page) {
  return page.evaluate(() => {
    const center = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`missing live control: ${selector}`);
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        top: rect.top,
        height: rect.height,
      };
    };

    return {
      action: center('.v3-action-button--action'),
      jump: center('.v3-action-button--jump'),
      attack: center('[data-testid="v3-attack-pad"]'),
    };
  });
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

test('live controls complete a full receive-set-jump-spike rally', async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto('/?v3e2e=manual');

  const screen = page.getByTestId('v3-match-screen');
  const jump = page.getByRole('button', { name: 'JUMP' });
  const attack = page.getByTestId('v3-attack-pad');
  const score = page.locator('.v3-score');

  await expect(page.getByText('DEFENSE READ')).toBeVisible();
  await expect(score).toHaveAttribute('aria-label', 'PLAYER 0 CPU 0');

  const controls = await readLiveControlCenters(page);
  expect((await readRuntimeDebug(page)).lastEvent).not.toBe('POINT');

  // Manual mode advances the exact same 1/60 runtime steps without depending
  // on software-rendered Three.js frame rate. All player actions below still
  // enter through the real screen controls.
  await advanceManualRally(page, 1.62);
  expect(Number((await readRuntimeDebug(page)).time)).toBeGreaterThanOrEqual(1.6);
  await page.touchscreen.tap(controls.action.x, controls.action.y);
  await advanceManualRally(page, 0.02);
  await expect(page.getByText('RECEIVE PREP')).toBeVisible();

  await advanceManualRally(page, 0.33);
  await expect(page.getByText('SET BUILDUP')).toBeVisible();
  expect((await readRuntimeDebug(page)).lastEvent).toBe('RECEIVE');

  // REN sets at t=2.50, then KAI becomes the controlled attacker.
  await advanceManualRally(page, 0.55);
  await expect(page.getByText('ATTACK APPROACH')).toBeVisible();
  await expect(jump).toBeEnabled();

  // Ideal jump is t=2.95. Tap at about t=2.84 for a forgiving GOOD timing.
  await advanceManualRally(page, 0.32);
  await page.touchscreen.tap(controls.jump.x, controls.jump.y);
  await advanceManualRally(page, 0.02);
  await expect(page.getByText('ATTACK AIRBORNE')).toBeVisible();
  await expect(attack).toHaveClass(/is-ready/);

  // Upward drag = POWER. Seed 73 with a successful jump deterministically wins.
  const attackStartY = controls.attack.top + controls.attack.height * 0.72;
  await page.mouse.move(controls.attack.x, attackStartY);
  await page.mouse.down();
  await page.mouse.move(controls.attack.x, attackStartY - 90);
  await page.mouse.up();
  await advanceManualRally(page, 0.02);

  await expect(score).toHaveAttribute('aria-label', 'PLAYER 1 CPU 0');
  await expect(page.getByText('DEFENSE READ')).toBeVisible();
  await expect(screen).toHaveAttribute('data-v3-last-event', 'ATTACK');
});
