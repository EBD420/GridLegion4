
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
const GROVE = CAMPAIGN_DETOURS.find(d=>d.id==='stripped_grove');

console.log('\n[287] tickCaravan(): the gap, the spawn roll, and expiry — never a live timer, only checked on demand');
startGame();
ok('a fresh legion starts with no offer', state.caravan===null);
ok('and a real eligible-by time out ahead of it, not immediately eligible', state.caravanNextEligible > Date.now());

let now = Date.now();
state.caravan = null;
state.caravanNextEligible = now + 5000;
tickCaravan(now);
ok('ticking before the gap has elapsed does nothing at all', state.caravan===null && state.caravanNextEligible===now+5000);

state.caravanNextEligible = now - 1;
Math.random = () => 0; // well under CARAVAN_SPAWN_CHANCE -> the roll succeeds
tickCaravan(now);
Math.random = realRandom;
ok('once eligible, a successful roll produces a real offer', !!state.caravan);
ok('the offer names a real type', CARAVAN_OFFER_TYPES.indexOf(state.caravan.type)>=0);
ok('the offer names a real tribe', !!TRIBES[state.caravan.tribe]);
ok('the offer carries a real expiry, CARAVAN_WINDOW_MS out from the moment it rolled', state.caravan.expiresAt===now+CARAVAN_WINDOW_MS);

state.caravan = null;
state.caravanNextEligible = now - 1;
Math.random = () => 0.999; // well over CARAVAN_SPAWN_CHANCE -> the roll fails
tickCaravan(now);
Math.random = realRandom;
ok('a failed roll leaves no offer behind', state.caravan===null);
ok('but still pushes the next eligible moment out — a failed roll cannot be retried every single tick', state.caravanNextEligible===now+CARAVAN_MIN_GAP_MS);

state.caravan = { type:'parts_for_favor', tribe:'fire', expiresAt: now+10000 };
tickCaravan(now);
ok('ticking before an active offer expires leaves it completely untouched', state.caravan && state.caravan.expiresAt===now+10000);

state.caravan = { type:'parts_for_favor', tribe:'fire', expiresAt: now };
Math.random = () => 0; // would succeed a reroll if one were attempted in the same tick
tickCaravan(now);
Math.random = realRandom;
ok('an offer at (or past) its expiry is cleared', state.caravan===null);
ok('expiry sets a fresh eligible-by window rather than rerolling in the very same tick', state.caravanNextEligible===now+CARAVAN_MIN_GAP_MS);

console.log('\n[288] rollCaravanOffer / caravanOfferText / caravanCanAfford: the right numbers for the right type');
Math.random = () => 0; // type index 0, tribe index 0
rollCaravanOffer(1000);
Math.random = realRandom;
ok('rollCaravanOffer picks deterministically off Math.random, just like every other roll table in this game',
  state.caravan.type===CARAVAN_OFFER_TYPES[0] && state.caravan.tribe===TRIBE_IDS[0] && state.caravan.expiresAt===1000+CARAVAN_WINDOW_MS);

let pff = { type:'parts_for_favor', tribe:'fire' };
ok('parts_for_favor text names the cost and the reward, with the right tribe', caravanOfferText(pff).indexOf(CARAVAN_PARTS_COST+' salvage parts')>=0 && caravanOfferText(pff).indexOf(CARAVAN_FAVOR_REWARD+' favor')>=0 && caravanOfferText(pff).indexOf(TRIBES.fire.name)>=0);
let ffp = { type:'favor_for_parts', tribe:'water' };
ok('favor_for_parts text names the cost and the reward the other way around', caravanOfferText(ffp).indexOf(CARAVAN_PARTS_REWARD+' salvage parts')>=0 && caravanOfferText(ffp).indexOf(CARAVAN_FAVOR_COST+' of your favor')>=0 && caravanOfferText(ffp).indexOf(TRIBES.water.name)>=0);
let rfs = { type:'recruit_for_salvage', tribe:'nature' };
ok('recruit_for_salvage text names the guaranteed recruit and its price', /guaranteed/i.test(caravanOfferText(rfs)) && caravanOfferText(rfs).indexOf(CARAVAN_RECRUIT_PARTS_COST+' salvage parts')>=0);
ok('a null offer -> empty text, no crash', caravanOfferText(null)==='');

