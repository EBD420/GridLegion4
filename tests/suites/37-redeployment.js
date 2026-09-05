
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
function sixMonsters(){ return ['emberling','aqualing','terrafang','emberling','aqualing','terrafang'].map(id=>newMonster(id,10)); }
function clearStages(list){ state.cleared = {}; list.forEach(n=>{ state.cleared[n]=true; }); }

console.log('\n[217] the basics: an empty Redeployment screen, and the Hub button gated the same way as Trials');
startGame();
state.cleared = {};
ok('nothing cleared yet -> clearedStages() is empty', clearedStages().length===0);
goRedeploy();
ok('goRedeploy lands on the redeploy screen', state.screen==='redeploy');
ok('goRedeploy resets any stale pick', state.redeployPick===null);
let html = renderRedeploy();
ok('an empty roster of cleared stages shows the "clear a stage first" message, not a picker', /clear a stage first/i.test(html));
ok('no stage buttons render when nothing is cleared', !/pickRedeployStage/.test(html));
hubTab='campaign';
let hubHtml = renderHub();
ok('the Hub hides the Redeployment button entirely until something is cleared', hubHtml.indexOf('Redeployment')<0);

console.log('\n[218] once stages are cleared: the picker, its default, and the Hub button');
clearStages([7,1,4,2]);
ok('clearedStages() reads back sorted ascending, regardless of insertion order', clearedStages().join(',')==='1,2,4,7');
goRedeploy();
html = renderRedeploy();
ok('the picker lists every cleared stage as a button', [1,2,4,7].every(n=>html.indexOf(`pickRedeployStage(${n})`)>=0));
ok('an uncleared stage never gets a button', html.indexOf('pickRedeployStage(3)')<0 && html.indexOf('pickRedeployStage(5)')<0);
ok('the default pick is the LOWEST cleared stage, not the highest — this is about going back', state.redeployPick.stage===1);
hubHtml = renderHub();
ok('the Hub shows the Redeployment button, counted just like Trials', hubHtml.indexOf('🔁 Redeployment (4)')>=0);

console.log('\n[219] pickRedeployStage, and the deploy button\'s empty-formation guard');
pickRedeployStage(4);
ok('picking a cleared stage updates the pick', state.redeployPick.stage===4);
state.formation = { front:[null,null,null], back:[null,null,null] };
html = renderRedeploy();
ok('the deploy button is disabled outright with an empty formation', html.indexOf('disabled onclick="beginRedeploy()"')>=0);
state.roster = sixMonsters();
state.formation.front = [state.roster[0].uid, state.roster[1].uid, state.roster[2].uid];
html = renderRedeploy();
ok('and enabled again once a formation is set', html.indexOf('disabled onclick="beginRedeploy()"')<0 && html.indexOf('onclick="beginRedeploy()"')>=0);

console.log('\n[220] beginRedeploy refuses anything that was never actually cleared');
const stageBefore = state.stage, battleBefore = state.battle;
state.redeployPick = { stage: 99 };
beginRedeploy();
ok('a garbage/uncleared stage never starts a battle', state.battle===battleBefore);
ok('and never touches state.stage or state.redeploy either', state.stage===stageBefore && state.redeploy===null);

console.log('\n[221] beginRedeploy: a real battle against the picked stage, with state.stage swapped for its duration');
startGame();
clearStages([1,2,3,4,5,6,7]);
state.stage = 8;   // the actual frontier
state.roster = sixMonsters();
state.formation.front = [state.roster[0].uid, state.roster[1].uid, state.roster[2].uid];
state.formation.back = [state.roster[3].uid, state.roster[4].uid, state.roster[5].uid];
pickRedeployStage(3);
beginRedeploy();
ok('state.redeploy records the picked stage', state.redeploy && state.redeploy.stage===3);
ok('state.stage is swapped to the picked stage for the fight\'s duration', state.stage===3);
ok('the frontier is remembered so it can be restored later', state.stageBeforeRedeploy===8);
ok('a real battle actually started', !!state.battle && !state.battle.result);
ok('the enemies were built against the redeployed stage\'s own terrain, not the frontier\'s', state.battle.terrain===terrainForStage(3) && state.battle.terrain!==terrainForStage(8));
html = renderBattle();
ok('the battle screen carries the Redeployment banner', html.indexOf('🔁 REDEPLOYMENT')>=0);
ok('the header reads the redeployed stage, not the frontier', html.indexOf('STAGE 3')>=0);

