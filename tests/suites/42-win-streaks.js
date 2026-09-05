
(function(){
function setupFight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.intel={history:[],wins:0}; state.stage=stage;
}
function sixMonsters(){ return ['emberling','aqualing','terrafang','emberling','aqualing','terrafang'].map(id=>newMonster(id,10)); }
function forceWin(){
  const b = state.battle;
  b.enemyUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
  return checkBattleEnd();
}
const realRandom = Math.random;

console.log('\n[270] winStreakLevel(): reuses state.streak, clamped to 0..WIN_STREAK_CAP');
startGame();
ok('a fresh legion (streak 0) has no bonus level at all', winStreakLevel()===0);
state.streak = 3;
ok('a real win streak reads through directly', winStreakLevel()===3);
state.streak = WIN_STREAK_CAP;
ok('exactly at the cap reads as the cap', winStreakLevel()===WIN_STREAK_CAP);
state.streak = WIN_STREAK_CAP + 20;
ok('well past the cap is clamped to it, not left to grow unbounded', winStreakLevel()===WIN_STREAK_CAP);
state.streak = -4;
ok('a loss streak (negative) reads as 0 — this bonus only ever rewards wins, never penalizes a bad run', winStreakLevel()===0);
state.streak = 0;

console.log('\n[271] chargeGauge(): the streak bonus is a small additive multiplier, stacking with existing modifiers, capped');
function gaugeFrom(streak){
  state.streak = streak;
  state.battle = { gambit:null, gauge:0, playerUnits:[{maxHp:100,hp:100,fainted:false}] };
  chargeGauge(10);
  return state.battle.gauge;
}
const g0 = gaugeFrom(0);
ok('no streak: a plain 10-point charge lands exactly at 10', g0===10, g0);
const g3 = gaugeFrom(3);
ok('a 3-streak adds exactly 3 * 2% = 6% on top (10.6)', Math.abs(g3-10.6)<1e-9, g3);
const g5 = gaugeFrom(WIN_STREAK_CAP);
ok('at the cap, the bonus tops out at 10% (11)', Math.abs(g5-11)<1e-9, g5);
const g50 = gaugeFrom(50);
ok('an absurd streak is clamped the same as the cap, not left to keep scaling', g50===g5, [g50,g5]);
state.streak = 0;

console.log('\n[272] the salvage-roll nudge: a real, capped win streak can flip an otherwise-missed pull, through a real battle');
startGame();
setupFight(sixMonsters(), 2);   // ordinary surface stage: single ordinary salvage pull, not the guaranteed elite/boss double
state.parts = [];
state.streak = 0;
Math.random = () => 0.75;   // above the base 0.70 threshold (no guild/commander/codex bonuses on a fresh legion) -> misses
beginBattle();
forceWin();
Math.random = realRandom;
ok('with no streak, this fixed roll misses the ordinary salvage pull entirely', state.parts.length===0, state.parts.length);

startGame();
setupFight(sixMonsters(), 2);
state.parts = [];
state.streak = WIN_STREAK_CAP;   // +10% at the cap: threshold becomes 0.80
Math.random = () => 0.75;   // the exact same roll as above
beginBattle();
forceWin();
Math.random = realRandom;
ok('the same fixed roll now clears the threshold once the streak bonus is added — the pull lands', state.parts.length===1, state.parts.length);
state.streak = 0;

console.log('\n[273] the Hub shows the bonus while it is active, and never claims one that is not there');
startGame();
let hubHtml = renderHub();
ok('a fresh legion with no streak shows no win-streak line at all', !/in a row/i.test(hubHtml));
state.streak = 3;
hubHtml = renderHub();
ok('an active streak is called out by exact count', hubHtml.indexOf('🔥 3 in a row')>=0, hubHtml.indexOf('🔥'));
ok('the displayed percentages match the real formulas (3 * 2% = 6% for both)', hubHtml.indexOf('6% faster')>=0 && hubHtml.indexOf('+6%')>=0);
state.streak = -2;
hubHtml = renderHub();
ok('a loss streak (no mechanical bonus) shows no win-streak line either', !/in a row/i.test(hubHtml));
state.streak = 0;

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
