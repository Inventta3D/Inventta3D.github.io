// Site de apresentação (raiz do domínio). O aplicativo fica em /app/.
// Estrutura da página nova (sistema do taste-skill): hero sozinho na primeira tela, cada seção com 1 ou 2 telas, bordas iguais.
const { test, expect } = require('@playwright/test');

const ehCelular = (info) => info.project.name.startsWith('celular');
const WA = /^https:\/\/wa\.me\/5511946641992/;
const BASE = { packPrice: 120, packQty: 1000, waste: 8, failure: 5, power: 120, energyRate: 0.95, printerCost: 3200, lifeHours: 5000, maintenance: 0.4, setupMin: 20, finishMin: 10, laborRate: 30, packaging: 6, salesFee: 0, taxRate: 0 };
// o mesmo cálculo do aplicativo, avaliado dentro da página
const calcular = (page, extra, campo) => page.evaluate(([b, e, c]) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(window.InventtaCalculations.calculate({ ...b, ...e })[c]), [BASE, extra, campo]);

test.describe('site de apresentação', () => {
  test('os botões principais levam ao app e ao WhatsApp; Instagram à vista', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('.hero');
    await expect(hero.getByRole('link', { name: 'Acessar o app' })).toHaveAttribute('href', '/app/');
    await expect(hero.getByRole('link', { name: 'Falar no WhatsApp' })).toHaveAttribute('href', WA);
    const fecho = page.locator('footer.closing');
    await expect(fecho.getByRole('link', { name: 'Acessar o app' }).first()).toHaveAttribute('href', '/app/');
    await expect(fecho.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', WA);
    await expect(fecho.getByRole('link', { name: /@3d\.inventta/ })).toHaveAttribute('href', 'https://www.instagram.com/3d.inventta/');
    expect(decodeURIComponent(await hero.getByRole('link', { name: 'Falar no WhatsApp' }).getAttribute('href'))).toContain('Inventta 3D');
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
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Orçamento de impressão 3D');
    expect(erros).toEqual([]);
  });

  test('o hero ocupa a primeira tela, sozinho, com os botões à vista', async ({ page }) => {
    await page.goto('/');
    const vh = page.viewportSize().height;
    const caixa = await page.locator('.hero').boundingBox();
    expect(Math.abs(caixa.height - vh)).toBeLessThanOrEqual(2);
    for (const nome of ['Acessar o app', 'Falar no WhatsApp']) {
      const b = await page.locator('.hero .btn-row').getByRole('link', { name: nome }).boundingBox();
      expect(b.y + b.height, `${nome} abaixo da primeira tela`).toBeLessThanOrEqual(vh);
    }
    await expect(page.locator('.hero__window .win__steps')).toBeVisible();
  });

  test('cada seção ocupa exatamente uma ou duas telas (e começa numa tela inteira)', async ({ page }, info) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    const vh = page.viewportSize().height;
    const secoes = await page.evaluate(() => [...document.querySelectorAll('main > section')].map((s) => ({ id: s.id || 'hero', top: s.getBoundingClientRect().top + scrollY, h: s.getBoundingClientRect().height })));
    expect(secoes.map((s) => s.id)).toEqual(['hero', 'app', 'recursos', 'negocio', 'como', 'faq']);
    for (const s of secoes) {
      const telas = s.h / vh;
      if (ehCelular(info)) { expect(s.h, `#${s.id} menor que a tela`).toBeGreaterThanOrEqual(vh - 3); expect(telas, `#${s.id} muito longa`).toBeLessThanOrEqual(4); continue; } // no celular a seção cresce com o conteúdo (telas de alturas diferentes; 320 px é a mais apertada)
      expect([1, 2], `#${s.id} tem ${telas.toFixed(2)} telas`).toContain(Math.round(telas));
      expect(Math.abs(telas - Math.round(telas)) * vh, `#${s.id} fora da grade de telas`).toBeLessThanOrEqual(3);
      expect(Math.abs(s.top / vh - Math.round(s.top / vh)) * vh, `#${s.id} não começa numa tela inteira`).toBeLessThanOrEqual(3);
    }
  });

  test('nada vaza da própria seção nem fica por cima de outra (texto, imagens, botões)', async ({ page }) => {
    await page.goto('/');
    // rola a página toda para as imagens com carregamento tardio entrarem e as alturas ficarem finais
    for (const f of [0.2, 0.4, 0.6, 0.8, 1, 0]) { await page.evaluate((x) => scrollTo(0, (document.body.scrollHeight - innerHeight) * x), f); await page.waitForTimeout(200); }
    await page.waitForFunction(() => [...document.querySelectorAll('main img')].every((i) => i.complete), null, { timeout: 15000 });
    const vazamentos = await page.evaluate(() => {
      const achados = [];
      const visivel = (e) => { const c = getComputedStyle(e); return c.display !== 'none' && c.visibility !== 'hidden' && e.getClientRects().length; };
      const blocos = [...document.querySelectorAll('main > section, footer.closing')];
      for (const s of blocos) {
        const caixa = s.getBoundingClientRect();
        for (const e of s.querySelectorAll('h1, h2, h3, p, li, img, a, button, canvas, dl, .win, .panel')) {
          if (!visivel(e) || e.closest('[aria-hidden="true"] .peca-tile')) continue;
          // o que um ancestral corta (overflow escondido, como a moldura da janela do topo) não aparece: conta só a parte visível
          let r = e.getBoundingClientRect(), top = r.top, bottom = r.bottom;
          for (let a = e.parentElement; a && a !== s; a = a.parentElement) {
            const o = getComputedStyle(a);
            if (/hidden|clip/.test(o.overflowY) || /hidden|clip/.test(o.overflow)) { const ar = a.getBoundingClientRect(); top = Math.max(top, ar.top); bottom = Math.min(bottom, ar.bottom); }
          }
          if (bottom - top <= 1) continue;
          r = { top, bottom, height: bottom - top };
          if (r.bottom > caixa.bottom + 1 || r.top < caixa.top - 1) achados.push(`${s.id || s.className.split(' ')[0]}: ${e.tagName.toLowerCase()} "${(e.textContent || e.alt || '').trim().slice(0, 30)}" vai de ${Math.round(r.top - caixa.top)} a ${Math.round(r.bottom - caixa.top)} numa seção de ${Math.round(caixa.height)}`);
        }
      }
      return achados;
    });
    expect(vazamentos).toEqual([]);
  });

  test('bordas iguais: logo, títulos e rodapé começam na mesma linha e nada passa da direita', async ({ page }) => {
    await page.goto('/');
    const lados = await page.evaluate(() => {
      const esq = (e) => e.getBoundingClientRect().left;
      return { logo: esq(document.querySelector('.nav__logo')), titulos: [...document.querySelectorAll('main h2')].map(esq), rodape: esq(document.querySelector('footer .nav__logo')),
        direita: Math.max(...[...document.querySelectorAll('main section .wrap > *')].map((e) => e.getBoundingClientRect().right)), larg: innerWidth };
    });
    for (const x of [...lados.titulos, lados.rodape]) expect(Math.abs(x - lados.logo)).toBeLessThanOrEqual(1);
    expect(lados.direita).toBeLessThanOrEqual(lados.larg - lados.logo + 1);
  });

  test('as imagens reais do aplicativo carregam (telas, peça em 3D, orçamento e barra de etapas)', async ({ page }) => {
    await page.goto('/');
    for (const y of [0, 0.25, 0.5, 0.75, 1]) { await page.evaluate((f) => scrollTo(0, (document.body.scrollHeight - innerHeight) * f), y); await page.waitForTimeout(250); }
    await page.waitForFunction(() => [...document.querySelectorAll('main img')].filter((i) => i.offsetParent).every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 15000 });
    const alts = await page.locator('main img').evaluateAll((l) => l.filter((i) => i.offsetParent).map((i) => i.alt));
    expect(alts.some((a) => /R\$ 429,72/.test(a))).toBe(true);
    for (const a of alts.filter(Boolean)) expect(a.length).toBeGreaterThan(20);
  });

  test('a peça 3D do hero e a do bloco de recursos aparecem, giram, e a troca de cor funciona', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero .peca-tile canvas')).toBeAttached({ timeout: 15000 });
    await page.locator('#recursos .panel--peca').scrollIntoViewIfNeeded();
    const tela = page.locator('#recursos .peca-tile canvas');
    await expect(tela).toBeVisible({ timeout: 15000 });
    const natal = page.getByRole('button', { name: 'Natal' }), oceano = page.getByRole('button', { name: 'Oceano' });
    await expect(natal).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(600);
    const antes = await tela.screenshot();
    await oceano.click();
    await expect(oceano).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(600);
    expect((await tela.screenshot()).equals(antes)).toBe(false); // a cor mudou (e a peça gira sozinha)
  });

  test('calculadora ao vivo: R$ 429,72 para o exemplo, e mexer no peso muda o preço (cálculo do app)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#r-total')).toHaveText('R$ 429,72');
    const antes = await page.locator('#r-unit').textContent();
    await page.locator('#c-peso').evaluate((el) => { el.value = '200'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await expect(page.locator('#o-peso')).toHaveText('200 g');
    expect(await page.locator('#r-unit').textContent()).not.toBe(antes);
    await expect(page.locator('#r-unit')).toHaveText(await calcular(page, { amount: 200, printHours: '03:40', margin: 120, quantity: 12 }, 'unitPrice'));
  });

  test('perguntas: todas as respostas abertas, sem promessas que o produto não confirmou', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.faq__item')).toHaveCount(5);
    for (const p of await page.locator('.faq__item p').all()) await expect(p).toBeVisible();
    const texto = await page.locator('main').innerText();
    expect(texto).not.toMatch(/gr[aá]tis|gratuit|depoiment|milhares|\d+\s*mil (clientes|usu)/i);
    await expect(page.getByText('Chame no WhatsApp para saber as condições.')).toHaveCount(1);
  });

  test('tema escuro do sistema: o fundo escurece e a logo aparece', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark' }), pg = await ctx.newPage();
    await pg.goto('/');
    expect(await pg.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(22, 19, 11)');
    await expect(pg.locator('.nav__logo img').first()).toBeVisible();
    await ctx.close();
  });

  test('tema claro: o botão principal é o vermelho da marca sobre o creme', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light' }), pg = await ctx.newPage();
    await pg.goto('/');
    expect(await pg.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 248, 239)');
    expect(await pg.evaluate(() => getComputedStyle(document.querySelector('.hero .btn--primary')).backgroundColor)).toBe('rgb(185, 30, 20)');
    await ctx.close();
  });

  test('teclado: o primeiro Tab leva ao "Pular para o conteúdo" e o foco é visível', async ({ page }, info) => {
    test.skip(ehCelular(info), 'foco por teclado é do computador');
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    expect(await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement).outlineWidth))).toBeGreaterThanOrEqual(2);
  });

  test('celular: o menu abre e leva às seções', async ({ page }, info) => {
    test.skip(!ehCelular(info), 'menu do celular');
    await page.goto('/');
    await page.locator('.nav__toggle').click();
    await expect(page.locator('.nav__toggle')).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('link', { name: 'Recursos' }).first().click();
    await expect(page.locator('#recursos')).toBeInViewport();
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
