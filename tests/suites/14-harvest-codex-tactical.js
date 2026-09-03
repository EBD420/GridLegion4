
(function(){
let B; const PIN={key:'hardy'};
function fight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null,mons[1]?mons[1].uid:null,mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null,null,null];
  state.intel={history:[],wins:0}; state.stage=stage;
  state.trial=null; state.duel=null; state.raidRun=false; state.tutorial=null;
  beginBattle(); return state.battle;
}

console.log('\n[59] rust harvesting');
startGame();
const clean=newMonster('emberling',6,1,PIN);
const rusty=newMonster('terrafang',6,1,{key:'keen'}); rusty.parts=['cinderjaw','sparkdrone'];
state.roster=[clean,rusty];
ok('a clean beast cannot be harvested', !canHarvest(clean), monsterCorruption(clean));
ok('a volatile beast can', canHarvest(rusty), monsterCorruption(rusty));
ok('threshold is the VOLATILE tier', corrTier(HARVEST_RUST).name==='VOLATILE');
const atkBefore=computeStats(clean).atk;
beginHarvest(rusty.uid); pickGraft('atk'); doHarvest(clean.uid);
ok('donor is consumed', state.roster.length===1 && state.roster[0].uid===clean.uid);
ok('graft raises the stat permanently', computeStats(clean).atk>atkBefore, atkBefore+' -> '+computeStats(clean).atk);
ok('graft is recorded', graftCount(clean,'atk')===1);
/* slot graft, and its one-per-beast cap */
const slotsBefore=partSlots(clean);
const r2=newMonster('terrafang',6,1,PIN); r2.parts=['cinderjaw','sparkdrone'];
const r3=newMonster('terrafang',6,1,PIN); r3.parts=['cinderjaw','sparkdrone'];
state.roster=[clean,r2,r3];
beginHarvest(r2.uid); pickGraft('slot'); doHarvest(clean.uid);
ok('slot graft adds a part slot', partSlots(clean)===slotsBefore+1, slotsBefore+' -> '+partSlots(clean));
beginHarvest(r3.uid); pickGraft('slot'); doHarvest(clean.uid);
ok('a second frame is refused', partSlots(clean)===slotsBefore+1, partSlots(clean));
ok('and the donor survives a refused harvest', state.roster.some(m=>m.uid===r3.uid));
ok('the refusal is explained', /already carries/i.test(state.bayMsg), state.bayMsg);
cancelBayAction();
ok('cancel clears the operation', state.harvest===null && state.bayMsg==='');
/* grafts stack and survive a save */
state.slot=0; autosave(); startGame(); continueSlot(0);
const reloaded=state.roster.find(m=>graftCount(m,'atk')>0);
ok('grafts persist through a save', !!reloaded && graftCount(reloaded,'atk')===1);
ok('and the extra slot persists', graftCount(reloaded,'slot')===1, graftCount(reloaded,'slot'));
ok('junk grafts are dropped on load', (function(){
  applySave({v:1,name:'x',stage:1,formation:{front:[null,null,null],back:[null,null,null]},
    roster:[{speciesId:'emberling',level:3,grafts:{atk:'lots',slot:99,bogus:4,def:2}}]},0);
  const m=state.roster[0];
  return graftCount(m,'atk')===0 && graftCount(m,'slot')===1 && graftCount(m,'def')===2 && !graftsOf(m).bogus;
})(), JSON.stringify(graftsOf(state.roster[0])));

console.log('\n[60] trait transfer');
startGame();
const donor=newMonster('voltcub',5,1,{key:'keen'});
const recip=newMonster('mossling',5,1,{key:'swift'});
const weak=newMonster('mossling',1,1,{key:'savage'});
state.roster=[donor,recip,weak];
beginTransfer(weak.uid);
ok('an under-levelled donor is refused', state.transfer===null);
beginTransfer(donor.uid);
ok('a Lv.3+ donor is accepted', !!state.transfer);
doTransfer(recip.uid);
ok('the trait moved', recip.trait.key==='keen', recip.trait);
ok('the donor is consumed', !state.roster.some(m=>m.uid===donor.uid));
ok('the recipient survives', state.roster.some(m=>m.uid===recip.uid));
ok('it is reported', /carried over/i.test(state.bayMsg), state.bayMsg);
ok('the transferred trait actually works in battle', (function(){
  B=fight([recip],3);
  return B.playerUnits[0].critBonus===0.08;
})(), 'critBonus');