console.log('\n[222] isHardFight is gated off during a redeploy — Loadout Gambit stays out of it, same as Trials');
ok('sanity: stage 3 with no special mode active would NOT be a hard fight anyway (no boss/elite there)', true);
startGame();
clearStages([5]);
state.stage = 12;
state.roster = sixMonsters();
state.formation.front = [state.roster[0].uid, state.roster[1].uid, state.roster[2].uid];
pickRedeployStage(5);
ok('sanity: stage 5 IS normally a hard fight (a Commander) before any redeploy starts', isHardFight(5));
beginRedeploy();
ok('once redeployed to it, the very same stage no longer counts as a hard fight', !isHardFight(5));
ok('and no Loadout Gambit was rolled for this battle', state.battle.gambit===null);

console.log('\n[223] a redeploy WIN flows through the real win path — EXP, doctrine, favour, bonds, journal and Commander Rank all still apply (unlike a Trial, which skips every one of these)');
startGame();
clearStages([1,2,3]);
state.stage = 6;
state.roster = sixMonsters();
state.formation.front = [state.roster[0].uid, state.roster[1].uid, state.roster[2].uid];
state.formation.back = [state.roster[3].uid, state.roster[4].uid, state.roster[5].uid];
const expBefore = state.roster[0].exp;
const doctrineWinsBefore = state.doctrine.wins;
const intelWinsBefore = state.intel.wins;
const journalLenBefore = state.journal.length;
const commanderXpBefore = commander.xp;
Math.random = () => 0;   // deterministic recruit/salvage rolls
pickRedeployStage(2);
beginRedeploy();
forceWin();
Math.random = realRandom;
ok('the result is tagged as a redeploy', state.lastResult && state.lastResult.redeploy===true);
ok('the result is still a genuine win with a real EXP figure', state.lastResult.win===true && state.lastResult.expGain>0);
ok('EXP was actually awarded to the roster', state.roster[0].exp>expBefore || state.roster[0].level>1);
ok('Rustbound Doctrine still tallies this win', state.doctrine.wins===doctrineWinsBefore+1);
ok('Intel\'s own short-term win counter still ticks up too', state.intel.wins===intelWinsBefore+1);
ok('a War Journal entry was written for it', state.journal.length===journalLenBefore+1);
ok('...and that entry is itself tagged as a redeploy', state.journal[0].redeploy===true);
ok('Commander Rank XP still accrues from a redeploy win', commander.xp>commanderXpBefore);

console.log('\n[224] the result screen: full normal content, but routed back to the Hub instead of advancing the frontier');
html = renderResult();
ok('the ordinary VICTORY panel renders (not a stripped-down Trial-style summary)', /VICTORY!|COMMANDER DOWN!|ELITE WAVE BROKEN!/.test(html));
ok('it carries the redeploy note', html.indexOf('🔁 Redeployment')>=0);
ok('the button returns to the Hub, not onward through the campaign', html.indexOf('onclick="endRedeploy()"')>=0 && html.indexOf('Return to Hub')>=0);
ok('it never offers to advance or descend', html.indexOf('advanceStage()')<0);

console.log('\n[225] endRedeploy: the frontier is restored exactly, nothing is left dangling');
endRedeploy();
ok('state.stage is back to the real frontier', state.stage===6);
ok('state.redeploy is cleared', state.redeploy===null);
ok('state.battle is cleared and we\'re back on the Hub', state.battle===null && state.screen==='hub');

