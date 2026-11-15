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

  async function mostrar(caixa, tri, { cor = '', nome = 'peça' } = {}) {
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

    let vivo = true;
    const desenhar = () => { if (!vivo) return; ctrl.update(); renderer.render(cena, camera); requestAnimationFrame(desenhar); };
    desenhar();
    const ajuste = new ResizeObserver(() => { const w = caixa.clientWidth, h = caixa.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); });
    ajuste.observe(caixa);

    return {
      cor: (c) => material.color.set(corDe(c)),
      fechar: () => { vivo = false; ajuste.disconnect(); ctrl.dispose(); geo.dispose(); material.dispose(); renderer.dispose(); caixa.replaceChildren(); },
    };
  }

  window.InventtaVisualizador = { mostrar, corDe };
})();
