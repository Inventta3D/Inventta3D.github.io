const test = require('node:test');
const assert = require('node:assert');
const M = require('../site/js/marketplace.js');

test('conta inversa: depois das taxas você recebe o que pediu (centavos para cima)', () => {
  const r = M.calcular(100, [[0, Infinity, 12, 5]], { imposto: 6, frete: 10 });
  assert.strictEqual(r.preco, Math.ceil((115 / 0.82) * 100) / 100); // 140,25
  assert.ok(r.recebe >= 100 && r.recebe < 100.01, r.recebe);
  assert.ok(Math.abs(r.comissao - r.preco * 0.12) < 1e-9);
});

test('Shopee: escolhe a faixa que contém o preço final', () => {
  const f = M.PLATAFORMAS.shopee.faixas;
  const baixo = M.calcular(30, f); // (30 + 4,50) / 0,80 = 43,13 → faixa até 79,99
  assert.deepStrictEqual([baixo.preco, baixo.taxaComissao, baixo.fixa], [43.13, 20, 4.5]);
  const medio = M.calcular(100, f); // 20% daria 130,63 (fora da faixa); 14% + 20 = 139,54
  assert.deepStrictEqual([medio.preco, medio.taxaComissao, medio.fixa], [139.54, 14, 20]);
  const alto = M.calcular(500, f);
  assert.deepStrictEqual([alto.preco, alto.fixa], [Math.ceil((526 / 0.86) * 100) / 100, 26]);
  for (const r of [baixo, medio, alto]) assert.ok(r.recebe >= [30, 100, 500][[baixo, medio, alto].indexOf(r)] - 1e-9);
});

test('taxas que somam 100% ou mais não têm preço possível', () => {
  assert.strictEqual(M.calcular(10, [[0, Infinity, 80, 0]], { imposto: 20 }), null);
});
