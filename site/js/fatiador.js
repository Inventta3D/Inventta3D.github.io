/* Importar arquivo 3D: preenche peso, tempo e material do orçamento. Tudo no navegador; o arquivo não sai do aparelho.
   - G-code / 3MF fatiado (Bambu, Orca, Prusa, Cura): usa os números do fatiador.
   - STL / 3MF sem fatiar: estimativa rápida pela forma da peça e, em seguida, fatiamento de verdade com o
     motor do Kiri:Moto (site/lib/kiri, licença MIT), com tempo simulado pela aceleração da impressora escolhida.
   Núcleo puro (testado em tests/fatiador.test.cjs) + ligação com a etapa 1 do orçamento. */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.InventtaFatiador = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const DENSIDADE = { PLA: 1.24, PETG: 1.27, ABS: 1.04, ASA: 1.07, TPU: 1.21, TPE: 1.2, PC: 1.2, PA: 1.14, NYLON: 1.14, PVA: 1.23, HIPS: 1.04, PP: 0.9 };
  const densidade = (tipo) => { const t = String(tipo || '').toUpperCase(); const k = Object.keys(DENSIDADE).sort((a, b) => b.length - a.length).find((d) => t.startsWith(d)); return k ? DENSIDADE[k] : 1.24; };
  // ponytail: valores aproximados dos perfis padrão de cada fabricante; o ritmo (g/h) do modo rápido é recalibrado pelo uso
  const IMPRESSORAS = {
    'Bambu Lab A1': { acel: 6000, vmax: 500, externa: 200, interna: 300, desloc: 500, vazao: 21, gph: 24, mesa: 256 },
    'Bambu Lab A1 mini': { acel: 6000, vmax: 500, externa: 200, interna: 300, desloc: 500, vazao: 21, gph: 22, mesa: 180 },
    'Bambu Lab P1S / P1P': { acel: 10000, vmax: 500, externa: 200, interna: 300, desloc: 500, vazao: 21, gph: 28, mesa: 256 },
    'Bambu Lab X1C / X1E': { acel: 10000, vmax: 500, externa: 200, interna: 300, desloc: 500, vazao: 21, gph: 28, mesa: 256 },
    'Bambu Lab H2D': { acel: 10000, vmax: 500, externa: 200, interna: 300, desloc: 500, vazao: 21, gph: 30, mesa: 320 },
    'Outra (Ender 3 e similares)': { acel: 1000, vmax: 150, externa: 40, interna: 60, desloc: 150, vazao: 12, gph: 10, mesa: 220 },
  };
  const soma = (s) => String(s).split(/[,;]/).reduce((t, v) => t + (parseFloat(v) || 0), 0);

  function duracao(s) { // "1d 2h 3m 4s" -> segundos
    let t = 0;
    for (const [, n, u] of String(s).matchAll(/(\d+(?:\.\d+)?)\s*([dhms])/g)) t += n * { d: 86400, h: 3600, m: 60, s: 1 }[u];
    return t;
  }

  function lerGcode(txt) {
    const r = { gramas: 0, segundos: 0, material: '', aproximado: false };
    const g = txt.match(/;\s*total filament (?:used|weight) \[g\]\s*[:=]\s*([\d.]+)/i) || txt.match(/;\s*filament used \[g\]\s*[:=]\s*([\d.,; ]+)/i);
    if (g) r.gramas = soma(g[1]);
    const mat = txt.match(/;\s*filament_type\s*=\s*([^\r\n;]+)/i);
    if (mat) r.material = mat[1].trim();
    const t = txt.match(/;\s*estimated printing time \(normal mode\)\s*=\s*([^\r\n]+)/i) || txt.match(/total estimated time:\s*([^\r\n;]+)/i);
    if (t) r.segundos = duracao(t[1]);
    else { const cura = txt.match(/^;TIME:(\d+)/m); if (cura) r.segundos = Number(cura[1]); }
    if (!r.gramas) { // Cura só informa metros: converte com filamento de 1,75 mm
      const m = txt.match(/^;Filament used:\s*([\d.,m ]+)/m);
      if (m) { r.gramas = soma(m[1].replace(/m/g, '')) * 2.405 * densidade(r.material); r.aproximado = true; }
    }
    return r;
  }

  function lerSliceInfo(xml) { // Bambu/Orca: Metadata/slice_info.config, uma <plate> por placa
    const r = { gramas: 0, segundos: 0, material: '', aproximado: false, placas: 0, objetos: 0 };
    for (const [placa] of xml.matchAll(/<plate>[\s\S]*?<\/plate>/g)) {
      const meta = (k) => Number((placa.match(new RegExp(`key="${k}"\\s+value="([\\d.]+)"`)) || [])[1] || 0);
      const gramas = meta('weight'), seg = meta('prediction');
      if (!gramas && !seg) continue;
      r.placas++; r.gramas += gramas; r.segundos += seg;
      r.objetos += (placa.match(/<object\b/g) || []).length;
      r.material ||= (placa.match(/<filament\b[^>]*\btype="([^"]+)"/) || [])[1] || '';
    }
    return r;
  }

  async function lerZip(bytes) { // só o necessário para 3MF: diretório central + deflate nativo
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), arquivos = {};
    let fim = bytes.length - 22;
    while (fim >= 0 && v.getUint32(fim, true) !== 0x06054b50) fim--;
    if (fim < 0) throw new Error('zip');
    let p = v.getUint32(fim + 16, true);
    for (let i = v.getUint16(fim + 10, true); i > 0; i--) {
      const metodo = v.getUint16(p + 10, true), tam = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true);
      const local = v.getUint32(p + 42, true), nome = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nl));
      arquivos[nome] = async () => {
        const ini = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true), dado = bytes.subarray(ini, ini + tam);
        if (metodo === 0) return new TextDecoder().decode(dado);
        return new Response(new Blob([dado]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
      };
      p += 46 + nl + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
    }
    return arquivos;
  }

  async function ler3mf(bytes) {
    const zip = await lerZip(bytes);
    const info = zip['Metadata/slice_info.config'] ? await zip['Metadata/slice_info.config']() : '';
    if (info) { const r = lerSliceInfo(info); if (r.placas) return r; }
    const gc = Object.keys(zip).find((n) => /\.gcode$/i.test(n));
    if (gc) return lerGcode(await zip[gc]());
    return { gramas: 0, segundos: 0, material: '', projetoBambu: /X-BBL-Client/.test(info) };
  }

  /* ---------- malha (STL e 3MF): Float32Array com 9 números (3 vértices) por triângulo ---------- */
  function lerSTL(bytes) {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), n = bytes.length >= 84 ? v.getUint32(80, true) : -1;
    if (84 + n * 50 === bytes.length) { // binário (mesmo que comece com "solid")
      const t = new Float32Array(n * 9);
      for (let i = 0; i < n; i++) for (let k = 0; k < 9; k++) t[i * 9 + k] = v.getFloat32(84 + i * 50 + 12 + k * 4, true);
      return t;
    }
    const nums = [];
    for (const m of new TextDecoder().decode(bytes).matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)) nums.push(+m[1], +m[2], +m[3]);
    return new Float32Array(nums);
  }

  const atributo = (tag, nome) => (tag.match(new RegExp(`\\b${nome}="([^"]*)"`)) || [])[1];
  const matriz = (t) => (t ? t.trim().split(/\s+/).map(Number) : null); // 3MF: m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32
  const aplicar = (m, x, y, z) => (m ? [x * m[0] + y * m[3] + z * m[6] + m[9], x * m[1] + y * m[4] + z * m[7] + m[10], x * m[2] + y * m[5] + z * m[8] + m[11]] : [x, y, z]);

  function objetos3mf(xml) {
    const objs = {};
    for (const [, tag, corpo] of xml.matchAll(/(<object\b[^>]*>)([\s\S]*?)<\/object>/g)) {
      const o = { comps: [] };
      if (corpo.includes('<mesh')) {
        o.vs = []; o.ts = [];
        for (const m of corpo.matchAll(/<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g)) o.vs.push(+m[1], +m[2], +m[3]);
        for (const m of corpo.matchAll(/<triangle\s+v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"/g)) o.ts.push(+m[1], +m[2], +m[3]);
      }
      for (const [c] of corpo.matchAll(/<component\b[^>]*>/g)) o.comps.push({ id: atributo(c, 'objectid'), caminho: atributo(c, 'p:path'), m: matriz(atributo(c, 'transform')) });
      objs[atributo(tag, 'id')] = o;
    }
    return objs;
  }

  // Lê a geometria de um 3MF (projeto ou não). Bambu/Orca: uma entrada por placa, sem peças modificadoras.
  // ponytail: modificadores do PrusaSlicer (Slic3r_PE_model.config) não são filtrados; entram como volume
  async function lerMalha3mf(bytes) {
    const zip = await lerZip(bytes), cache = {};
    const texto = async (nome) => (cache[nome] ??= objetos3mf(await zip[nome.replace(/^\//, '')]()));
    const raizNome = Object.keys(zip).find((n) => /^3D\/[^/]+\.model$/i.test(n));
    if (!raizNome) throw new Error('3mf');
    const raiz = await zip[raizNome]();
    const cfg = zip['Metadata/model_settings.config'] ? await zip['Metadata/model_settings.config']() : '';
    const modificador = new Set();
    for (const [, oid, corpo] of cfg.matchAll(/<object id="(\d+)"([\s\S]*?)<\/object>/g))
      for (const [, pid] of corpo.matchAll(/<part id="(\d+)" subtype="modifier_part"/g)) modificador.add(`${oid}:${pid}`);
    const itens = [...raiz.matchAll(/<item\b[^>]*>/g)].map(([t]) => ({ id: atributo(t, 'objectid'), m: matriz(atributo(t, 'transform')), imprime: atributo(t, 'printable') !== '0' })).filter((i) => i.imprime);

    async function emitir(arquivo, id, mats, saida, raizId) {
      const o = (await texto(arquivo))[id];
      if (!o) return;
      if (o.vs) for (const i of o.ts) { let [x, y, z] = [o.vs[i * 3], o.vs[i * 3 + 1], o.vs[i * 3 + 2]]; for (const m of mats) [x, y, z] = aplicar(m, x, y, z); saida.push(x, y, z); }
      for (const c of o.comps) {
        if (raizId && modificador.has(`${raizId}:${c.id}`)) continue;
        await emitir(c.caminho || arquivo, c.id, [c.m, ...mats], saida, null);
      }
    }
    const placas = [];
    const grupos = [...cfg.matchAll(/<plate>([\s\S]*?)<\/plate>/g)].map(([, p]) => [...p.matchAll(/key="object_id" value="(\d+)"/g)].map((m) => m[1])).filter((g) => g.length);
    for (const ids of grupos.length ? grupos : [itens.map((i) => i.id)]) {
      const saida = [];
      for (const it of itens.filter((i) => ids.includes(i.id))) await emitir(raizNome, it.id, [it.m], saida, it.id);
      if (saida.length) placas.push({ objetos: ids.length, tri: new Float32Array(saida) });
    }
    return placas;
  }

  function medidas(tri) { // volume (mm³) e área (mm²) de malha fechada
    let vol = 0, area = 0;
    for (let i = 0; i < tri.length; i += 9) {
      const [ax, ay, az, bx, by, bz, cx, cy, cz] = tri.subarray(i, i + 9);
      vol += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
      const ux = bx - ax, uy = by - ay, uz = bz - az, wx = cx - ax, wy = cy - ay, wz = cz - az;
      area += Math.hypot(uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx);
    }
    return { volume: Math.abs(vol) / 6, area: area / 2, triangulos: tri.length / 9 };
  }

  // Modo rápido: casca (paredes, topo e base) maciça + miolo com o preenchimento.
  // ponytail: espessura empírica da casca (paredes × 0,42 + 0,1 mm), calibrada com 4 placas reais do Bambu Studio (±8%); suporte não entra
  function estimarRapido({ volume, area }, { paredes = 2, preenchimento = 0.15, dens = 1.24, gph = 24 } = {}) {
    const casca = Math.min(volume, area * (paredes * 0.42 + 0.1));
    const gramas = (dens / 1000) * (casca + (volume - casca) * preenchimento);
    return { gramas, segundos: (gramas / gph) * 3600 };
  }

  function paraSTL(tri) { // STL binário para o Kiri
    const n = tri.length / 9, buf = new ArrayBuffer(84 + n * 50), v = new DataView(buf);
    v.setUint32(80, n, true);
    for (let i = 0; i < n; i++) for (let k = 0; k < 9; k++) v.setFloat32(84 + i * 50 + 12 + k * 4, tri[i * 9 + k], true);
    return buf;
  }

  // Configuração do Kiri a partir da impressora e do fatiamento. Fluxo 1,2 = mesmo do perfil A1 do Kiri,
  // conferido contra o Bambu Studio (peso dentro de ±6% por placa).
  function processoKiri(maq, { camada = 0.2, paredes = 2, preenchimento = 0.15, suporte = true } = {}) {
    return {
      sliceHeight: camada, firstSliceHeight: camada, sliceShells: paredes, sliceFillSparse: preenchimento, sliceFillType: 'grid',
      sliceTopLayers: 5, sliceBottomLayers: 3, sliceLineWidth: 0.42, sliceSolidMinArea: 0,
      sliceSupportType: suporte ? 'automatic' : 'disabled', sliceSupportEnable: suporte, sliceSupportAngle: 60, sliceSupportDensity: 0.15, sliceSupportSize: 5, sliceSupportArea: 0.25,
      outputFeedrate: maq.interna, outputFinishrate: maq.externa, outputSeekrate: maq.desloc, outputMaxFlowrate: maq.vazao, firstLayerRate: Math.min(50, maq.externa), firstLayerFillRate: 80,
      outputShellMult: 1.2, outputFillMult: 1.2, outputSparseMult: 1.2, outputRetractDist: 2, outputRetractSpeed: 80, outputShortPoly: 100, outputBrimCount: 0,
    };
  }

  const filamentoKiri = (g) => Number((g.match(/filament used: ([\d.]+) mm/) || [])[1] || 0); // mm de filamento
  const gramasDeMm = (mm, dens) => mm * Math.PI * 0.875 ** 2 * dens / 1000; // filamento de 1,75 mm

  // Tempo de um G-code simulando aceleração (perfil trapezoidal) e velocidade nas curvas (desvio de junção),
  // como o planejador do firmware. Conferido contra o Bambu Studio: ±11% por placa, −3% no total.
  function tempoGcode(txt, { acel: A = 6000, vmax: VMAX = 500 } = {}, JD = 0.02) {
    let x = 0, y = 0, z = 0, f = 50, abs = true, extra = 0, i = 0;
    const d = [], ux = [], uy = [], vel = [];
    while (i < txt.length) {
      let j = txt.indexOf('\n', i); if (j < 0) j = txt.length;
      const linha = txt.slice(i, j); i = j + 1;
      if (linha.charCodeAt(0) !== 71) continue; // só comandos G
      const c = linha.split(';')[0];
      if (/^G90\b/.test(c)) { abs = true; continue; }
      if (/^G91\b/.test(c)) { abs = false; continue; }
      if (!/^G[01]\b/.test(c)) continue;
      let nx = x, ny = y, nz = z, temE = false;
      for (const m of c.matchAll(/([XYZEF])(-?[\d.]+)/g)) {
        const val = Number(m[2]);
        if (m[1] === 'F') f = val / 60; else if (m[1] === 'E') temE = true;
        else if (m[1] === 'X') nx = abs ? val : x + val; else if (m[1] === 'Y') ny = abs ? val : y + val; else nz = abs ? val : z + val;
      }
      const dx = nx - x, dy = ny - y, dist = Math.hypot(dx, dy, nz - z);
      if (dist > 1e-6) { d.push(dist); ux.push(dx / dist); uy.push(dy / dist); vel.push(Math.min(f, VMAX)); }
      else if (temE) extra += 0.05; // retração curta
      x = nx; y = ny; z = nz;
    }
    const n = d.length, vj = new Float64Array(n + 1);
    for (let k = 1; k < n; k++) {
      const cos = -(ux[k - 1] * ux[k] + uy[k - 1] * uy[k]), s = Math.sqrt(Math.max(0, (1 - cos) / 2));
      vj[k] = Math.min(vel[k - 1], vel[k], s > 0.999 ? Infinity : Math.sqrt(A * JD * s / (1 - s)));
    }
    for (let k = n - 1; k >= 0; k--) vj[k] = Math.min(vj[k], Math.sqrt(vj[k + 1] ** 2 + 2 * A * d[k]));
    let t = extra;
    for (let k = 0; k < n; k++) {
      vj[k + 1] = Math.min(vj[k + 1], Math.sqrt(vj[k] ** 2 + 2 * A * d[k]));
      const v0 = vj[k], v1 = vj[k + 1], vm = vel[k], da = (vm * vm - v0 * v0) / (2 * A), dd = (vm * vm - v1 * v1) / (2 * A);
      if (da + dd <= d[k]) t += (vm - v0) / A + (vm - v1) / A + (d[k] - da - dd) / vm;
      else { const vp = Math.sqrt((2 * A * d[k] + v0 * v0 + v1 * v1) / 2); t += (vp - v0) / A + (vp - v1) / A; }
    }
    return t;
  }

  const paraHHMM = (seg) => { const m = Math.max(1, Math.round(seg / 60)), h = Math.min(99, Math.floor(m / 60)); return `${String(h).padStart(2, '0')}:${String(h === 99 ? 59 : m % 60).padStart(2, '0')}`; };

  return { lerGcode, lerSliceInfo, ler3mf, lerSTL, lerMalha3mf, medidas, estimarRapido, paraSTL, processoKiri, filamentoKiri, gramasDeMm, tempoGcode, densidade, IMPRESSORAS, duracao, paraHHMM };
});

(() => {
  if (typeof document === 'undefined') return;
  const F = window.InventtaFatiador, $ = (id) => document.getElementById(id);
  const entrada = $('slicerFile'), status = $('slicerStatus');
  if (!entrada) return;
  const BORDA = 512 * 1024, aviso = (m) => Object.assign(new Error(m), { aviso: true });
  const g1 = (g) => String(Math.round(g * 10) / 10).replace('.', ',');
  let vis = null;
  async function mostrarPeca(placas) { // junta as placas e mostra em 3D, se o visualizador estiver no app
    const caixa = $('slicerView');
    vis?.fechar(); vis = null; caixa.hidden = true;
    if (!placas || !window.InventtaVisualizador) return;
    const tri = new Float32Array(placas.reduce((t, p) => t + p.tri.length, 0));
    let o = 0; for (const p of placas) { tri.set(p.tri, o); o += p.tri.length; }
    caixa.hidden = false;
    // trocar a cor no 3D preenche "Cor do filamento", para o orçamento mostrar a mesma cor
    try { vis = await window.InventtaVisualizador.mostrar(caixa, tri, { cor: $('filamentColor').value, nome: $('product').value || 'peça', aoTrocarCor: (nome) => preencher('filamentColor', nome) }); } catch { caixa.hidden = true; }
  }

  const preencher = (id, valor, evento = 'input') => { const el = $(id); el.value = valor; el.dispatchEvent(new Event(evento, { bubbles: true })); el.dispatchEvent(new Event('blur')); };
  function material(tipo) {
    const t = tipo.split(';')[0].trim().toLowerCase();
    if (!t) return '';
    const ops = [...$('filamentType').options].map((o) => o.value);
    return ops.find((o) => o.toLowerCase() === t) || ops.find((o) => o.toLowerCase().startsWith(t + ' ')) || '';
  }
  const nomeArquivo = (n) => n.replace(/(\.gcode)?\.(3mf|gcode|gco|stl)$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 70);
  const placaTxt = (placas, objetos) => (placas > 1 ? ` Soma de ${placas} placas; ajuste para uma peça se precisar.` : objetos > 1 ? ` Placa com ${objetos} objetos; ajuste para uma peça se precisar.` : '');

  async function lerFatiado(arq) {
    if (/\.3mf$/i.test(arq.name)) return F.ler3mf(new Uint8Array(await arq.arrayBuffer()));
    if (/\.bgcode$/i.test(arq.name)) throw aviso('Arquivo .bgcode é binário. No PrusaSlicer, exporte em G‑code de texto.');
    // G-code pode ter dezenas de MB; o resumo fica no começo (Bambu, Cura) ou no fim (Prusa, Orca)
    const txt = arq.size > BORDA * 2 ? (await arq.slice(0, BORDA).text()) + '\n' + (await arq.slice(-BORDA).text()) : await arq.text();
    return F.lerGcode(txt);
  }

  async function importar(arq) {
    if (!arq) return;
    status.classList.remove('erro');
    status.textContent = 'Lendo o arquivo…';
    mostrarPeca(null);
    try {
      const malha = /\.stl$/i.test(arq.name);
      let r = malha ? null : await lerFatiado(arq);
      if (!$('product').value.trim()) preencher('product', nomeArquivo(arq.name));
      if (r && (r.gramas || r.segundos)) { // arquivo já fatiado: números do fatiador
        const feito = [];
        if (r.gramas) { const g = g1(r.gramas); preencher('amount', g); feito.push(`${g} g${r.aproximado ? ' (aprox.)' : ''}`); }
        if (r.segundos) { const hm = F.paraHHMM(r.segundos); preencher('printHours', hm); feito.push(hm); }
        const mat = material(r.material);
        if (mat) { preencher('filamentType', mat, 'change'); feito.push(mat); }
        status.textContent = `Do fatiador: ${feito.join(' · ')}.` + (placaTxt(r.placas || 0, r.objetos || 0) || ' Confira nas próximas etapas.');
        if (/\.3mf$/i.test(arq.name)) { // 3MF fatiado também traz a malha da peça
          try { const placas = await F.lerMalha3mf(new Uint8Array(await arq.arrayBuffer())); if (placas.some((p) => p.tri.length)) mostrarPeca(placas); } catch { /* sem 3D, só os números */ }
        }
        return;
      }
      if (!malha && !/\.3mf$/i.test(arq.name)) throw aviso('Não encontrei peso nem tempo neste arquivo. Use o G‑code gerado pelo fatiador, um STL ou um 3MF.');
      const bytes = new Uint8Array(await arq.arrayBuffer());
      const placas = malha ? [{ objetos: 1, tri: F.lerSTL(bytes) }] : await F.lerMalha3mf(bytes);
      if (!placas.length || !placas.some((p) => p.tri.length)) throw aviso('Não encontrei a peça neste arquivo.');
      status.textContent = 'Peça em 3D. Gire, aproxime e escolha a cor. Informe peso e tempo nas próximas etapas.';
      mostrarPeca(placas);
    } catch (e) {
      status.classList.add('erro');
      status.textContent = e.aviso ? e.message : 'Não consegui ler este arquivo. Use STL, 3MF ou G‑code.';
    } finally { entrada.value = ''; }
  }

  $('filamentColor').addEventListener('input', () => vis?.cor($('filamentColor').value));
  entrada.addEventListener('change', () => importar(entrada.files[0]));
  const alvo = entrada.closest('.panel');
  alvo.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); alvo.classList.add('soltar'); } });
  alvo.addEventListener('dragleave', (e) => { if (!alvo.contains(e.relatedTarget)) alvo.classList.remove('soltar'); });
  alvo.addEventListener('drop', (e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); alvo.classList.remove('soltar'); importar(e.dataTransfer.files[0]); });
})();
