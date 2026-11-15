const test = require('node:test');
const assert = require('node:assert');
const P = require('../site/js/pedidos.js');

const hoje = new Date(2026, 10, 15, 10, 0); // 15/11/2026
const ped = (extra) => ({ id: 'x', title: 'Suporte', client_name: 'Rafael Cardoso', client_phone: '(11) 98765-4321', created_at: '2026-11-10T09:00:00', ...extra });

test('atrasado: entrega antes de hoje e pedido ainda aberto', () => {
  assert.ok(P.atrasado(ped({ due_date: '2026-11-14', status: 'fila' }), hoje));
  assert.ok(!P.atrasado(ped({ due_date: '2026-11-15', status: 'fila' }), hoje)); // hoje ainda não é atraso
  assert.ok(!P.atrasado(ped({ due_date: '2026-11-01', status: 'entregue' }), hoje));
  assert.ok(!P.atrasado(ped({ due_date: null }), hoje));
});

test('sem resposta: só orçados, contados em dias desde o status (ou a criação)', () => {
  assert.strictEqual(P.diasSemResposta(ped({}), hoje), 5);
  assert.ok(P.aguardando(ped({}), hoje));
  assert.ok(!P.aguardando(ped({ status_at: '2026-11-14T08:00:00' }), hoje)); // 1 dia
  assert.strictEqual(P.diasSemResposta(ped({ status: 'aprovado' }), hoje), 0);
});

test('filtros da lista', () => {
  const lista = [ped({ id: 'a' }), ped({ id: 'b', status: 'imprimindo' }), ped({ id: 'c', status: 'pronto' }), ped({ id: 'd', status: 'entregue' }), ped({ id: 'e', status: 'fila', due_date: '2026-11-01' })];
  const ids = (k) => P.filtrar(lista, k, hoje).map((r) => r.id).join('');
  assert.strictEqual(ids('todos'), 'abcde');
  assert.strictEqual(ids('orcados'), 'a');
  assert.strictEqual(ids('producao'), 'be');
  assert.strictEqual(ids('prontos'), 'c');
  assert.strictEqual(ids('entregues'), 'd');
  assert.strictEqual(ids('atrasados'), 'e');
});

test('link de aprovação fica ao lado do app e o convite leva o link', () => {
  const link = P.linkAprovacao('https://inventta3d.github.io/index.html', 'abc');
  assert.strictEqual(link, 'https://inventta3d.github.io/aprovar.html?t=abc');
  assert.strictEqual(P.linkAprovacao('https://x.github.io/app/', 't'), 'https://x.github.io/app/aprovar.html?t=t');
  const txt = P.convite(ped({}), link);
  assert.ok(txt.startsWith('Olá, Rafael!') && txt.endsWith(link));
});

test('lembrete: primeiro nome e link do WhatsApp com DDI; telefone inválido não gera link', () => {
  const txt = P.lembrete(ped({}));
  assert.ok(txt.startsWith('Olá, Rafael!'));
  assert.ok(txt.includes('Suporte'));
  assert.strictEqual(P.whatsapp('(11) 98765-4321', 'oi'), 'https://wa.me/5511987654321?text=oi');
  assert.strictEqual(P.whatsapp('123', 'oi'), '');
});
