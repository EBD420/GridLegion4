
(function(){
function setupFight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.intel={history:[],wins:0}; state.stage=stage;
  beginBattle(); return state.battle;
}
const realRandom = Math.random;
function sixMonsters(){
  return ['emberling','aqualing','terrafang','emberling','aqualing','terrafang'].map(id=>newMonster(id,10));
}

console.log('\n[187] cascadeTarget: the next living unit in the same row, by array order — never crosses rows, null when none remain');
startGame();
let B = setupFight(sixMonsters(), 3);
let p = B.playerUnits;   // built front-then-back, slot order: p[0..2]=front, p[3..5]=back
ok('sanity: six player units deployed in the expected front/back split', p.length===6 &&
   p.slice(0,3).every(u=>u.row==='front') && p.slice(3,6).every(u=>u.row==='back'), p.map(u=>u.row));
ok('the very next slot in the row is returned', cascadeTarget(p[0])===p[1]);
p[1].fainted = true;
ok('a fainted row-mate is skipped in favour of the next living one', cascadeTarget(p[0])===p[2]);
p[2].fainted = true;
ok('null once no living unit remains later in that row', cascadeTarget(p[0])===null);
ok('the last slot of a row has no "next" at all, even with other rows full of survivors', cascadeTarget(p[2])===null);
ok('the back row has its own independent chain, starting from its own first slot', cascadeTarget(p[3])===p[4]);
p[4].fainted = true;
ok('back-row skip-the-fainted works identically to front', cascadeTarget(p[3])===p[5]);

startGame();
Math.random = () => 0;
B = setupFight([newMonster('emberling',10)], 3);
Math.random = realRandom;
ok('sanity: this wave fielded more than one enemy to chain across', B.enemyUnits.length>1, B.enemyUnits.length);
const e = B.enemyUnits;
ok('sanity: a stage-3 wave fields at least the first three enemies in the front row', e[0].row==='front' && e[1].row==='front', e.map(u=>u.row));
ok('the same next-in-row logic applies to the enemy side', cascadeTarget(e[0])===e[1]);

console.log('\n[188] applyDamage wiring: an overkill splashes the leftover damage onto the row-mate, exactly once, no further chaining');
startGame();
B = setupFight(sixMonsters(), 3);
p = B.playerUnits;
let atk = p[0];
Math.random = () => 0.99;   // no crit, no dodge/miss triggers below (both are gated on nonzero fields anyway)
let targetA = B.enemyUnits[0], targetB = B.enemyUnits[1] || null;
ok('sanity: this wave has at least two enemies in the same row to cascade across', !!targetB && targetA.row===targetB.row, B.enemyUnits.map(u=>[u.name,u.row]));
targetA.dodge=0; targetA.shield=false; targetA.firstHitReduction=false; atk.missChance=0;
targetB.hp = 999999; targetB.maxHp = 999999;   // give the splash room to land without also overkilling it
const probe = computeDamage(atk, targetA, false);
targetA.hp = probe.dmg - 4;   // guarantee an overkill of exactly 4
const beforeB = targetB.hp;
applyDamage(atk, targetA, false);
ok('the overkilled unit still faints normally', targetA.fainted===true);
ok('the row-mate takes exactly the leftover overflow, nothing more and nothing less', targetB.hp===beforeB-4, [beforeB, targetB.hp]);
ok('a distinct cascade line is logged', B.log.some(l=>/cascades/.test(l)), B.log[0]);
Math.random = realRandom;

console.log('\n[189] no cascade at all when there is no overflow, or nothing to catch it');
startGame();
B = setupFight(sixMonsters(), 3);
p = B.playerUnits; atk = p[0];
Math.random = () => 0.99;
targetA = B.enemyUnits[0]; targetB = B.enemyUnits[1];
targetA.dodge=0; targetA.shield=false; targetA.firstHitReduction=false; atk.missChance=0;
let probe2 = computeDamage(atk, targetA, false);
targetA.hp = probe2.dmg;   // an exact kill, zero overflow
const beforeB2 = targetB.hp;
applyDamage(atk, targetA, false);
ok('an exact kill (no overflow) leaves the row-mate completely untouched', targetB.hp===beforeB2);
ok('and logs no cascade line', !B.log.some(l=>/cascades/.test(l)));

startGame();
B = setupFight(sixMonsters(), 3);
p = B.playerUnits; atk = p[0];
Math.random = () => 0.99;
targetA = B.enemyUnits[0];
targetA.dodge=0; targetA.shield=false; targetA.firstHitReduction=false; atk.missChance=0;
targetA.hp = 999999; targetA.maxHp = 999999;   // this hit will not even kill it
applyDamage(atk, targetA, false);
ok('a hit that does not kill never attempts a cascade, regardless of formation', targetA.fainted===false);
Math.random = realRandom;

console.log('\n[190] symmetry: the enemy side can cascade into the player\'s own row too');
startGame();
B = setupFight(sixMonsters(), 3);
p = B.playerUnits;
const enemyAtk = B.enemyUnits[0];
Math.random = () => 0.99;
p[0].dodge=0; p[0].shield=false; p[0].firstHitReduction=false; enemyAtk.missChance=0;
p[1].hp = 999999; p[1].maxHp = 999999;
const probe3 = computeDamage(enemyAtk, p[0], false);
p[0].hp = probe3.dmg - 6;
const beforeP1 = p[1].hp;
applyDamage(enemyAtk, p[0], false);
ok('an enemy overkilling a front-row player unit splashes onto the next player row-mate', p[0].fainted===true && p[1].hp===beforeP1-6, [beforeP1, p[1].hp]);
Math.random = realRandom;

console.log('\n[191] a cascade kill routes through the exact same onEnemyFainted funnel as any other kill');
startGame();
B = setupFight(sixMonsters(), 3);
p = B.playerUnits; atk = p[0];
Math.random = () => 0.99;
targetA = B.enemyUnits[0]; targetB = B.enemyUnits[1];
ok('sanity: same row to cascade across', targetA.row===targetB.row);
targetA.dodge=0; targetA.shield=false; targetA.firstHitReduction=false; atk.missChance=0;
targetB.isAce = true; targetB.speciesKey = targetB.speciesKey || 'scraphound';
targetB.hp = 1; targetB.maxHp = 500;   // small enough that even a modest overflow kills it too
state.parts = [];
const probe4 = computeDamage(atk, targetA, false);
targetA.hp = probe4.dmg - 50;   // a big overkill, enough to also fell the 1-hp Ace next door
applyDamage(atk, targetA, false);
ok('the cascade kill also faints the row-mate when the overflow is enough', targetB.fainted===true, [probe4.dmg, targetB.hp]);
ok('and still grants its Ace drop through the shared onEnemyFainted hook — cause of death does not matter', state.parts.length===1 &&
   state.parts[0].key===targetB.speciesKey+ACE_SUFFIX, state.parts);
ok('kill credit for the cascaded kill also lands on the original attacker\'s species tally', (state.battle.killsBySpecies[atk.speciesId]||0)>=2,
   state.battle.killsBySpecies);
Math.random = realRandom;

console.log('\n[192] cascade overflow damage still feeds the same battle totals a direct hit would');
startGame();
B = setupFight(sixMonsters(), 3);
p = B.playerUnits; atk = p[0];
Math.random = () => 0.99;
targetA = B.enemyUnits[0]; targetB = B.enemyUnits[1];
targetA.dodge=0; targetA.shield=false; targetA.firstHitReduction=false; atk.missChance=0;
targetB.hp = 999999; targetB.maxHp = 999999;
const beforeTotal = B.totalDamage||0, beforeById = B.dmgByUnitId[atk.id]||0;
const probe5 = computeDamage(atk, targetA, false);
targetA.hp = probe5.dmg - 7;
applyDamage(atk, targetA, false);
ok('totalDamage includes the full direct hit AND the cascade overflow on top of it', B.totalDamage===beforeTotal+probe5.dmg+7, [B.totalDamage, beforeTotal, probe5.dmg]);
ok('dmgByUnitId for the attacker grew by that same combined amount', B.dmgByUnitId[atk.id]===beforeById+probe5.dmg+7);
Math.random = realRandom;

console.log('\n[193] cascade damage against a player unit still updates the War Journal\'s closest-call tracking');
startGame();
B = setupFight(sixMonsters(), 3);
p = B.playerUnits;
const enemyAtk2 = B.enemyUnits[0];
Math.random = () => 0.99;
p[0].dodge=0; p[0].shield=false; p[0].firstHitReduction=false; enemyAtk2.missChance=0;
p[1].maxHp = 100; p[1].hp = 100;
const probe6 = computeDamage(enemyAtk2, p[0], false);
p[0].hp = probe6.dmg - 3;
B.lowestSurvivorPct = null; B.lowestSurvivorId = null;
applyDamage(enemyAtk2, p[0], false);
ok('the cascaded survivor\'s HP percentage is recorded as the new closest call', B.lowestSurvivorId===p[1].id && B.lowestSurvivorPct===p[1].hp/p[1].maxHp,
   [B.lowestSurvivorId, p[1].id, B.lowestSurvivorPct]);
Math.random = realRandom;

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
