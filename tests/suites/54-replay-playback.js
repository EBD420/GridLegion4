
(function(){
CLOUD.url='https://test.supabase.co'; CLOUD.anonKey='sb_publishable_test';
srvReset();
const realRandom = Math.random;
function sixMonsters(){ return ['emberling','aqualing','terrafang','emberling','aqualing','terrafang'].map(id=>newMonster(id,10,1,{key:'keen'})); }
function setupFight(mons, stage){
  state.roster = mons;
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.intel={history:[],wins:0}; state.stage=stage;
  beginBattle(); return state.battle;
}
function forceWin(){ const b=state.battle; b.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;}); return checkBattleEnd(); }
const NORMAL_STAGE = 2;

console.log('\n[361] recordReplayAction()/applyDamage(): every kind of resolved attack is captured structurally, in step with the prose log');
startGame();
let B = setupFight(sixMonsters(), NORMAL_STAGE);
ok('a fresh battle starts actionLog empty', Array.isArray(B.actionLog) && B.actionLog.length===0);
let p = B.playerUnits, e = B.enemyUnits;
Math.random = () => 0.99;
let atk = p[0], tgt = e[0];
tgt.dodge=0; tgt.shield=false; tgt.firstHitReduction=false; atk.missChance=0;
applyDamage(atk, tgt, false);
Math.random = realRandom;
ok('a normal hit is recorded with attacker/defender ids, damage, and the exact same message the prose log got', B.actionLog.length===1 &&
   B.actionLog[0].a===atk.id && B.actionLog[0].d===tgt.id && B.actionLog[0].dmg>0 && B.actionLog[0].msg===B.log[0], B.actionLog[0]);
ok('a normal hit is not flagged as crit, faint, miss, dodge or cascade', !B.actionLog[0].crit && !B.actionLog[0].faint && !B.actionLog[0].miss && !B.actionLog[0].dodge && !B.actionLog[0].cascade);

atk.missChance = 1;
applyDamage(atk, e[1], false);
atk.missChance = 0;
ok('a miss is recorded distinctly, with no damage field implied', B.actionLog[1].miss===true && B.actionLog[1].a===atk.id && B.actionLog[1].d===e[1].id, B.actionLog[1]);

e[1].dodge = 1;
applyDamage(atk, e[1], false);
e[1].dodge = 0;
ok('a dodge is recorded distinctly from a miss', B.actionLog[2].dodge===true && !B.actionLog[2].miss, B.actionLog[2]);

e[1].shield = true;
Math.random = () => 0.99;
applyDamage(atk, e[1], false);
Math.random = realRandom;
ok('a shielded (0-damage) hit is still recorded, just with dmg 0 — playback tells this apart from a miss/dodge by the dmg/miss/dodge fields together', B.actionLog[3].dmg===0 && !B.actionLog[3].miss && !B.actionLog[3].dodge, B.actionLog[3]);

Math.random = () => 0.99;
const probe = computeDamage(atk, e[2], false);
e[2].hp = probe.dmg;
applyDamage(atk, e[2], false);
Math.random = realRandom;
ok('a killing blow is recorded with faint:true', B.actionLog[4].faint===true && e[2].fainted===true, B.actionLog[4]);

console.log('\n[362] cascade overflow gets its own distinct actionLog entry, separate from the original killing blow');
startGame();
B = setupFight(sixMonsters(), NORMAL_STAGE);
p = B.playerUnits; e = B.enemyUnits;
atk = p[0];
Math.random = () => 0.99;
let targetA = e[0], targetB = e[1];
targetA.dodge=0; targetA.shield=false; targetA.firstHitReduction=false; atk.missChance=0;
targetB.hp = 999999; targetB.maxHp = 999999;
const probe2 = computeDamage(atk, targetA, false);
targetA.hp = probe2.dmg - 4;
applyDamage(atk, targetA, false);
Math.random = realRandom;
ok('exactly two actionLog entries come out of one overkill: the kill itself, then the cascade', B.actionLog.length===2, B.actionLog);
ok('the second entry is flagged cascade:true, crediting the same original attacker against the row-mate', B.actionLog[1].cascade===true && B.actionLog[1].a===atk.id && B.actionLog[1].d===targetB.id && B.actionLog[1].dmg===4, B.actionLog[1]);

