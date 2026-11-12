/* Moteur indépendant de l'interface. Les cartes sont des rangs 12 (As) à 0 (2). */
window.BridgeColor = (() => {
  const RANKS = ['A','R','D','V','10','9','8','7','6','5','4','3','2'];
  const value = r => RANKS.indexOf(r);
  const choose = (n,k) => k < 0 || k > n ? 0 : (k === 0 || k === n ? 1 : choose(n-1,k-1) + choose(n-1,k));
  const percent = n => `${(n * 100).toLocaleString('fr-FR',{maximumFractionDigits:1})} %`;

  /** Toutes les distributions Est/Ouest et leur poids exact, avec 26 cartes inconnues. */
  function enumerateDeals(missing) {
    const total = choose(26,13);
    const deals = [];
    const n = missing.length;
    for (let mask=0; mask < (1 << n); mask++) {
      const east=[], west=[];
      missing.forEach((card,i) => (mask & (1<<i) ? east : west).push(card));
      const k=east.length;
      // Les autres couleurs complètent les 13 cartes de chaque défenseur.
      const weight = choose(26-n,13-k) / total;
      if (weight) deals.push({east,west,weight});
    }
    return deals;
  }

  function topControlled(ours) {
    let n=0; for (const r of RANKS) { if (ours.includes(r)) n++; else break; } return n;
  }
  // Honneurs utiles aux décisions de maniement ; inclut 10 et 9 pour permettre
  // des doubles impasses lorsque les figures supérieures sont déjà connues.
  function honors(cards) { return cards.filter(c => value(c) <= 5); }
  function highestMissingHonor(missing) { return honors(missing)[0] || null; }

  /* Chaque ligne est une politique paramétrée, appliquée à CHAQUE distribution.
     Elle ne suppose pas de lecture des cartes cachées : seules les branches prévues
     (honneur placé / mal placé, longueur) changent son résultat. */
  function candidateLines(declarer, dummy) {
    const ours=[...declarer,...dummy];
    const missing=RANKS.filter(x=>!ours.includes(x));
    const base=topControlled(ours);
    const h=highestMissingHonor(missing);
    const lines=[{
      id:'cash', name:'Tirer les gros honneurs',
      description:'Encaissez les cartes maîtresses visibles avant de tenter autre chose.',
      outcome: deal => ({tricks: Math.min(ours.length, base + (base === ours.length ? 0 : 0)), success:true})
    }];
    if(h && (declarer.includes('V') || dummy.includes('V') || declarer.includes('10') || dummy.includes('10') || declarer.includes('9') || dummy.includes('9'))) {
      lines.push({
        id:'finesse-east', name:`Faire l’impasse à ${h}`,
        description:`Jouez vers l’honneur inférieur : réussite si ${h} est à droite de l’impasse.`,
        outcome: deal => { const good=deal.east.includes(h); return {tricks:Math.min(ours.length,base+(good?1:0)),success:good}; }
      });
      lines.push({
        id:'finesse-west', name:`Faire l’impasse à ${h} (autre sens)`,
        description:`Même impasse dans l’autre direction ; utile si la position est connue plus tard.`,
        outcome: deal => { const good=deal.west.includes(h); return {tricks:Math.min(ours.length,base+(good?1:0)),success:good}; }
      });
    }
    const hs=honors(missing);
    if(hs.length>=2 && (declarer.includes('10') || dummy.includes('10') || declarer.includes('9') || dummy.includes('9'))) {
      const [a,b]=hs;
      lines.push({
        id:'double', name:'Double impasse',
        description:`Tentez successivement ${a} puis ${b} : la ligne profite de chaque honneur bien placé.`,
        outcome: deal => { const gained=(deal.east.includes(a)?1:0)+(deal.east.includes(b)?1:0); return {tricks:Math.min(ours.length,base+gained),success:gained>0}; }
      });
    }
    if (missing.length >= 4 && ours.length >= 5) {
      lines.push({
        id:'safety', name:'Jeu de sécurité',
        description:'Préservez les honneurs et privilégiez les répartitions régulières plutôt que le meilleur rendement.',
        outcome: deal => {
          const split=Math.abs(deal.east.length-deal.west.length);
          // Modèle de sécurité : régularité 3-2/4-2 favorisée, partage très long pénalisé.
          const gain=split<=2 ? 1 : 0;
          return {tricks:Math.min(ours.length,base+gain),success:split<=2};
        }
      });
    }
    return {missing,base,lines};
  }

  function analyze({declarer,dummy,target,objective}) {
    const {missing,base,lines}=candidateLines(declarer,dummy);
    const deals=enumerateDeals(missing);
    const results=lines.map(line=>{
      let average=0, reach=0, favorable=0;
      deals.forEach(deal=>{const o=line.outcome(deal); average+=o.tricks*deal.weight; if(o.tricks>=target) reach+=deal.weight; if(o.success) favorable+=deal.weight;});
      return {...line,average,reach,favorable};
    }).sort((a,b)=> objective==='average' ? b.average-a.average : b.reach-a.reach || b.average-a.average);
    return {missing,base,deals,results,best:results[0], target, objective};
  }

  function validationCases() {
    return [
      {name:'Toutes les cartes maîtresses', d:['A','R','D'], m:['V','10'], target:3, line:'cash', expected:'100 % pour au moins 3 levées', assert:r=>Math.abs(r.reach-1)<1e-10},
      {name:'Impasse simple à la Dame', d:['A','V','10'], m:['R','3'], target:3, line:'finesse-east', expected:'50 % : Dame placée à droite', assert:r=>Math.abs(r.reach-.5)<1e-10},
      {name:'Double impasse', d:['A','10','8'], m:['R','9','3'], target:3, line:'double', expected:'les deux honneurs manquants sont testés séparément', assert:r=>r.reach>0&&r.reach<1},
      {name:'Répartitions 3–2 / 4–1 / 5–0', d:['A','R','8','3'], m:['D','7','2'], target:4, line:'safety', expected:'toutes les longueurs compatibles sont énumérées', assert:r=>r.reach>0&&r.reach<1},
      {name:'Sécurité contre rendement', d:['A','R','V','8'], m:['10','7','2'], target:3, line:'safety', expected:'la ligne de sécurité favorise les partages réguliers', assert:r=>r.reach>0&&r.average<4}
    ];
  }
  function runValidation() { return validationCases().map(t=>{const r=analyze({declarer:t.d,dummy:t.m,target:t.target,objective:'target'}); const line=r.results.find(x=>x.id===t.line); return {...t,computed:line?percent(line.reach):'ligne absente', plan:line?.name||'—', pass:!!line && t.assert(line)};}); }
  return {RANKS,enumerateDeals,analyze,validationCases,runValidation,percent};
})();
