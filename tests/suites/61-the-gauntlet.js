
(function(){
function twoMonsters(){ return [newMonster('emberling',10,1,{key:'keen'}), newMonster('aqualing',10,1,{key:'keen'})]; }
function fullFormation(){
  const mons = twoMonsters();
  state.roster = mons;
  state.formation.front = [mons[0].uid, mons[1].uid, null];
  state.formation.back = [null,null,null];
}
function clearFinale(){ state.cleared[CAMPAIGN_LENGTH] = true; }
function forceWin(){ state.battle.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;}); endBattle('win'); }
function forceLose(){ state.battle.playerUnits.forEach(u=>{u.hp=0;u.fainted=true;}); endBattle('lose'); }

console.log('\n[424] gauntletAvailable(): locked until the campaign finale has been cleared at least once, exactly the clearedStages() gate Redeployment/Trials already use');
startGame();
ok('a fresh legion has not unlocked the Gauntlet', gauntletAvailable()===false);
state.cleared[CAMPAIGN_LENGTH-1] = true;
ok('clearing every stage except the finale still does not unlock it', gauntletAvailable()===false);
clearFinale();
ok('clearing the finale unlocks it', gauntletAvailable()===true);

console.log('\n[425] beginGauntlet(): refuses cleanly (no state mutation) when locked, formation-empty or unaffordable; charges the flat entry fee exactly once and starts wave 1 at Depth 1');
startGame();
energy = { current: ENERGY_MAX, lastUpdate: Date.now() };
fullFormation();
beginGauntlet();
ok('refuses outright while still locked, even with a full formation and energy to spare', state.gauntletRun===false && state.battle===null);
clearFinale();
state.roster = []; state.formation.front=[null,null,null]; state.formation.back=[null,null,null];
beginGauntlet();
ok('refuses with an empty formation, even once unlocked', state.gauntletRun===false && state.battle===null);
fullFormation();
energy.current = GAUNTLET_ENTRY_COST-1;
beginGauntlet();
ok('refuses one energy short of the entry fee', state.gauntletRun===false && state.battle===null && energy.current===GAUNTLET_ENTRY_COST-1);
energy.current = ENERGY_MAX;
beginGauntlet();
ok('once affordable, the entry fee is charged exactly once', energy.current===ENERGY_MAX-GAUNTLET_ENTRY_COST);
ok('wave 1 begins at the virtual Depth-1 stage (CAMPAIGN_LENGTH+1) — the Deep\'s own scaling, reused wholesale', state.gauntletRun===true && state.gauntlet.wave===1 && state.stage===CAMPAIGN_LENGTH+1 && isDeep(state.stage) && deepDepth(state.stage)===1);
ok('a real battle is actually underway', !!state.battle && state.screen==='battle');
ok('GAUNTLET_ENTRY_COST is deliberately the same flat cost as one ordinary campaign battle', GAUNTLET_ENTRY_COST===5);
forceWin();
endGauntlet();

console.log('\n[426] isCampaignBattle()/beginBattle(): a Gauntlet wave sits outside the campaign boundary — no per-wave Energy charge, and it never touches EXP, Doctrine, Battle-Forged Bonds or state.cleared');
startGame();
clearFinale();
fullFormation();
energy = { current: ENERGY_MAX, lastUpdate: Date.now() };
beginGauntlet();
ok('a live Gauntlet wave reads as outside the campaign boundary', isCampaignBattle()===false);
const energyAfterEntry = energy.current;
const expBefore = state.roster.map(m=>m.exp);
const doctrineWinsBefore = state.doctrine.wins;
const clearedBefore = Object.assign({}, state.cleared);
forceWin();
ok('winning a wave charges no further energy beyond the one-time entry fee', energy.current===energyAfterEntry);
ok('no EXP is awarded for a wave clear — this never touches the campaign reward pipeline', state.roster.every((m,i)=>m.exp===expBefore[i]));
ok('Rustbound Doctrine never logs a Gauntlet win', state.doctrine.wins===doctrineWinsBefore);
ok('state.cleared is completely untouched by a Gauntlet wave', JSON.stringify(state.cleared)===JSON.stringify(clearedBefore));
endGauntlet();

console.log('\n[427] endBattle() on a win: awards a small capped salvage drop, advances the wave, and records a new personal best the moment it\'s actually a new one');
startGame();
clearFinale();
fullFormation();
energy = { current: ENERGY_MAX, lastUpdate: Date.now() };
state.parts = [];
beginGauntlet();
forceWin();
ok('wave 1 cleared is recorded as lastResult', state.lastResult.gauntlet===true && state.lastResult.win===true && state.lastResult.waveCleared===1);
ok('a salvage drop was granted for clearing it', state.parts.length===1 && !!state.lastResult.drop);
ok('the wave counter advanced to 2 for the next attempt', state.gauntlet.wave===2);
ok('clearing wave 1 for the first time is a new personal best', state.gauntletBest===1 && state.lastResult.isRecord===true);
state.parts = fillTo14();
function fillTo14(){ const a=[]; for(let i=0;i<14;i++) a.push({uid:uid(), key:'scraphound'}); return a; }
continueGauntlet();
const partsBefore = state.parts.length;
forceWin();
ok('a full salvage bay (14/14) simply grants no drop rather than erroring', state.parts.length===partsBefore && !state.lastResult.drop);
ok('the best score keeps climbing as further waves clear', state.gauntletBest===2 && state.lastResult.isRecord===true);
endGauntlet();

