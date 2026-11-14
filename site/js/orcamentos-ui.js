/* Módulo de orçamentos · ajustes de interface.
   As dicas dos campos aparecem ao focar; quando a etapa ativa muda de altura,
   a área das etapas acompanha para nada ficar cortado. */
(() => {
  const viewport = document.getElementById('viewport');
  const panels = [...document.querySelectorAll('[data-panel]')];
  if (!viewport || !panels.length || !('ResizeObserver' in window)) return;
  const fit = () => {
    const active = panels.find(p => p.getAttribute('aria-hidden') !== 'true');
    if (active) viewport.style.height = active.offsetHeight + 'px';
  };
  const ro = new ResizeObserver(fit);
  panels.forEach(p => ro.observe(p));
})();
