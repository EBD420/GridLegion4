
(function(){
function setupFight(mons, stage){
  state.roster = mons;
  state.formation.front = [mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back = [mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.stage = stage;
}
function twoMonsters(){ return [newMonster('emberling',10,1,{key:'keen'}), newMonster('aqualing',10,1,{key:'keen'})]; }
const HOUR = 3600000;

console.log('\n[416] constants, loadStoredEnergy()/saveStoredEnergy(): sane numbers, a fresh device starts full, malformed or missing storage degrades to a fresh full tank, and a clean save round-trips exactly');
ok('a full tank is worth exactly twenty campaign battles', ENERGY_MAX/ENERGY_COST_PER_BATTLE===20, ENERGY_MAX+'/'+ENERGY_COST_PER_BATTLE);
ok('one hour of regen exactly pays for one battle', ENERGY_REGEN_PER_HOUR===ENERGY_COST_PER_BATTLE);
delete rawStore()[ENERGY_KEY];
ok('with nothing ever saved, loadStoredEnergy() reports nothing to load', loadStoredEnergy()===null);
ok('a brand-new device module-loads a full tank', energy.current===ENERGY_MAX);
_storageOK = null;
energy = { current: 42, lastUpdate: 123456 };
saveStoredEnergy();
let raw = rawStore()[ENERGY_KEY];
ok('a save writes readable JSON with both fields', !!raw && JSON.parse(raw).current===42 && JSON.parse(raw).lastUpdate===123456, raw);
let loaded = loadStoredEnergy();
ok('a fresh load reconstructs it exactly', !!loaded && loaded.current===42 && loaded.lastUpdate===123456);
rawStore()[ENERGY_KEY] = '{not json';
ok('corrupt JSON is ignored, not thrown', loadStoredEnergy()===null);
rawStore()[ENERGY_KEY] = JSON.stringify({ current:'oops', lastUpdate:123 });
ok('a non-numeric current is rejected', loadStoredEnergy()===null);
rawStore()[ENERGY_KEY] = JSON.stringify({ current:50, lastUpdate:'oops' });
ok('a non-numeric lastUpdate is rejected the same way', loadStoredEnergy()===null);
rawStore()[ENERGY_KEY] = JSON.stringify({ current:-5, lastUpdate:100 });
ok('an out-of-range low current is clamped up to zero on load, not rejected outright', loadStoredEnergy().current===0);
rawStore()[ENERGY_KEY] = JSON.stringify({ current:99999, lastUpdate:100 });
ok('an out-of-range high current is clamped down to the cap on load', loadStoredEnergy().current===ENERGY_MAX);
delete rawStore()[ENERGY_KEY];
energy = { current: ENERGY_MAX, lastUpdate: Date.now() };

console.log('\n[417] tickEnergy(): whole-hour batches only — nothing under an hour, exact multiples once it crosses, clamped at the cap, and never banks while already full');
energy = { current: 10, lastUpdate: 1000000 };
tickEnergy(1000000 + HOUR - 1);
ok('one millisecond short of an hour regenerates nothing at all', energy.current===10 && energy.lastUpdate===1000000);
tickEnergy(1000000 + HOUR);
ok('exactly one whole hour credits exactly one hour\'s worth', energy.current===10+ENERGY_REGEN_PER_HOUR);
ok('lastUpdate advances by exactly that one hour, not all the way to now', energy.lastUpdate===1000000+HOUR);
energy = { current: 10, lastUpdate: 1000000 };
tickEnergy(1000000 + HOUR*3 + 1000);
ok('three-plus whole hours credits exactly three hours\' worth, the odd 1000ms left for next time', energy.current===10+ENERGY_REGEN_PER_HOUR*3);
ok('lastUpdate advances by exactly three whole hours, preserving the leftover partial hour', energy.lastUpdate===1000000+HOUR*3);
energy = { current: ENERGY_MAX-2, lastUpdate: 1000000 };
tickEnergy(1000000 + HOUR*10);
ok('regen clamps at the cap even when far more than enough hours have passed', energy.current===ENERGY_MAX);
energy = { current: ENERGY_MAX, lastUpdate: 1000000 };
tickEnergy(1000000 + HOUR*24*7);
ok('sitting at max for a week never banks anything', energy.current===ENERGY_MAX);
ok('lastUpdate is simply rebased to now while full, rather than accumulating a week of banked hours', energy.lastUpdate===1000000+HOUR*24*7);
energy.current = 50;
tickEnergy(1000000 + HOUR*24*7 + 1000);
ok('once it later drops below the cap, only real elapsed time from that rebase counts — no week-old banked regen suddenly lands', energy.current===50);
energy = { current: 3, lastUpdate: 1000000 };
tickEnergy(1000000 + HOUR + 30*60000);
tickEnergy(1000000 + HOUR + 45*60000);
ok('two sub-hour ticks in a row do not double-credit — the second call, still short of the next whole hour, adds nothing further', energy.current===3+ENERGY_REGEN_PER_HOUR);
energy = { current: ENERGY_MAX, lastUpdate: Date.now() };

console.log('\n[418] hasEnergyFor()/spendEnergy()/energyPct()/energyMinutesToNextTick(): the basic math, clamped and refusing cleanly');
energy = { current: 20, lastUpdate: Date.now() };
ok('affordable exactly at the cost', hasEnergyFor(20)===true);
ok('affordable comfortably under the cost', hasEnergyFor(5)===true);
ok('not affordable one short', hasEnergyFor(21)===false);
ok('spending an affordable amount succeeds and deducts exactly that much', spendEnergy(ENERGY_COST_PER_BATTLE)===true && energy.current===20-ENERGY_COST_PER_BATTLE);
energy = { current: 3, lastUpdate: Date.now() };
ok('spending more than is available is refused outright', spendEnergy(ENERGY_COST_PER_BATTLE)===false);
ok('...and leaves the balance completely untouched', energy.current===3);
energy = { current: 0, lastUpdate: Date.now() };
ok('spending anything at zero is refused', spendEnergy(1)===false && energy.current===0);
energy = { current: ENERGY_MAX, lastUpdate: Date.now() };
ok('energyPct() reads 100 at a full tank', energyPct()===100);
energy.current = ENERGY_MAX/2;
ok('energyPct() reads 50 at half a tank', energyPct()===50);
energy.current = 0;
ok('energyPct() reads 0 at empty', energyPct()===0);
energy = { current: ENERGY_MAX, lastUpdate: Date.now() };
ok('a full tank has no next tick to wait for', energyMinutesToNextTick()===0);
energy = { current: 10, lastUpdate: Date.now() - (HOUR - 5*60000) };
ok('with 55 minutes already elapsed toward the next batch, about 5 minutes remain', energyMinutesToNextTick()<=5 && energyMinutesToNextTick()>=1, energyMinutesToNextTick());
energy = { current: 10, lastUpdate: Date.now() };
ok('freshly ticked, up to a full 60 minutes remain until the next batch', energyMinutesToNextTick()<=60 && energyMinutesToNextTick()>=55, energyMinutesToNextTick());
energy = { current: ENERGY_MAX, lastUpdate: Date.now() };

console.log('\n[419] isCampaignBattle(): a stage battle, a Redeployment, a Detour and the Undercroft all count; a Duel, a Raid, the World Boss, a Guild War sortie, a Trial and the tutorial all do not — and mercenaryEligibleBattle() delegates to the exact same rule');
startGame();
ok('an ordinary stage battle counts as the campaign', isCampaignBattle()===true);
state.redeploy = { stage:1 };
ok('a Redeployment still counts — it is the campaign, just replayed', isCampaignBattle()===true);
state.redeploy = null;
state.detour = { id:'stripped_grove' };
ok('a Campaign Map Detour counts too', isCampaignBattle()===true);
state.detour = null;
state.undercroft = true;
ok('and so does a trip into the Undercroft', isCampaignBattle()===true);
state.undercroft = null;
[['duel'],['raidRun'],['worldBossRun'],['guildWarRun']].forEach(([flag])=>{
  state[flag] = true;
  ok(`${flag} is excluded from the campaign`, isCampaignBattle()===false);
  state[flag] = false;
});
state.trial = { mods:[], stage:1, reward:1 };
ok('a Trial is excluded from the campaign', isCampaignBattle()===false);
state.trial = null;
state.tutorial = { done:false };
ok('an in-progress tutorial is excluded from the campaign', isCampaignBattle()===false);
state.tutorial = { done:true };
ok('a finished tutorial no longer excludes it', isCampaignBattle()===true);
state.tutorial = null;
ok('mercenaryEligibleBattle() is now just a thin alias for the exact same rule', mercenaryEligibleBattle()===isCampaignBattle());
state.duel = true;
ok('...proven again with an excluded flag set, so it is not a coincidence of both defaulting true', mercenaryEligibleBattle()===isCampaignBattle() && mercenaryEligibleBattle()===false);
state.duel = false;

console.log('\n[420] beginBattle(): a campaign battle actually charges ENERGY_COST_PER_BATTLE the instant it begins; every excluded mode leaves energy completely untouched');
startGame();
energy = { current: ENERGY_MAX, lastUpdate: Date.now() };
setupFight(twoMonsters(), 1);
beginBattle();
ok('an ordinary stage battle deducts exactly the battle cost', energy.current===ENERGY_MAX-ENERGY_COST_PER_BATTLE);
state.battle.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
endBattle('win');
state.battle = null; // endBattle() leaves it for the result screen; only the real "continue" handlers clear it

startGame();
energy = { current: ENERGY_MAX, lastUpdate: Date.now() };
setupFight(twoMonsters(), 1);
social.opponent = { user_id:'riv1', display_name:'Rival', formation:{units:[]} };
startDuel();
ok('a Duel never touches energy at all', energy.current===ENERGY_MAX);
endDuel();
social.opponent = null;

[['raidRun'], ['worldBossRun'], ['guildWarRun'], ['trial']].forEach(([flag])=>{
  startGame();
  energy = { current: ENERGY_MAX, lastUpdate: Date.now() };
  setupFight(twoMonsters(), 1);
  if(flag==='trial') state.trial = { mods:[], stage:1, reward:1 };
  else state[flag] = true;
  beginBattle();
  ok(`${flag} never charges energy — it runs its own separate difficulty/scoring layer`, energy.current===ENERGY_MAX);
  state.battle = null;
  if(flag==='trial') state.trial = null; else state[flag] = false;
});
energy = { current: ENERGY_MAX, lastUpdate: Date.now() };

console.log('\n[421] the four real entry points refuse cleanly when energy falls short — no state mutation at all — and proceed normally once it is affordable again');
startGame();
setupFight(twoMonsters(), 1);
energy = { current: ENERGY_COST_PER_BATTLE-1, lastUpdate: Date.now() };
goGambitOrBattle();
ok('goGambitOrBattle() refuses outright one short of the cost — no battle starts, no screen changes', state.battle===null && state.screen==='hub');
energy.current = ENERGY_COST_PER_BATTLE;
goGambitOrBattle();
ok('and proceeds the moment it is exactly affordable', !!state.battle);
state.battle.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
endBattle('win');
state.battle = null; // endBattle() leaves it for the result screen; only the real "continue" handlers clear it

startGame();
state.cleared = { 1: true };
state.redeployPick = { stage: 1 };
energy = { current: ENERGY_COST_PER_BATTLE-1, lastUpdate: Date.now() };
beginRedeploy();
ok('beginRedeploy() refuses cleanly when unaffordable — no redeploy state is ever set up', state.redeploy===null && state.battle===null);
energy.current = ENERGY_COST_PER_BATTLE;
beginRedeploy();
ok('and proceeds once affordable', !!state.redeploy && !!state.battle);
state.battle.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
endBattle('win');
endRedeploy();

startGame();
state.cleared = { 2: true };
energy = { current: ENERGY_COST_PER_BATTLE-1, lastUpdate: Date.now() };
beginDetour('stripped_grove');
ok('beginDetour() refuses cleanly when unaffordable — no detour state is ever set up', state.detour===null && state.battle===null);
energy.current = ENERGY_COST_PER_BATTLE;
beginDetour('stripped_grove');
ok('and proceeds once affordable', !!state.detour && !!state.battle);
state.battle.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
endBattle('win');
endDetour();

startGame();
let corrupted = [];
let sum = 0;
while(sum < UNDERCROFT_THRESHOLD || corrupted.length < 6){
  const m = newMonster('emberling', 10, 1, {key:'keen'});
  m.parts = ['cinderjaw_black'];
  corrupted.push(m);
  sum += monsterCorruption(m);
}
state.roster = corrupted;
ok('sanity: this roster genuinely opens the Undercroft', undercroftAvailable()===true);
energy = { current: ENERGY_COST_PER_BATTLE-1, lastUpdate: Date.now() };
beginUndercroft();
ok('beginUndercroft() refuses cleanly when unaffordable — no undercroft state is ever set up', state.undercroft===null && state.battle===null);
energy.current = ENERGY_COST_PER_BATTLE;
beginUndercroft();
ok('and proceeds once affordable', !!state.undercroft && !!state.battle);
state.battle.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
endBattle('win');
endUndercroft();
energy = { current: ENERGY_MAX, lastUpdate: Date.now() };

console.log('\n[422] the Hub/Redeploy/Campaign Map UI: the energy banner renders current/max, full vs. countdown text and a scaled gauge, and every gated button disables with an explanatory line when unaffordable');
startGame();
energy = { current: 63, lastUpdate: Date.now() };
let html = renderHub();
ok('the Hub banner shows the exact current/max reading', html.indexOf('63/'+ENERGY_MAX)>=0);
ok('short of full, it shows a countdown to the next regen tick rather than "(full)"', /next \+\d+ in \d+m/.test(html));
ok('the gauge fill is scaled to the exact live percentage', html.indexOf('width:'+energyPct()+'%; background:var(--volt)')>=0);
energy = { current: ENERGY_MAX, lastUpdate: Date.now() };
html = renderHub();
ok('at a full tank the banner reads "(full)" instead of a countdown', html.indexOf('(full)')>=0);

startGame();
setupFight(twoMonsters(), 1);
energy = { current: ENERGY_COST_PER_BATTLE-1, lastUpdate: Date.now() };
html = renderHub();
ok('the Deploy button disables when energy falls short, even with a full formation', /disabled[^>]*>⚡ DEPLOY TO BATTLE/.test(html));
ok('...and explains why, distinctly from the empty-formation message', html.indexOf('Not enough energy')>=0);
energy.current = ENERGY_COST_PER_BATTLE;
html = renderHub();
ok('and re-enables the instant it is affordable again', !/disabled[^>]*>⚡ DEPLOY TO BATTLE/.test(html));

startGame();
state.roster = corrupted;
energy = { current: ENERGY_COST_PER_BATTLE-1, lastUpdate: Date.now() };
html = renderHub();
ok('the Undercroft\'s Descend button disables the same way when unaffordable', /disabled[^>]*>Descend/.test(html));
ok('...with its own explanatory line naming the shortfall', html.indexOf('needs '+ENERGY_COST_PER_BATTLE+' energy')>=0);
energy.current = ENERGY_COST_PER_BATTLE;
html = renderHub();
ok('and re-enables once affordable', !/disabled[^>]*>Descend/.test(html));

startGame();
state.cleared = { 1:true, 4:true };
goRedeploy();
state.redeployPick = { stage: 1 };
energy = { current: ENERGY_COST_PER_BATTLE-1, lastUpdate: Date.now() };
html = renderRedeploy();
ok('the Redeploy button disables when unaffordable, even with a valid pick', /disabled[^>]*>🔁 REDEPLOY/.test(html));
ok('...and explains the shortfall', html.indexOf('Needs '+ENERGY_COST_PER_BATTLE+' energy')>=0);
energy.current = ENERGY_COST_PER_BATTLE;
html = renderRedeploy();
ok('and re-enables once affordable', !/disabled[^>]*>🔁 REDEPLOY/.test(html));

startGame();
state.cleared = { 2: true };
state.detourSelected = 'stripped_grove';
energy = { current: ENERGY_COST_PER_BATTLE-1, lastUpdate: Date.now() };
html = renderCampaignMap();
ok('the Detour button disables when unaffordable, even for an available detour', /disabled[^>]*>🧭 TAKE THE DETOUR/.test(html));
ok('...and explains the shortfall', html.indexOf('Needs '+ENERGY_COST_PER_BATTLE+' energy')>=0);
energy.current = ENERGY_COST_PER_BATTLE;
html = renderCampaignMap();
ok('and re-enables once affordable', !/disabled[^>]*>🧭 TAKE THE DETOUR/.test(html));
energy = { current: ENERGY_MAX, lastUpdate: Date.now() };

console.log('\n[423] account-level persistence: energy is untouched by startGame()/doRebirth(), is completely absent from any save slot, and only ever survives via its own dedicated localStorage key');
// lastUpdate pinned to "now" so the Hub's own tickEnergy(Date.now()) call, fired
// as an ordinary side effect of every render() here, has no whole hour to work
// with and is a genuine no-op — isolating what startGame()/doRebirth() themselves do.
let ts423 = Date.now();
energy = { current: 37, lastUpdate: ts423 };
startGame();
ok('starting a brand new legion does not touch energy — this is the player\'s own resource, not any one legion\'s', energy.current===37 && energy.lastUpdate===ts423);
state.stage = REBIRTH_MIN_STAGE;
doRebirth(); // arm
doRebirth(); // confirm
ok('prestiging into a Rebirth does not touch it either', energy.current===37 && energy.lastUpdate===ts423);
let saved = serializeSave();
ok('energy never rides along in a save slot at all — it is not this legion\'s to save', !('energy' in saved));
_storageOK = null;
energy = { current: 88, lastUpdate: 999000 };
saveStoredEnergy();
energy = { current: 1, lastUpdate: 1 }; // simulate a fresh process before reload
const reloaded = loadStoredEnergy();
ok('a reload reconstructs it from its own dedicated key, independent of anything save-slot related', !!reloaded && reloaded.current===88 && reloaded.lastUpdate===999000);
delete rawStore()[ENERGY_KEY];
energy = { current: ENERGY_MAX, lastUpdate: Date.now() };

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
