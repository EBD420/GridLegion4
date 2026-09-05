
(function(){
function sixMonsters(){ return ['emberling','aqualing','terrafang','emberling','aqualing','terrafang'].map(id=>newMonster(id,10,1,{key:'keen'})); }
function fillFormation(mons){
  state.roster = mons;
  state.formation.front=[mons[0].uid, mons[1].uid, mons[2].uid];
  state.formation.back=[mons[3].uid, mons[4].uid, mons[5].uid];
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
function clearStages(list){ state.cleared = {}; list.forEach(n=>{ state.cleared[n]=true; }); }
const realRandom = Math.random;

console.log('\n[394] companionLevel()/companionInfo(): a cumulative-threshold shape, same as guildLevel()');
ok('below every threshold is level 1', companionLevel(0)===1 && companionLevel(39)===1);
ok('landing exactly on a threshold advances the level', companionLevel(40)===2 && companionLevel(100)===3 && companionLevel(200)===4 && companionLevel(360)===5);
ok('one xp short of the next threshold stays at the lower level', companionLevel(99)===2 && companionLevel(199)===3 && companionLevel(359)===4);
ok('far past the last threshold caps at the top level, never climbs past it', companionLevel(999999)===5);

startGame();
ok('a fresh legion is rolled a real, known companion species', !!COMPANION_SPECIES[state.companion.speciesId]);
ok('and starts it at 0 xp', state.companion.xp===0);
let info = companionInfo();
ok('companionInfo() resolves the roll to real display data', info && info.name===COMPANION_SPECIES[info.speciesId].name && info.emoji===COMPANION_SPECIES[info.speciesId].emoji);
ok('a level-1 companion carries the base perk magnitude', info.level===1 && info.pct===COMPANION_PERK_BASE);
ok('companionInfo() with no companion at all is a harmless null, not a crash', (function(){ const saved=state.companion; state.companion=null; const r=companionInfo(); state.companion=saved; return r===null; })());
ok('an unknown species id degrades to null the same way', (function(){ const saved=state.companion; state.companion={speciesId:'not_a_real_species',xp:0}; const r=companionInfo(); state.companion=saved; return r===null; })());

console.log('\n[395] addCompanionXp(): the two feed points — every stage battle reaching the shared tail, and only a genuinely NEW Deep depth record');
startGame();
fillFormation(sixMonsters());
state.stage = 2;
beginBattle();
forceWin();
ok('a normal stage win feeds the companion COMPANION_XP_PER_BATTLE', state.companion.xp===COMPANION_XP_PER_BATTLE);
beginBattle();
forceLose();
ok('a stage loss feeds it too — the shared tail runs on both outcomes, same as the Caravan tick', state.companion.xp===COMPANION_XP_PER_BATTLE*2);

startGame();
fillFormation(sixMonsters());
social.opponent = { user_id:'riv1', display_name:'Rival', formation:{units:[]} };
startDuel();
Math.random = () => 0;
checkBattleEnd();
Math.random = realRandom;
ok('a duel never reaches the shared tail — no companion xp, even mid-fight', state.companion.xp===0);
endDuel();
social.opponent = null;

startGame();
fillFormation(sixMonsters());
startRaidRun();
Math.random = () => 0;
checkBattleEnd();
Math.random = realRandom;
ok('a raid run never reaches the shared tail either', state.companion.xp===0);
endRaidRun();

startGame();
fillFormation(sixMonsters());
state.trialPick = { stage:1, mods:['blitz'] };
state.stage = 5;
clearStages([1]);
startTrial();
Math.random = () => 0;
forceWin();
Math.random = realRandom;
ok('a trial run never reaches the shared tail', state.companion.xp===0);

startTutorial();
Math.random = () => 0;
forceWin();
Math.random = realRandom;
ok('the training deployment never reaches the shared tail either', state.companion.xp===0);

startGame();
ok('normal campaign play never touches best depth until stage 11', state.bestDepth===0);
state.stage = 10;
advanceStage();
ok('stepping from Stage 10 into Depth 1 is a genuinely new record — companion gets the depth bonus', state.bestDepth===1 && state.companion.xp===COMPANION_XP_PER_NEW_DEPTH);
state.stage = 11;
advanceStage();
ok('Depth 2 is new again — another bonus', state.bestDepth===2 && state.companion.xp===COMPANION_XP_PER_NEW_DEPTH*2);
state.bestDepth = 9;
state.stage = 11; // will become Depth 2 again, well short of the existing record of 9
advanceStage();
ok('re-visiting a depth well short of the existing record pays no bonus at all', state.bestDepth===9 && state.companion.xp===COMPANION_XP_PER_NEW_DEPTH*2);

console.log('\n[396] companionPerkPct()/companionPerkText(): the right kind, the right magnitude, and exactly zero for every other kind');
startGame();
state.companion = { speciesId:'gearcat', xp: 200 }; // level 4 -> pct = 0.04 + 3*0.02 = 0.10
ok('the perk pct is nonzero for the kind this companion actually grants', Math.abs(companionPerkPct('salvage') - 0.10) < 1e-9);
ok('and exactly zero for every kind it does not grant', companionPerkPct('exp')===0 && companionPerkPct('favor')===0);
ok('the perk text names the right mechanic and the right number', companionPerkText(companionInfo()).indexOf('10%')>=0 && /bonus salvage drop/.test(companionPerkText(companionInfo())));

state.companion = { speciesId:'mosschick', xp: 0 }; // level 1 -> base pct
ok('a different companion grants a different kind entirely', companionPerkPct('exp')===COMPANION_PERK_BASE && companionPerkPct('salvage')===0 && companionPerkPct('favor')===0);
ok('exp perk text names EXP', /EXP from every battle/.test(companionPerkText(companionInfo())));

state.companion = { speciesId:'emberwhelp', xp: 40 }; // level 2 -> pct = 0.06
ok('the favor companion grants only the favor kind, scaled to its level', Math.abs(companionPerkPct('favor')-0.06)<1e-9 && companionPerkPct('exp')===0 && companionPerkPct('salvage')===0);
ok('favor perk text names favor', /favor from every battle/.test(companionPerkText(companionInfo())));

state.companion = null;
ok('with no companion at all, every perk kind reads as exactly zero — never a crash', companionPerkPct('exp')===0 && companionPerkPct('salvage')===0 && companionPerkPct('favor')===0);

console.log('\n[397] the three perk hooks actually change the numbers they claim to change');
startGame();
fillFormation(sixMonsters());
state.stage = 1;
state.companion = { speciesId:'mosschick', xp: 200 }; // level 4 -> +10% EXP
beginBattle();
let b = state.battle;
b.enemyUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
b.elemDamage = {};
endBattle('win');
ok('the exp perk multiplies expGain by exactly (1+pct)', state.lastResult.expGain===Math.round(stageExp()*1.10));

startGame();
fillFormation(sixMonsters());
state.stage = 1;
state.companion = null;
beginBattle();
b = state.battle;
b.enemyUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
b.elemDamage = {};
endBattle('win');
const baseExp = state.lastResult.expGain;
ok('sanity: with no companion at all, expGain is the plain base amount', baseExp===stageExp());

startGame();
fillFormation(sixMonsters());
state.stage = 1;
state.companion = { speciesId:'gearcat', xp: 200 }; // level 4 -> +10% salvage-drop chance, threshold becomes 0.7+0.10=0.80
state.parts = [];
beginBattle();
b = state.battle;
b.enemyUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
b.elemDamage = {};
Math.random = () => 0.75; // between the base 0.70 and the boosted 0.80 threshold
endBattle('win');
Math.random = realRandom;
ok('a roll that would fail the base salvage-drop chance succeeds once the companion perk is folded in', state.parts.length===1);

startGame();
fillFormation(sixMonsters());
state.stage = 1;
state.companion = null;
state.parts = [];
beginBattle();
b = state.battle;
b.enemyUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
b.elemDamage = {};
Math.random = () => 0.75; // same roll, no companion this time
endBattle('win');
Math.random = realRandom;
ok('sanity: that exact same roll fails outright with no companion perk to help it', state.parts.length===0);

startGame();
fillFormation(sixMonsters());
state.stage = 1;
state.companion = { speciesId:'emberwhelp', xp: 200 }; // level 4 -> +10% favor
state.favor = {};
beginBattle();
b = state.battle;
b.enemyUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
b.elemDamage = { fire: 180 }; // favorGains.fire = min(8, 2+round(180/60)) = 5 before any perk
endBattle('win');
ok('the favor perk multiplies favor gained by exactly (1+pct), rounded the same way every other favor grant is', favorOf('fire')===Math.round(5*1.10));

startGame();
fillFormation(sixMonsters());
state.stage = 1;
state.companion = null;
state.favor = {};
beginBattle();
b = state.battle;
b.enemyUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
b.elemDamage = { fire: 180 };
endBattle('win');
ok('sanity: the same battle with no companion grants the plain, unmultiplied favor', favorOf('fire')===5);

console.log('\n[398] the Hub display: shows the rolled companion, its level, and its current perk text — and only when one exists');
startGame();
state.companion = { speciesId:'gearcat', xp: 40 };
let html = renderHub();
ok('the Hub names the companion and its level', html.indexOf('Gearcat')>=0 && html.indexOf('Lv.2')>=0);
ok('and states its current perk in plain language', /bonus salvage drop/.test(html));
state.companion = null;
html = renderHub();
ok('with no companion at all, the Hub simply omits the line — no crash, no placeholder', html.indexOf('Lv.')<0 || !/Lv\.\d+\)\s*—\s*$/.test(html));

console.log('\n[399] persistence: a clean round-trip, malformed data degrades to a FRESH companion (never null — every legion always has one), and survival through Rebirth');
startGame();
state.companion = { speciesId:'mosschick', xp: 137 };
let saved = serializeSave();
ok('the companion rides along in the save exactly as held', saved.companion && saved.companion.speciesId==='mosschick' && saved.companion.xp===137);
applySave(saved, 0);
ok('a clean save round-trips exactly', state.companion.speciesId==='mosschick' && state.companion.xp===137);

applySave(Object.assign({}, saved, { companion: { speciesId:'not_a_real_species', xp:10 } }), 0);
ok('an unknown species degrades to a freshly rolled companion, not null', !!state.companion && !!COMPANION_SPECIES[state.companion.speciesId] && state.companion.xp===0);
applySave(Object.assign({}, saved, { companion: { speciesId:'gearcat', xp:-5 } }), 0);
ok('a negative xp value degrades to a fresh roll too', !!state.companion && state.companion.xp===0);
applySave(Object.assign({}, saved, { companion: 'garbage' }), 0);
ok('a totally malformed companion field degrades to a fresh roll, never a crash', !!state.companion && !!COMPANION_SPECIES[state.companion.speciesId]);
applySave({v:1, name:'x', stage:1, roster:[], formation:{front:[null,null,null],back:[null,null,null]}}, 0);
ok('a save from before this feature ever existed loads with a freshly rolled companion, not a missing one', !!state.companion && !!COMPANION_SPECIES[state.companion.speciesId] && state.companion.xp===0);

startGame();
state.stage = REBIRTH_MIN_STAGE;
state.companion = { speciesId:'emberwhelp', xp: 314 };
doRebirth(); // arm
doRebirth(); // confirm
ok('the mascot\'s bond with the commander outlasts the legion — a Rebirth never touches it', state.companion.speciesId==='emberwhelp' && state.companion.xp===314);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
