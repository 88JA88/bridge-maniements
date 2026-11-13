(() => {
  const E=window.BridgeColor, selected=new Set();
  const count=document.querySelector('#team-count'), grid=document.querySelector('#selected-cards');
  for(let i=0;i<=13;i++){const o=document.createElement('option');o.value=i;o.textContent=`${i} carte${i===1?'':'s'}`;count.appendChild(o)}
  count.value='8';
  const invalidate=()=>document.querySelector('#results').classList.add('hidden');
  function draw(){
    const n=13-Number(count.value);
    document.querySelector('#summary-count').textContent=`${n} carte${n===1?'':'s'} chez les adversaires`;
    grid.replaceChildren();
    E.RANKS.forEach(c=>{const b=document.createElement('button');b.className='rank search-card'+(selected.has(c)?' selected':'');b.textContent=c;b.setAttribute('aria-pressed',String(selected.has(c)));b.setAttribute('aria-label',`Rechercher ${c}`);b.disabled=!selected.has(c)&&selected.size>=n;b.onclick=()=>{selected.has(c)?selected.delete(c):selected.add(c);invalidate();draw()};grid.appendChild(b)});
  }
  const rows=items=>`<table class="table"><tbody>${items.map(([label,p])=>`<tr><td>${label}</td><td><strong>${E.percent(p)}</strong></td></tr>`).join('')}</tbody></table>`;
  function render(){
    const n=13-Number(count.value), sought=E.RANKS.filter(c=>selected.has(c));
    if(!sought.length){alert('Choisis au moins une carte à rechercher.');return}
    const others=Array.from({length:n-sought.length},(_,i)=>`x${i}`), deals=E.enumerateDeals([...sought,...others]);
    const summary=E.summarizePositions(deals,sought);
    document.querySelector('#quick-results').innerHTML=`<div class="quick-card"><h3>${sought.join(' ')}</h3>${rows([['Au moins une de ces cartes sèche ou seconde',summary.atLeastOneAtMostTwo],['Une carte déterminée sèche ou seconde',summary.cards[0].atMostTwo],...(summary.together===null?[]:[['Toutes ensemble dans une main',summary.together],['Réparties entre les deux mains',summary.separated]])])}</div>`;
    const positions=new Map(), lengths=new Map();
    for(const deal of deals){
      const k=Math.min(deal.east.length,deal.west.length), length=`${k}–${n-k}`;lengths.set(length,(lengths.get(length)||0)+deal.weight);
      const first=deal.west.includes(sought[0])?deal.west:deal.east, second=first===deal.west?deal.east:deal.west;
      const display=hand=>[...sought.filter(c=>hand.includes(c)),...Array(hand.filter(c=>c.startsWith('x')).length).fill('x')].join(' ')||'—';
      const key=`${display(first)} / ${display(second)}`;positions.set(key,(positions.get(key)||0)+deal.weight);
    }
    document.querySelector('#position-results').innerHTML=rows([...positions].sort((a,b)=>b[1]-a[1]));
    document.querySelector('#length-results').innerHTML=rows([...lengths].sort((a,b)=>b[1]-a[1]));
    document.querySelector('#reasoning-content').innerHTML=`<p>Ton équipe détient ${13-n} cartes ; il en reste ${n} chez les adversaires, dont ${sought.join(' ')}. Les autres cartes sont représentées par x.</p><p>Le calcul examine ${deals.length} attributions précises des cartes aux deux adversaires. Chaque attribution est pondérée en tenant compte des 13 cartes de chaque défenseur, sans information issue des enchères. Les résultats symétriques sont additionnés.</p>`;
    document.querySelector('#results').classList.remove('hidden');
  }
  count.onchange=()=>{const max=13-Number(count.value);for(const c of [...selected].reverse())if(selected.size>max)selected.delete(c);invalidate();draw()};
  document.querySelector('#analyze').onclick=render;
  document.querySelector('#reset').onclick=()=>{count.value='8';selected.clear();invalidate();draw()};
  document.querySelector('#quit-app').onclick=()=>{
    window.close();
    window.setTimeout(()=>{
      if(document.visibilityState!=='visible')return;
      const help=document.querySelector('#quit-help');
      const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
      help.textContent=ios?'Pour quitter, balaie vers le haut depuis le bas de l’écran, ou appuie sur le bouton principal de ton appareil.':'Pour quitter, ferme cet onglet ou cette fenêtre. Sur Mac, tu peux aussi utiliser ⌘ W.';
      help.hidden=false;
    },300);
  };
  document.querySelector('#refresh-app').onclick=async()=>{try{if('serviceWorker' in navigator)await (await navigator.serviceWorker.getRegistration())?.update()}finally{window.location.reload()}};
  draw();
})();
