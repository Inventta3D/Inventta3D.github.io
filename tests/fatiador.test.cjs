const test = require('node:test');
const assert = require('node:assert');
const zlib = require('node:zlib');
const F = require('../site/js/fatiador.js');

// monta um zip mínimo (deflate) como o 3MF dos fatiadores
function zip(arquivos) {
  const locais = [], central = []; let off = 0;
  for (const [nome, txt] of Object.entries(arquivos)) {
    const n = Buffer.from(nome), dado = zlib.deflateRawSync(Buffer.from(txt));
    const l = Buffer.alloc(30); l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(8, 8); l.writeUInt32LE(dado.length, 18); l.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(8, 10); c.writeUInt32LE(dado.length, 20); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
    locais.push(l, n, dado); central.push(c, n); off += 30 + n.length + dado.length;
  }
  const cd = Buffer.concat(central), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(Object.keys(arquivos).length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return new Uint8Array(Buffer.concat([...locais, cd, e]));
}

test('PrusaSlicer / OrcaSlicer: peso, tempo e material no fim do G-code', () => {
  const r = F.lerGcode('G1 X1\n; filament used [mm] = 4120.5\n; filament used [g] = 12.34\n; estimated printing time (normal mode) = 1h 23m 45s\n; filament_type = PETG\n');
  assert.deepStrictEqual([r.gramas, r.segundos, r.material, r.aproximado], [12.34, 5025, 'PETG', false]);
});

test('Bambu Studio: cabeçalho com peso total e tempo total', () => {
  const r = F.lerGcode('; HEADER_BLOCK_START\n; model printing time: 2h 0m 5s; total estimated time: 2h 10m 5s\n; total filament weight [g] : 30.5\n; filament_type = PLA;PLA\n');
  assert.deepStrictEqual([r.gramas, r.segundos, r.material], [30.5, 7805, 'PLA']);
});

test('multimaterial soma os extrusores; dias contam no tempo', () => {
  const r = F.lerGcode('; filament used [g] = 10.0, 2.5\n; estimated printing time (normal mode) = 1d 2h 0m 0s\n');
  assert.deepStrictEqual([r.gramas, r.segundos], [12.5, 93600]);
});

test('Cura: tempo em segundos e filamento em metros vira gramas aproximadas', () => {
  const r = F.lerGcode(';FLAVOR:Marlin\n;TIME:3600\n;Filament used: 4m\n');
  assert.strictEqual(r.segundos, 3600);
  assert.ok(r.aproximado);
  assert.ok(Math.abs(r.gramas - 11.93) < 0.05, r.gramas);
});

test('G-code sem resumo devolve zeros (app mostra aviso)', () => {
  const r = F.lerGcode('G28\nG1 X10 Y10\n');
  assert.deepStrictEqual([r.gramas, r.segundos], [0, 0]);
});

test('3MF fatiado (Bambu/Orca): soma placas, conta objetos e pega o material', async () => {
  const placa = (w, s, objs) => `<plate><metadata key="index" value="1"/><metadata key="prediction" value="${s}"/><metadata key="weight" value="${w}"/>${'<object identify_id="1" name="a"/>'.repeat(objs)}<filament id="1" type="PETG" used_g="${w}"/></plate>`;
  const r = await F.ler3mf(zip({ '3D/3dmodel.model': '<model/>', 'Metadata/slice_info.config': `<config>${placa(20, 3600, 3)}${placa(5.5, 600, 1)}</config>` }));
  assert.deepStrictEqual([r.gramas, r.segundos, r.material, r.placas, r.objetos], [25.5, 4200, 'PETG', 2, 4]);
});

test('3MF com G-code dentro (.gcode.3mf) e 3MF não fatiado', async () => {
  const r = await F.ler3mf(zip({ 'Metadata/plate_1.gcode': '; total filament weight [g] : 7.2\n; total estimated time: 45m 0s\n' }));
  assert.deepStrictEqual([r.gramas, r.segundos], [7.2, 2700]);
  const vazio = await F.ler3mf(zip({ '3D/3dmodel.model': '<model/>' }));
  assert.deepStrictEqual([vazio.gramas, vazio.segundos], [0, 0]);
});

test('tempo para HH:MM arredonda minutos e limita em 99:59', () => {
  assert.strictEqual(F.paraHHMM(5025), '01:24');
  assert.strictEqual(F.paraHHMM(20), '00:01');
  assert.strictEqual(F.paraHHMM(500 * 3600), '99:59');
});

test('projeto do Bambu Studio sem fatiar é reconhecido (aviso específico)', async () => {
  const r = await F.ler3mf(zip({ '3D/3dmodel.model': '<model/>', 'Metadata/slice_info.config': '<config><header><header_item key="X-BBL-Client-Type" value="slicer"/></header></config>' }));
  assert.deepStrictEqual([r.gramas, r.segundos, r.projetoBambu], [0, 0, true]);
});

// cubo de lado L (12 triângulos, normais para fora) em STL binário
function cuboSTL(L = 20) {
  const v = [[0,0,0],[L,0,0],[L,L,0],[0,L,0],[0,0,L],[L,0,L],[L,L,L],[0,L,L]];
  const f = [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]];
  const b = Buffer.alloc(84 + f.length * 50); b.writeUInt32LE(f.length, 80);
  f.forEach((t, i) => t.forEach((k, j) => v[k].forEach((c, e) => b.writeFloatLE(c, 84 + i * 50 + 12 + j * 12 + e * 4))));
  return new Uint8Array(b);
}

