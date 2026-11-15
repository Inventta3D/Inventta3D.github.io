// Testes de interface no navegador. Cada teste descreve o que o usuário faz e vê.
// Os módulos (telas) são lidos de js/modules.js: uma tela nova entra sozinha nos testes de navegação e de layout.
const { test, expect } = require('@playwright/test');
const { entrar, gerarOrcamento, auditar } = require('./apoio.cjs');

const ehCelular = (info) => info.project.name.startsWith('celular');
const ehComputador = (info) => info.project.name.startsWith('computador');
const escolherEnvio = async (page, nome) => {
  await page.locator('#shareMenuBtn').click();
  await page.getByRole('menuitem', { name: nome }).click();
};

test.describe('login', () => {
  test('abre sem erros, mostra o formulário e alterna o tema', async ({ page }) => {
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Acesse sua conta' })).toBeVisible();
    await expect(page.locator('#loginEmail')).toBeVisible();
    await expect(page.locator('#loginPassword')).toBeVisible();
    await expect(page.getByRole('button', { name: /Continuar com Google/ })).toBeVisible();
    const antes = await page.locator('html').getAttribute('data-theme');
    await page.locator('.login-tools [data-theme-toggle]').click();
    expect(await page.locator('html').getAttribute('data-theme')).not.toBe(antes);
    expect(erros).toEqual([]);
  });

  test('layout: nada sai da tela e os botões ficam alinhados', async ({ page }) => {
    await page.goto('/');
    expect(await auditar(page, '#loginScreen')).toEqual([]);
  });

  test('computador: logo alinhada com o título e último tópico alinhado com os links', async ({ page }, info) => {
    test.skip(!ehComputador(info) || info.project.use.viewport.width < 960, 'só na tela dividida');
    await page.goto('/');
    const centro = async (sel) => page.locator(sel).first().evaluate((e) => { const r = e.getBoundingClientRect(); return (r.top + r.bottom) / 2; });
    const logo = await page.locator('.aside-logo img:visible').evaluate((e) => { const r = e.getBoundingClientRect(); return (r.top + r.bottom) / 2; });
    expect(Math.abs(logo - (await centro('#loginTitle')))).toBeLessThan(3);
    expect(Math.abs((await centro('.login-aside li:last-child')) - (await centro('.login-links')))).toBeLessThan(3);
    const q = await page.locator('.login-aside').boundingBox();
    expect(q.x).toBe(0);
    expect(q.y).toBe(0);
  });
});