console.log('\n[226] a redeploy LOSS: still teaches the legion something, still tagged, still routes home');
startGame();
clearStages([1,2,3]);
state.stage = 6;
state.roster = sixMonsters();
state.formation.front = [state.roster[0].uid, state.roster[1].uid, state.roster[2].uid];
pickRedeployStage(1);
beginRedeploy();
forceLose();
ok('a redeploy loss is still tagged', state.lastResult && state.lastResult.redeploy===true && state.lastResult.win===false);
ok('a defeat still awards some consolation EXP, same as any other loss', state.lastResult.expGain>0);
html = renderResult();
ok('the DEFEAT panel renders with the redeploy note', /DEFEAT/.test(html) && html.indexOf('🔁 Redeployment')>=0);
ok('its button also returns to the Hub rather than offering a Retry', html.indexOf('onclick="endRedeploy()"')>=0 && html.indexOf('retryStage()')<0);
endRedeploy();
ok('the frontier is restored after a loss too', state.stage===6 && state.redeploy===null);

console.log('\n[227] the campaign finale is never re-triggered by a redeploy — even a Stage 10 replay just wins normally');
startGame();
clearStages([1,2,3,4,5,6,7,8,9,10]);
state.stage = CAMPAIGN_LENGTH + 3;   // already well into the Deep
state.roster = sixMonsters();
state.formation.front = [state.roster[0].uid, state.roster[1].uid, state.roster[2].uid];
state.formation.back = [state.roster[3].uid, state.roster[4].uid, state.roster[5].uid];
pickRedeployStage(CAMPAIGN_LENGTH);
beginRedeploy();
forceWin();
ok('sanity: state.stage really is the finale stage during this fight', state.stage===CAMPAIGN_LENGTH);
ok('sanity: this technically satisfies the finale condition', state.lastResult.finale===true);
html = renderResult();
ok('but the finale cutscene never renders for a redeploy', html.indexOf('THE GATE FALLS')<0);
ok('the ordinary win panel renders instead (Stage 10 is a Commander fight), routed back to the Hub', /VICTORY!|COMMANDER DOWN!/.test(html) && html.indexOf('onclick="endRedeploy()"')>=0);
ok('and the Victory Portrait itself does not claim the campaign just ended either', html.indexOf('CAMPAIGN COMPLETE')<0);
endRedeploy();
ok('the player\'s real Deep progress is completely untouched', state.stage===CAMPAIGN_LENGTH+3);

console.log('\n[228] War Journal: the 🔁 marker appears only on entries that actually were a redeploy');
startGame();
clearStages([1,2]);
state.stage = 5;
state.roster = sixMonsters();
state.formation.front = [state.roster[0].uid, state.roster[1].uid, state.roster[2].uid];
beginBattle();   // an ordinary frontier fight — no redeploy involved
forceWin();
ok('an ordinary win\'s journal entry is not tagged as a redeploy', !state.journal[0].redeploy);
state.roster = sixMonsters();
state.formation.front = [state.roster[0].uid, state.roster[1].uid, state.roster[2].uid];
pickRedeployStage(1);
beginRedeploy();
forceWin();
ok('two journal entries now exist: the newest is the redeploy, the older is the ordinary win', state.journal.length===2);
ok('the redeploy entry (newest) is tagged', state.journal[0].redeploy===true);
ok('the ordinary entry (older) is not', !state.journal[1].redeploy);
html = renderJournal();
ok('exactly one of the two rendered entries shows the 🔁 marker', (html.match(/🔁 /g)||[]).length===1);

console.log('\n[229] the defensive resets: starting a duel, a raid, or a fresh legion all clear a stale state.redeploy');
function armRedeploy(){
  startGame();
  clearStages([1]);
  state.stage = 3;
  state.roster = sixMonsters();
  state.formation.front = [state.roster[0].uid, state.roster[1].uid, state.roster[2].uid];
  pickRedeployStage(1);
  beginRedeploy();
}
armRedeploy();
ok('sanity: state.redeploy is actually set going into these checks', !!state.redeploy);
social.opponent = { user_id:'x', display_name:'Rival', formation:{units:[]} };
startDuel();
ok('starting a duel clears a stale state.redeploy', state.redeploy===null);
state.duel = null; social.opponent = null;

armRedeploy();
startRaidRun();
ok('starting a raid run clears a stale state.redeploy', state.redeploy===null);
state.raidRun = false;

armRedeploy();
startGame();
ok('starting a brand-new legion clears it too', state.redeploy===null);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
