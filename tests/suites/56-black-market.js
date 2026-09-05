
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

console.log('\n[386] the "_black" suffix: isBlackMarketKey/baseKeyOf/partInfo — a bigger boost than Forge, and a corruption INCREASE instead of a decrease');
ok('a raw key is never mistaken for a Black-Market one', isBlackMarketKey('scraphound')===false);
ok('the suffixed key is recognized', isBlackMarketKey('scraphound_black')===true);
ok('baseKeyOf strips exactly the "_black" suffix and nothing else', baseKeyOf('scraphound_black')==='scraphound');
ok('a Black-Market key is never also mistaken for Forge/Ace/Vanguard', isForgedKey('scraphound_black')===false && isAceKey('scraphound_black')===false && isVanguardKey('scraphound_black')===false);

const rawScrap = PARTS.scraphound;
const info = partInfo('scraphound_black');
ok('partInfo resolves a Black-Market key to real data, not null', !!info);
ok('the name is prefixed distinctly, same lightweight pattern as Ace/Vanguard (no separate name table)', info.name==='Black-Market '+rawScrap.name);
ok('emoji/element/desc/stat all pass through from the base part unchanged', info.emoji===rawScrap.emoji && info.element===rawScrap.element && info.desc===rawScrap.desc && info.stat===rawScrap.stat);
ok('the stat boost is BLACK_MARKET_PCT_MULT over the raw part — bigger than Forge\'s own 1.2x', info.pct===Math.round(rawScrap.pct*BLACK_MARKET_PCT_MULT*100)/100 && BLACK_MARKET_PCT_MULT>FORGE_PCT_MULT);
ok('corruption is MULTIPLIED UP, the deliberate inverse of FORGE_CORRUPTION_MULT which multiplies it down', info.corruption===Math.round(rawScrap.corruption*BLACK_MARKET_CORRUPTION_MULT) && info.corruption>rawScrap.corruption && BLACK_MARKET_CORRUPTION_MULT>1);
ok('the black flag is set, and only on Black-Market parts', info.black===true && !partInfo('scraphound').black);

const infoCinder = partInfo('cinderjaw_black');
ok('the math holds for a second chassis too, not hardcoded to scraphound', infoCinder.pct===Math.round(PARTS.cinderjaw.pct*BLACK_MARKET_PCT_MULT*100)/100 && infoCinder.corruption===Math.round(PARTS.cinderjaw.corruption*BLACK_MARKET_CORRUPTION_MULT));
ok('an unknown chassis still resolves to null, exactly like every other suffix', partInfo('not_a_real_chassis_black')===null);

console.log('\n[387] tickBlackMarket(): the gap, the spawn roll, and expiry — same shape as tickCaravan(), its own independent clock');
startGame();
ok('a fresh legion starts with no offer', state.blackMarket===null);
ok('and a real eligible-by time out ahead of it, not immediately eligible', state.blackMarketNextEligible > Date.now());

let now = Date.now();
state.blackMarket = null;
state.blackMarketNextEligible = now + 5000;
tickBlackMarket(now);
ok('ticking before the gap has elapsed does nothing at all', state.blackMarket===null && state.blackMarketNextEligible===now+5000);

state.blackMarketNextEligible = now - 1;
Math.random = () => 0; // well under BLACK_MARKET_SPAWN_CHANCE -> the roll succeeds
tickBlackMarket(now);
Math.random = realRandom;
ok('once eligible, a successful roll produces a real offer', !!state.blackMarket);
ok('the offer names a real chassis', ENEMY_IDS.indexOf(state.blackMarket.key)>=0);
ok('the offer carries a real expiry, BLACK_MARKET_WINDOW_MS out from the moment it rolled', state.blackMarket.expiresAt===now+BLACK_MARKET_WINDOW_MS);
ok('her window is shorter and her odds lower than the Caravan\'s — she is tuned to feel rarer and more fleeting', BLACK_MARKET_WINDOW_MS<CARAVAN_WINDOW_MS && BLACK_MARKET_SPAWN_CHANCE<CARAVAN_SPAWN_CHANCE && BLACK_MARKET_MIN_GAP_MS>CARAVAN_MIN_GAP_MS);