console.log('\n[363] REPLAY_LOG_CAP: recording stops once the cap is reached — first-N, never a rolling window');
startGame();
B = setupFight(sixMonsters(), NORMAL_STAGE);
for(let i=0;i<REPLAY_LOG_CAP+15;i++) recordReplayAction({ a:'x', d:'y', dmg:i });
ok('the log never grows past the cap no matter how many actions actually happen', B.actionLog.length===REPLAY_LOG_CAP, B.actionLog.length);
ok('it is the FIRST entries that survive, not the most recent — the opening of the fight, not a rolling tail', B.actionLog[0].dmg===0 && B.actionLog[REPLAY_LOG_CAP-1].dmg===REPLAY_LOG_CAP-1, [B.actionLog[0], B.actionLog[REPLAY_LOG_CAP-1]]);

console.log('\n[364] captureReplay(): the roster snapshot mirrors both battle sides with exactly what playback needs, and the log matches state.battle.actionLog at that moment');
startGame();
B = setupFight(sixMonsters(), NORMAL_STAGE);
p = B.playerUnits; e = B.enemyUnits;
Math.random = () => 0.99;
atk = p[0]; tgt = e[0];
tgt.dodge=0; tgt.shield=false; tgt.firstHitReduction=false; atk.missChance=0;
applyDamage(atk, tgt, false);
Math.random = realRandom;
forceWin();
captureReplay('boss', 'Capture test felled');
let rep = state.replays[0];
ok('the roster carries all six player units and every enemy the wave actually fielded', rep.roster.player.length===6 && rep.roster.enemy.length===e.length, [rep.roster.player.length, rep.roster.enemy.length]);
ok('a player unit snapshot carries id/side/name/emoji/maxHp matching the real battle unit', rep.roster.player[0].id===p[0].id && rep.roster.player[0].side==='player' && rep.roster.player[0].name===p[0].name && rep.roster.player[0].maxHp===p[0].maxHp, rep.roster.player[0]);
ok('an enemy unit snapshot does the same', rep.roster.enemy[0].id===e[0].id && rep.roster.enemy[0].side==='enemy' && rep.roster.enemy[0].maxHp===e[0].maxHp, rep.roster.enemy[0]);
ok('the captured log is exactly what state.battle.actionLog held at capture time', JSON.stringify(rep.log)===JSON.stringify(B.actionLog), [rep.log, B.actionLog]);