console.log('\n[61] reactive terrain');
startGame();
ok('every element can claim the field', Object.keys(ELEM_TERRAIN).every(e=>!!TERRAINS[ELEM_TERRAIN[e]]));
ok('two new battlefields exist', !!TERRAINS.stormfront && !!TERRAINS.overgrowth);
B=fight([newMonster('emberling',14,1,PIN)],1);
const startTerrain=B.terrain;
ok('starts on the stage terrain', !!startTerrain);
B.elemDamage={fire:TERRAIN_SHIFT_AT+10};
checkTerrainShift();
ok('sustained fire turns the field to Ashen', B.terrain===TERRAINS.ashen, B.terrain.name);
ok('the shift is announced', B.log.some(l=>/The field turns/.test(l)));
ok('shift counter increments', B.terrainShifts===1);
/* the new terrain actually re-applies to units */
B=fight([newMonster('galekit',14,1,PIN)],1);
const windUnit=B.playerUnits[0];
const spdBefore=windUnit.bSpd;
B.elemDamage={volt:TERRAIN_SHIFT_AT+10};
checkTerrainShift();
ok('field became Stormfront', B.terrain===TERRAINS.stormfront, B.terrain.name);
ok('wind is grounded by the storm', windUnit.bSpd<spdBefore, spdBefore+' -> '+windUnit.bSpd);
/* and reverts cleanly rather than compounding */
B.elemDamage={nature:TERRAIN_SHIFT_AT*2+10};
checkTerrainShift();
ok('a second shift is allowed', B.terrain===TERRAINS.overgrowth, B.terrain.name);
ok('the old terrain penalty is lifted, not stacked', windUnit.bSpd===spdBefore, spdBefore+' vs '+windUnit.bSpd);
B.elemDamage={fire:TERRAIN_SHIFT_AT*9};
checkTerrainShift();
ok('shifts are capped per battle', B.terrainShifts===MAX_TERRAIN_SHIFTS, B.terrainShifts);
ok('hp never exceeds a shrunken max', B.playerUnits.every(u=>u.hp<=u.maxHp));

console.log('\n[62] bestiary');
startGame();
const p0=codexProgress();
ok('starts mostly empty', p0.seen < p0.total*0.3, p0.seen+'/'+p0.total);
ok('totals cover every category', (function(){ const t=codexTotals();
  return t.species===Object.keys(SPECIES).length && t.hybrids===15 && t.terrains===Object.keys(TERRAINS).length; })());
B=fight([newMonster('emberling',6,1,PIN)],1);
ok('fielding a beast records its species', codex().species.emberling===true);
ok('fighting records the enemy chassis', Object.keys(codex().enemies).length>0, Object.keys(codex().enemies));
ok('the battlefield is recorded', Object.keys(codex().terrains).length>0);
ok('its trait is recorded', codex().traits.hardy===true);
const hyb=newMonster(hybridIdFor('fire','water'),5,1,PIN);
codexRecordMonster(hyb);
ok('hybrids record separately', codex().hybrids[hybridIdFor('fire','water')]===true && !codex().species[hybridIdFor('fire','water')]);
B=fight([newMonster('emberling',18,1,PIN)],10);
ok('commanders are recorded', Object.keys(codex().bosses).length>0, Object.keys(codex().bosses));
ok('progress rises as things are met', codexProgress().seen>p0.seen);
ok('unseen entries render as unknown', /\?\?\?/.test(renderCodex()));
ok('seen entries render their name', /Emberling/.test(renderCodex()));
ok('the screen reports progress', /BESTIARY/.test(renderCodex()));
/* persistence + junk rejection */
state.slot=0; autosave(); const seenBefore=codexProgress().seen;
startGame(); continueSlot(0);
ok('the bestiary persists', codexProgress().seen===seenBefore, codexProgress().seen+' vs '+seenBefore);
applySave({v:1,name:'x',stage:1,roster:[],formation:{front:[null,null,null],back:[null,null,null]},
  codex:{species:{emberling:true, notreal:true}, bogus:{x:true}}},0);
