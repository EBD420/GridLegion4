
(function(){
function fillParts(n){
  const arr = [];
  for(let i=0;i<n;i++) arr.push({ uid: uid(), key:'thornbot' });
  return arr;
}
function setupFight(mons, stage){
  state.roster = mons;
  state.formation.front = [mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back = [mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.stage = stage;
  beginBattle();
  return state.battle;
}
// A pending contract plus a plain two-monster formation — the shared starting
// point for every beginBattle()-integration check below.
function pendingSetup(){
  startGame();
  state.parts = fillParts(MERCENARY_PART_COST);
  hireMercenary('skydancer');
  state.roster = [newMonster('emberling',10,1,{key:'keen'}), newMonster('aqualing',10,1,{key:'keen'})];
  state.formation.front = [state.roster[0].uid, state.roster[1].uid, null];
  state.formation.back = [null,null,null];
}

console.log('\n[408] mercenaryOptions()/mercenaryLevel()/canHireMercenary(): the roster of hires, the level curve, and the afford gate');
startGame();
const opts = mercenaryOptions();
ok('exactly one hireable option per tribe, every one a real champion id', opts.length===TRIBE_IDS.length && opts.every(o=>CHAMPION_IDS.indexOf(o.speciesId)>=0));
ok('the options are the tribes\' own champions, not some separate cast of monsters', opts.every(o=>SPECIES[o.speciesId] && SPECIES[o.speciesId].champion));
state.stage = 1;
ok('the level floor kicks in early — never a joke, even at Stage 1', mercenaryLevel()===MERCENARY_MIN_LEVEL);
state.stage = 40;
ok('and it keeps climbing with the campaign, same linear shape stageExp() already uses', mercenaryLevel()===40+MERCENARY_LEVEL_BONUS);
state.parts = [];
ok('can\'t afford it with no salvage at all', canHireMercenary()===false);
state.parts = fillParts(MERCENARY_PART_COST-1);
ok('one short is still not enough', canHireMercenary()===false);
state.parts = fillParts(MERCENARY_PART_COST);
ok('exactly enough salvage, no pending contract -> hireable', canHireMercenary()===true);
state.mercenary = { speciesId:'pyrelord', level:10 };
ok('a pending contract blocks a second hire outright, no matter how much salvage is sitting there', canHireMercenary()===false);

console.log('\n[409] hireMercenary(): spends exactly the salvage cost, refuses a bad id or an unaffordable/duplicate hire, never touches the roster');
startGame();
state.parts = fillParts(6);
const rosterBefore = state.roster.length;
hireMercenary('pyrelord');
ok('the contract is now pending, with the level locked in at hire time', !!state.mercenary && state.mercenary.speciesId==='pyrelord' && state.mercenary.level===mercenaryLevel());
ok('exactly MERCENARY_PART_COST salvage was spent, not the whole stash', state.parts.length===6-MERCENARY_PART_COST);
ok('the roster itself is completely untouched by hiring — nothing is recruited, only rented', state.roster.length===rosterBefore);
const partsAfterFirstHire = state.parts.length;
hireMercenary('tidewarden');
ok('a second hire is refused outright while one is already pending — no stacking contracts', state.mercenary.speciesId==='pyrelord' && state.parts.length===partsAfterFirstHire);
state.mercenary = null;
state.parts = fillParts(1);
hireMercenary('pyrelord');
ok('refused when salvage falls short, however slightly', state.mercenary===null && state.parts.length===1);
state.parts = fillParts(6);
hireMercenary('not_a_real_champion');
ok('refused outright for anything outside the champion roster', state.mercenary===null && state.parts.length===6);

console.log('\n[410] buildMercenaryUnit(): a genuinely strong, freshly-instantiated champion — never the same monster twice, never pulled from the roster');
startGame();
state.stage = 5;
state.mercenary = { speciesId:'stonefather', level: mercenaryLevel() };
const terrain0 = terrainForStage(state.stage);
const u1 = buildMercenaryUnit(terrain0);
ok('resolves to the hired species, at the level locked in at hire time, flagged as a mercenary and standing up front',
   u1.speciesId==='stonefather' && u1.level===state.mercenary.level && u1.isMercenary===true && u1.row==='front');
const plainStats = computeStats(newMonster('stonefather', state.mercenary.level, 1, u1.trait)); // same trait, so only the mult differs
ok('base stats carry the flat MERCENARY_STAT_MULT bump on top of an ordinary same-level Stonefather',
   u1.bHp===Math.round(plainStats.hp*MERCENARY_STAT_MULT) && u1.bAtk===Math.round(plainStats.atk*MERCENARY_STAT_MULT) &&
   u1.bDef===Math.round(plainStats.def*MERCENARY_STAT_MULT) && u1.bSpd===Math.round(plainStats.spd*MERCENARY_STAT_MULT));
ok('MERCENARY_STAT_MULT itself is a real cut above 1 — this is meant to feel genuinely strong', MERCENARY_STAT_MULT>1);
const u2 = buildMercenaryUnit(terrain0);
ok('two builds off the same pending contract mint two different throwaway monsters (different uids) — nothing here is a persistent identity', u1.monsterUid!==u2.monsterUid);
ok('that uid resolves to nothing in the roster — it was never pushed there', findMonster(u1.monsterUid)===undefined);
state.mercenary = null;
ok('with no pending contract, there is nothing to build', buildMercenaryUnit(terrain0)===null);

console.log('\n[411] beginBattle(): fielded exactly once for an eligible stage battle and consumed on the spot; every excluded mode leaves the contract pending, untouched, for next time');
pendingSetup();
state.stage = 1;
beginBattle();
let B = state.battle;
let mercUnit = B.playerUnits.find(u=>u.isMercenary);
ok('an ordinary stage battle fields the pending mercenary', !!mercUnit && mercUnit.speciesId==='skydancer');
ok('and the contract is spent the instant it\'s fielded — win or lose is still to be decided', state.mercenary===null);
ok('state.battle remembers who was fielded, for the result screen and War Journal flavor', !!B.mercenary && B.mercenary.speciesId==='skydancer' && B.mercenary.name===mercUnit.name);
B.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
endBattle('win');

pendingSetup();
social.opponent = { user_id:'riv1', display_name:'Rival', formation:{units:[]} };
startDuel();
ok('a Duel never fields a rented mercenary — fairness against a real opponent formation matters more than raw power here', state.battle.playerUnits.every(u=>!u.isMercenary));
ok('and the contract is still sitting there afterward, untouched, ready for a real fight', !!state.mercenary && state.mercenary.speciesId==='skydancer');
endDuel();
social.opponent = null;

[['raidRun'], ['worldBossRun'], ['guildWarRun'], ['trial']].forEach(([flag])=>{
  pendingSetup();
  state.stage = 1;
  if(flag==='trial') state.trial = { mods:[], stage:1, reward:1 };
  else state[flag] = true;
  beginBattle();
  const b = state.battle;
  ok(`${flag} never fields a rented mercenary — it runs its own separate difficulty/scoring layer`, b.playerUnits.every(u=>!u.isMercenary));
  ok(`${flag} leaves the contract pending, untouched, for the next real fight`, !!state.mercenary && state.mercenary.speciesId==='skydancer');
  if(flag==='trial') state.trial = null; else state[flag] = false;
});

console.log('\n[412] endBattle(): the contract\'s fate is decided at beginBattle(), not here — the result screen carries the flavor line on a win AND a loss, and renderResult() actually renders it');
pendingSetup();
state.stage = 1;
beginBattle();
B = state.battle;
B.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
B.elemDamage = {};
endBattle('win');
ok('a win carries the mercenary flavor into lastResult', !!state.lastResult.mercenary && state.lastResult.mercenary.speciesId==='skydancer');
ok('and renderResult() actually prints it, not just the data behind it', renderResult().indexOf('Mercenary Contract')>=0);

pendingSetup();
state.stage = 1;
beginBattle();
B = state.battle;
B.playerUnits.forEach(u=>{u.hp=0;u.fainted=true;});
endBattle('lose');
ok('a loss still carries the flavor through — the contract was already spent regardless of outcome', !!state.lastResult.mercenary && state.lastResult.mercenary.speciesId==='skydancer');
ok('and the DEFEAT screen renders it too', renderResult().indexOf('Mercenary Contract')>=0);

startGame();
B = setupFight([newMonster('emberling',10,1,{key:'keen'})], 1);
ok('with no pending contract at all, state.battle.mercenary stays null', B.mercenary===null);
B.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
endBattle('win');
ok('...lastResult carries no mercenary flavor either', !state.lastResult.mercenary);
ok('...nor does renderResult() print anything about one', renderResult().indexOf('Mercenary Contract')<0);

console.log('\n[413] no permanent footprint: a rented champion can win the fight outright without minting a permanent bond or a permanent kill-leader credit for a species the player never recruited');
startGame();
state.roster = [newMonster('emberling',10,1,{key:'keen'}), newMonster('aqualing',10,1,{key:'keen'})];
state.formation.front = [state.roster[0].uid, state.roster[1].uid, null];
state.formation.back = [null,null,null];
state.parts = fillParts(MERCENARY_PART_COST);
hireMercenary('pyrelord');
state.stage = 1;
beginBattle();
B = state.battle;
const merc = B.playerUnits.find(u=>u.isMercenary);
ok('the mercenary actually joined the fight', !!merc && merc.speciesId==='pyrelord');
merc.missChance = 0;
const victim = B.enemyUnits[0];
victim.hp = 1; victim.dodge = 0; victim.shield = false; victim.firstHitReduction = false;
applyDamage(merc, victim, false);
ok('the kill is never credited to killsBySpecies on the live battle object — that\'s the feed for Doctrine\'s permanent kill-leader tally, off-limits to a rental', !B.killsBySpecies || !B.killsBySpecies[merc.speciesId], B.killsBySpecies);
ok('but the ELEMENT it fought with still reaches elemDamage — a real, in-fiction consequence of the specialist you hired, not an identity leak', (B.elemDamage[merc.element]||0) > 0, B.elemDamage);
B.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
endBattle('win');
ok('that kill never reaches the permanent Doctrine kill-leader tally either', !state.doctrine.kills[merc.speciesId]);
ok('no permanent Battle-Forged Bond pairing was minted between the mercenary\'s species and anything else', Object.keys(state.bondCounts).every(k=>k.indexOf(merc.speciesId)<0), state.bondCounts);
ok('findMonster can never resolve the mercenary\'s throwaway uid — it was never pushed to the roster', findMonster(merc.monsterUid)===undefined);

console.log('\n[414] the Hub banner: a hire menu when nothing is pending, a status line once a contract is signed, wired to hireMercenary()');
startGame();
state.parts = [];
let html = renderHub();
ok('no salvage at all -> the hire menu still shows (always on offer), but every option is disabled', html.indexOf('MERCENARY CONTRACT')>=0 && /disabled/.test(html));
state.parts = fillParts(MERCENARY_PART_COST);
html = renderHub();
ok('enough salvage -> nothing in the Hub is disabled, and every champion has a live hire button wired to hireMercenary()',
   !/disabled/.test(html) && CHAMPION_IDS.every(id=>html.indexOf(`onclick="hireMercenary('${id}')"`)>=0));
hireMercenary('grovemother');
html = renderHub();
ok('once hired, the banner switches to a status line naming the retained champion, with no hire buttons left to click',
   html.indexOf('Grovemother')>=0 && html.indexOf('hireMercenary(')<0);

console.log('\n[415] persistence: a paid-for contract survives a save/reload, malformed data degrades to null (never a free contract), pre-feature saves load cleanly, and Rebirth never revokes salvage already spent');
startGame();
state.parts = fillParts(MERCENARY_PART_COST);
hireMercenary('tidewarden');
let saved = serializeSave();
ok('the pending contract rides along in the save, exactly as hired', saved.mercenary && saved.mercenary.speciesId==='tidewarden' && saved.mercenary.level===state.mercenary.level);
applySave(saved, 0);
ok('a clean save round-trips the contract exactly', !!state.mercenary && state.mercenary.speciesId==='tidewarden');

applySave(Object.assign({}, saved, { mercenary: { speciesId:'tidewarden', level:'not-a-number' } }), 0);
ok('a garbage level degrades the whole contract to null — no free rental of a hire that was never validly recorded', state.mercenary===null);
applySave(Object.assign({}, saved, { mercenary: { speciesId:'not_a_champion', level:12 } }), 0);
ok('a garbage species id degrades to null the same way', state.mercenary===null);
applySave({v:1, name:'x', stage:1, roster:[], formation:{front:[null,null,null],back:[null,null,null]}}, 0);
ok('a save from before this feature ever existed loads with no pending contract, not a crash', state.mercenary===null);

startGame();
state.parts = fillParts(MERCENARY_PART_COST);
hireMercenary('pyrelord');
state.stage = REBIRTH_MIN_STAGE;
doRebirth(); // arm
doRebirth(); // confirm
ok('a Rebirth never revokes a contract already paid for — the salvage is spent either way, same treatment the Caravan/Black Market\'s pending offers already get', !!state.mercenary && state.mercenary.speciesId==='pyrelord');

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
