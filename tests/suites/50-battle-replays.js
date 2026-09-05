
(function(){
CLOUD.url='https://test.supabase.co'; CLOUD.anonKey='sb_publishable_test';
srvReset();
function sixMonsters(){ return ['emberling','aqualing','terrafang','emberling','aqualing','terrafang'].map(id=>newMonster(id,10,1,{key:'keen'})); }
function fillFormation(mons){
  state.roster = mons;
  state.formation.front=[mons[0].uid, mons[1].uid, mons[2].uid];
  state.formation.back=[mons[3].uid, mons[4].uid, mons[5].uid];
}
function forceWin(){ const b=state.battle; b.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;}); return checkBattleEnd(); }
function forceLose(){ const b=state.battle; b.playerUnits.forEach(u=>{u.hp=0;u.fainted=true;}); return checkBattleEnd(); }
const BOSS_STAGE = 5;          // Foundry Overseer — a real scripted boss, no elite/warlord overlap
const NORMAL_STAGE = 2;        // no boss, plain wave
const DEEP_STAGE = CAMPAIGN_LENGTH + 1;   // Depth 1 — no boss/split-boss/warlord this early

console.log('\n[325] captureReplay(): automatic triggers — boss kill, new best win streak, new best deepest reach — at most one per battle, in that priority order');
startGame();
fillFormation(sixMonsters());
state.stage = NORMAL_STAGE;
beginBattle(); forceWin();
ok('a single ordinary win (streak 1) captures nothing — not yet a "notable" streak', state.replays.length===0, state.replays);

advanceStage();
beginBattle(); forceWin();
advanceStage();
beginBattle(); forceWin();
ok('the third win in a row is a genuine new best-streak record and gets captured', state.replays.length===1, state.replays);
ok('the captured replay is tagged as a streak replay, at the right stage', state.replays[0].kind==='streak' && /3-win streak/.test(state.replays[0].label), state.replays[0]);
ok('it carries a real formation snapshot and power score, same shape the Ladder already publishes', state.replays[0].formation.units.length===6 && state.replays[0].power>0, state.replays[0]);
ok('it carries at least one highlight line pulled from the War Journal entry for this exact battle', state.replays[0].highlights.length>0 && state.replays[0].highlights[0]===state.journal[0].text.split(/(?<=[.!?])\s+/)[0]);

startGame();
fillFormation(sixMonsters());
state.stage = BOSS_STAGE;
beginBattle(); forceWin();
ok('a boss kill is captured even though it is also this legion\'s first-ever win (streak 1, nowhere near "notable")', state.replays.length===1, state.replays);
ok('the boss replay names the boss that fell', state.replays[0].kind==='boss' && state.replays[0].label==='Foundry Overseer felled', state.replays[0]);

startGame();
fillFormation(sixMonsters());
state.stage = DEEP_STAGE;
beginBattle(); forceWin();
ok('a fresh deepest-reach win (Depth 1, bestDepth was 0) is captured as a depth replay — streak is only 1, so it does not shadow this one', state.replays.length===1, state.replays);
ok('the depth replay names the depth reached', state.replays[0].kind==='depth' && state.replays[0].label==='Depth 1 reached', state.replays[0]);

console.log('\n[326] priority order: a boss win that ALSO happens to be a new-best streak and a new-best depth only ever captures the boss');
startGame();
fillFormation(sixMonsters());
state.stage = NORMAL_STAGE;
beginBattle(); forceWin(); advanceStage();
beginBattle(); forceWin(); advanceStage();
state.replays = [];   // clear the streak replay the setup above just made, isolate the case under test
state.stage = BOSS_STAGE;   // jump straight to the scripted boss stage, still mid-streak
beginBattle(); forceWin();
ok('exactly one replay is captured, not two or three', state.replays.length===1, state.replays);
ok('boss wins the tie-break over streak', state.replays[0].kind==='boss', state.replays[0]);

console.log('\n[327] ordinary wins and losses that trigger none of the three conditions capture nothing');
startGame();
fillFormation(sixMonsters());
state.stage = NORMAL_STAGE;
beginBattle(); forceLose();
ok('a plain loss captures nothing', state.replays.length===0);
beginBattle(); forceWin();   // streak 1, not notable
ok('a lone win right after a loss (streak reset to 1) still is not "notable" enough to capture', state.replays.length===0, state.replays);

console.log('\n[328] the replay list is capped at REPLAY_CAP, newest first (FIFO)');
startGame();
fillFormation(sixMonsters());
state.stage = NORMAL_STAGE;
beginBattle();   // captureReplay() only ever runs mid/post-battle in real play; give it a real state.battle to read
for(let i=0;i<REPLAY_CAP+4;i++) captureReplay('boss', 'Test boss '+i+' felled');
ok('the list never grows past the cap', state.replays.length===REPLAY_CAP, state.replays.length);
ok('the most recently captured replay is first', state.replays[0].label==='Test boss '+(REPLAY_CAP+3)+' felled', state.replays[0]);
ok('the oldest entries were dropped off the end', state.replays[state.replays.length-1].label==='Test boss 4 felled', state.replays[state.replays.length-1]);