console.log('\n[365] reviveReplayUnit()/reviveReplayRoster(): defensive against garbage — never trust a snapshot round-tripped through storage or another player\'s shared row');
ok('a non-object is rejected outright', reviveReplayUnit(null)===null && reviveReplayUnit('nope')===null && reviveReplayUnit(42)===null);
ok('missing/invalid side is rejected', reviveReplayUnit({id:'x', side:'spectator', name:'X', maxHp:10})===null);
ok('a well-formed minimal unit survives with sane defaults for everything unspecified', (()=>{
  const u = reviveReplayUnit({id:'p0', side:'player', name:'Emberling'});
  return u && u.id==='p0' && u.side==='player' && u.row==='front' && u.maxHp===1 && u.isBoss===false && u.corruption===0 && u.trait===null;
})());
ok('an invalid element/plating string never survives — falls back to null rather than something an attacker chose', (()=>{
  const u = reviveReplayUnit({id:'p0', side:'player', name:'X', element:'<script>', plating:'nonsense'});
  return u.element===null && u.plating===null;
})());
ok('a bogus trait key is dropped, a real one survives', (()=>{
  const bad = reviveReplayUnit({id:'p0', side:'player', name:'X', trait:{key:'not-a-real-trait'}});
  const good = reviveReplayUnit({id:'p0', side:'player', name:'X', trait:{key:'keen'}});
  return bad.trait===null && good.trait && good.trait.key==='keen';
})());
ok('negative/NaN corruption and maxHp are sanitized rather than trusted', (()=>{
  const u = reviveReplayUnit({id:'p0', side:'player', name:'X', maxHp:-50, corruption:-9});
  return u.maxHp===1 && u.corruption===0;
})());
ok('a malformed sprite recipe degrades to null (unitSpriteHtml then falls back to the emoji) instead of surviving as garbage', (()=>{
  const u = reviveReplayUnit({id:'p0', side:'player', name:'X', sprite:{shape:'not-a-real-shape'}});
  return u.sprite===null;
})());
const roster = reviveReplayRoster({
  player: [{id:'p0',side:'player',name:'A'},{id:'p1',side:'player',name:'B'}, null, 'garbage', {id:'p2',side:'enemy',name:'wrong side, should be rejected here'}],
  enemy: [{id:'e0',side:'enemy',name:'C'}],
});
ok('reviveReplayRoster filters out nulls, garbage and side-mismatched entries, keeping only the genuinely valid ones', roster.player.length===2 && roster.enemy.length===1, roster);
ok('a completely garbage roster degrades to two empty arrays rather than throwing', (()=>{ const r = reviveReplayRoster('nope'); return r.player.length===0 && r.enemy.length===0; })());
ok('rosters are capped at the real maximum headcount per side (6 fielded, up to 8 enemies with Reinforcement Wave)', (()=>{
  const many = { player: Array.from({length:20},(_,i)=>({id:'p'+i,side:'player',name:'X'})), enemy: Array.from({length:20},(_,i)=>({id:'e'+i,side:'enemy',name:'Y'})) };
  const r = reviveReplayRoster(many);
  return r.player.length===6 && r.enemy.length===8;
})());

console.log('\n[366] reviveReplayLog(): the same defensive treatment for the action log itself');
ok('a non-array input degrades to an empty log', reviveReplayLog('nope').length===0 && reviveReplayLog(null).length===0);
ok('entries missing an attacker or defender id are dropped', reviveReplayLog([{dmg:5}, {a:'x'}, {a:'x', d:'y', dmg:5}]).length===1);
ok('an invalid element string is dropped to null rather than trusted verbatim', reviveReplayLog([{a:'x',d:'y',elem:'<img src=x>'}])[0].elem===null);
ok('a real element survives', reviveReplayLog([{a:'x',d:'y',elem:'fire'}])[0].elem==='fire');
ok('negative/garbage damage sanitizes to 0, booleans are coerced strictly (truthy strings do not count)', (()=>{
  const e2 = reviveReplayLog([{a:'x',d:'y',dmg:-5,crit:'yes',faint:1}])[0];
  return e2.dmg===0 && e2.crit===false && e2.faint===false;
})());
ok('the log is capped at REPLAY_LOG_CAP on revival too, not just at recording time', reviveReplayLog(Array.from({length:REPLAY_LOG_CAP+50},()=>({a:'x',d:'y'}))).length===REPLAY_LOG_CAP);