state.blackMarket = null;
state.blackMarketNextEligible = now - 1;
Math.random = () => 0.999; // well over BLACK_MARKET_SPAWN_CHANCE -> the roll fails
tickBlackMarket(now);
Math.random = realRandom;
ok('a failed roll leaves no offer behind', state.blackMarket===null);
ok('but still pushes the next eligible moment out — a failed roll cannot be retried every single tick', state.blackMarketNextEligible===now+BLACK_MARKET_MIN_GAP_MS);

state.blackMarket = { key:'scraphound', expiresAt: now+10000 };
tickBlackMarket(now);
ok('ticking before an active offer expires leaves it completely untouched', state.blackMarket && state.blackMarket.expiresAt===now+10000);

state.blackMarket = { key:'scraphound', expiresAt: now };
Math.random = () => 0; // would succeed a reroll if one were attempted in the same tick
tickBlackMarket(now);
Math.random = realRandom;
ok('an offer at (or past) its expiry is cleared', state.blackMarket===null);
ok('expiry sets a fresh eligible-by window rather than rerolling in the very same tick', state.blackMarketNextEligible===now+BLACK_MARKET_MIN_GAP_MS);

ok('the Black Market and the Caravan tick completely independently of one another', (function(){
  startGame();
  state.caravan = null; state.caravanNextEligible = now - 1;
  state.blackMarket = null; state.blackMarketNextEligible = now + 999999; // not eligible
  Math.random = () => 0;
  tickCaravan(now); tickBlackMarket(now);
  Math.random = realRandom;
  return !!state.caravan && state.blackMarket===null;
})());

console.log('\n[388] rollBlackMarketOffer / blackMarketOfferText / blackMarketCanAfford: a transparent offer — the exact chassis and its numbers, up front, never a blind box');
Math.random = () => 0; // chassis index 0
rollBlackMarketOffer(1000);
Math.random = realRandom;
ok('rollBlackMarketOffer picks a chassis deterministically off Math.random, just like every other roll table in this game', state.blackMarket.key===ENEMY_IDS[0] && state.blackMarket.expiresAt===1000+BLACK_MARKET_WINDOW_MS);

let offer = { key:'scraphound' };
let text = blackMarketOfferText(offer);
const scrapBlack = partInfo('scraphound_black');
ok('the offer text names the exact part on offer, not a mystery', text.indexOf(scrapBlack.name)>=0);
ok('the offer text states the real stat boost the part carries', text.indexOf('+'+Math.round(scrapBlack.pct*100)+'% '+STAT_LABEL[scrapBlack.stat])>=0);
ok('the offer text is honest about the corruption cost too — the whole point is it is not hidden', text.indexOf('+'+scrapBlack.corruption+' rust')>=0);
ok('the offer text states the flat cost', text.indexOf(BLACK_MARKET_PART_COST+' salvage part')>=0);
ok('a null offer -> empty text, no crash', blackMarketOfferText(null)==='');

startGame();
ok('blackMarketCanAfford(null) is always false', blackMarketCanAfford(null)===false);
state.parts = [];
ok('with no parts in the bay at all, the trade is unaffordable', blackMarketCanAfford(offer)===false);
state.parts = [{uid:'a',key:'scraphound'}];
ok('with at least BLACK_MARKET_PART_COST parts and bay room, the trade is affordable', blackMarketCanAfford(offer)===true);
for(let i=state.parts.length;i<14;i++) state.parts.push({uid:'p'+i,key:'scraphound'});
ok('but a full salvage bay blocks it even with parts to spend — the trade adds a part, so it needs room too', state.parts.length===14 && blackMarketCanAfford(offer)===false);