startGame();
ok('caravanCanAfford(null) is always false', caravanCanAfford(null)===false);
state.parts = [];
ok('parts_for_favor needs enough parts in the bay', caravanCanAfford(pff)===false);
state.parts = [{uid:'a',key:'scraphound'},{uid:'b',key:'scraphound'}];
ok('with enough parts, parts_for_favor is affordable', caravanCanAfford(pff)===true);

state.favor = {};
ok('favor_for_parts needs enough favor with that specific tribe', caravanCanAfford(ffp)===false);
addFavor('water', CARAVAN_FAVOR_COST);
ok('with enough favor and bay room, favor_for_parts is affordable', caravanCanAfford(ffp)===true);
for(let i=state.parts.length;i<14;i++) state.parts.push({uid:'p'+i,key:'scraphound'});
ok('but a full salvage bay blocks it even with the favor to spend', state.parts.length===14 && caravanCanAfford(ffp)===false);

state.parts = [{uid:'a',key:'scraphound'}];
ok('recruit_for_salvage needs enough parts too', caravanCanAfford(rfs)===false);
state.parts = [{uid:'a',key:'scraphound'},{uid:'b',key:'scraphound'},{uid:'c',key:'scraphound'}];
ok('with enough parts and roster room, recruit_for_salvage is affordable', state.roster.length<rosterCap() && caravanCanAfford(rfs)===true);
while(state.roster.length<rosterCap()) state.roster.push(newMonster('emberling',1,1,{key:'keen'}));
ok('but a full roster blocks the trade even with the parts to spend', caravanCanAfford(rfs)===false);

console.log('\n[289] acceptCaravanTrade(): each trade actually applies, clears the offer, and refuses when unaffordable');
startGame();
state.parts = [{uid:'a',key:'scraphound'},{uid:'b',key:'scraphound'},{uid:'c',key:'cinderjaw'}];
state.favor = { fire: 10 };
state.caravan = { type:'parts_for_favor', tribe:'fire', expiresAt: Date.now()+5000 };
acceptCaravanTrade();
ok('parts_for_favor removes the right number of parts from the bay', state.parts.length===1);
ok('parts_for_favor grants the right favor to the right tribe', favorOf('fire')===10+CARAVAN_FAVOR_REWARD);
ok('the offer is cleared once taken', state.caravan===null);
ok('a fresh eligible-by window is set so the same offer cannot be double-dipped', state.caravanNextEligible>Date.now());

startGame();
state.parts = [];
state.favor = { water: CARAVAN_FAVOR_COST };
state.caravan = { type:'favor_for_parts', tribe:'water', expiresAt: Date.now()+5000 };
acceptCaravanTrade();
ok('favor_for_parts spends the favor', favorOf('water')===0);
ok('favor_for_parts grants the right number of parts', state.parts.length===CARAVAN_PARTS_REWARD);
ok('every granted part is a real, known part', state.parts.every(p=>ENEMY_IDS.indexOf(p.key)>=0));

startGame();
state.parts = [{uid:'x',key:'scraphound'}];
for(let i=0;i<13;i++) state.parts.push({uid:'f'+i,key:'thornbot'}); // bay at 14 already
state.favor = { earth: CARAVAN_FAVOR_COST };
state.caravan = { type:'favor_for_parts', tribe:'earth', expiresAt: Date.now()+5000 };
ok('sanity: this trade is refused as unaffordable while the bay is full', caravanCanAfford(state.caravan)===false);
acceptCaravanTrade();
ok('acceptCaravanTrade refuses outright when unaffordable — no partial trade, no favor spent, no crash', favorOf('earth')===CARAVAN_FAVOR_COST && state.parts.length===14);
ok('an offer that could not be honored stays on offer, not silently cleared', !!state.caravan);

startGame();
state.parts = [{uid:'a',key:'scraphound'},{uid:'b',key:'scraphound'},{uid:'c',key:'scraphound'}];
const rosterBefore = state.roster.length;
state.caravan = { type:'recruit_for_salvage', tribe:'nature', expiresAt: Date.now()+5000 };
acceptCaravanTrade();
ok('recruit_for_salvage spends the parts', state.parts.length===0);
ok('recruit_for_salvage actually grows the roster by one', state.roster.length===rosterBefore+1);
ok('the recruit is a real, non-champion species', SPECIES[state.roster[state.roster.length-1].speciesId] && !SPECIES[state.roster[state.roster.length-1].speciesId].champion);
ok('the offer is cleared', state.caravan===null);

