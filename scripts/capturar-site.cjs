/* Gera as imagens REAIS do aplicativo que o site de apresentação mostra, sempre com dados fictícios.
   Roda o app local (banco falso, sem Supabase de verdade), faz um orçamento de uma peça de demonstração
   e salva capturas de tela e os arquivos que o app mesmo manda ao cliente.
   Uso:  node scripts/capturar-site.cjs      (as imagens vão para site/assets/img/) */
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { entrar } = require('../tests/e2e/apoio.cjs');

const SAIDA = path.join(__dirname, '..', 'site', 'assets', 'img');
const BASE = 'http://127.0.0.1:5190';
fs.mkdirSync(SAIDA, { recursive: true });

const noAr = () => new Promise((ok) => http.get(BASE, (r) => { r.resume(); ok(true); }).on('error', () => ok(false)));

// ---------- peça de demonstração: vaso torcido, em STL binário (Z para cima, em mm) ----------
function vasoSTL() {
  const COLS = 120, ROWS = 100, ESC = 100;
  const raio = (t) => 0.3 + 0.2 * Math.sin(Math.PI * (0.15 + 0.85 * t));
  const perfil = [];
  for (let i = 0; i <= ROWS; i++) { const t = i / ROWS; perfil.push([raio(t), t, true]); }
  perfil.push([raio(1) - 0.032, 1, false]);
  for (let i = ROWS; i >= 4; i -= 2) { const t = i / ROWS; perfil.push([raio(t) - 0.032, t, false]); }
  perfil.push([0, 0.04, false]);
  const P = perfil.map(([rad, y, ext]) => Array.from({ length: COLS + 1 }, (_, c) => {
    const th = (c / COLS) * Math.PI * 2, mod = ext ? 1 + 0.075 * Math.cos(7 * th + 2.6 * y * Math.PI) + 0.004 * Math.sin(y * 260) : 1;
    return [Math.cos(th) * rad * mod * ESC, Math.sin(th) * rad * mod * ESC, y * ESC];
  }));
  const tri = [];
  for (let r = 0; r < P.length - 1; r++) for (let c = 0; c < COLS; c++) {
    const a = P[r][c], b = P[r][c + 1], d = P[r + 1][c], e = P[r + 1][c + 1];
    tri.push([a, b, d], [b, e, d]); // ordem invertida: o STL usa Z para cima (eixos trocados em relação ao three.js)
  }
  const buf = Buffer.alloc(84 + tri.length * 50); buf.writeUInt32LE(tri.length, 80);
  tri.forEach((t, i) => {
    const o = 84 + i * 50, u = t[1].map((v, k) => v - t[0][k]), w = t[2].map((v, k) => v - t[0][k]);
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], l = Math.hypot(...n) || 1;
    [...n.map((v) => v / l), ...t[0], ...t[1], ...t[2]].forEach((v, k) => buf.writeFloatLE(v, o + k * 4));
  });
  return buf;
}

// campos de dinheiro têm máscara de centavos: digite 12000 para R$ 120,00
async function orcamento(page, { cor = 'Vermelho' } = {}) {
  await entrar(page);
  const ir = (i) => page.locator(`.panel[data-panel="${i}"] .btn-next`).click();
  await page.locator('#slicerFile').setInputFiles({ name: 'vaso_decorativo.stl', mimeType: 'model/stl', buffer: vasoSTL() });
  await page.locator('#slicerView canvas').waitFor({ timeout: 30000 });
  await page.locator('#slicerView').getByRole('button', { name: 'Escolher cor' }).click();
  await page.locator('#slicerView').getByRole('button', { name: cor }).click();
  await page.mouse.click(4, 4);
  await page.getByRole('textbox', { name: 'Nome da peça' }).fill('Vaso decorativo');
  await page.locator('#quantity').fill('12');
  await page.locator('#clientName').fill('Marina Souza');
  await page.locator('#clientEmail').fill('marina@exemplo.com');
  await page.locator('#clientPhone').fill('11900000000');
  await page.waitForTimeout(1200);
  const passo1 = async (arq) => { await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(500); await page.screenshot({ path: arq, type: 'jpeg', quality: 86 }); };
  const etapa1 = passo1;
  await ir(0);
  await page.locator('#amount').fill('38'); await page.locator('#packPrice').fill('12000'); await page.locator('#packQty').fill('1000'); await page.locator('#waste').fill('8');
  await ir(1);
  await page.locator('#printHours').fill('0340'); await page.locator('#energyRate').fill('95'); await page.locator('#power').fill('120');
  await page.locator('#printerCost').fill('320000'); await page.locator('#lifeHours').fill('5000'); await page.locator('#maintenance').fill('40');
  await ir(2);
  await page.locator('#setupMin').fill('20'); await page.locator('#finishMin').fill('10'); await page.locator('#laborRate').fill('3000');
  await page.locator('#packaging').fill('600');
  await ir(3);
  await page.locator('#failure').fill('5'); await page.locator('#margin').fill('120');
  await ir(4);
  await page.locator('#result.show').waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  if (process.env.DEPURAR) console.log('CAMPOS', JSON.stringify(await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-field]')].map((e) => [e.dataset.field, e.value])))), 'CUSTOS', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.cost-row')].map((r) => r.innerText.replace(/\s+/g, ' ')))));
  return { etapa1 };
}