test('STL binário e texto: mesmo cubo, volume e área exatos', () => {
  const bin = F.lerSTL(cuboSTL(20));
  const tri = Array.from(bin);
  let txt = 'solid c\n';
  for (let i = 0; i < tri.length; i += 9) txt += `facet normal 0 0 0\nouter loop\nvertex ${tri.slice(i, i + 3).join(' ')}\nvertex ${tri.slice(i + 3, i + 6).join(' ')}\nvertex ${tri.slice(i + 6, i + 9).join(' ')}\nendloop\nendfacet\n`;
  for (const t of [bin, F.lerSTL(new Uint8Array(Buffer.from(txt + 'endsolid c\n')))]) {
    const m = F.medidas(t);
    assert.deepStrictEqual([m.triangulos, Math.round(m.volume), Math.round(m.area)], [12, 8000, 2400]);
  }
});

test('3MF de projeto: aplica transformações, separa placas e ignora peças modificadoras', async () => {
  const cubo = '<mesh><vertices>' + [[0,0,0],[10,0,0],[10,10,0],[0,10,0],[0,0,10],[10,0,10],[10,10,10],[0,10,10]].map(([x,y,z]) => `<vertex x="${x}" y="${y}" z="${z}"/>`).join('') +
    '</vertices><triangles>' + [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]].map(([a,b,c]) => `<triangle v1="${a}" v2="${b}" v3="${c}"/>`).join('') + '</triangles></mesh>';
  const r = await F.lerMalha3mf(zip({
    '3D/Objects/o.model': `<model><resources><object id="1">${cubo}</object><object id="2">${cubo}</object></resources></model>`,
    '3D/3dmodel.model': '<model><resources>' +
      '<object id="10"><components><component p:path="/3D/Objects/o.model" objectid="1" transform="2 0 0 0 1 0 0 0 1 0 0 0"/><component p:path="/3D/Objects/o.model" objectid="2" transform="1 0 0 0 1 0 0 0 1 0 0 0"/></components></object>' +
      '<object id="20"><components><component p:path="/3D/Objects/o.model" objectid="1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/></components></object>' +
      '</resources><build><item objectid="10" transform="1 0 0 0 1 0 0 0 1 100 0 0"/><item objectid="20" transform="1 0 0 0 1 0 0 0 3 0 0 0"/></build></model>',
    'Metadata/model_settings.config': '<config><object id="10"><part id="1" subtype="normal_part"/><part id="2" subtype="modifier_part"/></object>' +
      '<plate><metadata key="plater_id" value="1"/><model_instance><metadata key="object_id" value="10"/></model_instance></plate>' +
      '<plate><metadata key="plater_id" value="2"/><model_instance><metadata key="object_id" value="20"/></model_instance></plate></config>',
  }));
  assert.strictEqual(r.length, 2);
  assert.strictEqual(Math.round(F.medidas(r[0].tri).volume), 2000); // cubo esticado 2× em X; o modificador não entra
  assert.strictEqual(Math.min(...r[0].tri.filter((_, i) => i % 3 === 0)), 100); // deslocado pela placa
  assert.strictEqual(Math.round(F.medidas(r[1].tri).volume), 3000); // 3× em Z
});