startGame();
state.caravan = null;
ok('accepting with no active offer at all is a harmless no-op', (function(){ try{ acceptCaravanTrade(); return state.caravan===null; }catch(e){ return false; } })());

console.log('\n[290] the two choke points: continueSlot() re-syncs on load, endBattle()\'s shared tail ticks it on the way back to the Hub — and only there');
startGame();
state.slot = 0;
fillFormation(sixMonsters());
autosave();
let d = readSlot(0);
d.caravanNextEligible = Date.now() - 1000; // already eligible by the time this loads
writeSlot(0, d);
startGame(); // wipe in-memory state, same as closing and reopening
Math.random = () => 0;
continueSlot(0);
Math.random = realRandom;
ok('a save whose gap had already elapsed rolls a fresh offer the instant it loads', !!state.caravan);
ok('and that fresh offer is immediately persisted, not just held in memory', readSlot(0).caravan && readSlot(0).caravan.type===state.caravan.type);

startGame();
state.slot = 0;
autosave();
d = readSlot(0);
d.caravan = { type:'favor_for_parts', tribe:'water', expiresAt: Date.now()-1000 }; // already stale by the time this loads
d.caravanNextEligible = 0;
writeSlot(0, d);
startGame();
Math.random = () => 0.999; // would fail a reroll anyway — isolates pure expiry
continueSlot(0);
Math.random = realRandom;
ok('a stale offer left over from before the tab closed is cleared on load, not kept frozen', state.caravan===null);

startGame();
fillFormation(sixMonsters());
state.stage = 2;
state.caravan = null;
state.caravanNextEligible = Date.now() - 1000;
beginBattle();
Math.random = () => 0;
forceWin();
Math.random = realRandom;
ok('a normal stage win reaches the shared tail and ticks the caravan', !!state.caravan);

advanceStage();
state.caravan = null;
state.caravanNextEligible = Date.now() - 1000;
beginBattle();
Math.random = () => 0;
forceLose();
Math.random = realRandom;
ok('a stage loss reaches the exact same shared tail (win/loss share it, same as the streak counter)', !!state.caravan);

retryStage();
clearStages([1]);
goRedeploy(); pickRedeployStage(1);
state.caravan = null;
state.caravanNextEligible = Date.now() - 1000;
beginRedeploy();
Math.random = () => 0;
forceWin();
Math.random = realRandom;
ok('Redeployment funnels through beginBattle() into the same shared tail', !!state.caravan);
endRedeploy();

clearStages([GROVE.afterStage]);
state.caravan = null;
state.caravanNextEligible = Date.now() - 1000;
beginDetour(GROVE.id);
Math.random = () => 0;
forceWin();
Math.random = realRandom;
ok('a Campaign Map Detour funnels through the same shared tail too', !!state.caravan);
endDetour();

startGame();
fillFormation(sixMonsters());
state.caravan = null;
state.caravanNextEligible = Date.now() - 1000; // eligible, if anything ticked it
social.opponent = { user_id:'riv1', display_name:'Rival', formation:{units:[]} };
startDuel();
Math.random = () => 0;
checkBattleEnd();
Math.random = realRandom;
ok('a duel returns early out of endBattle() and never reaches the tail — no caravan, even though it was eligible', state.caravan===null);
endDuel();
social.opponent = null;

startGame();
fillFormation(sixMonsters());
state.caravan = null;
state.caravanNextEligible = Date.now() - 1000;
startRaidRun();
Math.random = () => 0;
checkBattleEnd();
Math.random = realRandom;
ok('a raid run returns early too — no caravan tick', state.caravan===null);
endRaidRun();

startGame();
fillFormation(sixMonsters());
state.trialPick = { stage:1, mods:['blitz'] };
state.stage = 5;
clearStages([1]);
state.caravan = null;
state.caravanNextEligible = Date.now() - 1000;
startTrial();
Math.random = () => 0;
forceWin();
Math.random = realRandom;
ok('a trial run returns early too — no caravan tick', state.caravan===null);