console.log('\n[367] replayPlaybackSource()/canWatchReplay(): local and remote replays normalize the same way, and an incomplete/legacy replay honestly reports itself as unwatchable');
const fullLocal = { label:'Test', kind:'boss', log:[{a:'p0',d:'e0',dmg:5}], roster:{ player:[{id:'p0',side:'player',name:'A'}], enemy:[{id:'e0',side:'enemy',name:'B'}] } };
ok('a fully-recorded local replay is watchable', canWatchReplay(fullLocal, false)===true);
const legacyLocal = { label:'Old one', kind:'streak' };   // captured before this feature existed — no log/roster fields at all
ok('an old replay with no log/roster at all is honestly reported as not watchable, not a crash', canWatchReplay(legacyLocal, false)===false);
const emptyLogLocal = { label:'No fights recorded', kind:'depth', log:[], roster: fullLocal.roster };
ok('a roster with an empty log (e.g. captured via a forced win that skipped applyDamage) is also unwatchable', canWatchReplay(emptyLogLocal, false)===false);
const fullRemote = { display_name:'IronVanguard', data: { label:'Shared win', kind:'depth', log:[{a:'p0',d:'e0',dmg:5}], roster: fullLocal.roster } };
ok('a fully-recorded remote (community) replay is watchable too, normalized from its data column', canWatchReplay(fullRemote, true)===true);
const src = replayPlaybackSource(fullRemote, true);
ok('the remote source carries who shared it', src.by==='IronVanguard' && src.label==='Shared win');
const localSrc = replayPlaybackSource(fullLocal, false);
ok('a local source carries no "shared by" attribution', localSrc.by===null);

console.log('\n[368] renderReplayCard(): the Watch button only appears when a replay is genuinely watchable, and wires to the right function for local vs. remote');
let cardHtml = renderReplayCard(Object.assign({id:'r1'}, fullLocal), false);
ok('a watchable local card gets a Watch button keyed to its own id', cardHtml.indexOf("onclick=\"goWatchLocalReplay('r1')\"")>=0, cardHtml);
let legacyCardHtml = renderReplayCard(Object.assign({id:'r2'}, legacyLocal), false);
ok('an unwatchable card says so plainly instead of offering a dead button', legacyCardHtml.indexOf('no full playback recorded')>=0 && legacyCardHtml.indexOf('goWatchLocalReplay')<0, legacyCardHtml);
let remoteCardHtml = renderReplayCard(fullRemote, true, 3);
ok('a watchable remote card is keyed to its array index, not a row id it does not have', remoteCardHtml.indexOf('onclick="goWatchRemoteReplay(3)"')>=0, remoteCardHtml);

console.log('\n[369] goWatchLocalReplay()/goWatchRemoteReplay()/startReplayPlayback(): sets up a clean, full-HP working state and navigates to the playback screen');
startGame();
state.replays = [Object.assign({id:'watchme'}, fullLocal)];
goWatchLocalReplay('watchme');
ok('the screen switches to replaywatch', state.screen==='replaywatch');
ok('state.playback starts every unit at full HP, nobody fainted, step 0, paused, 1x speed', state.playback.player[0].hp===state.playback.player[0].maxHp && !state.playback.player[0].fainted &&
   state.playback.step===0 && state.playback.playing===false && state.playback.speed===1, state.playback);
ok('the working rosters are independent copies, not references into the stored replay (mutating one never touches the saved record)', state.playback.player[0]!==state.replays[0].roster.player[0]);

state.screen = 'hub'; state.playback = null;
goWatchLocalReplay('does-not-exist');
ok('watching an unknown local id is a harmless no-op, no crash, no navigation', state.screen==='hub' && state.playback===null);

state.replays = [Object.assign({id:'nolog'}, legacyLocal)];
goWatchLocalReplay('nolog');
ok('watching a replay with nothing recorded is also a harmless no-op', state.screen==='hub' && state.playback===null);

social.replays = [fullRemote];
goWatchRemoteReplay(0);
ok('watching a community replay works the same way, by array index', state.screen==='replaywatch' && !!state.playback && state.playback.by==='IronVanguard');
state.screen='hub'; state.playback=null;
goWatchRemoteReplay(99);
ok('an out-of-range community index is also a harmless no-op', state.screen==='hub' && state.playback===null);

