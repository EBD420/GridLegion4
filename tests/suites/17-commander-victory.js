
(function(){
function setupFight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.intel={history:[],wins:0}; state.stage=stage;
  beginBattle(); return state.battle;
}
function forceWin(){
  const b = state.battle;
  b.enemyUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
  return checkBattleEnd();
}

console.log('\n[60] Commander Rank — thresholds, XP and perks');
commander = { xp:0, level:1 };
ok('ten ranks defined', MAX_COMMANDER_LEVEL===10, MAX_COMMANDER_LEVEL);
ok('thresholds strictly rise', COMMANDER_XP.every((v,i)=>i===0||v>COMMANDER_XP[i-1]), COMMANDER_XP);
ok('every unlock rank from 2 has a perk', [2,4,6,8,10].every(l=>!!COMMANDER_PERKS[l]));
ok('level 1 has no perks yet', !commanderHasPerk('salvage_start') && !commanderHasPerk('roster_slot'));
ok('base roster cap is 18', rosterCap()===18);

let leveled = commanderAddXp(0);
ok('a zero award crosses nothing', leveled===null && commander.xp===0);
leveled = commanderAddXp(499);
ok('just under the level-2 threshold does not level', leveled===null && commander.level===1, commander.xp);
leveled = commanderAddXp(1);
ok('crossing the threshold levels up and returns the new level', leveled===2 && commander.level===2, commander.xp);
ok('Scavenger\'s Eye unlocks at level 2', commanderHasPerk('salvage_start'));
ok('later perks are still locked', !commanderHasPerk('roster_slot') && !commanderHasPerk('exp_all'));

commander = { xp:0, level:1 };
leveled = commanderAddXp(3500);   // enough to skip straight to level 4
ok('a big award can cross multiple ranks at once', commander.level===4, commander.level);
ok('the return value is the final level reached, not the first crossed', leveled===4, leveled);
ok('roster_slot is live at level 4', commanderHasPerk('roster_slot'));
ok('roster cap grew by one', rosterCap()===19, rosterCap());

commander = { xp:0, level:MAX_COMMANDER_LEVEL };
ok('max level shows no next threshold', commanderXpNext()===null);
ok('progress bar reads full at max rank', commanderXpPct()===100);
commander.xp = COMMANDER_XP[MAX_COMMANDER_LEVEL-1] + 999999;
leveled = commanderAddXp(1);
ok('xp keeps accumulating past max but level is capped', commander.level===MAX_COMMANDER_LEVEL && leveled===null);

console.log('\n[61] rank perks apply for real, on any legion');
commander = { xp:0, level:8 };   // roster_slot + roster_slot2 + exp_all live
ok('both roster perks stack', rosterCap()===20, rosterCap());
ok('Veteran Cadre (exp_all) is live', commanderHasPerk('exp_all'));
commander = { xp:0, level:10 };
ok('Foundry Contacts (salvage_pct) unlocks at 10, the max rank', commanderHasPerk('salvage_pct'));

console.log('\n[62] Commander Rank survives a full state wipe (New Game)');
commander = { xp:12345, level:5 };
startGame();
ok('starting a brand new legion does not touch commander rank', commander.xp===12345 && commander.level===5,
   commander.xp+'/'+commander.level);
ok('Scavenger\'s Eye at rank 5 gives a starting salvage part', state.parts.length===1, state.parts);
commander = { xp:0, level:1 };
startGame();
ok('and without the perk, a fresh legion starts with none', state.parts.length===0);

console.log('\n[63] localStorage round-trip and corruption guards');
_storageOK = null;
commander = { xp:777, level:3 };
saveStoredCommander();
const raw = rawStore()[COMMANDER_KEY];
ok('a save writes readable JSON', !!raw && JSON.parse(raw).xp===777, raw);
ok('a fresh load reconstructs it', (function(){ const d=loadStoredCommander(); return d && d.xp===777 && d.level===3; })());
rawStore()[COMMANDER_KEY] = '{not json';
ok('corrupt JSON is ignored, not thrown', loadStoredCommander()===null);
rawStore()[COMMANDER_KEY] = JSON.stringify({xp:'oops', level:3});
ok('a non-numeric field is rejected', loadStoredCommander()===null);
rawStore()[COMMANDER_KEY] = JSON.stringify({xp:5, level:9999});
ok('an out-of-range level is clamped on load', loadStoredCommander().level===MAX_COMMANDER_LEVEL);
delete rawStore()[COMMANDER_KEY];
commander = { xp:0, level:1 };

console.log('\n[64] the hub and rank screen reflect it');
commander = { xp:2000, level:3 };
startGame();
ok('the hub button shows the current level', /Commander Rank 3/.test(renderHub()), renderHub().match(/Commander Rank \d+/));
goCommanderRank();
ok('navigating there sets the screen', state.screen==='commander');
const rankHtml = renderCommanderRank();
ok('rank screen shows the level', /Level 3/.test(rankHtml), rankHtml.slice(0,200));
ok('rank screen lists every perk tier', [2,4,6,8,10].every(l=>rankHtml.indexOf(COMMANDER_PERKS[l].name)>=0));
ok('earned perks are checked off, locked ones are not', /✔.*Scavenger/.test(rankHtml) && /○.*Extended Muster/.test(rankHtml));
commander = { xp:0, level:1 };

console.log('\n[65] Victory Portrait — only genuinely big wins get one');
startGame();
let B = setupFight([newMonster('emberling',20), newMonster('aqualing',20)], 3);   // no boss on stage 3
forceWin();
ok('an ordinary stage win gets no portrait', state.lastResult.portrait===null, state.lastResult.portrait);
ok('and none is attached to the journal entry', !state.journal[0].portrait);

console.log('\n[66] a boss/warlord win generates a themed portrait');
startGame();
B = setupFight([newMonster('emberling',20), newMonster('aqualing',20)], 7);   // stage 7 is always Warlord Ashclaw
ok('stage 7 is Warlord Ashclaw', bossForStage(7).name==='Warlord Ashclaw' && bossForStage(7).isWarlord===true);
const mvpUnit = B.playerUnits[0];
B.dmgByUnitId[mvpUnit.id] = 500;   // make the MVP deterministic for the test
forceWin();
const p = state.lastResult.portrait;
ok('a warlord kill gets a portrait', !!p, p);
ok('it is flagged as a warlord fight with its faction', p.warlord===true && p.faction==='The Ashclaw Warband', p);
ok('the boss name and emoji are recorded', p.bossName==='Warlord Ashclaw' && p.bossEmoji==='🐉');
ok('the MVP is whoever dealt the most damage', p.mvpName===mvpUnit.name, p.mvpName+' vs '+mvpUnit.name);
ok('the stage label is set', p.label==='Stage 7', p.label);
ok('it rides along on the journal entry too', state.journal[0].portrait && state.journal[0].portrait.bossName==='Warlord Ashclaw');
const resultHtml = renderResult();
ok('the result screen names the fallen warlord', resultHtml.indexOf('Warlord Ashclaw')>=0, resultHtml.slice(0,300));
ok('and credits the MVP', resultHtml.indexOf(mvpUnit.name)>=0, mvpUnit.name);
const journalHtml = renderJournal();
ok('the war journal also shows the portrait', journalHtml.indexOf('Warlord Ashclaw')>=0 && journalHtml.indexOf(mvpUnit.name)>=0);

console.log('\n[67] the campaign finale gets a portrait even without a scripted boss on that depth');
startGame();
B = setupFight([newMonster('emberling',30)], CAMPAIGN_LENGTH);   // stage 10 is both the finale and a scripted boss
ok('stage 10 is the finale', CAMPAIGN_LENGTH===state.stage);
forceWin();
ok('finale win has a portrait', !!state.lastResult.portrait);
ok('and is marked as the finale', state.lastResult.portrait.finale===true);
const finaleHtml = renderResult();
ok('finale screen shows THE GATE FALLS with the portrait beneath it', /THE GATE FALLS/.test(finaleHtml));

console.log('\n[68] a defeat never generates a portrait');
startGame();
B = setupFight([newMonster('emberling',1)], 7);
state.battle.playerUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
checkBattleEnd();
ok('a loss on a boss stage still gets no portrait', state.lastResult.portrait===null);

console.log('\n[69] portraits survive a save/load round trip, malformed ones do not');
startGame();
B = setupFight([newMonster('emberling',20)], 7);
B.dmgByUnitId[B.playerUnits[0].id] = 999;
forceWin();
ok('journal carries the portrait before saving', !!state.journal[0].portrait);
const revived = reviveJournal(JSON.parse(JSON.stringify(state.journal)));
ok('a clean portrait survives the revive', revived[0].portrait && revived[0].portrait.bossName==='Warlord Ashclaw', revived[0].portrait);
ok('unknown fields are stripped, not carried through', Object.keys(revived[0].portrait).sort().join(',') ===
   ['bossEmoji','bossName','element','faction','finale','label','mvpEmoji','mvpName','warlord'].sort().join(','));
const badJournal = [{ id:'j1', stage:7, win:true, text:'test entry', at:Date.now(), portrait:{ element:'not-a-real-element', label:'x' } }];
ok('a portrait with a bogus element is dropped, entry kept', reviveJournal(badJournal)[0].portrait===null);
const noLabel = [{ id:'j2', stage:7, win:true, text:'test entry', at:Date.now(), portrait:{ element:'fire' } }];
ok('a portrait missing its label is dropped too', reviveJournal(noLabel)[0].portrait===null);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