(async () => {
  let servidor = null;
  if (!(await noAr())) { servidor = spawn(process.execPath, [path.join(__dirname, '..', 'tests', 'e2e', 'servidor.cjs')], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 1500)); }
  const navegador = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' });
  try {
    // ----- celular (como no aparelho do cliente) -----
    const cel = await navegador.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'light', locale: 'pt-BR' });
    const p = await cel.newPage();
    p.on('pageerror', (e) => console.log('ERRO NA PÁGINA', String(e).slice(0, 160)));
    // a primeira captura (etapa 1) precisa ser feita antes de avançar; refazemos o fluxo com o gancho
    await entrar(p);
    await p.locator('#slicerFile').setInputFiles({ name: 'vaso_decorativo.stl', mimeType: 'model/stl', buffer: vasoSTL() });
    await p.locator('#slicerView canvas').waitFor({ timeout: 30000 });
    await p.locator('#slicerView').getByRole('button', { name: 'Escolher cor' }).click();
    await p.locator('#slicerView').getByRole('button', { name: 'Vermelho' }).click();
    await p.mouse.click(4, 4);
    await p.getByRole('textbox', { name: 'Nome da peça' }).fill('Vaso decorativo');
    await p.locator('#quantity').fill('12');
    await p.locator('#clientName').fill('Marina Souza'); await p.locator('#clientEmail').fill('marina@exemplo.com'); await p.locator('#clientPhone').fill('11900000000');
    await p.waitForTimeout(1500);
    await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 0); });
    await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(SAIDA, 'app-pedido.jpg'), type: 'jpeg', quality: 86 });
    await cel.close();

    const cel2 = await navegador.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'light', locale: 'pt-BR' });
    const q = await cel2.newPage();
    await orcamento(q);
    await q.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 0); });
    await q.waitForTimeout(600);
    await q.screenshot({ path: path.join(SAIDA, 'app-preco.jpg'), type: 'jpeg', quality: 86 });
    console.log('TOTAL', await q.locator('#batchTotal').textContent().catch(() => '?'));
    await q.locator('.share-panel').scrollIntoViewIfNeeded(); await q.waitForTimeout(600);
    await q.screenshot({ path: path.join(SAIDA, 'app-envio.jpg'), type: 'jpeg', quality: 86 });
    // os arquivos que o app mesmo manda ao cliente: imagem do orçamento e imagem da peça
    await q.evaluate(() => {
      window.__arqs = [];
      navigator.canShare = () => true;
      navigator.share = async (d) => {
        for (const f of d.files) { const u = new Uint8Array(await f.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); window.__arqs.push({ n: f.name, b: btoa(s) }); }
        window.__fim = true;
      };
    });
    q.responder = false; // "Enviar também o GIF?" → não
    await q.locator('#shareMain').click();
    await q.waitForFunction(() => window.__fim === true, null, { timeout: 60000 });
    for (const a of await q.evaluate(() => window.__arqs)) {
      if (a.n === 'peca-3d.png') { fs.writeFileSync(path.join(SAIDA, 'peca-3d.png'), Buffer.from(a.b, 'base64')); continue; }
      // a imagem inteira traz a chave Pix e o e-mail do negócio: o site público mostra só o recorte (total, cliente e itens)
      const recorte = await q.evaluate(async (b64) => {
        const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
        const h = Math.round(img.width * 0.86), c = document.createElement('canvas'); c.width = img.width; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, img.width, h, 0, 0, img.width, h);
        return c.toDataURL('image/png').split(',')[1];
      }, a.b);
      fs.writeFileSync(path.join(SAIDA, 'orcamento-whatsapp.png'), Buffer.from(recorte, 'base64'));
    }
    await cel2.close();

    // ----- computador -----
    const pc = await navegador.newContext({ baseURL: BASE, viewport: { width: 960, height: 720 }, deviceScaleFactor: 2, colorScheme: 'light', locale: 'pt-BR' });
    const d = await pc.newPage();
    await orcamento(d);
    await d.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 0); });
    await d.waitForTimeout(600);
    await d.screenshot({ path: path.join(SAIDA, 'app-computador.jpg'), type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: 960, height: 622 } }); // corta antes do campo de desconto (no app, em ~960 px de largura o rótulo "Desconto do pedido" estoura o cartão: defeito do app a tratar à parte)
    await pc.close();
  } finally {
    await navegador.close();
    if (servidor) servidor.kill();
  }
  for (const f of fs.readdirSync(SAIDA)) console.log(f, Math.round(fs.statSync(path.join(SAIDA, f)).size / 1024) + ' KB');
})();
