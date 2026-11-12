(() => {
  const E=window.BridgeColor, state={}; E.RANKS.forEach(r=>state[r]='unknown');
  // Exemple initial explicitement décrit dans le brief.
  ['A','10','8','3'].forEach(r=>state[r]='declarer'); ['R','V','7','2'].forEach(r=>state[r]='dummy');
  const grid=document.querySelector('#rank-grid');
  const names={declarer:'Déclarant',dummy:'Mort',unknown:'Adversaires'};
  function cards(owner){return E.RANKS.filter(r=>state[r]===owner)}
  function draw(){
    grid.innerHTML=''; E.RANKS.forEach(r=>{const b=document.createElement('button'); b.className=`rank ${state[r]}`;b.textContent=r;b.setAttribute('aria-label',`${r}, ${names[state[r]]}`);b.title=`${r} : ${names[state[r]]}`;b.onclick=()=>{state[r]=state[r]==='unknown'?'declarer':state[r]==='declarer'?'dummy':'unknown';draw()};grid.appendChild(b)});
    document.querySelector('#declarer-cards').textContent=cards('declarer').join(' ')||'—'; document.querySelector('#dummy-cards').textContent=cards('dummy').join(' ')||'—';document.querySelector('#unknown-cards').textContent=cards('unknown').join(' ')||'—';
  }
  function objective(){return document.querySelector('input[name="goal"]:checked').value}
  function render(){
    const d=cards('declarer'),m=cards('dummy');
    if(!d.length&&!m.length){alert('Attribue au moins une carte au déclarant ou au mort.');return}
    const r=E.analyze({declarer:d,dummy:m,target:+document.querySelector('#target').value,objective:objective()});
    const best=r.best; document.querySelector('#results').classList.remove('hidden');document.querySelector('#best-name').textContent=best.name;document.querySelector('#best-description').textContent=best.description;
    document.querySelector('#metric-label').textContent=objective()==='average'?'Probabilité pour l’objectif choisi':`Probabilité d’au moins ${r.target} levées`;
    document.querySelector('#best-prob').textContent=E.percent(best.reach);document.querySelector('#best-average').textContent=best.average.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
    document.querySelector('#plans').innerHTML=r.results.map((p,i)=>`<article class="plan"><div><h3>${i===0?'★ ':''}${p.name}</h3><p>${p.description}</p></div><div><strong>${E.percent(p.reach)}</strong><p>≥ ${r.target} levées · moy. ${p.average.toFixed(2)}</p></div></article>`).join('');
    const byLength={};r.deals.forEach(x=>{const k=Math.min(x.east.length,x.west.length),key=`${k}–${r.missing.length-k}`;byLength[key]=(byLength[key]||0)+x.weight});
    document.querySelector('#reasoning-content').innerHTML=`<p><strong>Cartes manquantes :</strong> ${r.missing.join(' ')||'aucune'}.</p><p>Le moteur énumère ${r.deals.length} positions précises Est/Ouest compatibles. Leur poids tient compte des 13 cartes de chaque défenseur et des cartes des autres couleurs non précisées.</p><table class="table"><thead><tr><th>Répartition</th><th>Probabilité</th></tr></thead><tbody>${Object.entries(byLength).map(([k,v])=>`<tr><td>${k}</td><td>${E.percent(v)}</td></tr>`).join('')}</tbody></table><p>Dans la ligne recommandée, les positions favorables représentent ${E.percent(best.favorable)} des cas. L’évaluation est volontairement limitée à cette couleur : aucune rentrée extérieure ni information d’enchères n’est supposée.</p><p><em>Note de version 1 :</em> les lignes candidates sont générées à partir des honneurs et longueurs visibles, puis évaluées pour chaque distribution. Les séquences complètes coup par coup seront extensibles dans le moteur sans modifier l’interface.</p>`;
  }
  document.querySelector('#analyze').onclick=render;document.querySelector('#reset').onclick=()=>{E.RANKS.forEach(r=>state[r]='unknown');draw();document.querySelector('#results').classList.add('hidden');document.querySelector('#best-name').textContent='En attente de l’analyse';document.querySelector('#best-description').textContent='Choisis l’objectif, puis analyse la couleur.';document.querySelector('#best-prob').textContent='—';document.querySelector('#best-average').textContent='—'};
  document.querySelectorAll('input[name="goal"]').forEach(x=>x.onchange=()=>document.querySelectorAll('.choice').forEach(l=>l.classList.toggle('active',l.querySelector('input')?.checked)));
  draw();
})();