console.log('\n[389] acceptBlackMarketTrade(): spends the flat cost, mints exactly one real Black-Market part, clears the offer, and refuses when unaffordable');
startGame();
state.parts = [{uid:'a',key:'scraphound'},{uid:'b',key:'cinderjaw'}];
state.blackMarket = { key:'thornbot', expiresAt: Date.now()+5000 };
acceptBlackMarketTrade();
ok('exactly BLACK_MARKET_PART_COST ordinary parts are spent', state.parts.length===2-BLACK_MARKET_PART_COST+1); // started with 2, spent 1, gained 1
ok('the newly minted part carries the exact chassis that was on offer, suffixed', state.parts.some(p=>p.key==='thornbot_black'));
ok('the offer is cleared once taken', state.blackMarket===null);
ok('a fresh eligible-by window is set so the same offer cannot be double-dipped', state.blackMarketNextEligible>Date.now());

startGame();
state.parts = [];
for(let i=0;i<14;i++) state.parts.push({uid:'f'+i,key:'thornbot'}); // bay already full
state.blackMarket = { key:'scraphound', expiresAt: Date.now()+5000 };
ok('sanity: this trade is refused as unaffordable while the bay is full', blackMarketCanAfford(state.blackMarket)===false);
acceptBlackMarketTrade();
ok('acceptBlackMarketTrade refuses outright when unaffordable — no partial trade, no part destroyed, no crash', state.parts.length===14 && state.parts.every(p=>p.key==='thornbot'));
ok('an offer that could not be honored stays on offer, not silently cleared', !!state.blackMarket);

startGame();
state.blackMarket = null;
ok('accepting with no active offer at all is a harmless no-op', (function(){ try{ acceptBlackMarketTrade(); return state.blackMarket===null; }catch(e){ return false; } })());

console.log('\n[390] the two choke points: continueSlot() re-syncs on load, endBattle()\'s shared tail ticks it on the way back to the Hub — and only there, exactly like the Caravan');
startGame();
state.slot = 0;
fillFormation(sixMonsters());
autosave();
let d = readSlot(0);
d.blackMarketNextEligible = Date.now() - 1000; // already eligible by the time this loads
writeSlot(0, d);
startGame(); // wipe in-memory state, same as closing and reopening
Math.random = () => 0;
continueSlot(0);
Math.random = realRandom;
ok('a save whose gap had already elapsed rolls a fresh offer the instant it loads', !!state.blackMarket);
ok('and that fresh offer is immediately persisted, not just held in memory', readSlot(0).blackMarket && readSlot(0).blackMarket.key===state.blackMarket.key);

startGame();
state.slot = 0;
autosave();
d = readSlot(0);
d.blackMarket = { key:'galekite', expiresAt: Date.now()-1000 }; // already stale by the time this loads
d.blackMarketNextEligible = 0;
writeSlot(0, d);
startGame();
Math.random = () => 0.999; // would fail a reroll anyway — isolates pure expiry
continueSlot(0);
Math.random = realRandom;
ok('a stale offer left over from before the tab closed is cleared on load, not kept frozen', state.blackMarket===null);

startGame();
fillFormation(sixMonsters());
state.stage = 2;
state.blackMarket = null;
state.blackMarketNextEligible = Date.now() - 1000;
beginBattle();
Math.random = () => 0;
forceWin();
Math.random = realRandom;
ok('a normal stage win reaches the shared tail and ticks the Black Market', !!state.blackMarket);

advanceStage();
state.blackMarket = null;
state.blackMarketNextEligible = Date.now() - 1000;
beginBattle();
Math.random = () => 0;
forceLose();
Math.random = realRandom;
ok('a stage loss reaches the exact same shared tail (win/loss share it, same as the streak counter)', !!state.blackMarket);

