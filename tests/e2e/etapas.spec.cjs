const { test, expect } = require('@playwright/test');
const { entrar, gerarOrcamento } = require('./apoio.cjs');

// Os botões numerados do topo voltam e avançam entre as etapas; a tela precisa acompanhar o botão.
test.describe('etapas do orçamento', () => {
  const noPainel = (page, i) => page.evaluate((n) => {
    const p = document.querySelector(`.panel[data-panel="${n}"]`), v = document.getElementById('viewport').getBoundingClientRect(), r = p.getBoundingClientRect();
    return { inert: p.inert, aTela: Math.abs(r.left - v.left) < 2 };
  }, i);

  test('voltar pelos números durante o preenchimento mostra a etapa e o Continuar segue de lá', async ({ page }) => {
    await entrar(page);
    const ir = (i) => page.locator(`.panel[data-panel="${i}"] .btn-next`).click();
    await page.getByRole('textbox', { name: 'Nome da peça' }).fill('Peça');
    await ir(0);
    await page.locator('#amount').fill('38');
    await page.locator('#packPrice').fill('120');
    await ir(1);
    await page.locator('#printHours').fill('0342');
    await ir(2);
    await expect.poll(() => noPainel(page, 3)).toMatchObject({ aTela: true, inert: false });

    await page.getByRole('button', { name: /^Etapa 1:/ }).click();
    await expect.poll(() => noPainel(page, 0)).toMatchObject({ aTela: true, inert: false });
    await expect(page.locator('#stageCount')).toHaveText('Etapa 1 de 5');

    await page.locator('.panel[data-panel="0"] .btn-next').click();
    await expect.poll(() => noPainel(page, 1)).toMatchObject({ aTela: true, inert: false });
    await expect(page.locator('#stageCount')).toHaveText('Etapa 2 de 5');
  });

  test('voltar pelos números com o preço na tela reabre a etapa; recalcular não duplica o item', async ({ page }) => {
    await entrar(page);
    await gerarOrcamento(page, { peca: 'Vaso' });
    await expect(page.locator('#quoteItems .quote-item')).toHaveCount(1);

    await page.getByRole('button', { name: /^Etapa 2:/ }).click();
    await expect(page.locator('#result')).not.toHaveClass(/show/);
    await expect(page.locator('#formCard')).toBeVisible();
    await expect(page.locator('#stageCount')).toHaveText('Etapa 2 de 5');
    await expect.poll(() => noPainel(page, 1)).toMatchObject({ aTela: true, inert: false });
    await expect(page.locator('#amount')).toHaveValue('38');

    // avançar pelo número e pelo Continuar chega de novo ao preço, com um item só
    await page.getByRole('button', { name: /^Etapa 5:/ }).click();
    await expect(page.locator('#stageCount')).toHaveText('Etapa 5 de 5');
    await page.locator('.panel[data-panel="4"] .btn-next').click();
    await page.locator('#result.show').waitFor({ timeout: 10_000 });
    await expect(page.locator('#quoteItems .quote-item')).toHaveCount(1);
  });
});
