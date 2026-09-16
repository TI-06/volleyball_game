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

  const movement = page.getByTestId('v3-movement-pad');
  const action = page.getByRole('button', { name: 'ACTION' });
  const jump = page.getByRole('button', { name: 'JUMP' });
  const attack = page.getByTestId('v3-attack-pad');
  const score = page.locator('.v3-score');

  await expect(page.getByText('DEFENSE READ')).toBeVisible();
  await expect(score).toHaveAttribute('aria-label', 'PLAYER 0 CPU 0');

  // Seed 73 lands just in front of HINA. Move toward the forecast using the
  // actual virtual stick so this verifies direct 2D touch movement as part of
  // the rally instead of relying on a static starting position.
  const movementBox = await movement.boundingBox();
  expect(movementBox).not.toBeNull();
  if (!movementBox) return;
  const moveX = movementBox.x + movementBox.width / 2;
  const moveY = movementBox.y + movementBox.height / 2;
  await page.mouse.move(moveX, moveY);
  await page.mouse.down();
  await page.mouse.move(moveX, moveY - 40);
  await page.waitForTimeout(150);
  await page.mouse.up();

  // ACTION is buffered before contact. The timing is deliberately early enough
  // to feel human rather than requiring a last-frame reaction.
  await page.waitForTimeout(1_350);
  await action.click();
  await expect(page.getByText('SET BUILDUP')).toBeVisible({ timeout: 1_000 });

  // REN sets automatically for this first slice, then control moves to KAI.
  await expect(page.getByText('ATTACK APPROACH')).toBeVisible({ timeout: 1_000 });
  await expect(jump).toBeEnabled();

  // The ideal jump is about 450 ms after set contact. HUD updates every 80 ms,
  // so ~300 ms after ATTACK APPROACH lands inside the forgiving GOOD/PERFECT window.
  await page.waitForTimeout(300);
  await jump.click();
  await expect(page.getByText('ATTACK AIRBORNE')).toBeVisible({ timeout: 700 });
  await expect(attack).toHaveClass(/is-ready/);

  // Upward swipe = POWER. Seed 73 with a successful jump deterministically wins
  // this rally, proving that the real screen input path reaches score/reset.
  const attackBox = await attack.boundingBox();
  expect(attackBox).not.toBeNull();
  if (!attackBox) return;
  const attackX = attackBox.x + attackBox.width / 2;
  const attackY = attackBox.y + attackBox.height * 0.72;
  await page.mouse.move(attackX, attackY);
  await page.mouse.down();
  await page.mouse.move(attackX, attackY - 90);
  await page.mouse.up();

  await expect(score).toHaveAttribute('aria-label', 'PLAYER 1 CPU 0', { timeout: 1_000 });
  await expect(page.getByText('DEFENSE READ')).toBeVisible();
});
