import { expect, test } from '@playwright/test';

/**
 * The downstream check this repository exists for.
 *
 * The library's own suite runs against fixtures and mocked HTTP responses, and
 * the conformance suite runs against case data. Neither can catch the library
 * and the backend disagreeing about what a response means -- which has
 * happened twice: the two field spellings, and the published package having no
 * entry points at all.
 *
 * So this drives the real provider against a real backend seeded by
 * scripts/seed.sh.
 */
test.describe('library against a real backend', () => {
  test('every seeded toggle evaluates as expected', async ({ page }) => {
    await page.goto('/');

    // Fails loudly rather than reporting "all off" when the seed is missing.
    await expect(page.getByTestId('error')).toHaveCount(0);

    const summary = page.getByTestId('summary');
    await expect(summary).toContainText('All 7 toggles match', {
      timeout: 15_000,
    });
  });

  // Spelled out individually so a failure names the rule rather than just
  // "the summary was wrong".
  const cases: [string, string][] = [
    ['alwaysOn', 'true'],
    ['alwaysOff', 'false'],
    ['notYetActive', 'false'],
    ['alreadyDisabled', 'false'],
    ['insideWindow', 'true'],
    ['outsideWindow', 'false'],
    ['noSuchToggle', 'false'],
  ];

  for (const [key, expected] of cases) {
    test(`${key} is ${expected}`, async ({ page }) => {
      await page.goto('/');
      await expect(page.getByTestId(`actual-${key}`)).toHaveText(expected, {
        timeout: 15_000,
      });
    });
  }
});
