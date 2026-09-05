
(function(){
function setupFight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.intel={history:[],wins:0}; state.stage=stage;
}
function sixMonsters(){ return ['emberling','aqualing','terrafang','emberling','aqualing','terrafang'].map(id=>newMonster(id,10)); }
const realRandom = Math.random;
const ELITE_STAGE = CAMPAIGN_LENGTH + 5;   // matches the Loadout Gambit suite's own convention

console.log('\n[274] AUGMENTS: a real pool, and every Draft Augment checkpoint is an ordinary, non-boss, non-warlord surface stage');
ok('exactly five augments to draft from', AUGMENT_IDS.length===5, AUGMENT_IDS);
ok('every entry has a non-empty name and a real description', AUGMENT_IDS.every(id=>AUGMENTS[id].name && AUGMENTS[id].desc && AUGMENTS[id].desc.length>10), AUGMENTS);
ok('AUGMENT_IDS matches the object\'s own keys exactly', JSON.stringify(AUGMENT_IDS.slice().sort())===JSON.stringify(Object.keys(AUGMENTS).sort()));
ok('at least three checkpoints exist, matching "every few stages"', DRAFT_AUGMENT_STAGES.length>=3, DRAFT_AUGMENT_STAGES);
ok('every checkpoint stage is unique', new Set(DRAFT_AUGMENT_STAGES).size===DRAFT_AUGMENT_STAGES.length);
ok('every checkpoint is a real, in-range surface stage', DRAFT_AUGMENT_STAGES.every(s=>s>=1 && s<CAMPAIGN_LENGTH));
ok('no checkpoint lands on a boss or Warlord stage', DRAFT_AUGMENT_STAGES.every(s=>!bossForStage(s) && !warlordForStage(s)));

console.log('\n[275] augmentOfferPending / augmentStageClaimed: gated purely on stage + one-time claim, nothing else');
startGame();
state.stage = DRAFT_AUGMENT_STAGES[0];
ok('a checkpoint stage is pending on a fresh legion', augmentOfferPending());
ok('a non-checkpoint stage is never pending', !DRAFT_AUGMENT_STAGES.some(s=>s===1) ); // sanity the fixture below is really non-checkpoint
state.stage = 1;
ok('an ordinary non-checkpoint stage is never pending', !augmentOfferPending());
state.stage = DRAFT_AUGMENT_STAGES[0];
ok('not yet claimed at this checkpoint', !augmentStageClaimed(state.stage));
state.augmentStagesOffered = {}; state.augmentStagesOffered[DRAFT_AUGMENT_STAGES[0]] = true;
ok('once claimed, this checkpoint stops being pending', !augmentOfferPending());
ok('and the other checkpoints are untouched', !augmentStageClaimed(DRAFT_AUGMENT_STAGES[1]));

console.log('\n[276] goGambitOrBattle(): an augment offer takes priority over Loadout Gambit, which takes priority over a plain deploy');
startGame();
setupFight(sixMonsters(), DRAFT_AUGMENT_STAGES[0]);
goGambitOrBattle();
ok('a pending checkpoint opens the Draft Augment screen instead of deploying', state.screen==='augment' && !state.battle, state.screen);
ok('three choices were rolled as a side effect', state.augmentDraft && state.augmentDraft.choices.length===3);
ok('no Loadout Gambit was rolled — the two systems never both fire on the same click', state.gambit===null);

startGame();
setupFight(sixMonsters(), ELITE_STAGE);   // a hard fight, and not a Draft Augment checkpoint
goGambitOrBattle();
ok('once no augment is pending, a hard fight still opens the Loadout Gambit screen as before', state.screen==='gambit' && !state.battle);

startGame();
setupFight(sixMonsters(), 1);   // ordinary, not a checkpoint, not a hard fight
goGambitOrBattle();
ok('and an entirely ordinary stage still deploys straight to battle', state.screen==='battle' && !!state.battle);

console.log('\n[277] rollAugmentChoices(): three distinct, never-yet-held augments, shrinking (never crashing) as the pool empties');
startGame();
state.augments = {};
rollAugmentChoices();
ok('three choices, all distinct, all real augment ids', state.augmentDraft.choices.length===3 &&
   new Set(state.augmentDraft.choices).size===3 && state.augmentDraft.choices.every(id=>AUGMENT_IDS.indexOf(id)>=0));
ok('the roll remembers which stage it was rolled for', state.augmentDraft.stage===state.stage);

state.augments = {}; AUGMENT_IDS.slice(0,3).forEach(id=>{ state.augments[id]=true; });
rollAugmentChoices();
ok('an already-held augment is never offered again', state.augmentDraft.choices.every(id=>AUGMENT_IDS.slice(0,3).indexOf(id)<0));
ok('with only two left in the pool, the roll offers exactly those two — no crash, no duplicate padding', state.augmentDraft.choices.length===2);
state.augments = {};

console.log('\n[278] pickAugment() claims permanently and deploys; cancelAugmentDraft() claims nothing and can be re-rolled');
startGame();
state.slot = 0;   // needed for the autosave-persisted assertion below, same as any other autosave test in this codebase
setupFight(sixMonsters(), DRAFT_AUGMENT_STAGES[0]);
rollAugmentChoices();
const picked = state.augmentDraft.choices[0];
pickAugment(picked);
ok('the picked augment is now permanently held', hasAugment(picked));
ok('the checkpoint is marked claimed', augmentStageClaimed(DRAFT_AUGMENT_STAGES[0]));
ok('the draft state is cleared', state.augmentDraft===null);
ok('picking deploys straight into battle', state.screen==='battle' && !!state.battle);
ok('it was actually saved (not just held in memory)', !!readSlot(state.slot) && readSlot(state.slot).augments[picked]===true);

startGame();
setupFight(sixMonsters(), DRAFT_AUGMENT_STAGES[1]);
rollAugmentChoices();
ok('picking an id that was not actually offered does nothing', (pickAugment('not_a_real_id'), state.augmentDraft!==null && !hasAugment('not_a_real_id')));
cancelAugmentDraft();
ok('cancelling clears the draft and returns to the Hub', state.augmentDraft===null && state.screen==='hub');
ok('cancelling claims nothing — the checkpoint is still pending', !augmentStageClaimed(DRAFT_AUGMENT_STAGES[1]));
goGambitOrBattle();
ok('so clicking Deploy again re-rolls the very same offer', state.screen==='augment' && state.augmentDraft.choices.length===3);

console.log('\n[279] renderAugmentDraft(): shows exactly the three rolled cards, each wired to pickAugment');
startGame();
setupFight(sixMonsters(), DRAFT_AUGMENT_STAGES[0]);
rollAugmentChoices();
let html = renderAugmentDraft();
state.augmentDraft.choices.forEach(id=>{
  ok(`the ${id} card is rendered with its real name and hooked to pickAugment`, html.indexOf(AUGMENTS[id].name)>=0 && html.indexOf(`onclick="pickAugment('${id}')"`)>=0);
});
ok('an augment nowhere in this roll is not shown', AUGMENT_IDS.filter(id=>state.augmentDraft.choices.indexOf(id)<0)
  .every(id=>html.indexOf(`pickAugment('${id}')`)<0));

console.log('\n[280] every augment actually does what it says, through buildPlayerUnits (or rosterCap), same as a trait or Gambit would');
startGame();
setupFight(sixMonsters(), 2);
state.augments = {};
let plain = buildPlayerUnits(terrainForStage(2));

state.augments = { first_strike:true };
let fs1 = buildPlayerUnits(terrainForStage(2));
ok('First Strike flags every unit, front AND back — unlike Opening Strike, it is not row-restricted', fs1.every(u=>u.gambitFirstCrit===true));

state.augments = { pre_charged:true };
let pc = buildPlayerUnits(terrainForStage(2));
ok('Pre-Charged Cores shaves exactly one turn off every unit\'s skill cooldown, same mechanism as the quickstart trait', pc.every((u,i)=>u.skillMaxCd===plain[i].skillMaxCd-1));

const quickstartMon = newMonster('emberling',10,1,{key:'quickstart'});
setupFight([quickstartMon].concat(sixMonsters().slice(0,5)), 2);
state.augments = {};
const qsAlone = buildPlayerUnits(terrainForStage(2)).find(u=>u.monsterUid===quickstartMon.uid).skillMaxCd;
ok('sanity: the quickstart trait alone already shaves one turn off (3 -> 2)', qsAlone===2, qsAlone);
state.augments = { pre_charged:true };
const qsPlusAugment = buildPlayerUnits(terrainForStage(2)).find(u=>u.monsterUid===quickstartMon.uid).skillMaxCd;
ok('stacked with Pre-Charged Cores it would go to 1, and the floor holds it there rather than going lower', qsPlusAugment===1, qsPlusAugment);

setupFight(sixMonsters(), 2);
state.augments = {};
plain = buildPlayerUnits(terrainForStage(2));
state.augments = { hardened_line:true };
let hl = buildPlayerUnits(terrainForStage(2));
ok('Hardened Line raises every unit\'s live DEF (after refreshSynergies, not just the base field)', hl.every((u,i)=>u.def>plain[i].def), [hl[0].def, plain[0].def]);

const keenMon = newMonster('emberling',10,1,{key:'keen'});
setupFight([keenMon, newMonster('aqualing',10,1,{key:'resilient'})], 2);
state.augments = {};
const plainKeen = buildPlayerUnits(terrainForStage(2));
const keenBase = plainKeen.find(u=>u.monsterUid===keenMon.uid).critBonus;
ok('sanity: the keen trait alone grants its own 8% crit bonus', keenBase===0.08, keenBase);
state.augments = { keen_edge:true };
const withAugment = buildPlayerUnits(terrainForStage(2));
const keenPlusAugment = withAugment.find(u=>u.monsterUid===keenMon.uid).critBonus;
const plainPlusAugment = withAugment.find(u=>u.monsterUid!==keenMon.uid).critBonus;
ok('Keen Edge ADDS its own 6% on top of the keen trait\'s 8% — it never overwrites the trait\'s own bonus',
  Math.abs(keenPlusAugment-0.14)<1e-9, keenPlusAugment);
ok('and a unit with no trait bonus at all still gets the flat 6%', Math.abs(plainPlusAugment-0.06)<1e-9, plainPlusAugment);
state.augments = {};

startGame();
const capBefore = rosterCap();
state.augments = { extended_muster:true };
ok('Extended Muster adds exactly +1 to the roster cap', rosterCap()===capBefore+1, [rosterCap(), capBefore]);
state.augments = {};

console.log('\n[281] persistence: augments and their claimed checkpoints survive a save round-trip; junk degrades quietly');
startGame();
state.augments = { first_strike:true, keen_edge:true };
state.augmentStagesOffered = {}; state.augmentStagesOffered[DRAFT_AUGMENT_STAGES[0]] = true;
let saved = serializeSave();
ok('both fields ride along in the save', JSON.stringify(saved.augments)===JSON.stringify(state.augments) &&
   JSON.stringify(saved.augmentStagesOffered)===JSON.stringify(state.augmentStagesOffered));
applySave(saved, 0);
ok('a clean save round-trips both exactly', hasAugment('first_strike') && hasAugment('keen_edge') && !hasAugment('hardened_line') &&
   augmentStageClaimed(DRAFT_AUGMENT_STAGES[0]) && !augmentStageClaimed(DRAFT_AUGMENT_STAGES[1]));
applySave(Object.assign({}, saved, { augments: { not_a_real_id:true, first_strike:true } }), 0);
ok('only known augment ids survive revival', JSON.stringify(Object.keys(state.augments))===JSON.stringify(['first_strike']), state.augments);
applySave(Object.assign({}, saved, { augmentStagesOffered: { '999':true, [DRAFT_AUGMENT_STAGES[0]]:true } }), 0);
ok('only real checkpoint stages survive revival', JSON.stringify(Object.keys(state.augmentStagesOffered))===JSON.stringify([String(DRAFT_AUGMENT_STAGES[0])]), state.augmentStagesOffered);
applySave(Object.assign({}, saved, { augments:'nope', augmentStagesOffered:42 }), 0);
ok('non-object junk in either field degrades to empty, not a crash', Object.keys(state.augments).length===0 && Object.keys(state.augmentStagesOffered).length===0);
applySave({v:1, name:'x', stage:1, roster:[], formation:{front:[null,null,null],back:[null,null,null]}}, 0);
ok('a save from before this feature existed loads with both empty, not a crash', Object.keys(state.augments).length===0 && Object.keys(state.augmentStagesOffered).length===0);

console.log('\n[282] doRebirth() clears augments and their claimed checkpoints — a fresh build for a fresh life — while Doctrine and the win streak survive it untouched');
startGame();
state.stage = REBIRTH_MIN_STAGE;
state.augments = { first_strike:true, hardened_line:true };
state.augmentStagesOffered = {}; state.augmentStagesOffered[DRAFT_AUGMENT_STAGES[0]] = true; state.augmentStagesOffered[DRAFT_AUGMENT_STAGES[1]] = true;
state.doctrine.wins = 12;
state.streak = 4;
doRebirth();
doRebirth();
ok('augments themselves are wiped clean', Object.keys(state.augments).length===0, state.augments);
ok('claimed checkpoints reset too — the next life gets to draft from scratch', Object.keys(state.augmentStagesOffered).length===0, state.augmentStagesOffered);
ok('Doctrine, unlike augments, survives the same Rebirth untouched', state.doctrine.wins===12);
ok('and so does the win streak', state.streak===4);

console.log('\n[283] the Hub only shows an augment summary once at least one is actually held');
startGame();
let hubHtml = renderHub();
ok('a fresh legion with no augments shows no summary line', hubHtml.indexOf('Augments:')<0);
state.augments = { first_strike:true, extended_muster:true };
hubHtml = renderHub();
ok('once augments are held, they are named by their real display names', hubHtml.indexOf('Augments:')>=0 &&
   hubHtml.indexOf(AUGMENTS.first_strike.name)>=0 && hubHtml.indexOf(AUGMENTS.extended_muster.name)>=0);
ok('an augment not held is not listed', hubHtml.indexOf(AUGMENTS.keen_edge.name)<0);
state.augments = {};

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
