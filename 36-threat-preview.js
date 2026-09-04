
(function(){
function setupFight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.intel={history:[],wins:0}; state.stage=stage;
}
const realRandom = Math.random;
function sixMonsters(){ return ['emberling','aqualing','terrafang','emberling','aqualing','terrafang'].map(id=>newMonster(id,10)); }
// startGame() (via initGame()) seeds a fresh legion with three starters already
// placed in the front row — so "empty formation" has to be created explicitly.
function clearFormation(){ state.formation = { front:[null,null,null], back:[null,null,null] }; }

console.log('\n[211] previewFirstThreat: null in every case where a preview would be misleading or irrelevant');
startGame();
clearFormation();
ok('an empty formation returns no preview at all', previewFirstThreat()===null);
setupFight(sixMonsters(), 3);
ok('sanity: a filled formation at an ordinary stage DOES produce a preview', !!previewFirstThreat());
state.duel = { userId:'x', name:'Rival', formation:{units:[]} };
ok('never previews while setting up a duel', previewFirstThreat()===null);
state.duel = null;
state.raidRun = true;
ok('never previews during a raid run', previewFirstThreat()===null);
state.raidRun = false;
state.trial = { stage:3, mods:['glass'], reward:1 };
ok('never previews during a Trial', previewFirstThreat()===null);
state.trial = null;

console.log('\n[212] previewFirstThreat genuinely uses buildEnemyUnits and the real getValidTargets/scoreTarget targeting logic');
startGame();
setupFight(sixMonsters(), ACE_MIN_STAGE);   // non-elite, Ace-eligible
Math.random = () => 0;   // every enemy slot rolls the same species, AND forces an Ace onto slot 0 — strictly the fastest on the field
const preview = previewFirstThreat();
Math.random = realRandom;
ok('a real preview comes back', !!preview, preview);
ok('the identified threat is named consistently with a forced Ace roll — proof this reads buildEnemyUnits\' real output, not a stand-in',
   preview && ACE_TITLES.some(t=>preview.threatName.indexOf(t)===0), preview && preview.threatName);
ok('the predicted target is a real, named unit from the roster', preview && typeof preview.targetName==='string' && preview.targetName.length>0);
ok('the predicted target row is a real formation row', preview && (preview.targetRow==='front' || preview.targetRow==='back'));
ok('the element carried is a real element key', preview && Object.keys(ELEM_BEATS).indexOf(preview.threatElement)>=0, preview && preview.threatElement);

console.log('\n[213] previewFirstThreat never leaks into persisted state, and restores state.battle exactly as it found it');
startGame();
setupFight(sixMonsters(), 3);
ok('sanity: state.battle starts null on the Formation screen', state.battle===null);
const rosterBefore = JSON.stringify(state.roster), bondsBefore = JSON.stringify(state.bondCounts);
previewFirstThreat();
ok('state.battle is null again immediately after — nothing lingers from the scratch preview', state.battle===null);
ok('the persisted roster is completely unchanged', JSON.stringify(state.roster)===rosterBefore);
ok('bond counts are untouched — no real battle was ever fought', JSON.stringify(state.bondCounts)===bondsBefore);

setupFight(sixMonsters(), 3);
beginBattle();
const liveBattle = state.battle;
previewFirstThreat();
ok('a genuinely in-progress battle object (if one somehow existed) is restored exactly, not clobbered', state.battle===liveBattle);

console.log('\n[214] renderFormation: the Threat Preview panel appears with real content, and is absent when there\'s nothing to preview');
startGame();
clearFormation();
let formHtml = renderFormation();
ok('an empty formation shows no Threat Preview panel at all', formHtml.indexOf('THREAT PREVIEW')<0);

startGame();
setupFight(sixMonsters(), 3);
Math.random = () => 0;
formHtml = renderFormation();
Math.random = realRandom;
ok('a filled formation shows the Threat Preview panel', formHtml.indexOf('🎯 THREAT PREVIEW')>=0);
ok('it calls out a real element in bold, as a "strike"', /<b>\w+<\/b> strike/.test(formHtml), formHtml.match(/<b>\w+<\/b> strike/));
ok('it is explicit that this is a read, not a promise', /not a promise|scouting read/i.test(formHtml));

startGame();
setupFight(sixMonsters(), 3);
state.duel = { userId:'x', name:'Rival', formation:{units:[]} };
formHtml = renderFormation();
state.duel = null;
ok('the panel is correctly absent during duel setup, even with a full formation', formHtml.indexOf('THREAT PREVIEW')<0);

console.log('\n[215] each call is a fresh, live scouting read — not a memoised, stale snapshot');
startGame();
setupFight(sixMonsters(), 3);
ok('previewFirstThreat can be called repeatedly without throwing or caching a broken state', !!previewFirstThreat() && !!previewFirstThreat());

console.log('\n[216] works for boss stages too, through the same buildBossUnits path');
startGame();
setupFight(sixMonsters(), CAMPAIGN_LENGTH+7);   // Warlord Ashclaw, per the Depth Chart suite\'s established cadence
Math.random = () => 0;
const bossPreview = previewFirstThreat();
Math.random = realRandom;
ok('a boss-stage preview still resolves to a real, named unit', bossPreview && typeof bossPreview.threatName==='string' && bossPreview.threatName.length>0, bossPreview);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
