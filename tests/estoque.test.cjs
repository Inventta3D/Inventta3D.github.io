const test = require('node:test');
const assert = require('node:assert');
const E = require('../site/app/js/estoque.js');

const rolo = (id, material, color, remaining_g, weight_g = 1000) => ({ id, material, color, remaining_g, weight_g });

test('escolhe o rolo aberto que ainda basta; sem nenhum que baste, o maior', () => {
  const rolos = [rolo('a', 'PETG', 'Preto', 900), rolo('b', 'PETG', 'preto ', 120), rolo('c', 'PLA', 'Preto', 50), rolo('d', 'PETG', 'Branco', 10)];
  assert.strictEqual(E.escolherRolo(rolos, 'petg', 'Preto', 100).id, 'b'); // acentos, maiúsculas e espaços não importam
  assert.strictEqual(E.escolherRolo(rolos, 'PETG', 'Preto', 500).id, 'a');
  assert.strictEqual(E.escolherRolo(rolos, 'PETG', 'Preto', 5000).id, 'a');
  assert.strictEqual(E.escolherRolo(rolos, 'ABS', '', 10), null);
  assert.strictEqual(E.escolherRolo([rolo('z', 'PLA', '', 0)], 'PLA', '', 1), null); // rolo vazio não conta
});

test('disponível soma os rolos do material; sem cor, soma todas as cores', () => {
  const rolos = [rolo('a', 'PETG', 'Preto', 300), rolo('b', 'PETG', 'Preto', 200), rolo('d', 'PETG', 'Branco', 10)];
  assert.strictEqual(E.disponivel(rolos, 'PETG', 'Preto'), 500);
  assert.strictEqual(E.disponivel(rolos, 'PETG', ''), 510);
});

test('situação: porcentagem limitada a 0–100 e "acabando" abaixo de 20%', () => {
  assert.deepStrictEqual(E.situacao(rolo('a', 'PLA', '', 150)), { pct: 15, baixo: true });
  assert.deepStrictEqual(E.situacao(rolo('a', 'PLA', '', 250)), { pct: 25, baixo: false });
  assert.strictEqual(E.situacao(rolo('a', 'PLA', '', 2000)).pct, 100);
});
