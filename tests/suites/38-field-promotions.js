
(function(){
function setupFight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.intel={history:[],wins:0}; state.stage=stage;
}
function forceWin(){
  const b = state.battle;
  b.enemyUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
  return checkBattleEnd();
}
function forceLose(){
  const b = state.battle;
  b.playerUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
  return checkBattleEnd();
}
const realRandom = Math.random;
function mockSeq(seq){
  let i=0;
  Math.random = () => { const v = seq[Math.min(i, seq.length-1)]; i++; return v; };
}
function sixMonsters(){ return ['emberling','aqualing','terrafang','emberling','aqualing','terrafang'].map(id=>newMonster(id,10)); }
// Deploys the six starters and puts exactly ONE extra monster on the bench,
// so every random call in applyFieldPromotions() during these tests is
// unambiguously about that one monster.
function soloBench(benchMon, stage){
  const mons = sixMonsters();
  state.roster = mons.concat([benchMon]);
  state.formation.front = [mons[0].uid, mons[1].uid, mons[2].uid];
  state.formation.back = [mons[3].uid, mons[4].uid, mons[5].uid];
  state.stage = stage || 4;
  return mons;
}

console.log('\n[230] benchRoster: exactly the roster minus whatever is currently deployed');
startGame();
const mons = sixMonsters();
const b1 = newMonster('emberling', 3);
const b2 = newMonster('aqualing', 5);
state.roster = mons.concat([b1, b2]);
state.formation.front = [mons[0].uid, mons[1].uid, mons[2].uid];
state.formation.back = [mons[3].uid, mons[4].uid, mons[5].uid];
let bench = benchRoster();
ok('the bench is exactly the two undeployed monsters', bench.length===2 && bench.indexOf(b1)>=0 && bench.indexOf(b2)>=0);
ok('none of the six deployed monsters show up on the bench', mons.every(m=>bench.indexOf(m)<0));
state.formation.front = [null,null,null]; state.formation.back = [null,null,null];
bench = benchRoster();
ok('an empty formation puts the entire roster on the bench', bench.length===state.roster.length);

console.log('\n[231] applyFieldPromotions is gated off during duels, raids and Trials — even with a guaranteed roll');
soloBench(newMonster('terrafang', 2));
Math.random = () => 0;   // would otherwise guarantee a promotion
state.duel = { userId:'x', name:'Rival', formation:{units:[]} };
ok('no promotions during a duel', applyFieldPromotions().length===0);
state.duel = null;
state.raidRun = true;
ok('no promotions during a raid run', applyFieldPromotions().length===0);
state.raidRun = false;
state.trial = { stage:1, mods:['glass'], reward:1 };
ok('no promotions during a Trial', applyFieldPromotions().length===0);
state.trial = null;
Math.random = realRandom;

console.log('\n[232] a trigger that misses does nothing at all');
const missMon = newMonster('emberling', 6);
soloBench(missMon);
const beforeSnapshot = JSON.stringify(missMon);
mockSeq([0.99]);   // well above FIELD_PROMO_CHANCE
let notes = applyFieldPromotions();
Math.random = realRandom;
ok('no notes when the roll misses', notes.length===0);
ok('the bench monster is completely untouched', JSON.stringify(missMon)===beforeSnapshot);

console.log('\n[233] a trigger that hits, landing on the trait-reroll branch');
const traitMon = newMonster('aqualing', 6);
soloBench(traitMon);
mockSeq([0.01, 0.1]);   // trigger hits (0.01<0.07), outcome lands under 0.25 -> trait reroll
notes = applyFieldPromotions();
Math.random = realRandom;
ok('exactly one note came back', notes.length===1);
ok('the note explicitly says a trait was picked up', /picked up a new trait/.test(notes[0]));
ok('the monster carries a valid, real trait afterward', TRAIT_IDS.indexOf(traitMon.trait.key)>=0);

console.log('\n[234] the EXP-tick branch');
const expMon = newMonster('terrafang', 4);
soloBench(expMon);
const expBefore = expMon.exp, levelBefore = expMon.level;
mockSeq([0.01, 0.5]);   // trigger hits, outcome lands in the EXP band
notes = applyFieldPromotions();
Math.random = realRandom;
ok('the note says a sliver of EXP, not a trait or a level', notes.length===1 && /sliver of EXP/.test(notes[0]));
const expectedTick = Math.max(1, Math.round(stageExp()*0.25));
ok('the EXP actually landed, matching the documented formula (allowing for a level rollover)',
   expMon.level>levelBefore || expMon.exp===expBefore+expectedTick, {exp:expMon.exp, expBefore, expectedTick});

console.log('\n[235] the level branch — always lands at least one level, regardless of starting EXP');
const lvlMon = newMonster('emberling', 4);
lvlMon.exp = 3;   // level 4 needs 4*10-3 = 37 to cross into level 5
soloBench(lvlMon);
mockSeq([0.01, 0.95]);   // trigger hits, outcome lands in the level band
notes = applyFieldPromotions();
Math.random = realRandom;
ok('a level actually landed', lvlMon.level===5);
ok('the note reports the level-up, not a generic EXP tick', /levelled up just from watching/.test(notes[0]));
ok('the exp overflow was folded through the same rules as any other award (never negative, never left over the threshold)', lvlMon.exp>=0 && lvlMon.exp<lvlMon.level*10);

console.log('\n[236] deployed monsters are never touched, no matter how the dice land');
const deployed = soloBench(newMonster('aqualing', 2));
const deployedSnapshot = deployed.map(m=>JSON.stringify(m));
Math.random = () => 0;   // guarantees a hit AND a trait reroll for the one eligible bench monster
applyFieldPromotions();
Math.random = realRandom;
ok('every deployed monster is byte-identical to before the call', deployed.every((m,i)=>JSON.stringify(m)===deployedSnapshot[i]));

console.log('\n[237] each bench monster rolls independently');
startGame();
const twoMons = sixMonsters();
const benchA = newMonster('terrafang', 2), benchB = newMonster('emberling', 2);
state.roster = twoMons.concat([benchA, benchB]);
state.formation.front = [twoMons[0].uid, twoMons[1].uid, twoMons[2].uid];
state.formation.back = [twoMons[3].uid, twoMons[4].uid, twoMons[5].uid];
const aBefore = JSON.stringify(benchA), bBefore = JSON.stringify(benchB);
// benchA (rolled first, bench order follows roster order): trigger hits, EXP branch.
// benchB: trigger misses entirely.
mockSeq([0.01, 0.5, 0.99]);
notes = applyFieldPromotions();
Math.random = realRandom;
ok('exactly one promotion happened', notes.length===1);
ok('benchA is the one that changed', JSON.stringify(benchA)!==aBefore);
ok('benchB is untouched', JSON.stringify(benchB)===bBefore);

console.log('\n[238] wired into a real battle: win, loss, and the tutorial\'s total exclusion');
startGame();
soloBench(newMonster('aqualing', 1), 4);
Math.random = () => 0;   // guarantee a promotion for the one bench monster
beginBattle();
forceWin();
Math.random = realRandom;
ok('a real win carries fieldPromotions on the result', state.lastResult.fieldPromotions && state.lastResult.fieldPromotions.length>0);
ok('exactly one promotion — a recruit captured as loot from THIS SAME win must not also be swept up, even though it lands on the bench before applyFieldPromotions runs (it never sat out a fight it didn\'t exist for)',
   state.lastResult.fieldPromotions.length===1, {captured: state.lastResult.captured, notes: state.lastResult.fieldPromotions});

startGame();
soloBench(newMonster('terrafang', 1), 4);
Math.random = () => 0;
beginBattle();
forceLose();
Math.random = realRandom;
ok('a real loss can carry fieldPromotions too — the bench doesn\'t care who won', state.lastResult.fieldPromotions && state.lastResult.fieldPromotions.length>0);

startGame();
state.tutorial = { step:0, done:false, seen:[] };
soloBench(newMonster('emberling', 1), 1);
Math.random = () => 0;
beginBattle();
forceWin();
Math.random = realRandom;
ok('the tutorial result never even carries a fieldPromotions field — endBattle returns before that code runs', state.lastResult.fieldPromotions===undefined && state.lastResult.tutorial===true);
state.tutorial = null;

console.log('\n[239] the result screen shows the note only when there is one to show');
startGame();
soloBench(newMonster('aqualing', 1), 4);
Math.random = () => 0;
beginBattle();
forceWin();
Math.random = realRandom;
let html = renderResult();
ok('the win panel shows the 🎓 line', html.indexOf('🎓')>=0);

startGame();
setupFight(sixMonsters(), 4);   // no bench monster this time
beginBattle();
forceLose();
html = renderResult();
ok('a defeat with nothing to report never shows the 🎓 line', html.indexOf('🎓')<0);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
