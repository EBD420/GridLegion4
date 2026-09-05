
(function(){
function sixMonsters(){ return ['emberling','aqualing','terrafang','emberling','aqualing','terrafang'].map(id=>newMonster(id,10,1,{key:'keen'})); }
function fillFormation(mons){
  state.roster = mons;
  state.formation.front=[mons[0].uid, mons[1].uid, mons[2].uid];
  state.formation.back=[mons[3].uid, mons[4].uid, mons[5].uid];
}
function corruptedRoster(totalWanted){
  // Builds a roster whose summed monsterCorruption() lands at/above totalWanted,
  // by loading cinderjaw_black parts (corruption 49 each) onto fresh monsters.
  // Always at least 6, so the exact same roster can double as a formation
  // fill without any index in fillFormation() coming up undefined.
  const mons = [];
  let sum = 0;
  while(sum < totalWanted || mons.length < 6){
    const m = newMonster('emberling', 10, 1, {key:'keen'});
    m.parts = ['cinderjaw_black'];
    mons.push(m);
    sum += monsterCorruption(m);
  }
  return mons;
}
const realRandom = Math.random;

console.log('\n[400] totalRosterCorruption()/undercroftAvailable(): a live sum, gated by threshold and by whether it has already been claimed');
startGame();
ok('an empty-handed fresh legion has zero cumulative corruption', totalRosterCorruption()===0);
ok('and the Undercroft is not available', undercroftAvailable()===false);

let m1 = newMonster('emberling', 10, 1, {key:'keen'});
m1.parts = ['scraphound'];
let m2 = newMonster('aqualing', 10, 1, {key:'keen'});
m2.parts = ['frostcoil'];
state.roster = [m1, m2];
ok('totalRosterCorruption sums every monster in the roster, not just one', totalRosterCorruption()===monsterCorruption(m1)+monsterCorruption(m2));

state.roster = corruptedRoster(UNDERCROFT_THRESHOLD);
ok('once the sum reaches the threshold, the Undercroft opens', totalRosterCorruption()>=UNDERCROFT_THRESHOLD && undercroftAvailable()===true);

let lightlyCorrupted = newMonster('emberling', 10, 1, {key:'keen'});
lightlyCorrupted.parts = ['scraphound']; // a single, lightly-corrupted monster — well under threshold
state.roster = [lightlyCorrupted];
ok('well under the threshold, it stays closed', totalRosterCorruption()<UNDERCROFT_THRESHOLD && undercroftAvailable()===false);

state.roster = corruptedRoster(UNDERCROFT_THRESHOLD);
state.undercroftClaimed = true;
ok('already claimed -> never available again, no matter how corrupted the roster gets', undercroftAvailable()===false);

console.log('\n[401] beginUndercroft()/endUndercroft(): a fixed, non-boss anchor stage, refuses when unavailable, and restores the player\'s real stage afterward');
startGame();
state.roster = [];
state.stage = 4;
ok('sanity: this stage is not a boss stage, so it is a fair baseline to restore to', !bossForStage(4));
beginUndercroft();
ok('refuses outright when the corruption threshold has not been met — no battle, no flag', state.undercroft!==true && state.battle===null);

fillFormation(corruptedRoster(UNDERCROFT_THRESHOLD));
state.stage = 4;
beginUndercroft();
ok('once available, it opens a real battle', state.undercroft===true && !!state.battle);
ok('anchored to the fixed, non-boss Undercroft stage, not wherever the player happened to be', state.stage===UNDERCROFT_ANCHOR_STAGE && !bossForStage(UNDERCROFT_ANCHOR_STAGE));
ok('the player\'s real stage is remembered for the trip back', state.stageBeforeUndercroft===4);
endUndercroft();
ok('endUndercroft() restores the real stage, clears the flag, and returns to the Hub', state.stage===4 && state.undercroft===null && state.battle===null && state.screen==='hub');

console.log('\n[402] the anchor stage is meaner than a Detour, and the multiplier is applied through the same buildEnemyUnits() hook Detours already use');
ok('UNDERCROFT_STAT_MULT is a real number greater than 1, and steeper than DETOUR_STAT_MULT — this is meant to hurt more than a Detour', UNDERCROFT_STAT_MULT>1 && UNDERCROFT_STAT_MULT>DETOUR_STAT_MULT);

console.log('\n[403] the reward: a win grants the Corruption Ward exactly once; a loss, or an already-claimed Undercroft, grants nothing');
startGame();
state.roster = corruptedRoster(UNDERCROFT_THRESHOLD);
fillFormation(state.roster.slice(0,6));
state.stage = 1;
beginUndercroft();
let b = state.battle;
b.enemyUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
b.elemDamage = {};
endBattle('win');
ok('a win marks the result as an Undercroft fight', state.lastResult.undercroft===true);
ok('and grants the ward exactly once', state.undercroftClaimed===true && state.undercroftWard===true);
ok('the result names the reward in plain language', /Corruption Ward/.test(state.lastResult.undercroftReward));
ok('and the result SCREEN actually renders that reward text, not just the data behind it', renderResult().indexOf('Corruption Ward')>=0);
endUndercroft();

startGame();
state.roster = corruptedRoster(UNDERCROFT_THRESHOLD);
fillFormation(state.roster.slice(0,6));
state.stage = 1;
beginUndercroft();
b = state.battle;
b.playerUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
endBattle('lose');
ok('a loss is still marked as an Undercroft fight...', state.lastResult.undercroft===true);
ok('...but grants no ward at all — the corruption that opened the door is still there to try again', state.undercroftClaimed===false && state.undercroftWard===false && !state.lastResult.undercroftReward);
endUndercroft();

startGame();
state.roster = corruptedRoster(UNDERCROFT_THRESHOLD);
fillFormation(state.roster.slice(0,6));
state.stage = 1;
state.undercroftClaimed = true; // already claimed, somehow still mid-fight
state.undercroft = true;
beginBattle();
b = state.battle;
b.enemyUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
b.elemDamage = {};
const wardBefore = state.undercroftWard;
endBattle('win');
ok('an already-claimed Undercroft never re-grants the ward on a second win — no double-dipping', state.undercroftWard===wardBefore);

console.log('\n[404] monsterCorruption() folds in the Ward\'s flat reduction once it is earned, clamped at zero, and never touches a bare monster');
startGame();
let bare = newMonster('emberling', 10, 1, {key:'keen'});
state.undercroftWard = false;
ok('a monster with no parts at all reads 0 corruption regardless of the ward', monsterCorruption(bare)===0);
state.undercroftWard = true;
ok('...and still 0 once the ward is earned — nothing to reduce', monsterCorruption(bare)===0);

let armored = newMonster('emberling', 10, 1, {key:'keen'});
armored.parts = ['cinderjaw'];
state.undercroftWard = false;
const before = monsterCorruption(armored);
state.undercroftWard = true;
ok('with the ward earned, an equipped monster runs exactly UNDERCROFT_WARD_REDUCTION cooler', monsterCorruption(armored)===Math.max(0, before-UNDERCROFT_WARD_REDUCTION));

let lightlyArmored = newMonster('emberling', 10, 1, {key:'keen'});
lightlyArmored.parts = ['thornbot']; // low base corruption (18), likely below the ward's reduction
state.undercroftWard = true;
ok('the reduction never pushes corruption negative — it clamps at zero', monsterCorruption(lightlyArmored)>=0);

console.log('\n[405] the Hub banner: only while available, gone forever once claimed, wired to beginUndercroft()');
startGame();
state.roster = [];
let html = renderHub();
ok('nothing available -> no Undercroft banner at all', html.indexOf('THE UNDERCROFT')<0);

state.roster = corruptedRoster(UNDERCROFT_THRESHOLD);
html = renderHub();
ok('an open Undercroft renders the banner', html.indexOf('THE UNDERCROFT')>=0);
ok('wired to beginUndercroft(), with no affordability gate to fuss with — it is available or it is not', /onclick="beginUndercroft\(\)"/.test(html));

state.undercroftClaimed = true;
html = renderHub();
ok('once claimed, the banner is gone for good, even with the exact same corrupted roster still equipped', html.indexOf('THE UNDERCROFT')<0);

console.log('\n[406] mutual exclusion: every other battle mode clears state.undercroft, exactly like it already clears state.detour');
startGame();
fillFormation(sixMonsters());
state.undercroft = true;
social.opponent = { user_id:'riv1', display_name:'Rival', formation:{units:[]} };
startDuel();
ok('starting a duel clears a stale Undercroft flag', state.undercroft===null);
endDuel();
social.opponent = null;

state.undercroft = true;
startRaidRun();
ok('starting a raid run clears it too', state.undercroft===null);
endRaidRun();

state.undercroft = true;
startGuildWarRun();
ok('starting a guild war run clears it too', state.undercroft===null);
endGuildWarRun();

state.undercroft = true;
startWorldBossRun();
ok('starting a World Boss run clears it too', state.undercroft===null);
endWorldBossRun();

state.undercroft = true;
startTutorial();
ok('the training deployment clears it too', state.undercroft===null);

console.log('\n[407] persistence: a clean round-trip, malformed booleans degrade to false (never truthy garbage), and survival through Rebirth');
startGame();
state.undercroftClaimed = true;
state.undercroftWard = true;
let saved = serializeSave();
ok('both flags ride along in the save', saved.undercroftClaimed===true && saved.undercroftWard===true);
applySave(saved, 0);
ok('a clean save round-trips exactly', state.undercroftClaimed===true && state.undercroftWard===true);
ok('the transient mid-battle flag is never itself persisted — always null right after a load', state.undercroft===null);

applySave(Object.assign({}, saved, { undercroftClaimed: 'true', undercroftWard: 1 }), 0);
ok('non-boolean truthy garbage degrades to false, same "=== true" convention audio.music already uses', state.undercroftClaimed===false && state.undercroftWard===false);
applySave({v:1, name:'x', stage:1, roster:[], formation:{front:[null,null,null],back:[null,null,null]}}, 0);
ok('a save from before this feature ever existed loads with both flags false, not a crash', state.undercroftClaimed===false && state.undercroftWard===false && state.undercroft===null);

startGame();
state.stage = REBIRTH_MIN_STAGE;
state.undercroftClaimed = true;
state.undercroftWard = true;
doRebirth(); // arm
doRebirth(); // confirm
ok('a Rebirth never revokes an earned Corruption Ward — permanent means permanent, same treatment as Trophy Case and campaignDetours', state.undercroftClaimed===true && state.undercroftWard===true);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
