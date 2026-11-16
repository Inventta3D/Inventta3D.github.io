/* Inventta 3D · site de apresentação. A conversa, a calculadora e a peça 3D usam o mesmo cálculo do aplicativo (/app/js/calculations.js). */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

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
  const topo = $('#topo-site'), barra = $('#barra-fixa'), botoes = $('.hero-botoes'), palco = $('.palco');
  const rolar = () => topo.classList.toggle('rolou', scrollY > 8);
  addEventListener('scroll', rolar, { passive: true }); rolar();
  let passou = false, noPalco = false; // a barra aparece depois dos botões do topo e some enquanto o celular das telas está à vista (não cobre o seletor)
  const mostrar = () => { if (passou) barra.hidden = false; requestAnimationFrame(() => barra.classList.toggle('on', passou && !noPalco)); };
  if (barra && botoes) new IntersectionObserver(([e]) => { passou = !e.isIntersecting && e.boundingClientRect.top < 0; mostrar(); }).observe(botoes);
  if (barra && palco) new IntersectionObserver(([e]) => { noPalco = e.isIntersecting; mostrar(); }).observe(palco);
})();

/* ---------- peça 3D (carrega só quando aparece) ---------- */
let modulo3d = null;
const peca3d = () => (modulo3d ??= import('/assets/peca.js'));

/* ---------- celular com telas reais do aplicativo (dados fictícios) ---------- */
(() => {
  const telas = $$('#celular .tela'), pontos = $$('.ponto'), palco = $('.palco');
  let atual = 0, timer = 0, escolheu = reduzir; // com "reduzir movimento" ou depois que o visitante escolhe uma tela, não troca sozinho
  const ir = (i) => { atual = i; telas.forEach((t, k) => t.classList.toggle('on', k === i)); pontos.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i))); };
  const parar = () => clearInterval(timer);
  const girar = () => { parar(); if (!escolheu) timer = setInterval(() => ir((atual + 1) % telas.length), 3800); };
  pontos.forEach((b) => b.addEventListener('click', () => { escolheu = true; parar(); ir(Number(b.dataset.tela)); }));
  palco.addEventListener('pointerenter', parar); palco.addEventListener('pointerleave', girar);
  palco.addEventListener('focusin', parar); palco.addEventListener('focusout', girar);
  new IntersectionObserver(([e]) => (e.isIntersecting ? girar() : parar())).observe(palco);
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