test('modo rápido: cubo maciço pequeno vira casca inteira; preenchimento e ritmo mudam o resultado', () => {
  const m = F.medidas(F.lerSTL(cuboSTL(20))); // 8000 mm³, 2400 mm²
  const r = F.estimarRapido(m, { paredes: 2, preenchimento: 0.15, dens: 1.24, gph: 24 });
  assert.ok(Math.abs(r.gramas - 1.24e-3 * (2400 * 0.94 + (8000 - 2256) * 0.15)) < 1e-9);
  assert.ok(Math.abs(r.segundos - r.gramas / 24 * 3600) < 1e-9);
  assert.ok(F.estimarRapido(m, { preenchimento: 1 }).gramas > r.gramas);
  assert.ok(Math.abs(F.estimarRapido({ volume: 100, area: 1000 }, { preenchimento: 0, dens: 1 }).gramas - 0.1) < 1e-12); // casca nunca passa do volume
});

test('tempo do G-code: aceleração em reta e curva fechada freia', () => {
  // 100 mm a 100 mm/s com 1000 mm/s²: 5 mm acelerando, 90 mm em cruzeiro, 5 mm freando = 1,1 s
  assert.ok(Math.abs(F.tempoGcode('G90\nG1 X100 F6000\n', { acel: 1000, vmax: 500 }) - 1.1) < 1e-9);
  const reta = F.tempoGcode('G1 X50 F6000\nG1 X100\n', { acel: 1000, vmax: 500 });
  const volta = F.tempoGcode('G1 X50 F6000\nG1 X0\n', { acel: 1000, vmax: 500 });
  assert.ok(Math.abs(reta - 1.1) < 1e-6, reta); // sem curva: não para no meio
  assert.ok(Math.abs(volta - 1.2) < 1e-6, volta); // meia-volta: freia até parar e acelera de novo (+0,1 s)
  assert.ok(F.tempoGcode('G1 X100 F6000\n', { acel: 1000, vmax: 50 }) > 2); // limite de velocidade da máquina
});

test('impressoras da tela existem nos perfis; Kiri recebe velocidades da máquina', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '../site/index.html'), 'utf8');
  const sel = html.match(/<select[^>]*id="printerModel"[^>]*>([\s\S]*?)<\/select>/)[1];
  const nomes = [...sel.matchAll(/<option>([^<]+)<\/option>/g)].map((m) => m[1]);
  assert.deepStrictEqual(nomes, Object.keys(F.IMPRESSORAS));
  const p = F.processoKiri(F.IMPRESSORAS['Bambu Lab A1'], { preenchimento: 0.2, suporte: false });
  assert.deepStrictEqual([p.outputFinishrate, p.outputFeedrate, p.sliceFillSparse, p.sliceSupportType], [200, 300, 0.2, 'disabled']);
  assert.strictEqual(F.densidade('PETG-CF (fibra de carbono)'), 1.27);
  assert.strictEqual(F.densidade('PLA+'), 1.24);
  assert.ok(Math.abs(F.gramasDeMm(1000, 1.24) - 2.982) < 0.001);
});

test('3MF de projeto Bambu/Orca: cor de cada parte vem do filamento (extruder), sem fatiar', async () => {
  const cubo = (o) => '<mesh><vertices>' + [[0,0,0],[10,0,0],[10,10,0],[0,10,0],[0,0,10],[10,0,10],[10,10,10],[0,10,10]].map(([x,y,z]) => `<vertex x="${x + o}" y="${y}" z="${z}"/>`).join('') +
    '</vertices><triangles>' + [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]].map(([a,b,c]) => `<triangle v1="${a}" v2="${b}" v3="${c}"/>`).join('') + '</triangles></mesh>';
  const zipado = zip({
    '3D/Objects/o.model': `<model><resources><object id="1">${cubo(0)}</object><object id="2">${cubo(20)}</object></resources></model>`,
    '3D/3dmodel.model': '<model><resources><object id="10"><components><component p:path="/3D/Objects/o.model" objectid="1"/><component p:path="/3D/Objects/o.model" objectid="2"/></components></object></resources><build><item objectid="10"/></build></model>',
    'Metadata/project_settings.config': JSON.stringify({ filament_colour: ['#FF0000', '#0000FF', '#00FF00FF'] }),
    // objeto no filamento 1; a parte 2 sobrescreve para o filamento 3 (com alfa no hex, que é ignorado)
    'Metadata/model_settings.config': '<config><object id="10"><metadata key="extruder" value="1"/><part id="1" subtype="normal_part"></part><part id="2" subtype="normal_part"><metadata key="extruder" value="3"/></part></object></config>',
  });
  const [placa] = await F.lerMalha3mf(zipado);
  assert.strictEqual(placa.cores.length, placa.tri.length);
  assert.deepStrictEqual([...placa.cores.slice(0, 3)], [1, 0, 0]); // 1ª parte: filamento 1 (vermelho)
  assert.deepStrictEqual([...placa.cores.slice(placa.cores.length - 3)], [0, 1, 0]); // 2ª parte: filamento 3 (verde)
});

