
/* ===== new-feature tests (appended to the existing suite) ===== */
console.log('\n[9] tiered legion gauge');
startGame();
const g1=newMonster('emberling',6), g2=newMonster('terrafang',6);
state.roster=[g1,g2];
state.formation.front=[g1.uid,g2.uid,null]; state.formation.back=[null,null,null];
state.intel={history:[],wins:0}; state.stage=1;
beginBattle(); B=state.battle;

ok('purge/rally/overdrive have rising costs',
   GAUGE_COST.purge<GAUGE_COST.rally && GAUGE_COST.rally<GAUGE_COST.overdrive);

B.gauge=100;
const before100=B.gauge;
useGaugeRally();
ok('rally spends only its tier, not the whole bar', B.gauge===before100-GAUGE_COST.rally, B.gauge);
B.gauge=40;
const u0=B.playerUnits[0];
u0.status={type:'burn',turnsLeft:3};
B.awaitingInput=true; B.qIndex=B.queue.indexOf(u0);
if(B.qIndex<0){ B.queue.unshift(u0); B.qIndex=0; }
playerChooseAction('gauge_purge');
ok('purge enters ally-targeting', B.pendingAction==='gauge_purge', B.pendingAction);
playerTarget(u0.id);
ok('purge clears status', u0.status===null);
ok('purge costs 33', B.gauge===40-GAUGE_COST.purge, B.gauge);

/* purge knocks rust down a tier */
const r=newMonster('terrafang',6); r.parts=['cinderjaw','sparkdrone'];
state.roster=[r,g2]; state.formation.front=[r.uid,g2.uid,null]; state.formation.back=[null,null,null];
beginBattle(); B=state.battle;
const ru=B.playerUnits[0];
const rustBefore=ru.corruption, glitchBefore=ru.glitchChance;
ok('rusted unit starts VOLATILE', corrTier(rustBefore).name==='VOLATILE', rustBefore+' '+corrTier(rustBefore).name);
B.gauge=90; B.awaitingInput=true; B.qIndex=B.queue.indexOf(ru); if(B.qIndex<0){B.queue.unshift(ru);B.qIndex=0;}
playerChooseAction('gauge_purge'); playerTarget(ru.id);
ok('purge removes rust', ru.corruption===rustBefore-12, rustBefore+'->'+ru.corruption);
ok('purge lowers glitch chance', ru.glitchChance<glitchBefore, glitchBefore+'->'+ru.glitchChance);
ok('purge can drop a whole tier', corrTier(ru.corruption).name==='UNSTABLE', corrTier(ru.corruption).name);
ok('defection risk gone with the tier', ru.defectChance===0, ru.defectChance);

/* gauge gating */
B.gauge=20;
ok('below 33 nothing is affordable', !(B.gauge>=GAUGE_COST.purge));
B.gauge=70;
ok('at 70 purge+rally affordable, overdrive not',
   B.gauge>=GAUGE_COST.rally && !(B.gauge>=GAUGE_COST.overdrive));

/* banked spending: two purges off one full bar */
B.gauge=100; B.awaitingInput=true;
playerChooseAction('gauge_purge'); playerTarget(ru.id);
const afterFirst=B.gauge;
B.awaitingInput=true; B.qIndex=B.queue.indexOf(ru); if(B.qIndex<0){B.queue.unshift(ru);B.qIndex=0;}
playerChooseAction('gauge_purge'); playerTarget(ru.id);
ok('a full bar buys three purges, not one', afterFirst===67 && B.gauge===34, afterFirst+'/'+B.gauge);

console.log('\n[10] EXP on defeat');
startGame();
// Codex Set Bonuses (added later) gives +5% win EXP once every Rustbound
// chassis is discovered. Two 5-enemy battles below draw enough random
// species that they can occasionally complete that category by chance,
// which would silently inflate the "full amount" assertion below — pin the
// codex empty so this block tests the raw EXP formula, not that bonus.
state.codex = { species:{}, enemies:{}, hybrids:{}, bosses:{}, terrains:{}, parts:{}, traits:{} };
state.stage=6;
const e1=newMonster('emberling',1), e2=newMonster('aqualing',1);
state.roster=[e1,e2];
state.formation.front=[e1.uid,e2.uid,null]; state.formation.back=[null,null,null];
beginBattle(); B=state.battle;
const expBefore=e1.exp, lvlBefore=e1.level;
B.playerUnits.forEach(u=>{u.hp=0;u.fainted=true;});
endBattle('lose');
ok('defeat is still a defeat', state.lastResult.win===false);
ok('defeat awards partial EXP', state.lastResult.expGain===Math.round((8+6*2)*0.5), state.lastResult.expGain);
ok('loss EXP is half a win', state.lastResult.expGain*2===8+6*2);
ok('EXP actually lands on the monster', (e1.level>lvlBefore)||(e1.exp>expBefore), e1.level+'/'+e1.exp);
ok('defeat grants no salvage', state.lastResult.part===undefined);
ok('defeat does not feed enemy intel', state.intel.history.length===0, state.intel.history);
ok('stage does not advance on a loss', state.stage===6);

/* a win still pays double */
state.stage=6;
state.formation.front=[e1.uid,e2.uid,null];
beginBattle(); B=state.battle;
// re-pin: beginBattle() above just recorded this battle's own enemies into
// the codex, which combined with battle 1's draws could coincidentally
// complete the Rustbound Chassis category right as we measure raw EXP.
state.codex.enemies = {};
B.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
B.elemDamage={fire:50};
endBattle('win');
ok('win EXP is the full amount', state.lastResult.expGain===8+6*2, state.lastResult.expGain);
ok('win feeds intel', state.intel.history.length===1, state.intel.history);
ok('level-ups are reported', Array.isArray(state.lastResult.levelled));

