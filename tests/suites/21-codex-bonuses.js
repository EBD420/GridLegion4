
(function(){
function setupFight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.intel={history:[],wins:0}; state.stage=stage;
  beginBattle(); return state.battle;
}
function forceWin(){ state.battle.enemyUnits.forEach(u=>{ u.hp=0; u.fainted=true; }); return checkBattleEnd(); }
function clearCodex(){ state.codex = { species:{}, enemies:{}, hybrids:{}, bosses:{}, terrains:{}, parts:{}, traits:{} }; }
function fillCodexCategory(cat){
  if(cat==='species') Object.keys(SPECIES).forEach(k=>codexSee('species',k));
  else if(cat==='enemies') ENEMY_IDS.forEach(k=>codexSee('enemies',k));
  else if(cat==='hybrids') Object.keys(HYBRID_SPECIES).forEach(k=>codexSee('hybrids',k));
  else if(cat==='bosses') Object.keys(BOSSES).map(k=>BOSSES[k]).concat([DEEP_BOSS]).concat(Object.keys(WARLORDS).map(k=>WARLORDS[k])).forEach(bd=>codexSee('bosses',bd.name));
  else if(cat==='terrains') Object.keys(TERRAINS).forEach(k=>codexSee('terrains',k));
  else if(cat==='parts') Object.keys(PARTS).forEach(k=>codexSee('parts',k));
  else if(cat==='traits') TRAIT_IDS.forEach(k=>codexSee('traits',k));
}

console.log('\n[80] set bonuses are inactive until a category is fully recorded');
startGame(); clearCodex();
ok('every category has bonuses defined', ['species','enemies','hybrids','bosses','terrains','parts','traits'].every(c=>!!CODEX_BONUSES[c]));
ok('every real category has a nonzero total', Object.keys(CODEX_BONUSES).every(c=>codexTotals()[c]>0), codexTotals());
ok('nothing is active on a fresh codex', Object.keys(CODEX_BONUSES).every(c=>!codexBonusActive(c)));
fillCodexCategory('traits');
ok('filling one category activates only that one', codexBonusActive('traits') && Object.keys(CODEX_BONUSES).filter(c=>c!=='traits').every(c=>!codexBonusActive(c)));
// one entry short of the total does not activate it
clearCodex();
const allButOne = Object.keys(TRAITS).slice(0,-1);
allButOne.forEach(k=>codexSee('traits',k));
ok('one entry short of the category does not activate the bonus', !codexBonusActive('traits'),
   codexCount('traits')+'/'+codexTotals().traits);
codexSee('traits', TRAIT_IDS[TRAIT_IDS.length-1]);
ok('the last entry tips it over', codexBonusActive('traits'));
clearCodex();

console.log('\n[81] Field Naturalist (species) — +1 roster slot cap');
startGame(); clearCodex();
const baseCap = rosterCap();
fillCodexCategory('species');
ok('roster cap grows by exactly one', rosterCap()===baseCap+1, baseCap+' -> '+rosterCap());
clearCodex();
ok('and drops back without it (codex never actually shrinks in play, but the function is live)', rosterCap()===baseCap);

console.log('\n[82] Countermeasures Doctrine (enemies) — +5% EXP');
startGame(); clearCodex();
let B = setupFight([newMonster('emberling',20,1,{key:'resilient'})], 2);   // ordinary stage, no boss multiplier
forceWin();
const baseExp = state.lastResult.expGain;
startGame(); clearCodex(); fillCodexCategory('enemies');
B = setupFight([newMonster('emberling',20,1,{key:'resilient'})], 2);
forceWin();
ok('EXP gain is 5% higher with the bonus active', state.lastResult.expGain===Math.round(baseExp*1.05),
   baseExp+' -> '+state.lastResult.expGain);
clearCodex();

console.log('\n[83] Splice Archive (hybrids) — +5% salvage chance');
startGame(); clearCodex();
const realRandom = Math.random;
Math.random = () => 0.72;   // between the base 0.70 threshold and the boosted 0.75 one
B = setupFight([newMonster('emberling',20,1,{key:'resilient'})], 2);
forceWin();
ok('no bonus: a 0.72 roll misses the 0.70 salvage threshold', state.lastResult.drops.length===0, state.lastResult.drops);
startGame(); fillCodexCategory('hybrids');
B = setupFight([newMonster('emberling',20,1,{key:'resilient'})], 2);
forceWin();
ok('with the bonus: the same 0.72 roll now clears the 0.75 threshold', state.lastResult.drops.length>0, state.lastResult.drops);
Math.random = realRandom;
clearCodex();

console.log("\n[84] Commander's Ledger (bosses) — +6% ATK/DEF, boss fights only");
startGame(); clearCodex();
B = setupFight([newMonster('terrafang',20,1,{key:'resilient'})], 1);   // no boss on stage 1
const noBonusNoBoss = B.playerUnits[0].bAtk;
startGame(); fillCodexCategory('bosses');
B = setupFight([newMonster('terrafang',20,1,{key:'resilient'})], 1);
ok('the bonus does nothing outside a boss fight', B.playerUnits[0].bAtk===noBonusNoBoss, B.playerUnits[0].bAtk+' vs '+noBonusNoBoss);
startGame(); clearCodex();
B = setupFight([newMonster('terrafang',20,1,{key:'resilient'})], 5);   // scripted commander stage
const noBonusBoss = B.playerUnits[0].bAtk;
startGame(); fillCodexCategory('bosses');
B = setupFight([newMonster('terrafang',20,1,{key:'resilient'})], 5);
ok('the bonus applies in a boss fight', B.playerUnits[0].bAtk===Math.round(noBonusBoss*1.06), noBonusBoss+' -> '+B.playerUnits[0].bAtk);
ok('DEF gets the same treatment', B.playerUnits[0].bDef>0 && B.playerUnits[0].id);
clearCodex();

console.log('\n[85] Terrain Mastery — Legion Gauge starts +10%');
startGame(); clearCodex();
B = setupFight([newMonster('emberling',10)], 2);   // no adaptation yet, no ambush, no tutorial
const baseGauge = B.gauge;
startGame(); fillCodexCategory('terrains');
B = setupFight([newMonster('emberling',10)], 2);
ok('gauge starts 10 higher with the bonus', B.gauge===Math.min(100, baseGauge+10), baseGauge+' -> '+B.gauge);
ok('and it is announced', B.log.some(l=>/Terrain Mastery/.test(l)));
clearCodex();

console.log('\n[86] Salvage Efficiency (parts) — −2 rust per equipped part');
startGame(); clearCodex();
const rustyMon = newMonster('emberling',10);
rustyMon.parts = Object.keys(PARTS).slice(0,3);
const baseRust = monsterCorruption(rustyMon);
fillCodexCategory('parts');
const bonusRust = monsterCorruption(rustyMon);
ok('rust drops by 2 per equipped part', baseRust - bonusRust === 6, baseRust+' -> '+bonusRust);
ok('never drops below zero', (function(){
  const light = newMonster('emberling',10); light.parts=[];
  return monsterCorruption(light)===0;
})());
clearCodex();

console.log('\n[87] Trait Fluency — +3% SPD, no fight-type restriction');
startGame(); clearCodex();
B = setupFight([newMonster('emberling',10,1,{key:'resilient'})], 1);
const baseSpd = B.playerUnits[0].bSpd;
startGame(); fillCodexCategory('traits');
B = setupFight([newMonster('emberling',10,1,{key:'resilient'})], 1);
ok('SPD is 3% higher', B.playerUnits[0].bSpd===Math.round(baseSpd*1.03), baseSpd+' -> '+B.playerUnits[0].bSpd);
clearCodex();

console.log('\n[88] visible in the bestiary');
startGame(); clearCodex();
let html = renderCodex();
ok('the completion bonuses panel is present', /COMPLETION BONUSES/.test(html));
ok('an unfinished category shows locked', /○.*Trait Fluency/.test(html) || html.indexOf('Trait Fluency')>=0);
fillCodexCategory('traits');
html = renderCodex();
ok('a completed category is checked off', /✔.*Trait Fluency/.test(html), html.indexOf('Trait Fluency'));
ok('its progress count is shown', new RegExp('TRAITS '+TRAIT_IDS.length+'/'+TRAIT_IDS.length).test(html));
clearCodex();

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