console.log('\n[428] endBattle() on a loss: ends the run, reports waves actually cleared (one less than the wave you died on), restores the real stage, and only flags a record when it truly is one');
startGame();
clearFinale();
fullFormation();
energy = { current: ENERGY_MAX, lastUpdate: Date.now() };
state.stage = 3;   // the real, non-Gauntlet stage this legion is sitting at
beginGauntlet();
forceWin();          // clears wave 1
continueGauntlet();  // into wave 2
forceLose();
ok('dying on wave 2 reports exactly 1 wave actually cleared', state.lastResult.gauntlet===true && state.lastResult.win===false && state.lastResult.wavesCleared===1);
ok('losing on your very first-ever cleared wave is still a genuine new best', state.gauntletBest===1 && state.lastResult.isRecord===true);
ok('the run flags are torn down — no lingering mid-run state', state.gauntletRun===false && state.gauntlet===null);
ok('the player\'s real stage (3) is restored, not left at some Depth from the run', state.stage===3);

startGame();
clearFinale();
fullFormation();
energy = { current: ENERGY_MAX, lastUpdate: Date.now() };
state.gauntletBest = 5;
beginGauntlet();
forceLose();
ok('dying on wave 1 when the legion\'s already-established best is higher is correctly NOT a new record', state.lastResult.wavesCleared===0 && state.lastResult.isRecord===false && state.gauntletBest===5);

console.log('\n[429] continueGauntlet()/renderResult(): the only way forward after a win is onward, at the correct next Depth, and the loss/win screens both render with the right numbers');
startGame();
clearFinale();
fullFormation();
energy = { current: ENERGY_MAX, lastUpdate: Date.now() };
beginGauntlet();
forceWin();
let html = renderResult();
ok('a wave-clear screen names the wave just cleared and offers only "Continue" — no way to bank the score early', html.indexOf('WAVE 1 CLEARED')>=0 && html.indexOf('continueGauntlet()')>=0 && html.indexOf('Wave 2')>=0);
ok('and never offers a "Return to Hub" escape hatch on a Gauntlet win', html.indexOf('Return to Hub')<0);
continueGauntlet();
ok('continuing lands on wave 2 at the correct next Depth', state.gauntlet.wave===2 && state.stage===CAMPAIGN_LENGTH+2 && deepDepth(state.stage)===2);
forceLose();
html = renderResult();
ok('the run-over screen reports the true wave count and routes "Return to Hub" through endGauntlet()', html.indexOf('THE GAUNTLET ENDS')>=0 && html.indexOf('endGauntlet()')>=0 && /held for.*1/.test(html));

console.log('\n[430] renderGauntlet()/the Hub: the lobby screen disables its own Enter button with a reason when unaffordable or empty, and the Hub only surfaces the mode once it\'s unlocked');
startGame();
hubTab = 'campaign';
html = renderHub();
ok('a legion that has never cleared the finale sees no Gauntlet entry point at all in the Hub', html.indexOf('goGauntlet()')<0);
clearFinale();
state.gauntletBest = 7;
html = renderHub();
ok('once unlocked, the Hub surfaces it with the running best score', html.indexOf('goGauntlet()')>=0 && html.indexOf('Wave 7')>=0);

startGame();
clearFinale();
state.roster = []; state.formation.front=[null,null,null]; state.formation.back=[null,null,null];
html = renderGauntlet();
ok('the lobby disables Enter with an empty formation and explains why', /disabled[^>]*>☠ Enter the Gauntlet/.test(html) && html.indexOf('Assign at least one monster')>=0);
fullFormation();
energy = { current: GAUNTLET_ENTRY_COST-1, lastUpdate: Date.now() };
html = renderGauntlet();
ok('and disables it one energy short, with its own explanatory line', /disabled[^>]*>☠ Enter the Gauntlet/.test(html) && html.indexOf('Needs '+GAUNTLET_ENTRY_COST+' energy')>=0);
energy.current = GAUNTLET_ENTRY_COST;
html = renderGauntlet();
ok('and re-enables the moment both conditions are met', !/disabled[^>]*>☠ Enter the Gauntlet/.test(html));

console.log('\n[431] persistence: gauntletBest is a permanent, Rebirth-surviving high-water mark reset only by a brand-new legion; the run flags themselves are always transient and never saved');
startGame();
clearFinale();
state.gauntletBest = 12;
let saved = serializeSave();
ok('the best score rides along in a save, exactly as reached', saved.gauntletBest===12);
ok('but the transient run flags never do — nothing here to leak into a save file', !('gauntletRun' in saved) && !('gauntlet' in saved));
applySave(saved, 0);
ok('a clean round-trip restores the exact best score', state.gauntletBest===12);
applySave({v:1, name:'x', stage:1, roster:[], formation:{front:[null,null,null],back:[null,null,null]}}, 0);
ok('a save from before this feature existed loads with a zero best, not a crash', state.gauntletBest===0);
applySave(Object.assign({}, saved, { gauntletBest: -3 }), 0);
ok('a garbage negative best degrades to zero, never a negative record', state.gauntletBest===0);
applySave(Object.assign({}, saved, { gauntletBest: 'not-a-number' }), 0);
ok('a non-numeric best degrades to zero the same way', state.gauntletBest===0);

startGame();
clearFinale();
state.gauntletBest = 9;
state.stage = REBIRTH_MIN_STAGE;
doRebirth(); // arm
doRebirth(); // confirm
ok('a Rebirth never wipes the Gauntlet\'s best score — same "this legion\'s history" treatment as bestDepth/bestStreak', state.gauntletBest===9);
ok('...and since Rebirth never wipes state.cleared either ("cleared trials" explicitly stays per Legion Identity), having once cleared the finale keeps the Gauntlet unlocked straight through a Rebirth', gauntletAvailable()===true);

startGame();
ok('starting a brand-new legion resets the best score to zero', state.gauntletBest===0);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