console.log('\n[329] renderReplays(): local list — empty state, a populated card, and the three share-button states');
startGame();
let html = renderReplays();
ok('an empty replay list still renders the screen with an honest empty state, not a blank panel', html.indexOf('BATTLE REPLAYS')>=0 && html.indexOf('No notable battles captured yet')>=0);

captureReplay('boss', 'Test Overseer felled');
html = renderReplays();
ok('a captured replay renders its label, stage and power', html.indexOf('Test Overseer felled')>=0 && html.indexOf('power '+state.replays[0].power)>=0, html);
ok('signed out, the card offers no share button, just a hint to sign in', html.indexOf('sign in to share')>=0 && html.indexOf('doShareReplay')<0, html);

cloud.session = { access_token:'tok', user:{id:'someone'} };
html = renderReplays();
ok('signed in and unshared, the card offers an actual Share button', new RegExp("doShareReplay\\('"+state.replays[0].id+"'\\)").test(html), html);
cloud.session = null;

state.replays[0].shared = true;
html = renderReplays();
ok('once shared, the card shows a checkmark instead of a button', html.indexOf('✓ shared')>=0);

console.log('\n[330] shareReplay(): guards, a clean success, and a missing-table diagnosis');
startGame();
captureReplay('boss', 'Guard Test felled');
const localId = state.replays[0].id;
return shareReplay(localId).then(r=>{
  ok('signed out, sharing is refused before any network call', r.ok===false && /sign in/i.test(r.error) && SRV.calls.every(c=>c.path!=='/rest/v1/replays'), r);

  return cloudSignUp('replayshare@example.com','pw123456');
}).then(()=>{
  return shareReplay('not-a-real-id');
}).then(r=>{
  ok('an id that does not match any local replay is refused, not silently accepted', r.ok===false && /not found/i.test(r.error), r);

  return shareReplay(localId);
}).then(r=>{
  ok('signed in, sharing a real local replay succeeds', r.ok===true, r);
  ok('exactly one row now exists on the server, owned by this account', Object.keys(SRV.replays).length===1);
  const row = Object.values(SRV.replays)[0];
  ok('the shared row carries this account\'s current display name and the replay\'s own data payload', row.display_name===legionBanner() && row.data.label==='Guard Test felled', row);

  console.log('\n[331] doShareReplay(): flips the local flag, and refuses to double-share the same replay');
  state.replays.find(r=>r.id===localId).shared = false;   // undo the direct shareReplay() call above so doShareReplay's own flip is what we're testing
  return doShareReplay(localId);
}).then(()=>{
  ok('after doShareReplay resolves, the local replay is marked shared', state.replays.find(r=>r.id===localId).shared===true);
  const callsBefore = SRV.calls.filter(c=>c.path==='/rest/v1/replays' && c.method==='POST').length;
  doShareReplay(localId);   // already shared — should be an inert no-op
  ok('calling it again on an already-shared replay makes no second network write', SRV.calls.filter(c=>c.path==='/rest/v1/replays' && c.method==='POST').length===callsBefore);

  console.log('\n[332] missing-migration diagnosis: the replays table not installed yet degrades to real guidance, not a crash');
  SRV.noReplaysTable = true;
  captureReplay('streak', 'Another one');
  return shareReplay(state.replays[0].id);
}).then(r=>{
  ok('a missing replays table produces an actionable error naming step 7', r.ok===false && /step 7/i.test(r.error), r);
  SRV.noReplaysTable = false;

  console.log('\n[333] communityReplaysFetch() / renderReplays()\'s Community panel: signed-out prompt, empty state, a populated feed with escaping, and missing-table diagnosis');
  cloud.session = null;
  srvReset();
  let h = renderReplays();
  ok('signed out, the Community Replays panel invites sign-in rather than silently showing nothing', h.indexOf('COMMUNITY REPLAYS')>=0 && h.indexOf('Sign in to browse')>=0);

  startGame();
  return cloudSignUp('community@example.com','pw123456');
}).then(()=>{
  social.replays = []; social.replaysError = '';
  let h = renderReplays();
  ok('signed in with nobody having shared anything yet, an honest empty state is shown', h.indexOf('Nobody has shared a replay yet')>=0);

  social.replays = [
    { display_name:'<script>alert(1)</script>', data:{ label:'Rustbound Marshal felled', kind:'boss', stage:9, deep:false, power:555, formation:{units:[{name:'Emberling',level:12}]}, highlights:['A clean fight.'] }, created_at:new Date().toISOString() },
  ];
  let h2 = renderReplays();
  ok('a populated community feed renders the shared battle\'s label and highlight', h2.indexOf('Rustbound Marshal felled')>=0 && h2.indexOf('A clean fight.')>=0, h2);
  ok('a hostile-looking display name is escaped, never rendered as live markup', h2.indexOf('<script>')<0 && h2.indexOf('&lt;script&gt;')>=0, h2);
  ok('a remote card never offers its own Share button — sharing only ever applies to your own local replays', h2.indexOf('doShareReplay')<0, h2);

  SRV.noReplaysTable = true;
  return communityReplaysFetch();
}).then(()=>{
  ok('a missing table surfaces as a real error naming step 7, and clears the stale feed', /step 7/i.test(social.replaysError) && social.replays.length===0, social.replaysError);
  SRV.noReplaysTable = false;

  console.log('\n[334] Hub wiring and goReplays(): the button, its live count, and navigation with/without an account');
  startGame();
  captureReplay('boss','Count Test felled');
  hubTab='progress';
  let hubHtml = renderHub();
  ok('the Hub carries a button straight into Battle Replays, with a live count', hubHtml.indexOf('onclick="goReplays()"')>=0 && hubHtml.indexOf('Replays (1)')>=0, hubHtml);

  cloud.session = null;
  goReplays();
  ok('signed out, goReplays() still lands on the screen (the Community panel alone prompts sign-in)', state.screen==='replays');

  console.log('\n[335] cloudSelfTest(): reports the replays table\'s install state alongside every earlier migration check');
  srvReset();
  startGame();
  return cloudSignUp('selftest@example.com','pw123456');
}).then(()=>{
  return cloudSelfTest();
}).then(r=>{
  ok('a fully-installed project reports the replays table present', r.lines.some(l=>l.ok && /replays table is present/i.test(l.text)), r.lines);
  SRV.noReplaysTable = true;
  return cloudSelfTest();
}).then(r=>{
  ok('a project missing step 7 reports it by name, not a generic failure', r.lines.some(l=>!l.ok && /step 7/i.test(l.text)), r.lines);
  SRV.noReplaysTable = false;

  console.log('\n[336] persistence: a clean round-trip, defensive sanitization of malformed data, and survival through Rebirth (unlike the roster)');
  startGame();
  captureReplay('boss', 'Persist Me felled');
  captureReplay('streak', '5-win streak');
  let saved = serializeSave();
  ok('both replays ride along in the save, capped the same way the live list is', saved.replays.length===2);
  applySave(saved, 0);
  ok('a clean save round-trips both replays exactly, newest first', state.replays.length===2 && state.replays[0].label==='5-win streak' && state.replays[1].label==='Persist Me felled', state.replays);

  applySave(Object.assign({}, saved, { replays:'not-an-array' }), 0);
  ok('a totally malformed replays field degrades to an empty list, not a crash', Array.isArray(state.replays) && state.replays.length===0);

  applySave(Object.assign({}, saved, { replays:[
    { id:'x1', kind:'not_a_real_kind', label:'Bad kind', stage:2, formation:{units:[]}, highlights:[] },
    { id:'x2', kind:'boss', label:'', stage:2, formation:{units:[]}, highlights:[] },           // empty label
    { id:'x3', kind:'boss', label:'No stage', stage:0, formation:{units:[]}, highlights:[] },   // stage<1
    { id:'x4', kind:'boss', label:'Good one', stage:5, boss:'Foundry Overseer', power:-40,
      formation:{ units:[{name:'Emberling',level:3,row:'front',speciesId:'emberling',tier:1,parts:[],trait:null}], blessing:null, stage:5 },
      highlights:['fine'], at:12345, shared:'yes' },
  ]}), 0);
  ok('an unknown kind, an empty label, and a stage below 1 are all dropped rather than trusted', state.replays.length===1, state.replays);
  const revived = state.replays[0];
  ok('the one surviving entry is sanitized field-by-field: a negative power floors to 0, and a non-boolean shared flag is rejected to false', revived.label==='Good one' && revived.power===0 && revived.shared===false, revived);
  ok('its formation snapshot survives revival with the unit intact', revived.formation.units.length===1 && revived.formation.units[0].name==='Emberling', revived.formation);
  applySave({v:1, name:'x', stage:1, roster:[], formation:{front:[null,null,null],back:[null,null,null]}}, 0);
  ok('a save from before this feature ever existed loads with an empty replay list, not a crash', Array.isArray(state.replays) && state.replays.length===0);

  console.log('\n[337] initGame()/doRebirth(): wiped for a brand-new legion, preserved through Rebirth like Trophy Case and the login streak');
  startGame();
  fillFormation(sixMonsters());
  state.stage = NORMAL_STAGE;
  beginBattle();   // captureReplay() reads state.battle — applySave() above left it null, so give it a fresh one
  captureReplay('boss', 'Old Legion Kill felled');
  ok('sanity: the fresh capture landed', state.replays.length===1);
  startGame();   // an entirely new legion in the same slot
  ok('a brand-new legion starts with no replay history at all', state.replays.length===0);

  fillFormation(sixMonsters());
  beginBattle();
  captureReplay('boss', 'Pre-Rebirth Kill felled');
  state.stage = REBIRTH_MIN_STAGE;
  doRebirth(); // arm
  doRebirth(); // confirm
  ok('a replay captured before Rebirth survives it untouched — permanent record, same as Trophy Case', state.replays.length===1 && state.replays[0].label==='Pre-Rebirth Kill felled', state.replays);

  console.log('\n================ '+pass+' passed, '+fail+' failed ================');
  process.exit(fail?1:0);
}).catch(e=>{ console.log('HARNESS ERROR', e); process.exit(1); });
})();
