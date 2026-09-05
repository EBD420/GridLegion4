
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
const GROVE = CAMPAIGN_DETOURS.find(d=>d.id==='stripped_grove');
const GARRISON = CAMPAIGN_DETOURS.find(d=>d.id==='ashen_garrison');
const LINE = CAMPAIGN_DETOURS.find(d=>d.id==='fragile_line');

console.log('\n[250] data sanity: three detours, each anchored to a real, non-boss surface stage');
ok('exactly three detours', CAMPAIGN_DETOURS.length===3);
ok('every detour id is unique', new Set(CAMPAIGN_DETOURS.map(d=>d.id)).size===CAMPAIGN_DETOURS.length);
ok('every anchor stage is a real, in-range surface stage', CAMPAIGN_DETOURS.every(d=>d.afterStage>=1 && d.afterStage<CAMPAIGN_LENGTH));
ok('no detour is anchored to a boss stage — those stay on the main line', CAMPAIGN_DETOURS.every(d=>!bossForStage(d.afterStage)));
ok('the stat multiplier is a real, meaningful increase, not a no-op or a nerf', DETOUR_STAT_MULT>1);
ok('the three named helpers actually resolved', !!GROVE && !!GARRISON && !!LINE);
ok('one detour of each reward type — favor, part, lore', ['favor','part','lore'].every(t=>CAMPAIGN_DETOURS.some(d=>d.reward.type===t)));

console.log('\n[251] the Hub button is unconditional, and availability tracks state.cleared / claimed');
startGame();
let hubHtml = renderHub();
ok('the Campaign Map button is always on the Hub, even with nothing cleared yet', hubHtml.indexOf('Campaign Map')>=0);
clearStages([]);
ok('nothing cleared -> no detour is available yet', CAMPAIGN_DETOURS.every(d=>!detourAvailable(d)));
clearStages([GROVE.afterStage]);
ok('clearing its anchor stage makes a detour available', detourAvailable(GROVE));
ok('the other two, still uncleared, remain unavailable', !detourAvailable(GARRISON) && !detourAvailable(LINE));
state.campaignDetours = {}; state.campaignDetours[GROVE.id] = true;
ok('once claimed, it is no longer available, even though the stage is still cleared', !detourAvailable(GROVE));
ok('claimedDetour reads it back correctly', claimedDetour(GROVE.id) && !claimedDetour(GARRISON.id));

