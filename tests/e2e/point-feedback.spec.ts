import { expect, test, type Page } from '@playwright/test';

async function advance(page: Page, seconds: number) {
  await page.evaluate((advanceSeconds) => {
    window.dispatchEvent(new CustomEvent('v3:e2e-advance', { detail: advanceSeconds }));
  }, seconds);
}

async function centerOf(page: Page, selector: string) {
  return page.evaluate((target) => {
    const element = document.querySelector<HTMLElement>(target);
    if (!element) throw new Error(`missing control: ${target}`);
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, top: rect.top, height: rect.height };
  }, selector);
}

test('scoring keeps the next rally live while a short POINT beat is visible', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  await page.goto('/?v3e2e=manual');

  const screen = page.getByTestId('v3-match-screen');
  const score = page.locator('.v3-score');
  const jump = page.getByRole('button', { name: 'JUMP' });
  const attack = page.getByTestId('v3-attack-pad');
  const actionCenter = await centerOf(page, '.v3-action-button--action');
  const jumpCenter = await centerOf(page, '.v3-action-button--jump');
  const attackCenter = await centerOf(page, '[data-testid="v3-attack-pad"]');

  await advance(page, 1.62);
  await page.touchscreen.tap(actionCenter.x, actionCenter.y);
  await advance(page, 0.35);
  await expect(page.getByText('SET BUILDUP')).toBeVisible();

  await advance(page, 0.45);
  await expect(jump).toBeEnabled();
  await page.touchscreen.tap(jumpCenter.x, jumpCenter.y);
  await advance(page, 0.27);
  await expect(attack).toHaveClass(/is-ready/);

  const attackStartY = attackCenter.top + attackCenter.height * 0.72;
  await page.mouse.move(attackCenter.x, attackStartY);
  await page.mouse.down();
  await page.mouse.move(attackCenter.x, attackStartY - 90);
  await page.mouse.up();
  await advance(page, 0.02);

  await expect(score).toHaveAttribute('aria-label', 'PLAYER 1 CPU 0');
  await expect(page.getByText('DEFENSE READ')).toBeVisible();
  await expect(screen).toHaveAttribute('data-v3-last-event', 'ATTACK');
  await expect(page.getByTestId('v3-point-feedback')).toContainText('POINT!');
  await expect(page.getByTestId('v3-point-feedback')).toContainText('POWER');

  await page.screenshot({
    path: `test-results/gameplay-visual-audit/${testInfo.project.name}-point.png`,
    fullPage: true,
  });

  await advance(page, 0.8);
  await expect(page.getByTestId('v3-point-feedback')).toHaveCount(0);
  await expect(page.getByText('DEFENSE READ')).toBeVisible();
});
