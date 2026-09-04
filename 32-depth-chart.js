
(function(){
console.log('\n[176] the constants are sane, and needs zero new save data — cleared/bestDepth already exist');
ok('row height and the defensive row cap are both sane', DEPTH_CHART_ROW_H>0 && DEPTH_CHART_MAX_ROWS>=50);

console.log('\n[177] depthMilestoneType: classifies every kind of Deep depth correctly, bosses always winning over the raw elite check');
ok('depth 10 (Foundry Core) is NOT misclassified as an elite wave, even though 10%5===0 satisfies isEliteStage on its own',
   depthMilestoneType(10)==='foundry' && isEliteStage(CAMPAIGN_LENGTH+10)===true,
   'this proves the priority check actually matters, not just a vacuous pass');
ok('depth 20 and depth 30 (later Foundry Cores) stay foundry for the same reason', depthMilestoneType(20)==='foundry' && depthMilestoneType(30)==='foundry');
ok('depth 6 is the Fracture Engine', depthMilestoneType(6)==='fracture');
ok('depth 16, 26, 36 keep cycling as Fracture Engine', depthMilestoneType(16)==='fracture' && depthMilestoneType(26)==='fracture' && depthMilestoneType(36)==='fracture');
ok('depth 7 is a warlord (Ashclaw)', depthMilestoneType(7)==='warlord');
ok('depth 17 (Tidewrack) and depth 27 (Galevane) keep cycling as warlord', depthMilestoneType(17)==='warlord' && depthMilestoneType(27)==='warlord');
ok('depth 5 is an ordinary elite wave (no boss there)', depthMilestoneType(5)==='elite' && !bossForStage(CAMPAIGN_LENGTH+5));
ok('depths 1-4 are ordinary waves', [1,2,3,4].every(d=>depthMilestoneType(d)==='wave'));
ok('every depth 1-50 lands in exactly one of the five buckets, none left unclassified',
   Array.from({length:50},(_,i)=>i+1).every(d=>['foundry','fracture','warlord','elite','wave'].indexOf(depthMilestoneType(d))>=0));

console.log('\n[178] depthMilestoneMeta: real emoji, a real color, a real label for every milestone type — and only those');
const foundryMeta = depthMilestoneMeta(10,'foundry');
ok('foundry meta matches DEEP_BOSS itself', foundryMeta.emoji===DEEP_BOSS.emoji && foundryMeta.label===DEEP_BOSS.name && foundryMeta.color==='var(--volt)', foundryMeta);
const fractureMeta = depthMilestoneMeta(6,'fracture');
ok('fracture meta matches DEEP_SPLIT_BOSS itself', fractureMeta.emoji===DEEP_SPLIT_BOSS.emoji && fractureMeta.label===DEEP_SPLIT_BOSS.name && fractureMeta.color==='var(--earth)', fractureMeta);
const warlordMeta7 = depthMilestoneMeta(7,'warlord'), warlordMeta17 = depthMilestoneMeta(17,'warlord');
ok('warlord meta pulls the real fielded warlord\'s own name/emoji/element, not a generic placeholder',
   warlordMeta7.label==='Warlord Ashclaw' && warlordMeta7.color==='var(--fire)' &&
   warlordMeta17.label==='Warlord Tidewrack' && warlordMeta17.color==='var(--water)', [warlordMeta7, warlordMeta17]);
const eliteMeta = depthMilestoneMeta(5,'elite');
ok('elite meta is its own generic marker', eliteMeta.label==='Elite Wave' && eliteMeta.color==='var(--danger)');
const waveMeta = depthMilestoneMeta(1,'wave');
ok('an ordinary wave carries no label or emoji at all — it only ever renders as a small dot', waveMeta.emoji===null && waveMeta.label===null);

console.log('\n[179] clearedDeepDepths / depthChartStats: reads straight off state.cleared, surface stages excluded');
startGame();
ok('a fresh legion has charted nothing', clearedDeepDepths().length===0 && depthChartStats().maxDepth===0);
state.cleared[3] = true; state.cleared[CAMPAIGN_LENGTH] = true;   // surface only
ok('surface-only progress contributes no Deep depths to the chart', clearedDeepDepths().length===0);
state.cleared[CAMPAIGN_LENGTH+1] = true;
state.cleared[CAMPAIGN_LENGTH+6] = true;   // fracture
state.cleared[CAMPAIGN_LENGTH+7] = true;   // warlord
state.cleared[CAMPAIGN_LENGTH+10] = true;  // foundry
const stats = depthChartStats();
ok('Deep depths are extracted, converted to real depth numbers, and sorted', JSON.stringify(stats.depths)==='[1,6,7,10]', stats.depths);
ok('maxDepth is the deepest one charted', stats.maxDepth===10);
ok('the type tally matches what was actually cleared', stats.stats.wave===1 && stats.stats.fracture===1 && stats.stats.warlord===1 && stats.stats.foundry===1 && stats.stats.elite===0, stats.stats);

console.log('\n[180] renderDepthChart(): the empty state, the header, and the stat line');
startGame();
let html = renderDepthChart();
ok('nothing charted yet says so plainly instead of drawing an empty chart', html.indexOf('Nothing charted yet')>=0);
ok('surface-not-cleared header reads correctly', /Surface campaign not yet cleared/.test(html));
ok('the deepest-reach stat reads 0 on a fresh legion', html.indexOf('Depth 0')>=0);

state.cleared[CAMPAIGN_LENGTH] = true;
html = renderDepthChart();
ok('once Stage '+CAMPAIGN_LENGTH+' falls, the header flips to cleared', /Surface campaign cleared\./.test(html));

console.log('\n[181] renderDepthChart(): real milestones render with their real names, colors and depth numbers');
startGame();
state.cleared[CAMPAIGN_LENGTH+6] = true;    // Fracture Engine
state.cleared[CAMPAIGN_LENGTH+7] = true;    // Warlord Ashclaw
state.cleared[CAMPAIGN_LENGTH+10] = true;   // Foundry Core
state.bestDepth = 10;
html = renderDepthChart();
ok('the Fracture Engine depth is labeled by name', html.indexOf('Depth 6 — '+DEEP_SPLIT_BOSS.name)>=0);
ok('the warlord depth is labeled by its own fielded name, not a generic "warlord"', html.indexOf('Depth 7 — Warlord Ashclaw')>=0);
ok('the Foundry Core depth is labeled by name', html.indexOf('Depth 10 — '+DEEP_BOSS.name)>=0);
ok('the deepest-reach stat reflects state.bestDepth', html.indexOf('Depth 10</b>')>=0, html);
ok('the milestone counts in the summary line are all correct', html.indexOf('Foundry Core ×1')>=0 && html.indexOf('Warlords ×1')>=0 && html.indexOf('Fracture Engine ×1')>=0 && html.indexOf('Elite waves ×0')>=0);

console.log('\n[182] renderDepthChart(): "you are here" marks the live, uncharted depth distinctly from a cleared one');
startGame();
state.stage = CAMPAIGN_LENGTH + 4;   // mid-fight on an ordinary, not-yet-cleared depth
html = renderDepthChart();
ok('the current uncleared depth gets its own "you are here" marker', html.indexOf('Depth 4 — you are here')>=0, html);

startGame();
state.stage = 3;   // still on the surface — no Deep depth is "current" at all
html = renderDepthChart();
ok('while still on the surface, no "you are here" marker appears in the Deep chart', html.indexOf('you are here')<0);

console.log('\n[183] renderDepthChart(): a depth already cleared in a past life can also be the live depth this life');
startGame();
state.cleared[CAMPAIGN_LENGTH+6] = true;   // cleared once already (a prior life, per this legion\'s history)
state.stage = CAMPAIGN_LENGTH + 6;         // and it is the one being fought again, right now
html = renderDepthChart();
ok('it still shows as the real milestone it is (name, not a blank tick)', html.indexOf('Depth 6 — '+DEEP_SPLIT_BOSS.name)>=0);

console.log('\n[184] renderDepthChart(): the defensive row cap kicks in and says so, without needing hundreds of real battles to test it');
startGame();
state.cleared[CAMPAIGN_LENGTH + DEPTH_CHART_MAX_ROWS + 50] = true;   // fake a very long climb directly
html = renderDepthChart();
ok('a climb longer than the row cap gets an honest note that it is only showing the tail end', /Showing the most recent/.test(html), html.match(/Showing the most recent \d+ depths/));
ok('the deepest-reach stat still reports the true depth even when the drawing itself is capped', html.indexOf('Depth '+(DEPTH_CHART_MAX_ROWS+50)+'</b>')>=0);

startGame();
state.cleared[CAMPAIGN_LENGTH+3] = true;
html = renderDepthChart();
ok('an ordinary short climb never shows the capped-view note at all', html.indexOf('Showing the most recent')<0);

console.log('\n[185] persistence: nothing new to sanitize — cleared/bestDepth already survive Rebirth and reset on a fresh legion');
startGame();
state.stage = REBIRTH_MIN_STAGE + 1;
state.cleared[CAMPAIGN_LENGTH+6] = true;
state.bestDepth = 6;
doRebirth(); doRebirth();
ok('the Depth Chart\'s data survives Rebirth exactly like the Bestiary, Bonds, Doctrine and Archive', !!state.cleared[CAMPAIGN_LENGTH+6] && state.bestDepth===6);
ok('and the chart itself still renders that history right after the Rebirth', renderDepthChart().indexOf('Depth 6 — '+DEEP_SPLIT_BOSS.name)>=0);

startGame();
ok('a genuinely fresh legion clears the chart back to nothing (via the existing cleared/bestDepth reset in initGame)', clearedDeepDepths().length===0 && state.bestDepth===0);

console.log('\n[186] navigation and the Hub button');
startGame();
let hubHtml = renderHub();
ok('the Hub carries a Depth Chart button', hubHtml.indexOf('🗺 Depth Chart')>=0);
state.screen = 'hub';
let threw = null;
try{ goDepthChart(); }catch(e){ threw = e; }
ok('goDepthChart() navigates there and render() dispatches it without throwing', threw===null && state.screen==='depthchart', threw && threw.stack);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