retryStage();
clearStages([1]);
goRedeploy(); pickRedeployStage(1);
state.blackMarket = null;
state.blackMarketNextEligible = Date.now() - 1000;
beginRedeploy();
Math.random = () => 0;
forceWin();
Math.random = realRandom;
ok('Redeployment funnels through beginBattle() into the same shared tail', !!state.blackMarket);
endRedeploy();

clearStages([GROVE.afterStage]);
state.blackMarket = null;
state.blackMarketNextEligible = Date.now() - 1000;
beginDetour(GROVE.id);
Math.random = () => 0;
forceWin();
Math.random = realRandom;
ok('a Campaign Map Detour funnels through the same shared tail too', !!state.blackMarket);
endDetour();

startGame();
fillFormation(sixMonsters());
state.blackMarket = null;
state.blackMarketNextEligible = Date.now() - 1000; // eligible, if anything ticked it
social.opponent = { user_id:'riv1', display_name:'Rival', formation:{units:[]} };
startDuel();
Math.random = () => 0;
checkBattleEnd();
Math.random = realRandom;
ok('a duel returns early out of endBattle() and never reaches the tail — no Black Market, even though it was eligible', state.blackMarket===null);
endDuel();
social.opponent = null;

startGame();
fillFormation(sixMonsters());
state.blackMarket = null;
state.blackMarketNextEligible = Date.now() - 1000;
startRaidRun();
Math.random = () => 0;
checkBattleEnd();
Math.random = realRandom;
ok('a raid run returns early too — no Black Market tick', state.blackMarket===null);
endRaidRun();

startGame();
fillFormation(sixMonsters());
state.trialPick = { stage:1, mods:['blitz'] };
state.stage = 5;
clearStages([1]);
state.blackMarket = null;
state.blackMarketNextEligible = Date.now() - 1000;
startTrial();
Math.random = () => 0;
forceWin();
Math.random = realRandom;
ok('a trial run returns early too — no Black Market tick', state.blackMarket===null);

startTutorial();
state.blackMarket = null; // startTutorial() calls initGame(), which would otherwise set a fresh future window
state.blackMarketNextEligible = Date.now() - 1000;
Math.random = () => 0;
forceWin();
Math.random = realRandom;
ok('the training deployment returns earliest of all — no Black Market tick', state.blackMarket===null);

console.log('\n[391] the Hub banner: only when an offer is active, names it correctly, gates the Buy button by affordability, and coexists with the Caravan\'s own banner');
startGame();
state.blackMarket = null;
state.caravan = null;
let html = renderHub();
ok('nothing active -> no Black Market banner at all', html.indexOf('THE BLACK MARKET')<0);

