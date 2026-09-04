
(function(){
const NO_ATK_TRAIT = { key:'resilient' };   // pins out the random trait roll so stat comparisons stay clean

console.log('\n[89] rebirth is gated behind real progress');
startGame();
ok('starts at rebirth count 0', rebirthCount()===0);
ok('not eligible at stage 1', !rebirthEligible());
state.stage = REBIRTH_MIN_STAGE - 1;
ok('not eligible one stage short', !rebirthEligible());
state.stage = REBIRTH_MIN_STAGE;
ok('eligible exactly at the threshold', rebirthEligible());
state.stage = REBIRTH_MIN_STAGE + 3;
ok('eligible past the threshold', rebirthEligible());

console.log('\n[90] an ineligible rebirth attempt does nothing');
startGame();
state.stage = 2;
const uidsBefore = state.roster.map(m=>m.uid).join(',');
doRebirth();
ok('count is unchanged', rebirthCount()===0);
ok('roster is byte-for-byte untouched', state.roster.map(m=>m.uid).join(',')===uidsBefore);
ok('no confirm was armed either', !state.confirmRebirth);

console.log('\n[91] two-tap confirm, matching the existing delete-slot pattern');
startGame();
state.stage = REBIRTH_MIN_STAGE;
const originalRoster = state.roster.map(m=>m.uid);
doRebirth();
ok('first tap only arms the confirmation', state.confirmRebirth===true && rebirthCount()===0);
ok('roster is still the original', state.roster.map(m=>m.uid).join(',')===originalRoster.join(','));
doRebirth();
ok('second tap actually performs the wipe', rebirthCount()===1);
ok('confirm flag clears itself', state.confirmRebirth===false);

console.log('\n[92] what a rebirth wipes vs. what it keeps');
startGame();
state.stage = REBIRTH_MIN_STAGE + 5;
// build up state across every category a rebirth should touch or spare
state.roster = [newMonster('emberling',20,2,NO_ATK_TRAIT), newMonster('aqualing',15,1,NO_ATK_TRAIT)];
state.formation.front = [state.roster[0].uid, state.roster[1].uid, null];
state.parts = [{uid:'pu1',key:'scraphound'}];
state.intel = { history:['fire','water'], wins:7 };
codex();   // lazily initializes state.codex (initGame() leaves it null until first touched)
state.codex.species.emberling = true;
state.favor.fire = 40;
state.blessing = 'fire';
state.recruited.fire = true;
state.cleared[3] = true;
state.journal = [{ id:'j1', stage:3, deep:false, win:true, boss:null, text:'an old entry', at:1 }];
state.emblem = [];   // unlockedPartKeys() requires codex.parts, keep empty to avoid unrelated setup
state.profileName = 'Ironpaw Legion';
const journalLenBefore = state.journal.length;

doRebirth();   // arm
doRebirth();   // confirm

ok('roster resets to 3 fresh Lv.1 starters', state.roster.length===3 && state.roster.every(m=>m.level===1));
ok('the new roster is placed in the front row', state.formation.front.every((u,i)=>u===state.roster[i].uid) && state.formation.back.every(u=>u===null));
ok('stage resets to 1', state.stage===1);
ok('intel resets', state.intel.history.length===0 && state.intel.wins===0);
ok('salvage bay parts are untouched', state.parts.length===1 && state.parts[0].key==='scraphound');
ok('codex (bestiary) is untouched', state.codex.species.emberling===true);
ok('tribe favour is untouched', state.favor.fire===40);
ok('active blessing is untouched', state.blessing==='fire');
ok('recruited champions are untouched', state.recruited.fire===true);
ok('cleared trial stages are untouched', state.cleared[3]===true);
ok('profile name is untouched', state.profileName==='Ironpaw Legion');
ok('a new War Journal entry is prepended, the old one kept', state.journal.length===journalLenBefore+1 && state.journal[journalLenBefore].text==='an old entry');
ok('the new entry mentions the permanent edge', /permanent edge|stronger/.test(state.journal[0].text), state.journal[0].text);

console.log('\n[93] the stacking multiplier and the banner mark');
startGame();
ok('no mark at count 0', rebirthMark()==='');
ok('multiplier is 1 at count 0', rebirthMultiplier()===1);
state.rebirth.count = 1;
ok('multiplier at count 1', Math.abs(rebirthMultiplier()-(1+REBIRTH_STAT_BONUS))<1e-9);
ok('one star at count 1', rebirthMark()===' ★');
state.rebirth.count = 3;
ok('three stars at count 3', rebirthMark()===' ★★★');
state.rebirth.count = 9;
ok('the mark caps visually at 5 stars', rebirthMark()===' ★★★★★');
state.profileName = 'Ironpaw';
state.emblem = [];
ok('the banner carries the mark', legionBanner()==='Ironpaw ★★★★★', legionBanner());
state.rebirth.count = 0;

console.log('\n[94] the multiplier actually lands on battle stats');
startGame();
const soloMon = newMonster('terrafang',20,1,NO_ATK_TRAIT);
state.roster=[soloMon]; state.formation.front=[soloMon.uid,null,null]; state.formation.back=[null,null,null];
state.intel={history:[],wins:0}; state.stage=1; state.rebirth={count:0};
beginBattle();
const baseAtk = state.battle.playerUnits[0].bAtk, baseHp = state.battle.playerUnits[0].bHp;
startGame();
const soloMon2 = newMonster('terrafang',20,1,NO_ATK_TRAIT);
state.roster=[soloMon2]; state.formation.front=[soloMon2.uid,null,null]; state.formation.back=[null,null,null];
state.intel={history:[],wins:0}; state.stage=1; state.rebirth={count:2};
beginBattle();
const rebornAtk = state.battle.playerUnits[0].bAtk, rebornHp = state.battle.playerUnits[0].bHp;
const expectMult = 1 + 2*REBIRTH_STAT_BONUS;
ok('ATK carries the stacked bonus', rebornAtk===Math.round(baseAtk*expectMult), baseAtk+' -> '+rebornAtk+' (x'+expectMult+')');
ok('HP carries the same bonus', rebornHp===Math.round(baseHp*expectMult), baseHp+' -> '+rebornHp);
ok('it also reaches maxHp/hp through refreshSynergies', state.battle.playerUnits[0].maxHp===rebornHp);
state.rebirth = { count:0 };

console.log('\n[95] rebirth survives a save/load cycle, and old saves without it default cleanly');
startGame(); state.slot=0;
state.rebirth = { count: 3 };
autosave();
startGame();
continueSlot(0);
ok('rebirth count is restored from a save', rebirthCount()===3);
const preExisting = { v:1, name:'Old Legion', stage:2,
  roster:[], formation:{front:[null,null,null],back:[null,null,null]} };   // no "rebirth" key at all
applySave(preExisting, 0);
ok('a save from before this feature loads with count 0, not a crash', rebirthCount()===0);
ok('confirm flag is cleared on any load', state.confirmRebirth===null || state.confirmRebirth===false);

console.log('\n[96] visible in the Legion Identity screen');
startGame();
state.stage = 2;
state.confirmRebirth = null;
let html = renderLegionId();
ok('the rebirth panel is present', /LEGION REBIRTH/.test(html));
ok('locked below the stage threshold', new RegExp('Stage '+REBIRTH_MIN_STAGE).test(html));
ok('no rebirth button while locked', !/Rebirth this legion/.test(html));
state.stage = REBIRTH_MIN_STAGE;
html = renderLegionId();
ok('the rebirth button appears once eligible', /Rebirth this legion/.test(html));
state.confirmRebirth = true;
html = renderLegionId();
ok('an armed confirmation reads back a warning', /Really wipe/.test(html));
state.confirmRebirth = null;

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