test.describe('orçamento', () => {
  test('percorre as 5 etapas e gera o resultado', async ({ page }) => {
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    await entrar(page);
    await gerarOrcamento(page);
    await expect(page.locator('#batchTotal')).toHaveText(/R\$\s*\d/);
    await expect(page.locator('#quoteItems')).toContainText('Suporte de teste');
    expect(erros).toEqual([]);
  });

  test('desconto: valor final recalcula o total e a lista de ações aparece', async ({ page }) => {
    await entrar(page);
    await gerarOrcamento(page);
    await page.locator('label.discount-choice', { hasText: 'Valor final' }).click();
    await page.locator('#discountValue').fill('');
    await page.locator('#discountValue').pressSequentially('1000');
    await expect(page.locator('#batchTotal')).toContainText('10,00');
    for (const nome of ['Salvar orçamento', 'Salvar no histórico', 'Ajustar preços', 'Adicionar item', 'Limpar pedido']) {
      await expect(page.getByRole('button', { name: nome })).toBeVisible();
    }
  });

  test('salvar orçamento grava no banco', async ({ page }) => {
    const banco = await entrar(page);
    await gerarOrcamento(page);
    await page.locator('#saveQuoteBtn').click();
    await expect.poll(() => banco.db.inventta3d_quotes.length).toBe(1);
    expect(banco.db.inventta3d_quotes[0].client_name).toBe('Rafael Cardoso');
  });

  test('layout: etapas, resultado e diálogos sem itens fora da tela', async ({ page }) => {
    await entrar(page);
    const achados = [];
    const proximo = (i) => page.locator(`.panel[data-panel="${i}"] .btn-next`).click();
    await page.getByRole('textbox', { name: 'Nome da peça' }).fill('Peça com um nome bem comprido para testar a quebra de linha nas telas pequenas');
    achados.push(...(await auditar(page, '.panel[data-panel="0"]')));
    await proximo(0);
    await page.locator('#amount').fill('38');
    await page.locator('#packPrice').fill('120');
    achados.push(...(await auditar(page, '.panel[data-panel="1"]')));
    await proximo(1);
    await page.locator('#printHours').fill('0342');
    achados.push(...(await auditar(page, '.panel[data-panel="2"]')));
    await proximo(2);
    achados.push(...(await auditar(page, '.panel[data-panel="3"]')));
    await proximo(3);
    achados.push(...(await auditar(page, '.panel[data-panel="4"]')));
    await proximo(4);
    await page.locator('#result.show').waitFor();
    achados.push(...(await auditar(page, '#result')));
    await page.locator('#savePrintBtn').click();
    achados.push(...(await auditar(page, '#printSaveDialog')));
    await page.locator('#printSaveCancel').click();
    await escolherEnvio(page, 'Pré-visualizar');
    await expect(page.locator('#previewDialog')).toBeVisible();
    achados.push(...(await auditar(page, '#previewDialog')));
    expect(achados).toEqual([]);
  });
});

test.describe('enviar por e-mail', () => {
  test('gera o PDF e prepara o e-mail com o cliente preenchido', async ({ page }, info) => {
    await page.addInitScript(() => {
      window.__abertos = [];
      window.open = (u) => { window.__abertos.push(u); return null; };
      window.__compartilhado = null;
      navigator.canShare = () => true;
      navigator.share = async (d) => { window.__compartilhado = { title: d.title, texto: d.text, arquivos: (d.files || []).map((f) => `${f.name}:${f.type}`) }; };
    });
    await entrar(page);
    await gerarOrcamento(page, { cliente: 'Rafael Cardoso', email: 'rafael@exemplo.com' });
    const celular = ehCelular(info);
    const download = celular ? null : page.waitForEvent('download');
    await escolherEnvio(page, 'E-mail com PDF');
    await expect(page.locator('#shareMain')).toContainText('Enviar por e-mail');
    if (celular) {
      await expect(page.locator('#shareStatus')).toContainText('Compartilhamento aberto');
      const c = await page.evaluate(() => window.__compartilhado);
      expect(c.arquivos).toEqual(['orcamento-inventta-3d.pdf:application/pdf']);
      expect(c.title).toContain('Rafael Cardoso');
      expect(c.texto).toContain('Olá, Rafael!');
    } else {
      expect((await download).suggestedFilename()).toBe('orcamento-inventta-3d.pdf');
      await expect(page.locator('#shareStatus')).toContainText('PDF baixado e e-mail aberto');
      const [link] = await page.evaluate(() => window.__abertos);
      expect(link).toMatch(/^mailto:rafael%40exemplo\.com\?subject=/);
      expect(decodeURIComponent(link)).toContain('Segue o orçamento em PDF');
    }
    await expect(page.locator('#shareMain')).toBeEnabled();
  });

  test('botão dividido: lembra a última forma, abre pelo teclado e pré-visualizar não muda o principal', async ({ page }) => {
    await entrar(page);
    await gerarOrcamento(page);
    const principal = page.locator('#shareMain');
    await expect(principal).toContainText('Enviar pelo WhatsApp');
    await page.locator('#shareMenuBtn').click();
    await expect(page.getByRole('menuitem')).toHaveCount(5);
    await expect(page.locator('#shareMenuBtn')).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('#shareMenu')).toBeHidden();
    await expect(page.locator('#shareMenuBtn')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#shareMenu')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'E-mail com PDF' })).toBeFocused();
    await page.keyboard.press('Escape');
    const download = page.waitForEvent('download');
    await escolherEnvio(page, 'Baixar PDF');
    expect((await download).suggestedFilename()).toBe('orcamento-inventta-3d.pdf');
    await expect(principal).toContainText('Baixar PDF');
    await escolherEnvio(page, 'Pré-visualizar');
    await expect(page.locator('#previewDialog')).toBeVisible();
    await page.locator('#previewClose').click();
    await expect(principal).toContainText('Baixar PDF');
    await page.reload();
    await expect(page.locator('#shareMainLbl')).toHaveText('Baixar PDF');
  });
});