console.log('\n[370] advanceReplayStep(): correct HP/fainted bookkeeping for every entry kind, stops cleanly at the end, and tolerates a tampered id it cannot find');
startGame();
const richLocal = {
  label:'Full fight', kind:'boss',
  roster: { player:[{id:'p0',side:'player',name:'Emberling',maxHp:100}], enemy:[{id:'e0',side:'enemy',name:'Cinderjaw',maxHp:50},{id:'e1',side:'enemy',name:'Sparkdrone',maxHp:40}] },
  log: [
    { a:'p0', d:'e0', dmg:20 },
    { a:'p0', d:'e0', dmg:30, crit:true, faint:true },
    { a:'e1', d:'p0', miss:true },
    { a:'e1', d:'p0', dodge:true },
    { a:'p0', d:'e1', dmg:0 },                 // a shielded/blocked hit
    { a:'p0', d:'ghost-unit-that-does-not-exist', dmg:999 },   // tampered/unknown id
  ],
};
state.replays = [Object.assign({id:'rich'}, richLocal)];
goWatchLocalReplay('rich');
const pb = state.playback;
ok('step 1: a plain hit reduces the target\'s HP by exactly the recorded amount', advanceReplayStep() && playbackUnitById('e0').hp===30);
ok('step 2: a killing blow faints the target and its HP floors at zero, never negative', advanceReplayStep() && playbackUnitById('e0').hp===0 && playbackUnitById('e0').fainted===true);
ok('step 3: a miss changes nobody\'s HP', advanceReplayStep() && playbackUnitById('p0').hp===100);
ok('step 4: a dodge changes nobody\'s HP either', advanceReplayStep() && playbackUnitById('p0').hp===100);
ok('step 5: a 0-damage block leaves HP untouched but still consumes a step', advanceReplayStep() && playbackUnitById('e1').hp===40);
ok('step 6: an entry naming an id that does not exist in this roster is skipped safely rather than throwing', (()=>{
  let threw=null, res=null;
  try{ res = advanceReplayStep(); }catch(err){ threw=err; }
  return threw===null && res===true;
})());
ok('the cursor has advanced past every entry now', pb.step===richLocal.log.length);
ok('advancing again once the log is exhausted returns false and changes nothing further', advanceReplayStep()===false && pb.step===richLocal.log.length);

console.log('\n[371] toggleReplayPlay()/restartReplayPlayback()/cycleReplaySpeed(): the playback controls\' state transitions');
ok('toggling play from a fresh, unplayed replay starts it playing', (()=>{ toggleReplayPlay(); return state.playback.playing===true; })());
ok('toggling again pauses it without touching progress', (()=>{ toggleReplayPlay(); return state.playback.playing===false; })());
ok('cycling speed flips between 1x and 2x', (()=>{ cycleReplaySpeed(); const a=state.playback.speed; cycleReplaySpeed(); return a===2 && state.playback.speed===1; })());
restartReplayPlayback();
ok('restart resets every unit to full HP, clears fainted, and rewinds the cursor to 0', state.playback.step===0 && playbackUnitById('e0').hp===50 && playbackUnitById('e0').fainted===false);
while(advanceReplayStep()){}
ok('sanity: the replay is now fully finished', state.playback.step===richLocal.log.length);
toggleReplayPlay();
ok('pressing Play again after finishing restarts it from the top rather than doing nothing', state.playback.step===0 && state.playback.playing===true && playbackUnitById('e0').hp===50);
toggleReplayPlay();

console.log('\n[372] replayStepForward(): a single manual step that also pauses autoplay');
restartReplayPlayback();
state.playback.playing = true;
replayStepForward();
ok('one manual step advances the cursor by exactly one and pauses autoplay', state.playback.step===1 && state.playback.playing===false);

