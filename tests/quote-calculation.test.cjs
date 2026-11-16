const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate, printDurationHours, decimalToHHMM } = require('../site/app/js/calculations.js');
const base = { quantity: 1, amount: 100, packPrice: 20, packQty: 1000, waste: 0, failure: 0, printHours: '02:00', power: 100, energyRate: 1, printerCost: 1000, lifeHours: 1000, maintenance: 0, setupMin: 60, finishMin: 0, laborRate: 10, packaging: .5, salesFee: 0, taxRate: 0, margin: 100 };
test('converte duração HH:MM em horas', () => { assert.equal(printDurationHours('01:30'), 1.5); assert.equal(printDurationHours('00:45'), .75); assert.ok(Number.isNaN(printDurationHours('1:60'))); });
test('calcula custos, preço unitário e lucro do cenário base', () => { const r = calculate(base); assert.equal(r.q, 1); assert.equal(r.material, 2); assert.equal(r.energy, .2); assert.equal(r.machine, 2); assert.equal(r.labor, 10); assert.equal(r.packaging, .5); assert.equal(r.cost, 14.7); assert.equal(r.price, 29.4); assert.equal(r.profit, 14.7); });
test('aplica material extra e reserva para falhas', () => { const r = calculate({ ...base, waste: 10, failure: 10 }); assert.ok(Math.abs(r.material - 2.2) < 1e-10); assert.ok(Math.abs(r.failureCost - (14.4 / 9)) < 1e-10); });
test('recusa taxas que inviabilizam o cálculo', () => { assert.equal(calculate({ ...base, salesFee: 100 }), null); });

test('converte horas decimais do fatiador em HH:MM', () => { assert.equal(decimalToHHMM('3,7'), '03:42'); assert.equal(decimalToHHMM('1.5'), '01:30'); assert.equal(decimalToHHMM('0,75'), '00:45'); assert.equal(decimalToHHMM('abc'), ''); assert.equal(decimalToHHMM('120'), ''); });
