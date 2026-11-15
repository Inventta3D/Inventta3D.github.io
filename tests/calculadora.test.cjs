const test = require('node:test');
const assert = require('node:assert/strict');
const { avaliar, formatar, paraCampo } = require('../site/js/calculadora-nucleo.js');

test('operações básicas e precedência', () => {
  assert.equal(avaliar('2+3*4'), 14);
  assert.equal(avaliar('10-4-3'), 3);
  assert.equal(avaliar('100/4/5'), 5);
  assert.equal(avaliar('2×3+1'), 7);
  assert.equal(avaliar('9÷3−1'), 2);
});

test('vírgula decimal e sem erro de ponto flutuante', () => {
  assert.equal(avaliar('0,1+0,2'), 0.3);
  assert.equal(avaliar('1,5*2'), 3);
  assert.equal(avaliar('120/1000*38'), 4.56);
});

test('porcentagem como numa calculadora comum', () => {
  assert.equal(avaliar('100+10%'), 110);
  assert.equal(avaliar('100-10%'), 90);
  assert.equal(avaliar('200*10%'), 20);
  assert.equal(avaliar('50%'), 0.5);
});

test('número negativo no começo e depois de operador', () => {
  assert.equal(avaliar('-5+8'), 3);
  assert.equal(avaliar('4*-2'), -8);
});

test('expressões incompletas ou inválidas devolvem NaN, sem lançar erro', () => {
  for (const ruim of ['', '5+', '*3', '1/0', '1..2', 'abc', '5%%x', '(1+2)']) assert.ok(Number.isNaN(avaliar(ruim)), `"${ruim}" deveria ser inválida`);
});

test('não executa código: texto que parece JavaScript é rejeitado', () => {
  assert.ok(Number.isNaN(avaliar('alert(1)')));
  assert.ok(Number.isNaN(avaliar('process.exit()')));
  assert.ok(Number.isNaN(avaliar('1;2')));
});

test('formatação para mostrar e para gravar no campo', () => {
  assert.equal(formatar(1234.5), '1234,5');
  assert.equal(formatar(1 / 3), '0,333333');
  assert.equal(formatar(NaN), '');
  assert.equal(paraCampo(41.5, 2, true), '41,50');
  assert.equal(paraCampo(38, 1, false), '38');
  assert.equal(paraCampo(38.46, 1, false), '38,5');
});
