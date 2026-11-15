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

// O balão abre ao passar o mouse (computador) ou tocar (celular) e fica dentro da tela, com o texto.
test('balões de ajuda aparecem e ficam dentro da tela, em todos os campos da etapa', async ({ page }, info) => {
  const toque = info.project.name.startsWith('celular');
  await entrar(page);
  const gatilhos = page.locator('.panel:not([inert]) .field-help-trigger:visible');
  const n = await gatilhos.count();
  expect(n).toBeGreaterThan(3);
  for (let i = 0; i < n; i++) {
    const g = gatilhos.nth(i);
    await g.scrollIntoViewIfNeeded();
    if (toque) await g.tap(); else await g.hover();
    const id = await g.getAttribute('aria-describedby');
    const balao = page.locator(`#${id}`);
    await expect(balao, `balão de ${await g.getAttribute('data-for')}`).toBeVisible({ timeout: 3000 });
    expect((await balao.textContent()).trim().length).toBeGreaterThan(20);
    const caixa = await balao.boundingBox();
    expect(caixa.x).toBeGreaterThanOrEqual(0); expect(caixa.x + caixa.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
    expect(caixa.y).toBeGreaterThanOrEqual(0); expect(caixa.y + caixa.height).toBeLessThanOrEqual(page.viewportSize().height + 1);
    await page.keyboard.press('Escape');
    await page.mouse.move(2, 2);
  }
});
