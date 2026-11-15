/* Visualizador 3D: mostra a peça (triângulos já lidos do STL/3MF) num <canvas>, com girar, zoom e sombra.
   three.js (site/vendor/three, MIT) só é baixado na primeira vez que algo é mostrado.
   Uso: const v = await InventtaVisualizador.mostrar(caixa, tri, { cor, nome }); v.cor('#hex'); v.fechar(); */
(() => {
  let three = null;
  const carregar = () => (three ??= Promise.all([
    import(new URL('vendor/three/three.module.min.js', document.baseURI).href),
    import(new URL('vendor/three/OrbitControls.js', document.baseURI).href),
  ]));

  // nomes de cor comuns em filamentos -> cor de exibição; o resto usa a cor primária do tema
  const CORES = { preto: '#2b2b2b', branco: '#f2f2f2', cinza: '#9a9a9a', prata: '#c0c0c0', vermelho: '#c62828', azul: '#1e5bb8', verde: '#2e7d32', amarelo: '#f2c230', laranja: '#ef7d22', roxo: '#6a3fa0', rosa: '#e47aa8', marrom: '#7a4a2a', dourado: '#c9a227', bege: '#d9c8a5', transparente: '#cfe8f2' };
  function corDe(texto) {
    const t = String(texto || '').toLowerCase();
    const k = Object.keys(CORES).find((c) => t.includes(c));
    return k ? CORES[k] : getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-primary').trim() || '#8a5a00';
  }

  /* GIF animado sem biblioteca: paleta única (median cut) + LZW. quadros: Uint8ClampedArray RGBA de L×A. */
  function paleta(quadros) {
    const amostra = [];
    for (const q of [quadros[0], quadros[quadros.length >> 2], quadros[quadros.length >> 1], quadros[(quadros.length * 3) >> 2]])
      for (let i = 0; i < q.length; i += 28) amostra.push([q[i], q[i + 1], q[i + 2]]);
    let caixas = [amostra];
    while (caixas.length < 256) {
      let k = -1, melhor = 0, canal = 0;
      caixas.forEach((c, i) => { if (c.length < 2) return; for (let ch = 0; ch < 3; ch++) { let lo = 255, hi = 0; for (const p of c) { if (p[ch] < lo) lo = p[ch]; if (p[ch] > hi) hi = p[ch]; } const v = (hi - lo) * c.length; if (v > melhor) { melhor = v; k = i; canal = ch; } } });
      if (k < 0) break;
      const c = caixas[k].sort((a, b) => a[canal] - b[canal]), m = c.length >> 1;
      caixas.splice(k, 1, c.slice(0, m), c.slice(m));
    }
    return caixas.map((c) => [0, 1, 2].map((ch) => Math.round(c.reduce((t, p) => t + p[ch], 0) / c.length)));
  }
  function lzw(idx) {
    const out = [], dic = new Int16Array(4096 * 256);
    let bits = 9, prox = 258, buf = 0, n = 0;
    const emitir = (cod) => { buf |= cod << n; n += bits; while (n >= 8) { out.push(buf & 255); buf >>>= 8; n -= 8; } };
    emitir(256);
    let pre = idx[0];
    for (let i = 1; i < idx.length; i++) {
      const k = idx[i], chave = pre * 256 + k;
      if (dic[chave]) { pre = dic[chave]; continue; }
      emitir(pre);
      if (prox < 4096) { dic[chave] = prox++; if (prox > (1 << bits) && bits < 12) bits++; }
      else { emitir(256); dic.fill(0); prox = 258; bits = 9; }
      pre = k;
    }
    emitir(pre); emitir(257);
    if (n) out.push(buf & 255);
    return out;
  }
  function gif(quadros, L, A, atraso) {
    const pal = paleta(quadros), cache = new Int16Array(1 << 18).fill(-1);
    const perto = (r, g, b) => { const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2); let v = cache[key]; if (v < 0) { let d = 1e9; for (let i = 0; i < pal.length; i++) { const e = (pal[i][0] - r) ** 2 + (pal[i][1] - g) ** 2 + (pal[i][2] - b) ** 2; if (e < d) { d = e; v = i; } } cache[key] = v; } return v; };
    const w16 = (v) => [v & 255, v >> 8];
    const b = [...'GIF89a'].map((c) => c.charCodeAt(0)).concat(w16(L), w16(A), [0xf7, 0, 0]);
    for (let i = 0; i < 256; i++) b.push(...(pal[i] || [0, 0, 0]));
    b.push(0x21, 0xff, 11, ...[...'NETSCAPE2.0'].map((c) => c.charCodeAt(0)), 3, 1, 0, 0, 0);
    for (const q of quadros) {
      const idx = new Uint8Array(L * A);
      for (let i = 0, j = 0; j < idx.length; i += 4, j++) idx[j] = perto(q[i], q[i + 1], q[i + 2]);
      b.push(0x21, 0xf9, 4, 4, ...w16(atraso), 0, 0, 0x2c, 0, 0, 0, 0, ...w16(L), ...w16(A), 0, 8);
      const d = lzw(idx);
      for (let i = 0; i < d.length; i += 255) { const f = d.slice(i, i + 255); b.push(f.length, ...f); }
      b.push(0);
    }
    b.push(0x3b);
    return new Blob([new Uint8Array(b)], { type: 'image/gif' });
  }

  async function mostrar(caixa, tri, { cor = '', nome = 'peça', aoTrocarCor = null } = {}) {
    const [T, { OrbitControls }] = await carregar();
    caixa.replaceChildren();
    const larg = caixa.clientWidth || 320, alt = caixa.clientHeight || 240;
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    renderer.setSize(larg, alt);
    renderer.shadowMap.enabled = true;
    const canvas = renderer.domElement;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Visualização 3D de ${nome}. Arraste para girar e use a roda ou dois dedos para aproximar.`);
    caixa.append(canvas);
    const cores = document.createElement('div');
    cores.className = 'model-cores'; cores.setAttribute('role', 'group'); cores.setAttribute('aria-label', 'Cor da peça');
    const botoes = Object.entries(CORES).map(([k, hex]) => {
      const b = document.createElement('button'), rotulo = k[0].toUpperCase() + k.slice(1);
      b.type = 'button'; b.className = 'model-cor'; b.style.background = hex; b.title = rotulo; b.setAttribute('aria-label', rotulo); b.dataset.cor = rotulo;
      b.addEventListener('click', () => { marcar(k); material.color.set(hex); aoTrocarCor?.(rotulo); });
      cores.append(b); return [k, b];
    });
    const marcar = (texto) => { const t = String(texto || '').toLowerCase(), k = Object.keys(CORES).find((c) => t.includes(c)); for (const [c, b] of botoes) b.setAttribute('aria-pressed', String(c === k)); };
    caixa.append(cores);
    const acoes = document.createElement('div'); acoes.className = 'model-acoes';
    const botao = (texto) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-tonal btn-sm'; b.textContent = texto; acoes.append(b); return b; };
    const enviar = botao('Compartilhar imagem'), enviarGif = botao('Compartilhar GIF');
    caixa.append(acoes);

    const cena = new T.Scene();
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(tri.slice(), 3)); // cópia: a original segue para o fatiamento
    geo.rotateX(-Math.PI / 2); // impressão usa Z para cima; three.js usa Y
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    const caixaGeo = geo.boundingBox, centro = new T.Vector3();
    caixaGeo.getCenter(centro);
    geo.translate(-centro.x, -caixaGeo.min.y, -centro.z); // apoiada na mesa, centralizada
    const tam = caixaGeo.getSize(new T.Vector3()), raio = Math.max(tam.x, tam.y, tam.z) || 10;

    const material = new T.MeshStandardMaterial({ color: corDe(cor), roughness: 0.55, metalness: 0.05 });
    marcar(cor);
    const malha = new T.Mesh(geo, material);
    malha.castShadow = true;
    cena.add(malha);
    const chao = new T.Mesh(new T.PlaneGeometry(raio * 6, raio * 6), new T.ShadowMaterial({ opacity: 0.18 }));
    chao.rotateX(-Math.PI / 2); chao.receiveShadow = true;
    cena.add(chao);
    cena.add(new T.HemisphereLight(0xffffff, 0x666666, 2.2));
    const sol = new T.DirectionalLight(0xffffff, 1.6);
    sol.position.set(raio, raio * 2, raio);
    sol.castShadow = true;
    Object.assign(sol.shadow.camera, { left: -raio * 2, right: raio * 2, top: raio * 2, bottom: -raio * 2, far: raio * 8 });
    sol.shadow.mapSize.set(1024, 1024);
    cena.add(sol);

    const camera = new T.PerspectiveCamera(35, larg / alt, raio / 100, raio * 50);
    camera.position.set(raio * 1.6, raio * 1.2, raio * 1.9);
    const ctrl = new OrbitControls(camera, canvas);
    ctrl.target.set(0, tam.y / 2, 0);
    ctrl.enableDamping = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    ctrl.update();

    // imagem 1200×900 com fundo claro (PNG transparente fica preto no WhatsApp)
    function imagem() {
      const L = 1200, A = 900, w = renderer.domElement.width, h = renderer.domElement.height, pr = renderer.getPixelRatio();
      renderer.setPixelRatio(1); renderer.setSize(L, A, false); camera.aspect = L / A; camera.updateProjectionMatrix();
      renderer.render(cena, camera);
      const c = document.createElement('canvas'); c.width = L; c.height = A;
      const x = c.getContext('2d'); x.fillStyle = '#f4f2ee'; x.fillRect(0, 0, L, A); x.drawImage(renderer.domElement, 0, 0);
      renderer.setPixelRatio(pr); renderer.setSize(w / pr, h / pr, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      return new Promise((ok) => c.toBlob(ok, 'image/png'));
    }
    const base = String(nome).trim().replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase() || 'peca';
    async function compartilhar(blob, ext) {
      const arq = new File([blob], `${base}.${ext}`, { type: blob.type });
      if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [arq] })) { try { await navigator.share({ files: [arq], title: nome }); } catch { /* cancelou */ } return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(arq); a.download = arq.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    enviar.addEventListener('click', async () => compartilhar(await imagem(), 'png'));
    // peça girando uma volta (48 quadros de 400×300, ~3 s); a câmera fica parada e a peça gira, como num prato giratório
    enviarGif.addEventListener('click', async () => {
      const L = 400, A = 300, N = 48, w = renderer.domElement.width, h = renderer.domElement.height, pr = renderer.getPixelRatio(), giro = malha.rotation.y, texto = enviarGif.textContent;
      acoes.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      try {
        renderer.setPixelRatio(1); renderer.setSize(L, A, false); camera.aspect = L / A; camera.updateProjectionMatrix();
        const c = document.createElement('canvas'); c.width = L; c.height = A; const x = c.getContext('2d', { willReadFrequently: true }), quadros = [];
        for (let i = 0; i < N; i++) {
          malha.rotation.y = giro + (i / N) * 2 * Math.PI; renderer.render(cena, camera);
          x.fillStyle = '#f4f2ee'; x.fillRect(0, 0, L, A); x.drawImage(renderer.domElement, 0, 0);
          quadros.push(x.getImageData(0, 0, L, A).data);
          enviarGif.textContent = `Gerando… ${Math.round(((i + 1) / N) * 100)}%`;
          await new Promise((ok) => setTimeout(ok));
        }
        enviarGif.textContent = 'Montando…'; await new Promise((ok) => setTimeout(ok));
        await compartilhar(gif(quadros, L, A, 6), 'gif');
      } finally {
        malha.rotation.y = giro; renderer.setPixelRatio(pr); renderer.setSize(w / pr, h / pr, false); camera.aspect = w / h; camera.updateProjectionMatrix();
        enviarGif.textContent = texto; acoes.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      }
    });

    let vivo = true;
    const desenhar = () => { if (!vivo) return; ctrl.update(); renderer.render(cena, camera); requestAnimationFrame(desenhar); };
    desenhar();
    const ajuste = new ResizeObserver(() => { const w = caixa.clientWidth, h = caixa.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); });
    ajuste.observe(caixa);

    return {
      cor: (c) => { marcar(c); material.color.set(corDe(c)); },
      fechar: () => { vivo = false; ajuste.disconnect(); ctrl.dispose(); geo.dispose(); material.dispose(); renderer.dispose(); caixa.replaceChildren(); },
    };
  }

  window.InventtaVisualizador = { mostrar, corDe };
})();
