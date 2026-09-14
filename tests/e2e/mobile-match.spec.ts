import { expect, test } from '@playwright/test';

test('smartphone landscape enters the 2.5d match with fixed PLAY and POWER controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'VOLLEYBALL' })).toBeVisible();
  await page.getByRole('button', { name: 'CPU MATCH' }).click();
  await expect(page.getByRole('heading', { name: '難易度を選択' })).toBeVisible();
  await page.getByRole('button', { name: /NORMAL/ }).click();

  await expect(page.getByTestId('rework-match-screen')).toBeVisible();
  await expect(page.getByText(/QUICK START/)).toBeVisible();
  await expect(page.getByText('KAI')).toBeVisible();

  const movement = page.getByTestId('rework-movement-strip');
  const play = page.getByRole('button', { name: /PLAY/i });
  const power = page.getByRole('button', { name: /POWER/i });
  await expect(movement).toBeVisible();
  await expect(play).toBeVisible();
  await expect(power).toBeVisible();
  await expect(page.locator('.character-switcher')).toHaveCount(0);
  await expect(page.locator('.action-button')).toHaveCount(0);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);

  const playBox = await play.boundingBox();
  const powerBox = await power.boundingBox();
  const viewport = page.viewportSize();
  expect(playBox).not.toBeNull();
  expect(powerBox).not.toBeNull();
  expect(viewport).not.toBeNull();

  if (playBox && powerBox && viewport) {
    expect(playBox.width).toBeGreaterThanOrEqual(88);
    expect(playBox.height).toBeGreaterThanOrEqual(88);
    expect(powerBox.width).toBeGreaterThanOrEqual(104);
    expect(powerBox.height).toBeGreaterThanOrEqual(104);
    const rightGutter = viewport.width - (powerBox.x + powerBox.width);
    const bottomGutter = viewport.height - (powerBox.y + powerBox.height);
    expect(rightGutter).toBeGreaterThanOrEqual(18);
    expect(bottomGutter).toBeGreaterThanOrEqual(14);
  }
});
