const { test, expect } = require('@playwright/test');
const { entrar } = require('./apoio.cjs');

// Os balões de ajuda (?) abrem por mouse/toque; o Tab passa direto por eles.
test('balões de ajuda ficam fora da ordem do Tab', async ({ page }) => {
  await entrar(page);
  const gatilhos = page.locator('.field-help-trigger');
  expect(await gatilhos.count()).toBeGreaterThan(0);
  const comTab = await gatilhos.evaluateAll((els) => els.filter((e) => e.tabIndex >= 0).length);
  expect(comTab).toBe(0);
  await page.getByRole('textbox', { name: 'Nome da peça' }).focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement.classList.contains('field-help-trigger'))).toBe(false);
});