test.describe('detalhamento para o cliente', () => {
  test('orçamento detalhado mostra custos e taxas, mas nunca o lucro', async ({ page }) => {
    await page.addInitScript(() => {
      window.__copiado = '';
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__copiado = t; } }, configurable: true });
    });
    await entrar(page);
    await gerarOrcamento(page);
    await page.locator('input[name="shareMode"][value="detailed"]').check({ force: true });
    await escolherEnvio(page, 'Copiar texto');
    await expect.poll(() => page.evaluate(() => window.__copiado)).toContain('DETALHAMENTO DO ORÇAMENTO');
    const texto = await page.evaluate(() => window.__copiado);
    expect(texto).toContain('Custo estimado');
    expect(texto).toContain('Taxas e tributos');
    expect(texto.toLowerCase()).not.toContain('lucro');
    await expect(page.locator('.share-panel')).toContainText('O lucro nunca vai para o cliente.');
  });
});

test.describe('telas (módulos)', () => {
  test('cada módulo abre, tem título e passa na auditoria de layout', async ({ page }) => {
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    await entrar(page);
    const modulos = await page.evaluate(() => window.INVENTTA_MODULES.map((m) => ({ id: m.id, rota: m.route, nome: m.label })));
    expect(modulos.length).toBeGreaterThanOrEqual(4);
    for (const m of modulos) {
      await page.evaluate((r) => { location.hash = r; }, m.rota);
      await expect(page.locator(`main[data-page="${m.id}"]`), `tela ${m.id}`).toBeVisible();
      await expect(page).toHaveTitle(new RegExp(m.nome));
      expect(await auditar(page, `main[data-page="${m.id}"]`), `layout de ${m.id}`).toEqual([]);
    }
    expect(erros).toEqual([]);
  });

  test('navegação: o item atual do menu acompanha a tela aberta', async ({ page }) => {
    await entrar(page);
    const modulos = await page.evaluate(() => window.INVENTTA_MODULES.map((m) => ({ rota: m.route, nome: m.label, curto: m.short })));
    for (const m of modulos) {
      await page.evaluate((r) => { location.hash = r; }, m.rota);
      await expect(page.locator('#mainNav a[aria-current="page"]')).toContainText(m.curto);
    }
  });
});

