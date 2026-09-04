
(function(){
function setupFight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.intel={history:[],wins:0}; state.stage=stage;
}
const realRandom = Math.random;
const ELITE_STAGE = CAMPAIGN_LENGTH + 5;
function sixMonsters(){ return ['emberling','aqualing','terrafang','emberling','aqualing','terrafang'].map(id=>newMonster(id,10)); }
function baseUnit(extra){ return Object.assign(baseUnitDefaults(), Object.assign({
  id:'u'+Math.random(), side:'player', row:'front', name:'Test', emoji:'❔', element:'fire', elements:['fire'],
  bHp:100,bAtk:30,bDef:10,bSpd:10, maxHp:100,hp:100,atk:30,def:10,spd:10, speciesId:'emberling',
}, extra||{})); }

console.log('\n[202] GAMBITS: a real pool, every entry has a name and a real trade-off description');
ok('at least 3 distinct modifiers exist to draw from', GAMBIT_IDS.length>=3, GAMBIT_IDS);
ok('every entry has a non-empty name and description', GAMBIT_IDS.every(id=>GAMBITS[id].name && GAMBITS[id].desc && GAMBITS[id].desc.length>10), GAMBITS);
ok('GAMBIT_IDS matches the object\'s own keys exactly', JSON.stringify(GAMBIT_IDS.slice().sort())===JSON.stringify(Object.keys(GAMBITS).sort()));

console.log('\n[203] isHardFight: gated on real bosses and elite waves, excluded entirely during duels/raids/trials');
startGame();
ok('an ordinary early stage is not a hard fight', !isHardFight(3));
ok('an elite wave in the Deep is a hard fight', isHardFight(ELITE_STAGE));
const warlordStage = CAMPAIGN_LENGTH+7;   // matches the Depth Chart suite's own Warlord Ashclaw cadence
ok('sanity: this stage really does carry a boss', !!bossForStage(warlordStage));
ok('a Warlord stage is a hard fight', isHardFight(warlordStage));
ok('an ordinary Deep wave with no boss and not on the elite cadence is not a hard fight', !isHardFight(CAMPAIGN_LENGTH+1));

state.duel = { userId:'x', name:'Rival', formation:{units:[]} };
ok('a duel is never a hard fight, whatever the stage', !isHardFight(warlordStage));
state.duel = null;
state.raidRun = true;
ok('a raid run is never a hard fight either', !isHardFight(warlordStage));
state.raidRun = false;
state.trial = { stage:3, mods:['glass'], reward:1 };
ok('nor is a Trial — it already has its own handicap system', !isHardFight(warlordStage));
state.trial = null;

console.log('\n[204] rollGambitChoices: exactly three distinct modifiers, freshly recorded against the current stage');
startGame();
state.stage = ELITE_STAGE;
rollGambitChoices();
ok('exactly three choices are offered', state.gambit && state.gambit.choices.length===3, state.gambit);
ok('all three are distinct, valid modifier ids', new Set(state.gambit.choices).size===3 && state.gambit.choices.every(id=>GAMBIT_IDS.indexOf(id)>=0));
ok('nothing is picked yet', state.gambit.picked===null);
ok('the roll remembers which stage it was rolled for', state.gambit.stage===ELITE_STAGE);

console.log('\n[205] goGambitOrBattle: routes to the gambit screen for a hard fight, straight into battle otherwise');
startGame();
setupFight(sixMonsters(), ELITE_STAGE);
state.gambit = null;
goGambitOrBattle();
ok('a hard fight opens the Loadout Gambit screen instead of deploying immediately', state.screen==='gambit' && !state.battle, state.screen);
ok('three choices were rolled as a side effect', state.gambit && state.gambit.choices.length===3);

startGame();
setupFight(sixMonsters(), 3);   // not a hard fight
goGambitOrBattle();
ok('an ordinary fight deploys straight to battle, no gambit screen at all', state.screen==='battle' && !!state.battle && !state.gambit);

console.log('\n[206] pickGambit: commits the choice and deploys; guards against double-picks and unknown ids');
startGame();
setupFight(sixMonsters(), ELITE_STAGE);
rollGambitChoices();
const validId = state.gambit.choices[0];
pickGambit('not-a-real-gambit-id');
ok('an id outside the rolled three is silently rejected', state.gambit.picked===null && state.screen!=='battle');
pickGambit(validId);
ok('picking a valid offered id commits it and deploys to battle', state.battle && state.battle.gambit===validId, state.battle && state.battle.gambit);

startGame();
setupFight(sixMonsters(), ELITE_STAGE);
rollGambitChoices();
const firstPick = state.gambit.choices[0];
state.gambit.picked = firstPick;   // simulate an already-committed pick without re-deploying
pickGambit(state.gambit.choices[1]);
ok('a pick cannot be changed once already committed for this roll', state.gambit.picked===firstPick);

console.log('\n[207] beginBattle wiring: the picked gambit lands on state.battle.gambit, then state.gambit is cleared for the next fight');
startGame();
setupFight(sixMonsters(), ELITE_STAGE);
rollGambitChoices();
const pick2 = state.gambit.choices[0];
state.gambit.picked = pick2;
beginBattle();
ok('state.battle.gambit carries the exact id that was picked', state.battle.gambit===pick2);
ok('state.gambit itself is cleared immediately after — one battle only, never leaks into the next', state.gambit===null);
ok('a log line announces which gambit is active, by name', state.battle.log.some(l=>l.indexOf(GAMBITS[pick2].name)>=0), state.battle.log[0]);

startGame();
setupFight(sixMonsters(), 3);   // no gambit rolled at all this time
beginBattle();
ok('an ordinary fight with no gambit rolled carries a null gambit, not undefined or a stale value', state.battle.gambit===null);

console.log('\n[208] buildPlayerUnits: each gambit\'s stat tweaks land on the right units, folded through refreshSynergies');
startGame();
setupFight(sixMonsters(), 3);
state.gambit = { stage:3, choices:['opening_strike'], picked:'opening_strike' };
let pu = buildPlayerUnits(terrainForStage(3));
ok('Opening Strike flags every front-row unit and only the front row', pu.filter(u=>u.row==='front').every(u=>u.gambitFirstCrit===true) &&
   pu.filter(u=>u.row==='back').every(u=>!u.gambitFirstCrit), pu.map(u=>[u.row,u.gambitFirstCrit]));

startGame();
setupFight(sixMonsters(), 3);
const plainUnits = buildPlayerUnits(terrainForStage(3));
const plainDef = plainUnits[0].def, plainSpd = plainUnits[0].spd;
state.gambit = { stage:3, choices:['bulwark'], picked:'bulwark' };
let buUnits = buildPlayerUnits(terrainForStage(3));
ok('Bulwark Doctrine raises every unit\'s live DEF (after refreshSynergies, not just the base field)', buUnits[0].def > plainDef, [buUnits[0].def, plainDef]);

startGame();
setupFight(sixMonsters(), 3);
state.gambit = { stage:3, choices:['adrenaline'], picked:'adrenaline' };
let adrUnits = buildPlayerUnits(terrainForStage(3));
ok('Adrenaline Rush raises live SPD and sets a real critVulnerability on every unit', adrUnits[0].spd > plainSpd && adrUnits.every(u=>u.critVulnerability>=0.05),
   [adrUnits[0].spd, plainSpd, adrUnits[0].critVulnerability]);
state.gambit = null;

console.log('\n[209] the damage/gauge hooks: overclock, focused fire, bulwark\'s slower gauge, and adrenaline\'s crit vulnerability');
Math.random = () => 0.99;   // pin out natural crit/dodge/miss everywhere below
let atk1 = baseUnit({}), def1 = baseUnit({side:'enemy'});
state.battle = { gambit:null };
const baseline = computeDamage(atk1, def1, false).dmg;
state.battle = { gambit:'overclock' };
const overclocked = computeDamage(atk1, def1, false).dmg;
ok('Overclock deals exactly 8% less than the same hit without it', overclocked===Math.round(baseline*0.92), [overclocked, baseline]);

let lowDef = baseUnit({side:'enemy', hp:10, maxHp:100});     // under half HP
let fullDef = baseUnit({side:'enemy', hp:100, maxHp:100});   // at full HP
state.battle = { gambit:null };
const baseLow = computeDamage(atk1, lowDef, false).dmg, baseFull = computeDamage(atk1, fullDef, false).dmg;
state.battle = { gambit:'focused_fire' };
const ffLow = computeDamage(atk1, lowDef, false).dmg, ffFull = computeDamage(atk1, fullDef, false).dmg;
ok('Focused Fire deals 10% more into a target already below half HP', ffLow===Math.round(baseLow*1.10), [ffLow, baseLow]);
ok('and 6% less into a target still at full HP', ffFull===Math.round(baseFull*0.94), [ffFull, baseFull]);

state.battle = { gambit:'overclock', gauge:0, playerUnits:[{maxHp:100,hp:100,fainted:false}] };
chargeGauge(10);
const overclockGauge = state.battle.gauge;
state.battle = { gambit:null, gauge:0, playerUnits:[{maxHp:100,hp:100,fainted:false}] };
chargeGauge(10);
const plainGauge = state.battle.gauge;
ok('Overclock charges Legion Gauge noticeably faster than normal for the same damage', overclockGauge>plainGauge, [overclockGauge, plainGauge]);
state.battle = { gambit:'bulwark', gauge:0, playerUnits:[{maxHp:100,hp:100,fainted:false}] };
chargeGauge(10);
ok('Bulwark Doctrine charges Legion Gauge noticeably slower, the trade for the DEF', state.battle.gauge<plainGauge, [state.battle.gauge, plainGauge]);

state.battle = { gambit:null };
let vulnDef = baseUnit({side:'enemy', critVulnerability:0});
Math.random = () => 0.15;   // between the base 12% crit chance and 12%+5%
ok('at 15% roll and 0 vulnerability, no crit fires (0.15 is above the 12% base threshold)', computeDamage(atk1, vulnDef, false).crit===false);
vulnDef.critVulnerability = 0.05;
ok('the same 15% roll now crits once the defender carries Adrenaline\'s +5-point vulnerability (threshold now 17%)', computeDamage(atk1, vulnDef, false).crit===true);

console.log('\n[209b] Opening Strike: a guaranteed crit on the very first hit, never again after it is spent');
startGame();
setupFight(sixMonsters(), 3);
beginBattle();
let osB = state.battle;
Math.random = () => 0.99;   // guarantees no NATURAL crit, isolating the forced one
let osAtk = osB.playerUnits[0], osDef1 = osB.enemyUnits[0];
osAtk.gambitFirstCrit = true; osAtk.gambitFirstCritUsed = false;
osDef1.hp = 99999; osDef1.maxHp = 99999; osDef1.dodge=0; osDef1.shield=false; osDef1.firstHitReduction=false; osAtk.missChance=0;
applyDamage(osAtk, osDef1, false);
ok('the very first hit is a guaranteed crit', osB.log[0].indexOf('CRIT')>=0, osB.log[0]);
ok('the flag is spent after use', osAtk.gambitFirstCritUsed===true);
applyDamage(osAtk, osDef1, false);
ok('the second hit is an ordinary roll again — no natural crit under a pinned-high random', osB.log[0].indexOf('CRIT')<0, osB.log[0]);
Math.random = realRandom;

console.log('\n[210] renderGambit / cancelGambit / the Hub button routes through the gambit check');
startGame();
setupFight(sixMonsters(), ELITE_STAGE);
rollGambitChoices();
let gambitHtml = renderGambit();
ok('all three offered modifiers render by name and description', state.gambit.choices.every(id=> gambitHtml.indexOf(GAMBITS[id].name)>=0 && gambitHtml.indexOf(GAMBITS[id].desc)>=0));
const battleBefore = state.battle;
cancelGambit();
ok('cancelling clears the roll and returns to the Hub without ever deploying', state.gambit===null && state.screen==='hub' && state.battle===battleBefore);

startGame();
setupFight(sixMonsters(), ELITE_STAGE);
let hubHtml = renderHub();
ok('the Hub\'s deploy button routes through goGambitOrBattle, not straight into beginBattle', hubHtml.indexOf('goGambitOrBattle()')>=0, hubHtml.indexOf('DEPLOY'));

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
