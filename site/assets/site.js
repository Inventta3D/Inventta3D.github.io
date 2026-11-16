/* Inventta 3D · site de apresentação. A conversa, a calculadora e a peça 3D usam o mesmo cálculo do aplicativo (/app/js/calculations.js). */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dorme = (ms) => new Promise((ok) => setTimeout(ok, ms));

/* ---------- valores de exemplo e cálculo (o mesmo do app) ---------- */
const BASE = { packPrice: 120, packQty: 1000, waste: 8, failure: 5, power: 120, energyRate: 0.95, printerCost: 3200, lifeHours: 5000, maintenance: 0.4, setupMin: 20, finishMin: 10, laborRate: 30, packaging: 6, salesFee: 0, taxRate: 0 };
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const orcar = ({ peso, minutos, margem, qtd }) => window.InventtaCalculations.calculate({ ...BASE, amount: peso, printHours: hhmm(minutos), margin: margem, quantity: qtd });

/* ---------- tema (a escolha vale também para o aplicativo) ---------- */
(() => {
  const raiz = document.documentElement, mq = matchMedia('(prefers-color-scheme: dark)'), meta = $('meta[name="theme-color"]'), botao = $('[data-tema]');
  const escuro = () => (raiz.dataset.theme || (mq.matches ? 'dark' : 'light')) === 'dark';
  function pintar() { const d = escuro(); if (meta) meta.content = d ? '#16130B' : '#FFF8EF'; botao.setAttribute('aria-pressed', String(d)); botao.setAttribute('aria-label', d ? 'Usar tema claro' : 'Usar tema escuro'); }
  botao.addEventListener('click', () => { raiz.dataset.theme = escuro() ? 'light' : 'dark'; try { localStorage.setItem('inventta-theme', raiz.dataset.theme); } catch { /* sem armazenamento */ } pintar(); });
  (mq.addEventListener ? mq.addEventListener('change', pintar) : mq.addListener(pintar)); pintar();
})();

/* ---------- topo e barra fixa ---------- */
(() => {
  const topo = $('#topo-site'), barra = $('#barra-fixa'), botoes = $('.hero-botoes');
  const rolar = () => topo.classList.toggle('rolou', scrollY > 8);
  addEventListener('scroll', rolar, { passive: true }); rolar();
  if (barra && botoes) new IntersectionObserver(([e]) => {
    const passou = !e.isIntersecting && e.boundingClientRect.top < 0;
    if (passou) barra.hidden = false;
    requestAnimationFrame(() => barra.classList.toggle('on', passou));
  }).observe(botoes);
})();

/* ---------- peça 3D (carrega só quando aparece) ---------- */
let modulo3d = null;
const peca3d = () => (modulo3d ??= import('/assets/peca.js'));

/* ---------- conversa do primeiro quadro ---------- */
(() => {
  const conversa = $('#conversa'), rever = $('#rever'), passos = (n) => $(`[data-passo="${n}"]`, conversa);
  const demo = orcar({ peso: 38, minutos: 220, margem: 120, qtd: 12 }); // mesmos valores iniciais da calculadora abaixo
  if (!demo) return;
  const linhas = $$('#linhas-demo li'), total = $('#demo-total'), porpeca = $('#demo-porpeca'), total$ = $('.total', conversa);
  $('#demo-qtd').textContent = `${demo.q} un.`;
  let rodada = 0, peca = null, criando = null;

  const entra = (el) => { el.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('entra'))); };
  const tira = (el) => el.classList.remove('on', 'entra');
  function contar(el, ate, ms, token) {
    return new Promise((ok) => {
      if (reduzir) { el.textContent = BRL.format(ate); return ok(); }
      const t0 = performance.now();
      (function passo(t) {
        if (token !== rodada) return ok();
        const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
        el.textContent = BRL.format(ate * e);
        p < 1 ? requestAnimationFrame(passo) : ok();
      })(t0);
    });
  }
  function reiniciar() {
    $$('.msg, .digitando', conversa).forEach(tira);
    linhas.forEach((li) => { li.classList.remove('on'); $('b', li).textContent = BRL.format(0); });
    total$.classList.remove('on'); porpeca.classList.remove('on'); total.textContent = BRL.format(0); porpeca.textContent = '';
    rever.hidden = true;
  }
  function final() {
    $$('.msg', conversa).forEach((m) => m.classList.add('on', 'entra'));
    tira(passos(2));
    linhas.forEach((li) => { li.classList.add('on'); $('b', li).textContent = BRL.format(demo[li.dataset.k] || 0); });
    total$.classList.add('on'); porpeca.classList.add('on');
    total.textContent = BRL.format(demo.price); porpeca.textContent = `${BRL.format(demo.unitPrice)} por peça · valores de exemplo`;
  }
  async function preparar3d() {
    if (peca || criando) return criando;
    criando = peca3d().then((m) => m.criarPeca($('#peca-hero'), { paleta: 'natal', velocidade: 3.2 })).then((p) => { peca = p; });
    return criando;
  }
  async function rodar() {
    const token = ++rodada;
    reiniciar();
    if (reduzir) { final(); rever.hidden = true; preparar3d(); return; }
    preparar3d();
    await dorme(500); if (token !== rodada) return;
    entra(passos(1));
    await dorme(1300); if (token !== rodada) return;
    entra(passos(2));
    await dorme(1500); if (token !== rodada) return;
    tira(passos(2)); entra(passos(3));
    await dorme(900); if (token !== rodada) return;
    for (const li of linhas) {
      li.classList.add('on');
      await contar($('b', li), demo[li.dataset.k] || 0, 420, token); if (token !== rodada) return;
    }
    total$.classList.add('on');
    await contar(total, demo.price, 700, token); if (token !== rodada) return;
    porpeca.textContent = `${BRL.format(demo.unitPrice)} por peça · valores de exemplo`; porpeca.classList.add('on');
    await dorme(900); if (token !== rodada) return;
    entra(passos(4));
    await dorme(700); if (token !== rodada) return;
    rever.hidden = false;
  }
  rever.addEventListener('click', rodar);
  // espera as fontes para o texto não "pular" no meio da animação
  (document.fonts?.ready || Promise.resolve()).then(rodar);
})();