state.parts = [{uid:'a',key:'scraphound'}];
state.blackMarket = { key:'sparkdrone', expiresAt: Date.now()+5000 };
html = renderHub();
ok('an active offer renders the banner', html.indexOf('THE BLACK MARKET')>=0);
ok('the banner names the exact part on offer', html.indexOf(partInfo('sparkdrone_black').name)>=0);
ok('affordable right now -> the Buy button is enabled and wired to acceptBlackMarketTrade()', /onclick="acceptBlackMarketTrade\(\)"[^>]*>Buy/.test(html.replace(/\s+/g,' ')) && !/disabled[^>]*onclick="acceptBlackMarketTrade/.test(html));

state.parts = [];
html = renderHub();
ok('not affordable right now -> the Buy button is disabled instead', new RegExp('disabled[^>]*onclick="acceptBlackMarketTrade\\(\\)"').test(html));
ok('and the banner says so in plain language', /can.t make this trade/i.test(html));

state.parts = [{uid:'a',key:'scraphound'},{uid:'b',key:'scraphound'}];
state.caravan = { type:'parts_for_favor', tribe:'fire', expiresAt: Date.now()+5000 };
state.blackMarket = { key:'sparkdrone', expiresAt: Date.now()+5000 };
html = renderHub();
ok('both traders can be on offer to the same player at once — two independent banners, not mutually exclusive', html.indexOf('SCAVENGER CARAVAN')>=0 && html.indexOf('THE BLACK MARKET')>=0);

console.log('\n[392] persistence: a clean round-trip, safe degradation on malformed data, and survival through Rebirth — same treatment as the Caravan');
startGame();
state.blackMarket = { key:'frostcoil', expiresAt: 123456789 };
state.blackMarketNextEligible = 987654321;
let saved = serializeSave();
ok('the offer rides along in the save exactly as held', saved.blackMarket && saved.blackMarket.key==='frostcoil' && saved.blackMarket.expiresAt===123456789);
ok('the eligibility clock rides along too', saved.blackMarketNextEligible===987654321);
applySave(saved, 0);
ok('a clean save round-trips exactly, with no re-tick applied by applySave itself', state.blackMarket.key==='frostcoil' && state.blackMarket.expiresAt===123456789 && state.blackMarketNextEligible===987654321);

applySave(Object.assign({}, saved, { blackMarket: { key:'not_a_real_chassis', expiresAt:1 } }), 0);
ok('an unknown chassis degrades to no offer, not a crash', state.blackMarket===null);
applySave(Object.assign({}, saved, { blackMarket: { key:'frostcoil', expiresAt:'soon' } }), 0);
ok('a non-numeric expiry degrades to no offer', state.blackMarket===null);
applySave(Object.assign({}, saved, { blackMarket: 'garbage' }), 0);
ok('a totally malformed blackMarket field degrades quietly', state.blackMarket===null);
applySave(Object.assign({}, saved, { blackMarketNextEligible: 'soon' }), 0);
ok('a malformed eligibility clock degrades to 0 — eligible immediately, not a crash', state.blackMarketNextEligible===0);
applySave({v:1, name:'x', stage:1, roster:[], formation:{front:[null,null,null],back:[null,null,null]}}, 0);
ok('a save from before this feature ever existed loads with no offer and an immediately-eligible clock, not a crash', state.blackMarket===null && state.blackMarketNextEligible===0);

startGame();
state.stage = REBIRTH_MIN_STAGE;
state.blackMarket = { key:'cinderjaw', expiresAt: Date.now()+99999 };
state.blackMarketNextEligible = 42;
doRebirth(); // arm
doRebirth(); // confirm
ok('a shady trader does not care that the legion was just reborn — unlike Draft Augments, the Black Market is untouched', state.blackMarket && state.blackMarket.key==='cinderjaw' && state.blackMarketNextEligible===42);

console.log('\n[393] Set Bonuses and the salvage screen: a Black-Market part counts toward its chassis family for free, and shows its own distinct badge');
startGame();
let mon = newMonster('emberling', 10, 1, {key:'keen'});
mon.parts = ['scraphound', 'scraphound_black'];
state.roster = [mon];
let sb = activeSetBonuses(mon.parts);
ok('a raw part and a Black-Market part of the same chassis count together as one family — baseKeyOf() collapses the suffix for free, no extra code needed', sb.length===1 && sb[0].family==='scraphound' && sb[0].count===2);

state.roster = [];
state.parts = [{uid:'a', key:'scraphound_black'}];
state.selectedPart = null;
html = renderSalvage();
ok('a Black-Market part card shows the skull badge in the Salvage screen', html.indexOf('☠️')>=0);
ok('and still shows its real name and stat line, not a placeholder', html.indexOf(partInfo('scraphound_black').name)>=0);

const wearer = newMonster('aqualing', 8, 1, {key:'keen'});
wearer.parts = ['scraphound_black'];
state.roster = [wearer];
state.parts = [];
html = renderSalvage();
ok('an equipped Black-Market part\'s chip also carries the skull badge', /☠️/.test(html) && html.indexOf(PARTS.scraphound.emoji)>=0);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
