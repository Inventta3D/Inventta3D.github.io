(()=>{
    const $=id=>document.getElementById(id),q=k=>document.querySelector(`[data-recap="${k}"]`);
    if(!q('product'))return;
    function set(k,v){const el=q(k);if(!el)return;el.textContent=v||'—';el.classList.toggle('empty',!v)}
    function sync(){
      const f=id=>$(id)?.value?.trim()||'';
      const type=f('filamentType')==='Outro tipo (especificar)'?(f('customFilament')||'Outro filamento'):f('filamentType');
      const color=f('filamentColor'),qty=f('quantity'),amount=f('amount'),time=f('printHours');
      set('product',f('product'));
      set('quantity',qty?`${qty} ${qty==='1'?'unidade':'unidades'}`:'');
      set('client',f('clientName'));
      set('material',type?(color?`${type} · ${color}`:type):'');
      set('amount',amount?`${amount} g`:'');
      set('time',/^\d{2}:\d{2}$/.test(time)?`${time.slice(0,2)}h${time.slice(3)}min`:'');
    }
    const later=()=>setTimeout(sync,60);
    document.addEventListener('input',sync);document.addEventListener('change',sync);
    document.addEventListener('click',later);window.addEventListener('pageshow',later);
    sync();later();
  })();
