
/* ================= FEATURE TESTS ================= */
let pass=0, fail=0;
function ok(name, cond, extra){ if(cond){pass++; console.log('  PASS',name);} else {fail++; console.log('  FAIL',name, extra===undefined?'':extra);} }

startGame();

/* --- 1. dual-element from parts + synergy math --- */
console.log('\n[1] parts, dual elements, synergy');
const m1 = state.roster[0]; // emberling (fire)
m1.trait = {key:'keen'};    // pin it: a rolled Scavenger would absorb rust and skew these
const before = computeStats(m1);
m1.parts = ['sparkdrone']; // +volt, +28% spd
const after = computeStats(m1);
ok('part adds second element', after.elements.join(',')==='fire,volt', after.elements);
ok('part boosts stat', after.spd > before.spd, before.spd+'->'+after.spd);
ok('corruption tracked', after.corruption===24, after.corruption);
m1.parts = ['sparkdrone','cinderjaw','thornbot'];
ok('3 parts -> compounding rust', monsterCorruption(m1)===24+28+18+16, monsterCorruption(m1));
ok('critical tier', corrTier(monsterCorruption(m1)).name==='CRITICAL', corrTier(monsterCorruption(m1)).name);
ok('slots: base 2, prime 3', partSlots({tier:1})===2 && partSlots({tier:2})===3);
m1.parts = [];

/* --- 2. row synergy counts dual elements --- */
console.log('\n[2] dual-element row synergy');
const a=newMonster('emberling'), b2=newMonster('aqualing'), c=newMonster('terrafang');
b2.parts=['cinderjaw']; c.parts=['cinderjaw'];  // both gain fire
state.roster=[a,b2,c];
state.formation.front=[a.uid,b2.uid,c.uid]; state.formation.back=[null,null,null];
const lbl = formationRowSynergyLabel('front');
ok('three fire sources -> TRIO', /FIRE TRIO/.test(lbl||''), lbl);
c.parts=[];
ok('two fire sources -> DUO', /FIRE DUO/.test(formationRowSynergyLabel('front')||''), formationRowSynergyLabel('front'));

/* --- 3. live shifting recomputes synergy --- */
console.log('\n[3] live formation shifting');
const f1=newMonster('emberling',10), f2=newMonster('emberling',10), w1=newMonster('aqualing',10), f3=newMonster('emberling',10);
state.roster=[f1,f2,w1,f3];
state.formation.front=[f1.uid,f2.uid,w1.uid];
state.formation.back=[f3.uid,null,null];
state.intel={history:[],wins:0}; state.stage=1;
beginBattle();
let B=state.battle;
ok('front starts as FIRE DUO', /FIRE DUO/.test(B.synLabels.front||''), B.synLabels.front);
const water = B.playerUnits.find(u=>u.name==='Aqualing');
const fireBack = B.playerUnits.find(u=>u.row==='back');
const atkBefore = B.playerUnits.find(u=>u.id!==water.id && u.row==='front').atk;
// swap the water unit out of the front for the back-row fire unit
doShift(water, fireBack);
ok('shift moved units', water.row==='back' && fireBack.row==='front', water.row+'/'+fireBack.row);
ok('front upgraded to FIRE TRIO', /FIRE TRIO/.test(B.synLabels.front||''), B.synLabels.front);
const atkAfter = B.playerUnits.find(u=>u.row==='front' && u.element==='fire').atk;
ok('trio raises ATK above duo', atkAfter > atkBefore, atkBefore+'->'+atkAfter);
ok('trio grants flavour (burnOnHit)', B.playerUnits.filter(u=>u.row==='front').every(u=>u.burnOnHit>0));
// shift back down again
doShift(fireBack, water);
ok('synergy downgrades on reverse shift', /FIRE DUO/.test(B.synLabels.front||''), B.synLabels.front);
ok('flavour removed with the trio', B.playerUnits.filter(u=>u.row==='front').every(u=>u.burnOnHit===0));

/* --- 4. synergy breaks when a unit faints --- */
console.log('\n[4] synergy responds to casualties');
state.formation.front=[f1.uid,f2.uid,f3.uid]; state.formation.back=[w1.uid,null,null];
beginBattle(); B=state.battle;
ok('trio up front', /FIRE TRIO/.test(B.synLabels.front||''), B.synLabels.front);
const victim=B.playerUnits.find(u=>u.row==='front');
victim.fainted=true; victim.hp=0;
applySynergyRefresh();
ok('trio drops to duo after a death', /FIRE DUO/.test(B.synLabels.front||''), B.synLabels.front);
ok('log records the change', B.log.some(l=>/FRONT line/.test(l)));

