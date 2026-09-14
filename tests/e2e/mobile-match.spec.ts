import { expect, test } from '@playwright/test';

test('smartphone landscape can enter a CPU match without layout overflow', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'VOLLEYBALL' })).toBeVisible();
  await page.getByRole('button', { name: 'CPU MATCH' }).click();
  await expect(page.getByRole('heading', { name: '難易度を選択' })).toBeVisible();
  await page.getByRole('button', { name: /NORMAL/ }).click();

  await expect(page.getByTestId('match-screen')).toBeVisible();
  await expect(page.getByText(/TUTORIAL/)).toBeVisible();
  const actionButton = page.locator('.action-button');
  await expect(actionButton).toBeVisible({ timeout: 5000 });

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);

  const actionBox = await actionButton.boundingBox();
  expect(actionBox).not.toBeNull();
  if (actionBox) {
    const rightGutter = 844 - (actionBox.x + actionBox.width);
    const bottomGutter = 390 - (actionBox.y + actionBox.height);
    expect(rightGutter).toBeGreaterThanOrEqual(28);
    expect(bottomGutter).toBeGreaterThanOrEqual(20);
  }
});
