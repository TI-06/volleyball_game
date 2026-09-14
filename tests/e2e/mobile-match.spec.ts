import { expect, test } from '@playwright/test';

test('smartphone landscape can enter and control a CPU match without layout overflow', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'VOLLEYBALL' })).toBeVisible();
  await page.getByRole('button', { name: 'CPU MATCH' }).click();
  await expect(page.getByRole('heading', { name: '難易度を選択' })).toBeVisible();
  await page.getByRole('button', { name: /NORMAL/ }).click();

  await expect(page.getByTestId('match-screen')).toBeVisible();
  await expect(page.getByText(/TUTORIAL/)).toBeVisible();

  await page.getByRole('button', { name: /KAI/ }).click();
  await expect(page.locator('.controlled-player-label')).toHaveText('KAI');

  const actionButton = page.locator('.action-button');
  await expect(actionButton).toBeVisible({ timeout: 5000 });

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);

  const actionBox = await actionButton.boundingBox();
  const viewport = page.viewportSize();
  expect(actionBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (actionBox && viewport) {
    const rightGutter = viewport.width - (actionBox.x + actionBox.width);
    const bottomGutter = viewport.height - (actionBox.y + actionBox.height);
    expect(rightGutter).toBeGreaterThanOrEqual(28);
    expect(bottomGutter).toBeGreaterThanOrEqual(20);
  }
});
