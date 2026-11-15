// Apoio dos testes de navegador: login simulado, Supabase falso em memória e auditoria de layout.
const fs = require('node:fs');
const path = require('node:path');

const config = fs.readFileSync(path.join(__dirname, '..', '..', 'site', 'config.js'), 'utf8');
const urlSupabase = (config.match(/https:\/\/[a-z0-9]+\.supabase\.co/) || [])[0];
const ref = new URL(urlSupabase).hostname.split('.')[0];
const USUARIO = '11111111-1111-1111-1111-111111111111';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

// Sessão válida de mentira no localStorage: o app acredita que há alguém logado.
function sessao() {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USUARIO, aud: 'authenticated', role: 'authenticated', email: 'teste@exemplo.com', exp })}.assinatura`;
  return { access_token: jwt, refresh_token: 'r', expires_in: 3600, expires_at: exp, token_type: 'bearer', user: { id: USUARIO, aud: 'authenticated', email: 'teste@exemplo.com', user_metadata: {}, app_metadata: {} } };
}

// Banco falso: imita o suficiente do PostgREST e do Storage para o app funcionar sem rede.
function bancoFalso() {
  const db = { inventta3d_quotes: [], inventta3d_customers: [], inventta3d_prints: [], inventta3d_print_requests: [] };
  const arquivos = {};
  let seq = 0;
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };
  const json = (route, status, corpo) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(corpo) });

  async function tratar(route) {
    const req = route.request(), url = new URL(req.url()), metodo = req.method();
    if (metodo === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const unico = (req.headers().accept || '').includes('vnd.pgrst.object');
    const quer = (req.headers().prefer || '').includes('return=representation');
    if (url.pathname.startsWith('/rest/v1/')) {
      const tabela = url.pathname.split('/')[3];
      const linhas = db[tabela];
      if (!linhas) return json(route, 404, { message: 'tabela desconhecida' });
      const filtroId = (url.searchParams.get('id') || '').replace(/^eq\./, '');
      const alvo = () => (filtroId ? linhas.filter((r) => r.id === filtroId) : linhas.slice());
      const completa = (r) => (tabela === 'inventta3d_prints' ? { ...r, inventta3d_print_requests: db.inventta3d_print_requests.filter((q) => q.print_id === r.id) } : r);
      const resposta = (rs, status) => (unico ? (rs.length ? json(route, status, completa(rs[0])) : json(route, 406, { message: 'nenhuma linha' })) : json(route, status, rs.map(completa)));
      if (metodo === 'GET') return resposta(alvo(), 200);
      if (metodo === 'POST') {
        const corpo = JSON.parse(req.postData() || '{}');
        const novas = (Array.isArray(corpo) ? corpo : [corpo]).map((c) => ({ id: `id-${++seq}`, owner_id: USUARIO, created_at: new Date().toISOString(), requested_at: new Date().toISOString(), ...c }));
        linhas.push(...novas);
        return quer ? resposta(novas, 201) : route.fulfill({ status: 201, headers: cors });
      }
      if (metodo === 'PATCH') {
        const alvos = alvo();
        alvos.forEach((r) => Object.assign(r, JSON.parse(req.postData() || '{}')));
        return quer ? resposta(alvos, 200) : route.fulfill({ status: 204, headers: cors });
      }
      if (metodo === 'DELETE') {
        alvo().forEach((r) => {
          linhas.splice(linhas.indexOf(r), 1);
          if (tabela === 'inventta3d_prints') db.inventta3d_print_requests = db.inventta3d_print_requests.filter((q) => q.print_id !== r.id);
        });
        return route.fulfill({ status: 204, headers: cors });
      }
    }
    if (url.pathname.startsWith('/storage/v1/object/sign/')) return json(route, 200, { signedURL: `/object/sign/x?token=t` });
    if (url.pathname.startsWith('/storage/v1/object/')) {
      if (metodo === 'POST') { arquivos[url.pathname] = true; return json(route, 200, { Key: url.pathname }); }
      if (metodo === 'DELETE') { Object.keys(arquivos).forEach((k) => delete arquivos[k]); return json(route, 200, []); }
    }
    if (url.pathname.startsWith('/auth/v1/')) return route.fulfill({ status: 204, headers: cors });
    return json(route, 404, { message: 'não simulado' });
  }
  return { db, arquivos, tratar };
}

// Abre o app já "logado", com o banco falso. Devolve o banco para os testes conferirem o que foi gravado.
async function entrar(page) {
  const banco = bancoFalso();
  await page.route((u) => u.href.startsWith(urlSupabase), banco.tratar);
  await page.addInitScript(([chave, valor]) => localStorage.setItem(chave, valor), [`sb-${ref}-auth-token`, JSON.stringify(sessao())]);
  await page.goto('/');
  await page.locator('#appShell').waitFor({ state: 'visible' });
  return banco;
}

// Preenche as 5 etapas como o usuário e gera o orçamento (cada etapa tem o seu botão "Continuar").
async function gerarOrcamento(page, { peca = 'Suporte de teste', cliente = 'Rafael Cardoso', email = 'rafael@exemplo.com' } = {}) {
  const proximo = (i) => page.locator(`.panel[data-panel="${i}"] .btn-next`).click();
  await page.getByRole('textbox', { name: 'Nome da peça' }).fill(peca);
  await page.locator('#clientName').fill(cliente);
  await page.locator('#clientEmail').fill(email);
  await proximo(0);
  await page.locator('#amount').fill('38');
  await page.locator('#packPrice').fill('120');
  await proximo(1);
  await page.locator('#printHours').fill('0342');
  await proximo(2);
  await proximo(3);
  await proximo(4);
  await page.locator('#result.show').waitFor({ timeout: 10_000 });
}

// Mede, dentro do navegador: itens fora da tela, rolagem horizontal e botões do mesmo grupo desalinhados.
function auditar(page, seletor) {
  return page.evaluate((sel) => {
    const raiz = document.querySelector(sel);
    if (!raiz) return [`raiz não encontrada: ${sel}`];
    const larg = innerWidth, achados = [];
    const painel = raiz.classList.contains('panel');
    const pr = raiz.getBoundingClientRect();
    const E = painel ? pr.left : 0, D = painel ? pr.right : larg;
    const todos = [raiz, ...raiz.querySelectorAll('*')];
    const visivel = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width && r.height && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[hidden]'); };
    todos.forEach((e) => {
      if (!visivel(e) || e.closest('.toast,.app-status')) return;
      if (!painel && e.closest('.panel')) return; // as etapas são auditadas uma a uma (ficam deslizando fora da tela)
      const r = e.getBoundingClientRect();
      if (r.right > D + 1 || r.left < E - 1) achados.push(`fora da tela: ${(e.id || e.className || e.tagName).toString().slice(0, 40)}`);
    });
    if (document.documentElement.scrollWidth > larg + 1) achados.push(`rolagem horizontal: ${document.documentElement.scrollWidth}px`);
    if (larg < 720) {
      const grupos = new Set(todos.filter((e) => [...e.children].filter((c) => c.matches('.btn,button,label.discount-choice') && visivel(c)).length >= 2 && !e.classList.contains('field-tools')));
      grupos.forEach((g) => {
        const bs = [...g.children].filter((c) => c.matches('.btn,button,label.discount-choice') && visivel(c));
        const linhas = [];
        bs.forEach((b) => { const r = b.getBoundingClientRect(), cy = (r.top + r.bottom) / 2; let l = linhas.find((x) => Math.abs(x.cy - cy) < 14); if (!l) linhas.push(l = { cy, rs: [] }); l.rs.push(r); });
        if (linhas.length > 1) {
          const esq = linhas.map((l) => Math.round(Math.min(...l.rs.map((r) => r.left)) - E)), dir = linhas.map((l) => Math.round(Math.max(...l.rs.map((r) => r.right)) - E));
          if (Math.max(...esq) - Math.min(...esq) > 2 || Math.max(...dir) - Math.min(...dir) > 2) achados.push(`botões desalinhados em ${(g.id || g.className || g.tagName).toString().slice(0, 30)} esq[${esq}] dir[${dir}]`);
        }
      });
    }
    return [...new Set(achados)].slice(0, 8);
  }, seletor);
}

module.exports = { entrar, gerarOrcamento, auditar, urlSupabase };
