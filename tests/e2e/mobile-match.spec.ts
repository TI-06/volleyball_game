import { expect, test, type Page } from '@playwright/test';

const STORAGE_KEY = 'volleyball-game:v1';

async function seedTutorialComplete(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          settings: {
            tutorialComplete: true,
            switchMode: 'STANDARD',
            cameraMode: 'STANDARD',
            unlockedDifficulties: ['BEGINNER', 'NORMAL', 'HARD'],
          },
          records: {
            bestScores: {},
            highestSpikeKmh: 0,
            perfectCount: 0,
            matchesPlayed: 0,
            wins: 0,
          },
        }),
      );
    },
    { key: STORAGE_KEY },
  );
}

async function enterNormalMatch(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'CPU MATCH' }).click();
  await expect(page.getByRole('heading', { name: '難易度を選択' })).toBeVisible();
  await page.getByRole('button', { name: /NORMAL/ }).click();
  await expect(page.getByTestId('rework-match-screen')).toBeVisible();
}

test('smartphone landscape enters the 2.5d match with fixed PLAY and POWER controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'VOLLEYBALL' })).toBeVisible();
  await enterNormalMatch(page);

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

test('mobile match serves, scores, reaches result, and rematches without replaying tutorial', async ({ page }) => {
  await seedTutorialComplete(page);
  await page.goto('/?e2e=1');
  await enterNormalMatch(page);

  await expect(page.getByText(/QUICK START/)).toHaveCount(0);
  const score = page.locator('.rework-score');
  await expect(score).toHaveAttribute('aria-label', 'PLAYER 0 CPU 0');

  const servePower = page.getByRole('button', { name: /POWER SERVE/i });
  await expect(servePower).toBeVisible();
  await servePower.tap();

  await expect(score).not.toHaveAttribute('aria-label', 'PLAYER 0 CPU 0', { timeout: 12_000 });
  await expect(page.getByTestId('rework-match-screen')).toBeVisible();

  await page.evaluate(() => {
    const bridge = (window as typeof window & {
      __VOLLEYBALL_E2E__?: { finishMatch: (homeScore: number, awayScore: number) => void };
    }).__VOLLEYBALL_E2E__;
    if (!bridge) throw new Error('missing local E2E bridge');
    bridge.finishMatch(15, 8);
  });

  await expect(page.getByRole('heading', { name: 'WIN' })).toBeVisible();
  await expect(page.getByLabel('試合結果')).toContainText('15');
  await page.getByRole('button', { name: 'REMATCH' }).click();

  await expect(page.getByTestId('rework-match-screen')).toBeVisible();
  await expect(page.getByText(/QUICK START/)).toHaveCount(0);
  await expect(page.locator('.rework-score')).toHaveAttribute('aria-label', 'PLAYER 0 CPU 0');
});
