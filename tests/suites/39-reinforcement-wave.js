
(function(){
function setupFight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.intel={history:[],wins:0}; state.stage=stage;
}
const realRandom = Math.random;
function mockSeq(seq){
  let i=0;
  Math.random = () => { const v = seq[Math.min(i, seq.length-1)]; i++; return v; };
}
function sixMonsters(){ return ['emberling','aqualing','terrafang','emberling','aqualing','terrafang'].map(id=>newMonster(id,10)); }

console.log('\n[240] the constants and the eligibility gate');
ok('the threshold is a positive round count', REINFORCE_MIN_ROUND>0);
ok('the chance is a real probability', REINFORCE_CHANCE>0 && REINFORCE_CHANCE<1);
ok('the stat multiplier really does make it smaller, not equal or bigger', REINFORCE_STAT_MULT>0 && REINFORCE_STAT_MULT<1);
startGame();
setupFight(sixMonsters(), 4);   // ordinary, non-boss stage
ok('an ordinary wave is eligible', reinforcementsEligible());
setupFight(sixMonsters(), 5);   // a Commander stage
ok('a shielded commander fight is NOT eligible', !reinforcementsEligible());
setupFight(sixMonsters(), 4);
state.duel = { userId:'x', name:'Rival', formation:{units:[]} };
ok('a duel is not eligible', !reinforcementsEligible());
state.duel = null;
state.raidRun = true;
ok('a raid run is not eligible', !reinforcementsEligible());
state.raidRun = false;
state.trial = { stage:4, mods:['glass'], reward:1 };
ok('a Trial is not eligible', !reinforcementsEligible());
state.trial = null;
state.tutorial = { step:0, done:false, seen:[] };
ok('the tutorial is not eligible', !reinforcementsEligible());
state.tutorial = null;
state.redeploy = { stage:4 };
ok('a Redeployment (to a non-boss stage) IS still eligible — it is a real fight in every other sense', reinforcementsEligible());
state.redeploy = null;

console.log('\n[241] never fires before the round threshold, no matter how the dice land');
startGame();
setupFight(sixMonsters(), 4);
beginBattle();
let b = state.battle;
const startCount = b.enemyUnits.length;
b.rounds = REINFORCE_MIN_ROUND - 1;   // one short
Math.random = () => 0;   // would otherwise guarantee it
maybeSpawnReinforcements();
Math.random = realRandom;
ok('nothing spawned one round early', b.enemyUnits.length===startCount);
ok('the flag was never latched', b.reinforced===false);

console.log('\n[242] a deterministic single-unit spawn, and the badge it carries');
b.rounds = REINFORCE_MIN_ROUND;
mockSeq([0.1, 0.5, 0]);   // chance roll hits; count roll stays at 1; species pick lands on index 0
maybeSpawnReinforcements();
Math.random = realRandom;
ok('exactly one unit joined', b.enemyUnits.length===startCount+1);
const newcomer = b.enemyUnits[b.enemyUnits.length-1];
ok('it is flagged as a reinforcement', newcomer.isReinforcement===true);
ok('it entered in the back row', newcomer.row==='back');
ok('it is a real, playable enemy unit — not fainted, not zero HP', !newcomer.fainted && newcomer.hp>0);
ok('the flag latched so it can never fire twice in the same battle', b.reinforced===true);
ok('the log recorded the event by name', b.log.some(l=>l.indexOf('REINFORCEMENTS')>=0 && l.indexOf(newcomer.name)>=0));
let html = renderBattle();
ok('the battle screen shows its badge', html.indexOf('🚨 REINFORCEMENT')>=0);

console.log('\n[243] once latched, it never spawns again this battle — even with a guaranteed roll and rounds still climbing');
const countAfterFirst = b.enemyUnits.length;
b.rounds = REINFORCE_MIN_ROUND + 4;
Math.random = () => 0;
maybeSpawnReinforcements();
Math.random = realRandom;
ok('no second reinforcement ever joins', b.enemyUnits.length===countAfterFirst);

console.log('\n[244] "smaller": a reinforcement is measurably weaker than a same-stage unit built the normal way');
startGame();
setupFight(sixMonsters(), 6);
beginBattle();
b = state.battle;
const ordinaryHp = b.enemyUnits[0].maxHp;
b.rounds = REINFORCE_MIN_ROUND;
mockSeq([0.1, 0.5, 0]);
maybeSpawnReinforcements();
Math.random = realRandom;
const reinforcementHp = b.enemyUnits[b.enemyUnits.length-1].maxHp;
ok('the reinforcement has meaningfully less HP than a unit from the original wave at the same stage', reinforcementHp < ordinaryHp, {ordinaryHp, reinforcementHp});

console.log('\n[245] a possible second unit, and the wiring is via the real startRound() entry point, not just the spawner directly');
startGame();
setupFight(sixMonsters(), 4);
beginBattle();
b = state.battle;
const before2 = b.enemyUnits.length;
b.rounds = REINFORCE_MIN_ROUND - 1;
mockSeq([0.1, 0.2, 0, 0]);   // chance hits, count roll under 0.35 -> two units, two species picks
startRound();
Math.random = realRandom;
ok('rounds actually advanced to the threshold through startRound() itself', b.rounds===REINFORCE_MIN_ROUND);
ok('two reinforcements joined in one event', b.enemyUnits.length===before2+2);
ok('both are flagged', b.enemyUnits.slice(-2).every(u=>u.isReinforcement));

console.log('\n[246] never eligible this battle -> the flag latches immediately and nothing ever spawns, even much later');
startGame();
setupFight(sixMonsters(), 5);   // a Commander stage
beginBattle();
b = state.battle;
const bossEnemyCount = b.enemyUnits.length;
b.rounds = REINFORCE_MIN_ROUND;
Math.random = () => 0;
maybeSpawnReinforcements();
b.rounds = REINFORCE_MIN_ROUND + 10;
maybeSpawnReinforcements();
Math.random = realRandom;
ok('the flag latched on the very first eligible round', b.reinforced===true);
ok('no reinforcement was ever added to a commander fight', b.enemyUnits.length===bossEnemyCount);

console.log('\n[247] the plating a wave carries is passed on to a reinforcement too');
startGame();
setupFight(sixMonsters(), 4);
beginBattle();
b = state.battle;
b.plating = 'fire';
b.rounds = REINFORCE_MIN_ROUND;
mockSeq([0.1, 0.5, 0]);
maybeSpawnReinforcements();
Math.random = realRandom;
const platedNewcomer = b.enemyUnits[b.enemyUnits.length-1];
ok('the reinforcement carries the wave\'s own plating', platedNewcomer.plating==='fire' && platedNewcomer.platingPct>0);

console.log('\n[248] checkBattleEnd correctly waits on a reinforcement — it is a real combatant, not decoration');
startGame();
setupFight(sixMonsters(), 4);
beginBattle();
b = state.battle;
b.rounds = REINFORCE_MIN_ROUND;
mockSeq([0.1, 0.5, 0]);
maybeSpawnReinforcements();
Math.random = realRandom;
ok('sanity: a reinforcement is now on the field', b.enemyUnits.some(u=>u.isReinforcement));
b.enemyUnits.filter(u=>!u.isReinforcement).forEach(u=>{ u.hp=0; u.fainted=true; });
ok('fainting only the ORIGINAL wave does not end the battle — the reinforcement is still standing', checkBattleEnd()===false);
b.enemyUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
ok('fainting everyone, reinforcement included, ends it as a real win', checkBattleEnd()===true && state.lastResult.win===true);

console.log('\n[249] War Journal reflects a battle that was reinforced, for both a win and a loss');
startGame();
setupFight(sixMonsters(), 4);
beginBattle();
b = state.battle;
b.rounds = REINFORCE_MIN_ROUND;
mockSeq([0.1, 0.5, 0]);
maybeSpawnReinforcements();
Math.random = realRandom;
b.enemyUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
checkBattleEnd();
ok('a reinforced win is called out in the journal entry', /reinforcements|second wave/i.test(state.journal[0].text), state.journal[0].text);

startGame();
setupFight(sixMonsters(), 4);
beginBattle();
b = state.battle;
b.rounds = REINFORCE_MIN_ROUND;
mockSeq([0.1, 0.5, 0]);
maybeSpawnReinforcements();
Math.random = realRandom;
b.playerUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
checkBattleEnd();
ok('a reinforced loss is called out too', /reinforcements|second wave/i.test(state.journal[0].text), state.journal[0].text);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