/* --- 5. corruption glitch + defection --- */
console.log('\n[5] rust glitch / defection');
const r1=newMonster('terrafang'), r2=newMonster('terrafang');
r1.parts=['cinderjaw','sparkdrone','thornbot']; // heavy rust
state.roster=[r1,r2];
state.formation.front=[r1.uid,r2.uid,null]; state.formation.back=[null,null,null];
beginBattle(); B=state.battle;
const rusty=B.playerUnits[0];
ok('rusty unit carries glitch chance', rusty.glitchChance>0.2, rusty.glitchChance);
ok('rusty unit can defect', rusty.defectChance>0, rusty.defectChance);
ok('clean unit is stable', B.playerUnits[1].glitchChance===0);
let glitches=0, defects=0;
const realRandom=Math.random;
Math.random=()=>0.01; // force every roll
for(let i=0;i<12;i++){
  const n=B.log.length;
  tickStatusStart(rusty);
  const fresh=B.log.slice(0, B.log.length-n).join(' ');
  if(/RUST DEFECTION/.test(fresh)) defects++;
  else if(/RUST GLITCH/.test(fresh)) glitches++;
}
Math.random=realRandom;
ok('glitch/defect fires under forced rolls', glitches+defects===12, glitches+'/'+defects);
ok('defection is what happens at critical rust', defects>0, defects);
ok('glitch skips the turn', tickStatusStartSkips(rusty));
function tickStatusStartSkips(u){ const rr=Math.random; Math.random=()=>0.01; const s=tickStatusStart(u); Math.random=rr; return s===true; }

/* --- 6. adaptive Rustbound --- */
console.log('\n[6] adaptive Rustbound');
state.intel={history:['fire','fire','fire'],wins:6}; state.stage=5;
ok('adaptation reads the history', currentAdaptation()==='fire');
ok('plating active from stage 3', platingActive()===true);
const counts={};
for(let i=0;i<3000;i++){ const id=pickEnemySpecies('fire'); counts[ENEMY_SPECIES[id].element]=(counts[ENEMY_SPECIES[id].element]||0)+1; }
ok('spawns skew to water (beats fire)', counts.water>counts.nature*5, JSON.stringify(counts));
ok('fire-food (nature) is rare', counts.nature < counts.water/5, JSON.stringify(counts));
state.roster=[f1,f2,f3]; state.formation.front=[f1.uid,f2.uid,f3.uid]; state.formation.back=[null,null,null];
beginBattle(); B=state.battle;
ok('enemies wear counter-plating', B.enemyUnits.every(u=>u.plating==='fire'));
ok('no ambush when playing into the read', B.gauge===0, B.gauge);
const plated=B.enemyUnits[0];
const fireAtk={element:'fire', elements:['fire'], atk:100, side:'player'};
const noPlate=Object.assign({},plated,{plating:null,platingPct:0});
Math.random=()=>0.5; // no crit
const dPlated=computeDamage(fireAtk, plated, false).dmg;
const dBare=computeDamage(fireAtk, noPlate, false).dmg;
Math.random=realRandom;
ok('plating reduces matching-element damage', dPlated < dBare, dPlated+' vs '+dBare);
// ambush: deploy a different element
const v1=newMonster('voltcub'), v2=newMonster('voltcub');
state.roster=[v1,v2]; state.formation.front=[v1.uid,v2.uid,null]; state.formation.back=[null,null,null];
beginBattle(); B=state.battle;
ok('ambush bonus for switching elements', B.gauge===30, B.gauge);
ok('ambush logged', B.log.some(l=>/AMBUSH/.test(l)));

/* --- 7. dual-element defence --- */
console.log('\n[7] hybrid defence');
const def={element:'nature', elements:['nature','water']};
const atkFire={element:'fire', elements:['fire']};
ok('plating grants the better matchup', multiplierVs(atkFire,def).mult===0.75, multiplierVs(atkFire,def));
ok('pure nature still takes 1.4x', multiplierVs(atkFire,{element:'nature',elements:['nature']}).mult===1.4);

/* --- 8. salvage bay flows --- */
console.log('\n[8] salvage bay');
startGame();
state.parts=[{uid:'px', key:'scraphound'}];
const tgt=state.roster[0];
state.selectedPart='px';
installPart(tgt.uid);
ok('install moves part out of inventory', state.parts.length===0 && tgt.parts.length===1);
ok('selection cleared', state.selectedPart===null);
state.parts=[{uid:'py',key:'galekite'},{uid:'pz',key:'thornbot'}];
state.selectedPart='py'; installPart(tgt.uid);
state.selectedPart='pz'; installPart(tgt.uid);
ok('slot limit respected', tgt.parts.length===2 && state.parts.length===1, tgt.parts.length+'/'+state.parts.length);
purgePart(tgt.uid,0);
ok('purge destroys the part', tgt.parts.length===1 && state.parts.length===1);
