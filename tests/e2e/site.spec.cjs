// Site de apresentação (raiz do domínio). O aplicativo fica em /app/.
const { test, expect } = require('@playwright/test');

const ehCelular = (info) => info.project.name.startsWith('celular');
const WA = /^https:\/\/wa\.me\/5511946641992/;
const BASE = { packPrice: 120, packQty: 1000, waste: 8, failure: 5, power: 120, energyRate: 0.95, printerCost: 3200, lifeHours: 5000, maintenance: 0.4, setupMin: 20, finishMin: 10, laborRate: 30, packaging: 6, salesFee: 0, taxRate: 0 };
// o mesmo cálculo do aplicativo, avaliado dentro da página
const calcular = (page, extra, campo) => page.evaluate(([b, e, c]) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(window.InventtaCalculations.calculate({ ...b, ...e })[c]), [BASE, extra, campo]);

test.describe('site de apresentação', () => {
  test('os dois botões principais levam ao app e ao WhatsApp; Instagram à vista', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('.hero');
    await expect(hero.getByRole('link', { name: 'Acessar o app' })).toHaveAttribute('href', '/app/');
    await expect(hero.getByRole('link', { name: 'Entrar em contato' })).toHaveAttribute('href', WA);
    await expect(page.locator('.fecho').getByRole('link', { name: 'Acessar o app' })).toHaveAttribute('href', '/app/');
    await expect(page.locator('.fecho').getByRole('link', { name: 'Entrar em contato' })).toHaveAttribute('href', WA);
    for (const ig of await page.getByRole('link', { name: /@3d\.inventta/ }).all()) await expect(ig).toHaveAttribute('href', 'https://www.instagram.com/3d.inventta/');
    await expect(page.getByRole('link', { name: /@3d\.inventta/ }).first()).toBeVisible();
    expect(decodeURIComponent(await hero.getByRole('link', { name: 'Entrar em contato' }).getAttribute('href'))).toContain('Inventta 3D');
  });

  test('sem rolagem horizontal, sem erros no console, com título e idioma', async ({ page }) => {
    const erros = [];
    page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
    page.on('pageerror', (e) => erros.push(String(e)));
    await page.goto('/');
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    await expect(page).toHaveTitle(/Inventta 3D/);
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('pt-BR');
    expect(erros).toEqual([]);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu cliente pergunta');
  });

  test('conversa: o orçamento da demonstração usa o mesmo cálculo do app e é marcado como exemplo', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/');
    const esperado = await calcular(page, { amount: 38, printHours: '03:40', margin: 120, quantity: 12 }, 'price');
    await expect(page.locator('#demo-total')).toHaveText(esperado);
    await expect(page.locator('#demo-porpeca')).toContainText('valores de exemplo');
    await expect(page.locator('.enviado')).toBeVisible();
    await ctx.close();
  });

  test('conversa animada termina sozinha e permite ver de novo', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');
    await expect(page.locator('#rever')).toBeVisible({ timeout: 20000 });
    await page.locator('#rever').click();
    await expect(page.locator('#rever')).toBeHidden();
    await expect(page.locator('#rever')).toBeVisible({ timeout: 20000 });
  });

  test('calculadora ao vivo: mexer no peso muda o preço, conforme o cálculo do app', async ({ page }) => {
    await page.goto('/');
    const antes = await page.locator('#r-unit').textContent();
    await page.locator('#c-peso').evaluate((el) => { el.value = '200'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await expect(page.locator('#o-peso')).toHaveText('200 g');
    expect(await page.locator('#r-unit').textContent()).not.toBe(antes);
    const esperado = await calcular(page, { amount: 200, printHours: '03:40', margin: 120, quantity: 12 }, 'unitPrice');
    await expect(page.locator('#r-unit')).toHaveText(esperado);
    await expect(page.locator('#barra i')).toHaveCount(6);
  });

  test('peça 3D do bloco de recursos aparece e a troca de cor funciona', async ({ page }) => {
    await page.goto('/');
    await page.locator('#peca-tile').scrollIntoViewIfNeeded();
    await expect(page.locator('#peca-tile canvas')).toBeVisible({ timeout: 15000 });
    const natal = page.getByRole('button', { name: 'Natal' }), oceano = page.getByRole('button', { name: 'Oceano' });
    await expect(natal).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(600);
    const antes = await page.locator('#peca-tile canvas').screenshot();
    await oceano.click();
    await expect(oceano).toHaveAttribute('aria-pressed', 'true');
    await expect(natal).toHaveAttribute('aria-pressed', 'false');
    await page.waitForTimeout(500);
    expect((await page.locator('#peca-tile canvas').screenshot()).equals(antes)).toBe(false);
  });

  test('a conversa e a calculadora mostram o MESMO orçamento (mesmos valores iniciais)', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('#demo-total')).toHaveText(await page.locator('#r-total').textContent());
    await expect(page.locator('#demo-porpeca')).toContainText((await page.locator('#r-unit').textContent()).trim());
    await ctx.close();
  });

  test('peça 3D: as setas do teclado giram a peça', async ({ page }, info) => {
    test.skip(ehCelular(info), 'teclado é do computador');
    await page.goto('/');
    await page.locator('#peca-tile').scrollIntoViewIfNeeded();
    await expect(page.locator('#peca-tile canvas')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(600);
    await page.locator('#peca-tile').focus();
    const antes = await page.locator('#peca-tile canvas').screenshot();
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    expect((await page.locator('#peca-tile canvas').screenshot()).equals(antes)).toBe(false);
  });

  test('perguntas são uma conversa: a resposta aparece como balão do app ao abrir', async ({ page }) => {
    await page.goto('/');
    const item = page.locator('.faq details').first();
    await item.locator('summary').click();
    const cor = await item.locator('p').evaluate((p) => getComputedStyle(p).backgroundColor);
    expect(cor).not.toBe('rgba(0, 0, 0, 0)');
    expect(await item.locator('p').evaluate((p) => getComputedStyle(p).justifySelf)).toMatch(/end|flex-end/);
  });

  test('o texto do topo alinha com as demais seções', async ({ page }, info) => {
    test.skip(ehCelular(info), 'alinhamento do conteúdo no computador');
    await page.goto('/');
    const x = await page.evaluate(() => [document.querySelector('.hero-texto'), document.querySelector('.recursos h2'), document.querySelector('.rodape .marca')].map((e) => Math.round(e.getBoundingClientRect().left)));
    expect(Math.abs(x[0] - x[1])).toBeLessThanOrEqual(1);
    expect(Math.abs(x[1] - x[2])).toBeLessThanOrEqual(1);
  });

  test('tema: alternar grava a escolha (a mesma do app) e a página responde', async ({ page }) => {
    await page.goto('/');
    const botao = page.getByRole('button', { name: /Usar tema/ });
    const antes = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await botao.click();
    const tema = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(['light', 'dark']).toContain(tema);
    expect(await page.evaluate(() => localStorage.getItem('inventta-theme'))).toBe(tema);
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(antes);
  });

  test('perguntas frequentes abrem e fecham; o preço não é prometido', async ({ page }) => {
    await page.goto('/');
    const item = page.locator('.faq details').first();
    await item.locator('summary').click();
    await expect(item).toHaveAttribute('open', '');
    await item.locator('summary').click();
    await expect(item).not.toHaveAttribute('open', '');
    const texto = await page.locator('main').innerText();
    expect(texto).not.toMatch(/gr[aá]tis|gratuit|depoiment|milhares|\d+\s*mil (clientes|usu)/i); // nada que o produto não confirmou
    await expect(page.getByText('Chame no WhatsApp para saber as condições.')).toHaveCount(1);
  });

  test('teclado: o primeiro Tab leva ao "Pular para o conteúdo" e o foco é visível nos botões', async ({ page }, info) => {
    test.skip(ehCelular(info), 'foco por teclado é do computador');
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    const largura = await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement).outlineWidth));
    expect(largura).toBeGreaterThanOrEqual(2);
  });

  test('celular: a barra fixa com os dois botões aparece ao rolar', async ({ page }, info) => {
    test.skip(!ehCelular(info), 'a barra fixa é só do celular');
    await page.goto('/');
    await expect(page.locator('#barra-fixa')).toBeHidden();
    await page.evaluate(() => scrollTo(0, 1400));
    const barra = page.locator('#barra-fixa');
    await expect(barra).toBeVisible();
    await expect(barra.getByRole('link', { name: 'Acessar o app' })).toHaveAttribute('href', '/app/');
    await expect(barra.getByRole('link', { name: /Contato/ })).toHaveAttribute('href', WA);
  });

  test('retorno do login Google que caia na raiz é repassado ao app, com o código', async ({ page }) => {
    await page.route('**/app/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>app</title>' }));
    await page.goto('/?code=abc123');
    await page.waitForURL(/\/app\/\?code=abc123/);
  });

  test('/app/ abre o aplicativo (login)', async ({ page }) => {
    await page.goto('/app/');
    await expect(page.locator('#googleLogin')).toBeVisible();
  });
});
