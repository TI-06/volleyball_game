import { expect, test } from '@playwright/test';

test('gameplay v3 stays readable and separated on smartphone landscape', async ({ page }, testInfo) => {
  await page.goto('/?v3=1');

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
  await expect(page.getByText('GAMEPLAY V3')).toBeVisible();
  await expect(page.getByText(/DEFENSE READ|RECEIVE PREP/)).toBeVisible();

  await page.waitForTimeout(220);

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

  await page.screenshot({
    path: `test-results/v3-visual-audit/${testInfo.project.name}-initial-read.png`,
    fullPage: true,
  });
});
