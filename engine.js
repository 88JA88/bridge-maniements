/* Une couleur : positions D, O, M, E ; les petits indices sont les gros rangs. */
window.BridgeColor = (() => {
  const RANKS=['A','R','D','V','10','9','8','7','6','5','4','3','2'];
  const value=c=>RANKS.indexOf(c);
  const choose=(n,k)=>{if(k<0||k>n)return 0;let x=1;for(let i=1;i<=k;i++)x=x*(n-i+1)/i;return x};
  const percent=n=>`${(100*n).toLocaleString('fr-FR',{maximumFractionDigits:1})} %`;
  function enumerateDeals(missing){
    const deals=[], n=missing.length, total=choose(26,13);
    for(let mask=0;mask<2**n;mask++){
      const east=[],west=[];missing.forEach((c,i)=>(mask&(1<<i)?east:west).push(c));
      const weight=choose(26-n,13-east.length)/total;
      if(weight)deals.push({east,west,weight});
    }return deals;
  }
  function summarizePositions(deals,sought){
    const sum=predicate=>deals.reduce((total,deal)=>total+(predicate(deal)?deal.weight:0),0);
    const cards=sought.map(card=>({card,singleton:sum(d=>(d.east.includes(card)?d.east:d.west).length===1),atMostTwo:sum(d=>(d.east.includes(card)?d.east:d.west).length<=2),atLeastThree:sum(d=>(d.east.includes(card)?d.east:d.west).length>=3)}));
    const together=sought.length>1?sum(d=>sought.every(c=>d.east.includes(c))||sought.every(c=>d.west.includes(c))):null;
    const atLeastOneAtMostTwo=sum(d=>sought.some(c=>(d.east.includes(c)?d.east:d.west).length<=2));
    return {cards,together,atLeastOneAtMostTwo,separated:together===null?null:sum(d=>!sought.every(c=>d.east.includes(c))&&!sought.every(c=>d.west.includes(c)))};
  }
  const sort=h=>h.slice().sort((a,b)=>value(a)-value(b));
  /* La défense fournit la plus petite carte qui gagne si son partenaire ne gagne
     pas déjà, sinon sa plus petite carte. Cette défense est une hypothèse explicite. */
  function defense(hand,plays,seat){
    const h=sort(hand);if(!h.length)return null;
    const best=plays.filter(p=>p.card!==null).sort((a,b)=>value(a.card)-value(b.card))[0];
    if(!best||best.seat%2===seat%2)return h[h.length-1];
    return h.filter(c=>value(c)<value(best.card)).at(-1)||h[h.length-1];
  }
  function choosePartner(hand,plays,mode){
    const h=sort(hand);if(!h.length)return null;
    const best=plays.filter(p=>p.card!==null).sort((a,b)=>value(a.card)-value(b.card))[0];
    if(!best||best.seat%2===0)return h[h.length-1];
    const winners=h.filter(c=>value(c)<value(best.card));
    return mode==='high'?winners[0]||h[h.length-1]:winners.at(-1)||h[h.length-1];
  }
  /* Les deux mains peuvent être rejointes avant chaque attaque, y compris après
     une perte : hypothèse de reprises extérieures illimitées, affichée à l'écran. */
  function simulateDeal(declarer,dummy,deal,line){
    const hands=[sort(declarer),sort(deal.west),sort(dummy),sort(deal.east)];
    const history=[];let tricks=0;
    while(hands[0].length||hands[2].length){
      let leadSeat=line.lead;
      if(!hands[leadSeat].length)leadSeat=2-leadSeat;
      const h=hands[leadSeat];
      const lead=line.mode==='cash'||(line.mode==='high-low'&&history.length!==1)?h[0]:h[h.length-1];
      const plays=[];
      for(let i=0;i<4;i++){
        const seat=(leadSeat+i)%4;let card;
        if(i===0)card=lead;
        else if(seat%2)card=defense(hands[seat],plays,seat);
        else card=choosePartner(hands[seat],plays,line.mode==='cash'?'high':'low');
        if(card!==null)hands[seat].splice(hands[seat].indexOf(card),1);
        plays.push({seat,card});
      }
      const winner=plays.filter(p=>p.card!==null).sort((a,b)=>value(a.card)-value(b.card))[0];
      if(winner.seat%2===0)tricks++;
      history.push({plays,winner:winner.seat});
    }
    return {tricks,history};
  }
  function analyze({declarer,dummy,target,objective}){
    const ours=[...declarer,...dummy],missing=RANKS.filter(c=>!ours.includes(c));
    const deals=enumerateDeals(missing);
    const lines=[];
    for(const lead of [0,2])if((lead===0?declarer:dummy).length){
      const side=lead===0?'déclarant':'mort';
      lines.push({id:`cash-${lead}`,name:`Tirer en partant du ${side}`,description:'Joue la plus grosse carte disponible ; en face, fournis une petite carte si ton camp est déjà maître, sinon prends avec ta plus grosse carte gagnante.',lead,mode:'cash'});
      lines.push({id:`low-${lead}`,name:`Petite carte depuis le ${side}`,description:'Joue une petite carte vers l’autre main ; prends au plus juste si un adversaire est maître.',lead,mode:'low'});
      lines.push({id:`high-low-${lead}`,name:`Grosse carte puis petite depuis le ${side}`,description:'Joue d’abord la plus grosse carte, puis une petite vers l’autre main ; ensuite joue les plus grosses cartes restantes.',lead,mode:'high-low'});
    }
    const results=lines.map(line=>{let average=0,reach=0;for(const deal of deals){const {tricks}=simulateDeal(declarer,dummy,deal,line);average+=tricks*deal.weight;if(tricks>=target)reach+=deal.weight}return {...line,average,reach,favorable:reach}})
      .sort((a,b)=>objective==='average'?b.average-a.average||b.reach-a.reach:b.reach-a.reach||b.average-a.average);
    return {missing,deals,results,best:results[0],target,objective};
  }
  return {RANKS,enumerateDeals,summarizePositions,simulateDeal,analyze,percent};
})();
