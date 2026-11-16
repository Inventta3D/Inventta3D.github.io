/* Peça de demonstração em 3D (um vaso torcido, como os de "vase mode"), gerada na própria página.
   Usa o three.js que já vem com o aplicativo (/app/vendor/three), baixado só quando alguém vê a peça. */
let tres = null;
const carregar = () => (tres ??= Promise.all([
  import('/app/vendor/three/three.module.min.js'),
  import('/app/vendor/three/OrbitControls.js'),
]));

export const PALETAS = {
  natal: { corpo: '#B91E14', borda: '#FFF8EF', base: '#2F6B3A' },
  oceano: { corpo: '#1F5FD6', borda: '#E9F1FF', base: '#0B2A5B' },
  grafite: { corpo: '#3A3A3A', borda: '#D9D2C3', base: '#CF2F22' },
};

// perfil do vaso: raio em função da altura (0 a 1)
const raio = (t) => 0.3 + 0.2 * Math.sin(Math.PI * (0.15 + 0.85 * t));

function montarGeometria(T) {
  const COLS = 144, ROWS = 120, H = 1;
  // pontos do perfil: [raio, altura, faixa, externo?]  faixa: 0 = corpo, 1 = borda, 2 = base
  const perfil = [];
  for (let i = 0; i <= ROWS; i++) {
    const t = i / ROWS, y = t * H;
    perfil.push([raio(t), y, t < 0.1 ? 2 : t > 0.88 ? 1 : 0, true]);
  }
  perfil.push([raio(1) - 0.032, H, 1, false]); // borda
  for (let i = ROWS; i >= 4; i -= 2) { const t = i / ROWS; perfil.push([raio(t) - 0.032, t * H, 1, false]); } // parede de dentro
  perfil.push([0.0, 0.04, 1, false]); // fundo de dentro

  const pos = [], faixa = [], idx = [];
  const n = perfil.length;
  for (let r = 0; r < n; r++) {
    const [rad, y, f, externo] = perfil[r];
    for (let c = 0; c <= COLS; c++) {
      const th = (c / COLS) * Math.PI * 2;
      // fluting torcido + linhas de camada, só por fora
      const mod = externo ? 1 + 0.075 * Math.cos(7 * th + 2.6 * y * Math.PI) + 0.004 * Math.sin(y * 260) : 1;
      pos.push(Math.cos(th) * rad * mod, y, Math.sin(th) * rad * mod);
      faixa.push(f);
    }
  }
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < COLS; c++) {
    const a = r * (COLS + 1) + c, b = a + 1, d = a + COLS + 1, e = d + 1;
    idx.push(a, d, b, b, d, e);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // costura: a primeira e a última coluna são o mesmo ponto; une as normais para não aparecer linha
  const nm = g.getAttribute('normal');
  for (let r = 0; r < n; r++) {
    const i0 = r * (COLS + 1), i1 = i0 + COLS;
    const x = nm.getX(i0) + nm.getX(i1), y = nm.getY(i0) + nm.getY(i1), z = nm.getZ(i0) + nm.getZ(i1), l = Math.hypot(x, y, z) || 1;
    nm.setXYZ(i0, x / l, y / l, z / l); nm.setXYZ(i1, x / l, y / l, z / l);
  }
  g.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(pos.length), 3));
  g.userData.faixa = faixa;
  return g;
}

/* host: elemento que recebe o canvas. interativo: arrastar gira. Devolve null se o WebGL não estiver disponível. */
export async function criarPeca(host, { interativo = false, paleta = 'natal', velocidade = 2 } = {}) {
  const [T, { OrbitControls }] = await carregar();
  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); } catch { return null; }
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  const canvas = renderer.domElement;
  host.replaceChildren(canvas);

  const cena = new T.Scene();
  const geo = montarGeometria(T);
  const material = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.02 });
  const malha = new T.Mesh(geo, material);
  cena.add(malha);
  // sombra de contato (um disco com gradiente, sem mapa de sombra)
  const c2 = document.createElement('canvas'); c2.width = c2.height = 128;
  const x2 = c2.getContext('2d'), gr = x2.createRadialGradient(64, 64, 6, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,.38)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x2.fillStyle = gr; x2.fillRect(0, 0, 128, 128);
  const sombra = new T.Mesh(new T.PlaneGeometry(1.7, 1.7), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c2), transparent: true, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = -0.002;
  cena.add(sombra);
  cena.add(new T.HemisphereLight(0xffffff, 0x8a7f6a, 1.7));
  const sol = new T.DirectionalLight(0xffffff, 2.1); sol.position.set(2, 3, 2.2); cena.add(sol);

  const camera = new T.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(1.9, 1.35, 2.35);
  const ctrl = new OrbitControls(camera, canvas);
  ctrl.target.set(0, 0.48, 0);
  ctrl.enablePan = false; ctrl.enableZoom = false; ctrl.enableDamping = !reduzir;
  ctrl.minPolarAngle = 0.35; ctrl.maxPolarAngle = 1.45;
  ctrl.autoRotate = !reduzir; ctrl.autoRotateSpeed = velocidade;
  ctrl.enableRotate = interativo;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.touchAction = interativo ? 'pan-y' : 'auto'; // no celular, rolar a página com o dedo sobre a peça continua funcionando
  ctrl.update();

  const cor = new T.Color();
  function aplicarPaleta(nome) {
    const p = PALETAS[nome] || PALETAS.natal, c = [p.corpo, p.borda, p.base].map((h) => new T.Color(h)), at = geo.getAttribute('color'), f = geo.userData.faixa;
    for (let i = 0; i < f.length; i++) { cor.copy(c[f[i]]); at.setXYZ(i, cor.r, cor.g, cor.b); }
    at.needsUpdate = true; pedir();
  }

  let vivo = true, visivel = true, pendente = false;
  function quadro() { pendente = false; if (!vivo || !visivel) return; const mudou = ctrl.update(); renderer.render(cena, camera); if (mudou || ctrl.autoRotate) pedir(); }
  function pedir() { if (pendente || !vivo) return; pendente = true; requestAnimationFrame(quadro); }
  ctrl.addEventListener('change', pedir);
  const medir = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.render(cena, camera); pedir(); }; // redesenha já: redimensionar apaga o canvas, mesmo fora da tela
  const ro = new ResizeObserver(medir); ro.observe(host);
  const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; if (visivel) pedir(); }); io.observe(host);
  if (interativo) { // teclado: as setas giram a peça
    host.tabIndex = 0;
    host.addEventListener('keydown', (e) => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); ctrl.autoRotate = false; malha.rotation.y += (e.key === 'ArrowLeft' ? -1 : 1) * 0.3; pedir(); });
  }
  aplicarPaleta(paleta); medir();

  return {
    paleta: aplicarPaleta,
    fechar() { vivo = false; ro.disconnect(); io.disconnect(); ctrl.dispose(); geo.dispose(); material.dispose(); renderer.dispose(); host.replaceChildren(); },
  };
}
