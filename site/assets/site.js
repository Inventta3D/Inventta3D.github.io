/* Calculadora da página: o mesmo cálculo do aplicativo (/app/js/calculations.js), com valores de exemplo. */
(() => {
  const $ = (s) => document.querySelector(s);
  if (!window.InventtaCalculations || !$('#calc')) return;
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const BASE = { packPrice: 120, packQty: 1000, waste: 8, failure: 5, power: 120, energyRate: 0.95, printerCost: 3200, lifeHours: 5000, maintenance: 0.4, setupMin: 20, finishMin: 10, laborRate: 30, packaging: 6, salesFee: 0, taxRate: 0 };
  const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  const campos = { peso: $('#c-peso'), minutos: $('#c-tempo'), margem: $('#c-margem'), qtd: $('#c-qtd') };
  const saida = { peso: $('#o-peso'), minutos: $('#o-tempo'), margem: $('#o-margem'), qtd: $('#o-qtd') };
  const fmt = { peso: (v) => `${v} g`, minutos: (v) => `${Math.floor(v / 60)}h${String(v % 60).padStart(2, '0')}`, margem: (v) => `${v}%`, qtd: String };
  let fala = 0;
  function atualizar() {
    const v = {};
    for (const k in campos) {
      const c = campos[k];
      v[k] = Number(c.value); saida[k].textContent = fmt[k](v[k]);
      c.style.setProperty('--p', `${((c.value - c.min) / (c.max - c.min)) * 100}%`);
    }
    const r = window.InventtaCalculations.calculate({ ...BASE, amount: v.peso, printHours: hhmm(v.minutos), margin: v.margem, quantity: v.qtd });
    if (!r) return;
    $('#r-unit').textContent = BRL.format(r.unitPrice);
    $('#r-total').textContent = BRL.format(r.price);
    $('#r-lucro').textContent = BRL.format(r.profit);
    clearTimeout(fala); // leitor de tela: só depois de parar de mexer
    fala = setTimeout(() => { $('#calc-fala').textContent = `Preço por peça ${BRL.format(r.unitPrice)}, total do pedido ${BRL.format(r.price)}, lucro estimado ${BRL.format(r.profit)}.`; }, 700);
  }
  Object.values(campos).forEach((c) => c.addEventListener('input', atualizar));
  atualizar();
})();

/* peça 3D de demonstração (vaso torcido): gira sozinha e carrega só quando aparece */
(() => {
  const hosts = [...document.querySelectorAll('[data-peca]')];
  if (!hosts.length) return;
  let modulo = null;
  const montar = async (host) => {
    modulo ??= await import('/assets/peca.js');
    const peca = await modulo.criarPeca(host, { interativo: host.hasAttribute('data-interativo'), paleta: host.dataset.peca, velocidade: Number(host.dataset.velocidade) || 1.6 });
    if (!peca) return;
    const botoes = [...document.querySelectorAll('.cor')];
    if (host.hasAttribute('data-interativo')) botoes.forEach((b) => b.addEventListener('click', () => { botoes.forEach((o) => o.setAttribute('aria-pressed', String(o === b))); peca.paleta(b.dataset.p); }));
  };
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); montar(e.target); } }), { rootMargin: '300px' });
  hosts.forEach((h) => io.observe(h));
})();