console.log('\n[252] the map screen: navigation, the node spine, and the selected-detour detail panel');
startGame();
clearStages([GROVE.afterStage]);
goCampaignMap();
ok('goCampaignMap lands on the map screen', state.screen==='campaignmap');
ok('goCampaignMap clears any stale selection', state.detourSelected===null);
let html = renderCampaignMap();
for(let s=1;s<=CAMPAIGN_LENGTH;s++) ok(`stage ${s} is plotted on the spine`, html.indexOf('>'+s+'<')>=0);
ok('all three detour markers render', (html.match(/onclick="selectDetour\(/g)||[]).length===3);
ok('no detail panel shows before anything is selected', html.indexOf('TAKE THE DETOUR')<0 && html.indexOf(GROVE.name)<0);
selectDetour(GARRISON.id);
ok('selecting a detour records it', state.detourSelected===GARRISON.id);
html = renderCampaignMap();
ok('the detail panel names the selected detour', html.indexOf(GARRISON.name)>=0);
ok('an unavailable detour hides its exact reward behind a tease', html.indexOf('???')>=0 && html.indexOf(GARRISON.rewardDesc)<0);
ok('no "take the detour" button for a locked detour', html.indexOf('TAKE THE DETOUR')<0);
selectDetour(GROVE.id);
html = renderCampaignMap();
ok('an available detour shows its real reward and a way to take it', html.indexOf(GROVE.rewardDesc)>=0 && html.indexOf('TAKE THE DETOUR')>=0);

console.log('\n[253] beginDetour gating: refuses when locked or unknown, succeeds when available');
startGame();
setupFight(sixMonsters(), 6);   // wherever the legion currently stands
clearStages([]);
beginDetour(GROVE.id);
ok('refuses a detour whose anchor stage is not yet cleared', state.detour===null && state.battle===null);
beginDetour('not_a_real_detour_id');
ok('refuses an unknown id outright', state.detour===null && state.battle===null);
clearStages([GROVE.afterStage]);
beginDetour(GROVE.id);
ok('an available detour actually starts a battle', !!state.battle);
ok('state.detour is tagged with the right id', state.detour && state.detour.id===GROVE.id);
ok('state.stage is temporarily swapped to the anchor stage for the fight', state.stage===GROVE.afterStage);
ok('a normal-sized wave for that stage is on the field', state.battle.enemyUnits.length===Math.min(3+Math.floor((GROVE.afterStage-1)/2),6));
ok('the battle log calls out the detour by name', state.battle.log.some(l=>l.indexOf(GROVE.name)>=0));

console.log('\n[254] "a harder fight": a detour wave is scaled up by exactly DETOUR_STAT_MULT over the same stage fought normally');
startGame();
const terrain2 = terrainForStage(2);   // stage 2: below ACE_MIN_STAGE and never an elite stage, so
                                        // buildEnemyUnits burns no extra Math.random() calls on Ace/Vanguard rolls here
state.detour = null;
Math.random = () => 0;
const normalUnits = buildEnemyUnits(2, terrain2, null, false, null);
Math.random = realRandom;
state.detour = { id: GROVE.id };
Math.random = () => 0;
const detourUnits = buildEnemyUnits(2, terrain2, null, false, null);
Math.random = realRandom;
state.detour = null;
const ratio = detourUnits[0].maxHp / normalUnits[0].maxHp;
ok('same species, same headcount — only the stats differ', normalUnits.length===detourUnits.length && normalUnits[0].speciesKey===detourUnits[0].speciesKey);
ok('the detour unit\'s HP is scaled up by exactly the documented multiplier', Math.abs(ratio-DETOUR_STAT_MULT)<0.02, {normalHp:normalUnits[0].maxHp, detourHp:detourUnits[0].maxHp, ratio});

console.log('\n[255] the favor reward, start to finish, through the real battle pipeline');
startGame();
setupFight(sixMonsters(), 4);
clearStages([GROVE.afterStage]);
const favorBefore = favorOf(GROVE.reward.element);
Math.random = () => 0.9999;   // suppresses incidental favor/salvage/recruit rolls elsewhere in
                               // endBattle() so only the guaranteed detour reward moves the number
beginDetour(GROVE.id);
forceWin();
Math.random = realRandom;
ok('a win grants the guaranteed favor', favorOf(GROVE.reward.element)===favorBefore+GROVE.reward.amount);
ok('the detour is now marked claimed', claimedDetour(GROVE.id));
ok('the result carries a display note for it', typeof state.lastResult.detourReward==='string' && state.lastResult.detourReward.length>0);
ok('the result is tagged as a detour, by name', state.lastResult.detour===true && state.lastResult.detourName===GROVE.name);
ok('taking it again is no longer on offer', !detourAvailable(GROVE));

console.log('\n[256] the part reward: granted normally, but withheld (and left unclaimed) when the salvage bay is full');
startGame();
setupFight(sixMonsters(), 4);
clearStages([GARRISON.afterStage]);
const partsBefore = state.parts.length;
Math.random = () => 0.9999;   // suppresses the ordinary salvage/Ace/recruit rolls so the only
                               // part added is the guaranteed detour one
beginDetour(GARRISON.id);
forceWin();
Math.random = realRandom;
ok('the exact promised part was added to the salvage bay', state.parts.length===partsBefore+1 && state.parts[state.parts.length-1].key===GARRISON.reward.key);
ok('claimed', claimedDetour(GARRISON.id));

startGame();
setupFight(sixMonsters(), 4);
clearStages([GARRISON.afterStage]);
state.parts = []; for(let i=0;i<14;i++) state.parts.push({uid:uid(), key:'scraphound'});
beginDetour(GARRISON.id);
forceWin();
ok('a full bay leaves the part ungranted rather than silently discarding the reward', state.parts.length===14);
ok('and crucially leaves the detour UNclaimed, so it can still be collected once there is room', !claimedDetour(GARRISON.id));
ok('no reward note when nothing was actually granted', state.lastResult.detourReward===undefined);

console.log('\n[257] the lore reward: its own War Journal entry, not folded into the battle\'s own summary line');
startGame();
setupFight(sixMonsters(), 8);
clearStages([LINE.afterStage]);
const journalLenBefore = state.journal.length;
beginDetour(LINE.id);
forceWin();
ok('a new, distinct journal entry was added on top of the ordinary battle entry', state.journal.length===journalLenBefore+2);
ok('the field report is the newest entry, carrying the exact recovered text', state.journal[0].text===LINE.reward.text);
ok('claimed', claimedDetour(LINE.id));

console.log('\n[258] one-time only: a claimed detour cannot be fought again through this door');
startGame();
setupFight(sixMonsters(), 4);
state.battle = null;   // startGame()/initGame() doesn't touch a battle left over from an earlier
                        // section in this same script — a real player never reaches the Hub mid-battle,
                        // so this is a test-harness nicety, not something beginDetour() needs to guard
clearStages([GROVE.afterStage]);
state.campaignDetours = {}; state.campaignDetours[GROVE.id] = true;
beginDetour(GROVE.id);
ok('beginDetour refuses a detour that is already claimed', state.detour===null && state.battle===null);

console.log('\n[259] a loss grants nothing but still resolves cleanly, and campaignDetours survives a save round-trip');
startGame();
setupFight(sixMonsters(), 4);
clearStages([GROVE.afterStage]);
beginDetour(GROVE.id);
forceLose();
ok('a lost detour grants no reward', !claimedDetour(GROVE.id) && state.lastResult.detourReward===undefined);
ok('the result is still tagged as a detour for the result screen', state.lastResult.detour===true && state.lastResult.detourName===GROVE.name);
const stageBefore = state.stageBeforeDetour;
endDetour();
ok('endDetour restores the stage the legion was actually on', state.stage===stageBefore);
ok('and returns cleanly to the Hub', state.screen==='hub' && state.detour===null);

startGame();
state.campaignDetours = {}; state.campaignDetours[GROVE.id] = true; state.campaignDetours[LINE.id] = true;
let saved = serializeSave();
ok('claimed detours ride along in the save', JSON.stringify(saved.campaignDetours)===JSON.stringify(state.campaignDetours));
applySave(saved, 0);
ok('a clean save round-trips exactly', claimedDetour(GROVE.id) && claimedDetour(LINE.id) && !claimedDetour(GARRISON.id));
applySave(Object.assign({}, saved, { campaignDetours: { not_a_real_id:true, [GROVE.id]:true } }), 0);
ok('only known detour ids with a truthy value survive revival', JSON.stringify(Object.keys(state.campaignDetours))===JSON.stringify([GROVE.id]), state.campaignDetours);
applySave(Object.assign({}, saved, { campaignDetours: 'not-an-object' }), 0);
ok('a non-object campaignDetours in the save file degrades to empty, not a crash', Object.keys(state.campaignDetours).length===0);

console.log('\n[260] selectMapStage toggles, and stage/detour selection are mutually exclusive');
startGame();
setupFight(sixMonsters(), 4);
clearStages([2,3]);
ok('nothing selected on a fresh visit to the map', state.mapStageSelected===null);
selectMapStage(3);
ok('selecting a stage records it', state.mapStageSelected===3);
selectMapStage(3);
ok('selecting the same stage again toggles it back off', state.mapStageSelected===null);
selectMapStage(2);
ok('selecting a different stage selects that one instead', state.mapStageSelected===2);
selectDetour(GROVE.id);
ok('selecting a detour clears any active stage selection', state.mapStageSelected===null && state.detourSelected===GROVE.id);
selectMapStage(2);
ok('and selecting a stage clears any active detour selection right back', state.detourSelected===null && state.mapStageSelected===2);
goCampaignMap();
ok('re-entering the map screen clears any stale stage selection too', state.mapStageSelected===null);

console.log('\n[261] the stage detail panel: locked, "you are here", and cleared-and-revisitable each read differently');
startGame();
setupFight(sixMonsters(), 4);   // legion currently stands at stage 4
clearStages([2,3]);
selectMapStage(8);
html = renderCampaignMap();
ok('an uncleared stage that isn\'t where you stand says so, with no way to act on it', /not reached yet/i.test(html) && html.indexOf('REDEPLOY HERE')<0);
selectMapStage(4);
html = renderCampaignMap();
ok('the stage you currently stand on says so instead of offering a redeploy', html.indexOf('stands right now')>=0 && html.indexOf('REDEPLOY HERE')<0);
selectMapStage(3);
html = renderCampaignMap();
ok('a cleared stage you are not standing on offers to redeploy there, with its story text', html.indexOf('REDEPLOY HERE')>=0 && html.indexOf(escapeHtml(STAGE_STORY[2]))>=0);
selectMapStage(5);
html = renderCampaignMap();
ok('a boss stage carries the same skull marker in its own panel heading as it does on the spine', html.indexOf('STAGE 5 ☠')>=0);

console.log('\n[262] the redeploy button is a real door into the existing Redeployment pipeline — not a second implementation of it');
startGame();
setupFight(sixMonsters(), 6);
clearStages([3]);
redeployFromMap(3);
ok('redeployFromMap actually starts a battle', !!state.battle);
ok('it goes through state.redeploy, exactly like the Redeployment screen does', state.redeploy && state.redeploy.stage===3);
ok('the stage is temporarily swapped to the one picked from the map', state.stage===3);
forceWin();
ok('the result is tagged exactly the way the existing Redeployment result screen expects', state.lastResult.redeploy===true);
const stageBeforeRedeploy = state.stageBeforeRedeploy;
endRedeploy();
ok('endRedeploy (the pre-existing function) cleanly hands control back', state.stage===stageBeforeRedeploy && state.screen==='hub' && state.redeploy===null);

console.log('\n[263] the redeploy button in the stage panel is disabled with an empty formation, exactly like the Redeployment screen');
startGame();
state.stage = 6;
clearStages([3]);
state.formation.front=[null,null,null]; state.formation.back=[null,null,null];
selectMapStage(3);
html = renderCampaignMap();
ok('the button renders disabled with nothing deployed', html.indexOf('disabled onclick="redeployFromMap(3)"')>=0);
setupFight(sixMonsters(), 6);   // fills the formation; state.mapStageSelected is already 3 from above (selectMapStage toggles, so calling it again here would deselect it)
html = renderCampaignMap();
ok('and enabled again once a formation is set', html.indexOf('disabled onclick="redeployFromMap(3)"')<0 && html.indexOf('onclick="redeployFromMap(3)"')>=0);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