test('3MF sem cores de filamento: não devolve cores', async () => {
  const r = await F.lerMalha3mf(zip({ '3D/3dmodel.model': '<model><resources><object id="1"><mesh><vertices><vertex x="0" y="0" z="0"/><vertex x="1" y="0" z="0"/><vertex x="0" y="1" z="0"/></vertices><triangles><triangle v1="0" v2="1" v3="2"/></triangles></mesh></object></resources><build><item objectid="1"/></build></model>' }));
  assert.strictEqual(r[0].cores, undefined);
});

test('3MF pintado (paint_color): cada triângulo usa o filamento pintado; sem pintura usa o do objeto; face dividida usa o dominante', async () => {
  const tri = (a, c) => `<triangle v1="${a[0]}" v2="${a[1]}" v3="${a[2]}"${c ? ` paint_color="${c}"` : ''}/>`;
  const malha = '<mesh><vertices>' + [[0,0,0],[1,0,0],[0,1,0],[1,1,0]].map(([x,y,z]) => `<vertex x="${x}" y="${y}" z="${z}"/>`).join('') + '</vertices><triangles>' +
    tri([0,1,2]) + tri([0,1,2], '8') + tri([0,1,2], '0C') + tri([0,1,2], '881') + tri([0,1,2], '4') + '</triangles></mesh>';
  const [placa] = await F.lerMalha3mf(zip({
    '3D/3dmodel.model': `<model><resources><object id="1">${malha}</object></resources><build><item objectid="1"/></build></model>`,
    'Metadata/project_settings.config': JSON.stringify({ filament_colour: ['#FF0000', '#0000FF', '#00FF00', '#FFFF00'] }),
    'Metadata/model_settings.config': '<config><object id="1"><metadata key="extruder" value="4"/></object></config>',
  }));
  const cor = (t) => [...placa.cores.slice(t * 9, t * 9 + 3)].join(',');
  assert.strictEqual(cor(0), '1,1,0'); // sem pintura: filamento 4 do objeto (amarelo)
  assert.strictEqual(cor(1), '0,0,1'); // "8" = filamento 2 (azul)
  assert.strictEqual(cor(2), '0,1,0'); // "0C" = filamento 3 (verde)
  assert.strictEqual(cor(3), '0,0,1'); // face dividida em duas metades de filamento 2: azul
  assert.strictEqual(cor(4), '1,0,0'); // "4" = filamento 1 (vermelho)
});

test('leitura de 3MF grande informa progresso crescente entre 0 e 1 e cede a vez ao navegador', async () => {
  const tris = Array.from({ length: 120000 }, () => '<triangle v1="0" v2="1" v3="2"/>').join('');
  const malha = '<mesh><vertices><vertex x="0" y="0" z="0"/><vertex x="1" y="0" z="0"/><vertex x="0" y="1" z="0"/></vertices><triangles>' + tris + '</triangles></mesh>';
  const marcas = [];
  const [placa] = await F.lerMalha3mf(zip({ '3D/3dmodel.model': `<model><resources><object id="1">${malha}</object></resources><build><item objectid="1"/></build></model>` }), (f) => marcas.push(f));
  assert.strictEqual(placa.tri.length, 120000 * 9);
  assert.ok(marcas.length >= 2, `poucas marcas: ${marcas.length}`);
  assert.ok(marcas.every((f) => f >= 0 && f <= 1));
  assert.deepStrictEqual(marcas, [...marcas].sort((a, b) => a - b)); // nunca anda para trás
});
