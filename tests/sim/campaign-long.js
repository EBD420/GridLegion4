
/* competent auto-player: full campaign run */
const ev={shift:0,glitch:0,defect:0,ambush:0,plating:0,salvage:0,syn:0,win:0,lose:0,rally:0,purge:0,od:0,splice:0,prime:0,ascend:0,champ:0,bless:0,boss:0,battles:0};
const _log=logMsg;
logMsg=function(m){
  if(/RUST GLITCH/.test(m))ev.glitch++; if(/RUST DEFECTION/.test(m))ev.defect++;
  if(/AMBUSH/.test(m))ev.ambush++; if(/counter plating/.test(m))ev.plating++;
  if(/shifts to the/.test(m))ev.shift++; if(/locks in|synergy broken/.test(m))ev.syn++;
  _log(m);
};
startGame();
let guard=0;
function tryFuse(){
  if(state.roster.length<5) return;
  // ascend three matching Primes when possible
  const byPrime={};
  state.roster.filter(m=>m.tier===2&&m.level>=3).forEach(m=>{(byPrime[m.speciesId]=byPrime[m.speciesId]||[]).push(m);});
  for(const k in byPrime){
    if(byPrime[k].length>=3){
      fuseSelection=byPrime[k].slice(0,3).map(m=>m.uid);
      if(fusionPlan()){ ev.ascend++; doFuse(); return; }
    }
  }
  // otherwise evolve a matching pair to Prime
  const byBase={};
  state.roster.filter(m=>m.tier===1&&m.level>=3).forEach(m=>{(byBase[m.speciesId]=byBase[m.speciesId]||[]).push(m);});
  for(const k in byBase){
    if(byBase[k].length>=2 && state.roster.length>=6){
      fuseSelection=byBase[k].slice(0,2).map(m=>m.uid);
      if(fusionPlan()){ ev.prime++; doFuse(); return; }
    }
  }
  for(let i=0;i<state.roster.length;i++){
    for(let j=i+1;j<state.roster.length;j++){
      fuseSelection=[state.roster[i].uid, state.roster[j].uid];
      const pl=fusionPlan();
      if(pl && pl.kind==='hybrid'){ ev.splice++; doFuse(); return; }
    }
  }
  fuseSelection=[];
}
function manage(){
  tryFuse();
  // call any champion on offer, and invoke the best blessing available
  TRIBE_IDS.forEach(e=>{ if(championUnlocked(e) && !state.recruited[e]) { ev.champ++; recruitChampion(e); } });
  const bless=TRIBE_IDS.filter(blessingUnlocked);
  if(bless.length && !activeBlessing()){ ev.bless++; setBlessing(bless[0]); }
  // install parts on the least-rusted monster with room
  while(state.parts.length){
    const cands=state.roster.filter(m=>(m.parts||[]).length<partSlots(m) && monsterCorruption(m)<50)
                            .sort((a,b)=>monsterCorruption(a)-monsterCorruption(b));
    if(!cands.length) break;
    state.selectedPart=state.parts[0].uid;
    installPart(cands[0].uid);
    if(state.selectedPart){state.selectedPart=null;break;}
  }
  // formation: group by element so rows form synergies
  const by={};
  state.roster.forEach(m=>{const e=computeStats(m).element;(by[e]=by[e]||[]).push(m);});
  const groups=Object.values(by).sort((a,b)=>b.length-a.length);
  const flat=[].concat.apply([],groups).slice(0,6);
  state.formation.front=[flat[0],flat[1],flat[2]].map(m=>m?m.uid:null);
  state.formation.back =[flat[3],flat[4],flat[5]].map(m=>m?m.uid:null);
}
function step(){
  if(guard++>4000000){console.log('GUARD',state.stage);process.exit(1);}
  if(state.screen==='hub'){
    manage();
    if(state.stage>parseInt(process.env.MAXSTAGE||'10')){ done('CLEARED'); return; }
    ev.battles++; if(ev.battles>1500){ done('battle cap'); return; }
    beginBattle();
  } else if(state.screen==='result'){
    if(state.lastResult.win){ev.win++; if(state.lastResult.boss) ev.boss++; if(state.lastResult.part)ev.salvage++; advanceStage();}
    else {ev.lose++; retryStage();}
  } else if(state.screen==='battle'){
    const b=state.battle;
    const u=b.qIndex<b.queue.length?b.queue[b.qIndex]:null;
    if(u&&u.side==='player'&&!u.fainted&&b.awaitingInput){
      if(b.pendingAction==='gauge_purge'){
        const t=b.playerUnits.filter(x=>!x.fainted&&(x.status||x.corruption>=25))[0]||b.playerUnits.filter(x=>!x.fainted)[0];
        if(t) playerTarget(t.id); else b.pendingAction=null;
      } else if(b.pendingAction==='shift'){
        const dest=shiftDestination(u);
        const al=b.playerUnits.filter(x=>x.row===dest&&!x.fainted);
        if(al.length) playerTarget(al[0].id); else b.pendingAction=null;
      } else if(b.pendingAction){
        let t;
        if(b.pendingAction==='gauge_alpha') t=b.enemyUnits.filter(x=>!x.fainted).sort((a,c)=>c.hp-a.hp)[0];
        else {
          const av=getValidTargets(u).slice();
          const pylons=av.filter(x=>x.isGenerator);
          t=(pylons.length?pylons:av).sort((a,c)=>a.hp-c.hp)[0];   // burn the shield down first
        }
        if(t) playerTarget(t.id); else b.pendingAction=null;
      } else {
        const hurt=b.playerUnits.filter(x=>!x.fainted&&x.hp/x.maxHp<0.35).length;
        const needPurge=b.playerUnits.filter(x=>!x.fainted&&(x.status||x.corruption>=25))[0];
        if(b.gauge>=100&&hurt<2){ ev.od++; playerChooseAction('gauge_overdrive'); }
        else if(b.gauge>=66&&hurt>=2){ ev.rally++; playerChooseAction('gauge_rally'); }
        else if(b.gauge>=33&&needPurge){ ev.purge++; playerChooseAction('gauge_purge'); }
        else if(u.row==='front'&&u.hp/u.maxHp<0.25&&b.playerUnits.filter(x=>x.row==='back'&&!x.fainted).length<3) playerChooseAction('shift');
        else if(u.skillCd<=0) playerChooseAction('skill');
        else playerChooseAction('attack');
      }
    }
  }
  setImmediate(step);
}
function done(why){
  console.log('===',why,'=== stage',state.stage);
  console.log(ev);
  console.log('intel',state.intel.history,'-> expects',currentAdaptation());
  console.log('favour:', TRIBE_IDS.map(e=>e+':'+favorOf(e)).join(' '), '| blessing:', activeBlessing());
  console.log('traits:', state.roster.map(m=>m.trait?traitName(m.trait):'-').join(', '));
  console.log('hybrids discovered:', Object.keys(state.discovered||{}).length);
  console.log('roster:',state.roster.map(m=>`${m.speciesId}${m.tier>1?'*':''} L${m.level} [${(m.parts||[]).join(',')}] rust=${monsterCorruption(m)}`).join(' | '));
  process.exit(0);
}
step();