test.describe('clientes', () => {
  test('cadastrar, editar, buscar e excluir', async ({ page }) => {
    const banco = await entrar(page);
    await page.evaluate(() => { location.hash = '#/clientes'; });
    await expect(page.getByText('Nenhum cliente salvo ainda').first()).toBeVisible();
    await page.locator('#newCustomerBtn').click();
    await page.locator('#customerSave').click();
    await expect(page.locator('#customerMsg')).toContainText('Informe o nome');
    await page.locator('#customerName').fill('Maria Souza');
    await page.locator('#customerPhone').pressSequentially('11999887766');
    await expect(page.locator('#customerPhone')).toHaveValue('(11) 99988-7766');
    await page.locator('#customerSave').click();
    await expect(page.locator('#customerList')).toContainText('Maria Souza');
    expect(banco.db.inventta3d_customers).toHaveLength(1);
    await page.locator('#customerList').getByRole('button', { name: 'Editar' }).click();
    await page.locator('#customerName').fill('Maria de Souza');
    await page.locator('#customerSave').click();
    await expect(page.locator('#customerList')).toContainText('Maria de Souza');
    await page.locator('#customerSearch').fill('zzz');
    await expect(page.locator('#customerStatus')).toContainText('Nenhum cliente encontrado');
    await page.locator('#customerSearch').fill('');
    page.once('dialog', (d) => d.accept());
    await page.locator('#customerList').getByRole('button', { name: 'Excluir' }).click();
    await expect(page.getByText('Nenhum cliente salvo ainda').first()).toBeVisible();
    expect(banco.db.inventta3d_customers).toHaveLength(0);
  });

  test('salvar cliente a partir do orçamento não duplica', async ({ page }) => {
    const banco = await entrar(page);
    await page.getByRole('textbox', { name: 'Nome da peça' }).fill('Peça');
    await page.locator('#clientName').fill('Ana Lima');
    await page.locator('#clientEmail').fill('ana@exemplo.com');
    await page.locator('#saveCustomerBtn').click();
    await expect.poll(() => banco.db.inventta3d_customers.length).toBe(1);
    await page.locator('#clientName').fill('Ana Lima Santos');
    await page.locator('#saveCustomerBtn').click();
    await expect.poll(() => banco.db.inventta3d_customers[0].name).toBe('Ana Lima Santos');
    expect(banco.db.inventta3d_customers).toHaveLength(1);
  });
});

test.describe('histórico de impressões', () => {
  test('salvar com arquivo STL, consultar, baixar e excluir', async ({ page }) => {
    const banco = await entrar(page);
    await gerarOrcamento(page, { peca: 'Suporte raquete' });
    await page.locator('#savePrintBtn').click();
    await expect(page.locator('#printSaveDialog')).toContainText('anexar o arquivo');
    await page.locator('#printFile0').setInputFiles({ name: 'suporte.stl', mimeType: 'model/stl', buffer: Buffer.from('solid x') });
    await page.locator('#printSaveBtn').click();
    await expect.poll(() => banco.db.inventta3d_prints.length).toBe(1);
    await expect.poll(() => banco.db.inventta3d_print_requests.length).toBe(1);
    await expect.poll(() => banco.db.inventta3d_prints[0].file_name).toBe('suporte.stl');
    await page.evaluate(() => { location.hash = '#/impressoes'; });
    await expect(page.locator('#printList')).toContainText('Suporte raquete');
    await expect(page.locator('#printList')).toContainText('Arquivo: suporte.stl');
    await page.locator('#printList').getByRole('button', { name: 'Detalhes' }).click();
    await expect(page.locator('#printDetailDialog')).toContainText('Pedidos (1)');
    await expect(page.locator('#printDetailDialog').getByRole('button', { name: 'Baixar' })).toBeVisible();
    page.once('dialog', (d) => d.accept());
    await page.locator('#printDetailDelete').click();
    await expect(page.locator('#printStatus')).toContainText('Nenhuma impressão salva');
    expect(banco.db.inventta3d_prints).toHaveLength(0);
  });

  test('rejeita arquivo que não é STL nem 3MF', async ({ page }) => {
    const banco = await entrar(page);
    await gerarOrcamento(page);
    await page.locator('#savePrintBtn').click();
    await page.locator('#printFile0').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('x') });
    await page.locator('#printSaveBtn').click();
    await expect(page.locator('#printSaveMsg')).toContainText('não é um arquivo STL ou 3MF');
    expect(banco.db.inventta3d_prints).toHaveLength(0);
  });
});

test.describe('conta', () => {
  test('sair da conta volta ao login sem erro', async ({ page }) => {
    await entrar(page);
    await page.locator('summary[aria-label*="menu da conta"]').click();
    await page.locator('#accountSignOut').click();
    await expect(page.locator('#loginScreen')).toBeVisible();
    await expect(page.locator('#loginStatus')).toContainText('Você saiu da sua conta');
  });
});