/* ---------- calculadora ao vivo ---------- */
(() => {
  const campos = { peso: $('#c-peso'), minutos: $('#c-tempo'), margem: $('#c-margem'), qtd: $('#c-qtd') };
  const saida = { peso: $('#o-peso'), minutos: $('#o-tempo'), margem: $('#o-margem'), qtd: $('#o-qtd') };
  const fmt = { peso: (v) => `${v} g`, minutos: (v) => `${Math.floor(v / 60)}h${String(v % 60).padStart(2, '0')}`, margem: (v) => `${v}%`, qtd: (v) => String(v) };
  const barra = $('#barra'), legenda = $('#legenda');
  let fala = 0;
  const partes = [['Material', 'material', '--seg-material'], ['Energia', 'energy', '--seg-energia'], ['Máquina', 'machine', '--seg-maquina'], ['Trabalho e embalagem', null, '--seg-trabalho'], ['Falhas', 'failureCost', '--seg-falhas'], ['Lucro', null, '--seg-lucro']];
  const segs = partes.map(([nome, , cor]) => {
    const i = document.createElement('i'); i.style.setProperty('--c', `var(${cor})`); barra.append(i);
    const li = document.createElement('li'); li.style.setProperty('--c', `var(${cor})`); li.append(`${nome} `, document.createElement('b')); legenda.append(li);
    return [i, li.lastChild];
  });
  function atualizar() {
    const v = {}; for (const k in campos) { v[k] = Number(campos[k].value); saida[k].textContent = fmt[k](v[k]); const c = campos[k]; c.style.setProperty('--p', `${((c.value - c.min) / (c.max - c.min)) * 100}%`); }
    const r = orcar(v); if (!r) return;
    $('#r-unit').textContent = BRL.format(r.unitPrice); $('#r-total').textContent = BRL.format(r.price); $('#r-lucro').textContent = BRL.format(r.profit);
    const val = [r.material, r.energy, r.machine, r.labor + r.packaging, r.failureCost, Math.max(0, r.profit)];
    val.forEach((x, i) => { segs[i][0].style.setProperty('--w', String(Math.max(0.0001, x))); segs[i][1].textContent = BRL.format(x); });
    clearTimeout(fala); fala = setTimeout(() => { $('#calc-fala').textContent = `Preço por peça ${BRL.format(r.unitPrice)}, total do pedido ${BRL.format(r.price)}, lucro estimado ${BRL.format(r.profit)}.`; }, 700); // leitor de tela: só depois de parar de mexer
  }
  Object.values(campos).forEach((c) => c.addEventListener('input', atualizar)); atualizar();
})();

/* ---------- peça interativa do bloco de 3D ---------- */
(() => {
  const host = $('#peca-tile'), botoes = $$('.cor');
  let peca = null, pedido = false;
  const abrir = async () => {
    if (pedido) return; pedido = true;
    const m = await peca3d();
    peca = await m.criarPeca(host, { interativo: true, paleta: 'natal', velocidade: 1.6 });
    if (!peca) host.setAttribute('aria-label', 'Peça de demonstração em 3D indisponível neste navegador.');
  };
  new IntersectionObserver((es, obs) => { if (es.some((e) => e.isIntersecting)) { obs.disconnect(); abrir(); } }, { rootMargin: '300px' }).observe(host);
  botoes.forEach((b) => b.addEventListener('click', () => { botoes.forEach((o) => o.setAttribute('aria-pressed', String(o === b))); peca?.paleta(b.dataset.p); }));
})();