console.log('\n[373] renderReplayPlayback(): renders both lanes, an honest progress readout, working controls, and a graceful empty state');
restartReplayPlayback();
let pbHtml = renderReplayPlayback();
ok('both sides render with their real unit counts', (pbHtml.match(/data-unit="p0"/g)||[]).length===1 && (pbHtml.match(/data-unit="e0"/g)||[]).length===1 && (pbHtml.match(/data-unit="e1"/g)||[]).length===1, pbHtml);
ok('the progress readout starts at action 1 of the real total', pbHtml.indexOf('Action 1 / '+richLocal.log.length)>=0, pbHtml);
ok('a Play and a Step control are both present, Step is not disabled at the start', pbHtml.indexOf('onclick="toggleReplayPlay()"')>=0 && /onclick="replayStepForward\(\)">/.test(pbHtml) && !/disabled[^>]*onclick="replayStepForward\(\)"/.test(pbHtml));
while(advanceReplayStep()){}
let doneHtml = renderReplayPlayback();
ok('once finished, the readout says so and Step becomes disabled', doneHtml.indexOf('Replay finished.')>=0 && /disabled[^>]*onclick="replayStepForward\(\)"/.test(doneHtml), doneHtml);
ok('the Play button itself now offers to play it again', doneHtml.indexOf('Play again')>=0, doneHtml);
const savedPb = state.playback;
state.playback = null;
ok('with nothing loaded, rendering the screen degrades to a plain message rather than throwing', renderReplayPlayback().indexOf('No replay loaded')>=0);
state.playback = savedPb;

console.log('\n[374] a fight that hit the recording cap shows an honest note about it; an ordinary short fight does not');
state.playback.log = Array.from({length:REPLAY_LOG_CAP}, ()=>({a:'p0', d:'e0', dmg:1}));
state.playback.step = 0;
ok('a log sitting exactly at the cap is flagged as an abbreviated replay', renderReplayPlayback().indexOf('ran long')>=0);
state.playback.log = richLocal.log;
ok('an ordinary log well under the cap gets no such warning', renderReplayPlayback().indexOf('ran long')<0);

console.log('\n[375] stopReplayPlayback() and the wider save lifecycle: playback is UI-only, never persisted, always cleared going into or out of a save load');
stopReplayPlayback();
ok('leaving playback clears it and returns to the Replays screen', state.playback===null && state.screen==='replays');
ok('a brand-new default state starts with no playback loaded', (()=>{ startGame(); return state.playback===null; })());
ok('serializeSave() never writes playback data to the save file at all', JSON.stringify(serializeSave()).indexOf('playback')<0);
state.playback = { label:'stale', player:[], enemy:[], log:[], step:0, playing:false, speed:1 };
const save2 = serializeSave();
applySave(save2);
ok('loading a save always clears any in-progress playback, the same treatment state.battle itself gets', state.playback===null);

console.log('\n[376] shareReplay() includes the full log and roster in the shared payload, and render() actually dispatches the new screen');
startGame();
return cloudSignUp('replaywatcher@example.com','pw123456').then(()=>{
  B = setupFight(sixMonsters(), NORMAL_STAGE);
  Math.random = () => 0.99;
  applyDamage(B.playerUnits[0], B.enemyUnits[0], false);
  Math.random = realRandom;
  forceWin();
  captureReplay('boss', 'Share test felled');
  return doShareReplay(state.replays[0].id);
}).then(()=>{
  const posted = SRV.replays[Object.keys(SRV.replays)[Object.keys(SRV.replays).length-1]];
  ok('the shared row carries a non-empty action log', posted && Array.isArray(posted.data.log) && posted.data.log.length>0, posted && posted.data);
  ok('the shared row carries the full two-sided roster, not just the player formation summary', posted && posted.data.roster && posted.data.roster.player.length===6 && posted.data.roster.enemy.length>0, posted && posted.data.roster);

  state.replays[0].shared = false;   // isolate: confirm render() wiring independent of the share flow above
  state.screen = 'replaywatch';
  state.playback = null;
  let threw = null;
  try{ render(); }catch(e){ threw = e; }
  ok('render() with screen=replaywatch calls renderReplayPlayback() without throwing, even with nothing loaded', threw===null, threw && threw.stack);

  console.log('\n================ '+pass+' passed, '+fail+' failed ================');
  process.exit(fail?1:0);
}).catch(e=>{ console.log('HARNESS ERROR', e); process.exit(1); });
})();