ok('unknown codex keys are ignored', codex().species.emberling===true);
ok('and junk categories dropped', !codex().bogus);

console.log('\n[63] tactical mode');
startGame();
ok('live turns are the default', state.tactical!==true);
toggleTactical();
ok('tactical can be switched on', tacticalOn()===true);
const m1=newMonster('emberling',10,1,PIN), m2=newMonster('aqualing',10,1,PIN);
B=fight([m1,m2],3);
ok('the round opens in planning', planningOpen()===true);
ok('nothing is awaiting a live action', B.awaitingInput===false);
ok('no orders yet', !planReady());
const u1=B.playerUnits[0], u2=B.playerUnits[1];
planSelectUnit(u1.id); planChooseAction('attack');
planChooseTarget(B.enemyUnits[0].id);
ok('an order is recorded', !!B.orders[u1.id] && B.orders[u1.id].kind==='attack');
ok('still not ready with one unit unordered', !planReady());
planSelectUnit(u2.id); planChooseAction('shift');
ok('shift needs no target', !!B.orders[u2.id] && B.orders[u2.id].kind==='shift');
ok('now ready', planReady()===true);
planClear(u2.id);
ok('an order can be cleared', !B.orders[u2.id] && !planReady());
planSelectUnit(u2.id); planChooseAction('attack'); planChooseTarget(B.enemyUnits[0].id);
const enemyHpBefore=B.enemyUnits[0].hp;
executePlan();
ok('executing leaves planning', B.planning===false);
/* run the queued orders through */
for(let i=0;i<12 && B.orders && Object.keys(B.orders).length;i++){
  const u=B.queue[B.qIndex];
  if(!u){ break; }
  if(u.side==='player' && B.orders[u.id]) runOrder(u);
  B.qIndex++;
}
ok('the standing order actually landed', B.enemyUnits[0].hp<enemyHpBefore || B.enemyUnits[0].fainted,
   enemyHpBefore+' -> '+B.enemyUnits[0].hp);
/* retargeting when the mark dies first */
B=fight([m1,m2],3);
beginPlanning();
const dead=B.enemyUnits[0];
B.orders[B.playerUnits[0].id]={kind:'attack', targetId:dead.id};
dead.hp=0; dead.fainted=true;
/* the fallback picks the weakest living enemy, not a fixed index — measure the side */
const sumLiving = ()=>B.enemyUnits.filter(u=>!u.fainted).reduce((a,u)=>a+u.hp,0);
const livingBefore=sumLiving(), countBefore=B.enemyUnits.filter(u=>!u.fainted).length;
/* stage 3 is Sandstorm: fire units have a 15% miss chance. Pin the rolls so this
   tests retargeting rather than the weather. */
const _r=Math.random; Math.random=()=>0.5;
runOrder(B.playerUnits[0]);
Math.random=_r;
ok('a unit whose mark died retargets instead of wasting the turn',
   sumLiving()<livingBefore || B.enemyUnits.filter(u=>!u.fainted).length<countBefore,
   livingBefore+' -> '+sumLiving());
ok('the switch is logged', B.log.some(l=>/mark is gone/.test(l)));
/* tactical never applies during training */
state.tutorial={step:0,done:false,seen:[]};
ok('training always uses live turns', tacticalOn()===false);
state.tutorial=null;
toggleTactical();
ok('it can be switched back off', tacticalOn()===false);
ok('the preference persists', (function(){
  state.tactical=true; state.slot=0; autosave();
  startGame(); continueSlot(0);
  return state.tactical===true;
})());

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