startTutorial();
state.caravan = null; // startTutorial() calls initGame(), which would otherwise set a fresh future window
state.caravanNextEligible = Date.now() - 1000;
Math.random = () => 0;
forceWin();
Math.random = realRandom;
ok('the training deployment returns earliest of all — no caravan tick', state.caravan===null);

console.log('\n[291] the Hub banner: only when an offer is active, names it correctly, and gates the Trade button by affordability');
startGame();
state.caravan = null;
let html = renderHub();
ok('nothing active -> no caravan banner at all', html.indexOf('SCAVENGER CARAVAN')<0);

state.parts = [{uid:'a',key:'scraphound'},{uid:'b',key:'scraphound'}];
state.caravan = { type:'parts_for_favor', tribe:'fire', expiresAt: Date.now()+5000 };
html = renderHub();
ok('an active offer renders the banner', html.indexOf('SCAVENGER CARAVAN')>=0);
ok('the banner names the tribe making the offer', html.indexOf(TRIBES.fire.name)>=0);
ok('affordable right now -> the Trade button is enabled and wired to acceptCaravanTrade()', /onclick="acceptCaravanTrade\(\)"[^>]*>Trade/.test(html.replace(/\s+/g,' ')) && !/disabled[^>]*onclick="acceptCaravanTrade/.test(html));

state.parts = [];
html = renderHub();
ok('not affordable right now -> the Trade button is disabled instead', new RegExp('disabled[^>]*onclick="acceptCaravanTrade\\(\\)"').test(html));
ok('and the banner says so in plain language', /can.t make this trade/i.test(html));

console.log('\n[292] persistence: a clean round-trip, safe degradation on malformed data, and survival through Rebirth');
startGame();
state.caravan = { type:'favor_for_parts', tribe:'water', expiresAt: 123456789 };
state.caravanNextEligible = 987654321;
let saved = serializeSave();
ok('the offer rides along in the save exactly as held', saved.caravan && saved.caravan.type==='favor_for_parts' && saved.caravan.tribe==='water' && saved.caravan.expiresAt===123456789);
ok('the eligibility clock rides along too', saved.caravanNextEligible===987654321);
applySave(saved, 0);
ok('a clean save round-trips exactly, with no re-tick applied by applySave itself', state.caravan.type==='favor_for_parts' && state.caravan.tribe==='water' && state.caravan.expiresAt===123456789 && state.caravanNextEligible===987654321);

applySave(Object.assign({}, saved, { caravan: { type:'not_a_real_type', tribe:'water', expiresAt:1 } }), 0);
ok('an unknown offer type degrades to no offer, not a crash', state.caravan===null);
applySave(Object.assign({}, saved, { caravan: { type:'favor_for_parts', tribe:'not_a_real_tribe', expiresAt:1 } }), 0);
ok('an unknown tribe degrades to no offer too', state.caravan===null);
applySave(Object.assign({}, saved, { caravan: { type:'favor_for_parts', tribe:'water', expiresAt:'soon' } }), 0);
ok('a non-numeric expiry degrades to no offer', state.caravan===null);
applySave(Object.assign({}, saved, { caravan: 'garbage' }), 0);
ok('a totally malformed caravan field degrades quietly', state.caravan===null);
applySave(Object.assign({}, saved, { caravanNextEligible: 'soon' }), 0);
ok('a malformed eligibility clock degrades to 0 — eligible immediately, not a crash', state.caravanNextEligible===0);
applySave({v:1, name:'x', stage:1, roster:[], formation:{front:[null,null,null],back:[null,null,null]}}, 0);
ok('a save from before this feature ever existed loads with no offer and an immediately-eligible clock, not a crash', state.caravan===null && state.caravanNextEligible===0);

startGame();
state.stage = REBIRTH_MIN_STAGE;
state.caravan = { type:'parts_for_favor', tribe:'fire', expiresAt: Date.now()+99999 };
state.caravanNextEligible = 42;
doRebirth(); // arm
doRebirth(); // confirm
ok('a traveling trader does not care that the legion was just reborn — unlike Draft Augments, the caravan is untouched', state.caravan && state.caravan.tribe==='fire' && state.caravanNextEligible===42);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
