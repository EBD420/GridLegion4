
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
const realRandom = Math.random;

console.log('\n[304] generateUsername() / isDefaultLegionName() / assignDefaultUsername(): a themed name for an account that never named itself');
const sample = Array.from({length:40}, ()=>generateUsername());
ok('every generated name is drawn from the themed adjective+noun+number pools', sample.every(n=>USERNAME_ADJ.some(a=>n.indexOf(a)===0)));
ok('every generated name ends in a 3-digit number', sample.every(n=>/\d{3}$/.test(n)));
ok('every generated name fits the same 18-char cap Legion Identity already enforces', sample.every(n=>n.length<=18));
ok('generation is not stuck on one fixed output', new Set(sample).size>1, sample.slice(0,5));

ok('the untouched startGame() default counts as unnamed', isDefaultLegionName('Legion'));
ok('an untouched blank-profile default ("Legion 3") counts as unnamed too', isDefaultLegionName('Legion 3'));
ok('empty/null/undefined all count as unnamed', isDefaultLegionName('') && isDefaultLegionName(null) && isDefaultLegionName(undefined));
ok('a name the player actually chose is never mistaken for a default', !isDefaultLegionName('Ironpaw Legion') && !isDefaultLegionName('Legiontown'));

startGame();
state.profileName = 'Legion';
assignDefaultUsername();
ok('assignDefaultUsername replaces an untouched default', state.profileName!=='Legion' && !isDefaultLegionName(state.profileName), state.profileName);

startGame();
state.profileName = 'My Iron Fist';
assignDefaultUsername();
ok('assignDefaultUsername never overwrites a name the player already set', state.profileName==='My Iron Fist');

console.log('\n[305] doSignUp()\'s exact sequence: cloudSignUp() then assignDefaultUsername(), regardless of email confirmation');
srvReset();
startGame();
state.profileName = 'Legion';
let chain = cloudSignUp('new@example.com','pw123456').then(r=>{
  ok('sign-up itself succeeds against a fresh project', r.ok===true, r.error);
  assignDefaultUsername();
  ok('a fresh account with an untouched legion name gets a generated username', state.profileName!=='Legion' && !isDefaultLegionName(state.profileName), state.profileName);

  cloud.session = null;
  srvReset();
  startGame();
  state.profileName = 'Rustpaw Vanguard';   // the player had already renamed this legion
  return cloudSignUp('named@example.com','pw123456');
}).then(r=>{
  assignDefaultUsername();
  ok('but a legion the player already renamed keeps that name through sign-up', state.profileName==='Rustpaw Vanguard');

  cloud.session = null;
  srvReset();
  SRV.requireConfirm = true;   // email confirmation on: no session yet, but this is still a real registration
  startGame();
  state.profileName = 'Legion';
  return cloudSignUp('confirm@example.com','pw123456');
}).then(r=>{
  ok('sanity: confirmation-required signup reports needsConfirm', r.needsConfirm===true);
  assignDefaultUsername();
  ok('a username is generated even when confirmation is pending — this is local state, independent of the server session', state.profileName!=='Legion' && !isDefaultLegionName(state.profileName), state.profileName);
  SRV.requireConfirm = false;

  console.log('\n[306] legionBanner() carries the generated username everywhere the existing display name already goes');
  cloud.session = null;
  srvReset();
  startGame();
  state.profileName = 'Legion';
  return cloudSignUp('banner@example.com','pw123456');
}).then(r=>{
  assignDefaultUsername();
  const name = state.profileName;
  ok('legionBanner() reflects the freshly generated username with no glyph on an empty emblem', legionBanner()===name, legionBanner());
  return guildCreate('Banner Test','BANR');
}).then(r=>{
  ok('sanity: the guild actually got created', r.ok===true, r.error);
  const mine = social.members.find(m=>m.user_id===cloud.session.user.id);
  ok('the guild roster shows the generated username, exactly as it would a hand-typed legion name', mine && mine.display_name===state.profileName, mine);

  console.log('\n[307] presenceSync() / the heartbeat RPC: requires an account, upserts one row keyed by account, keeps last_seen fresh');
  return presenceSync();
}).then(()=>{
  return presenceSync();   // heartbeat again — should update the same row, not create a second one
}).then(()=>{
  ok('exactly one presence row exists for this account no matter how many times it heartbeats', Object.keys(SRV.presence).length===1, Object.keys(SRV.presence));
  return presenceFetch();
}).then(()=>{
  ok('presenceFetch() surfaces that row with the account\'s current username', social.online.length===1 && social.online[0].username===state.profileName, social.online);

  cloud.session = null;
  srvReset();
  return presenceSync();
}).then(r=>{
  ok('signed out, presenceSync() is a harmless no-op and never reaches the network', r.ok===false && SRV.calls.every(c=>c.path!=='/rest/v1/rpc/heartbeat'));
  return presenceFetch();
}).then(rows=>{
  ok('presenceFetch() is the same no-op when signed out — same as guildFetch()/ladderFetch(), it leaves whatever state was there rather than clearing it', rows===null);

  console.log('\n[308] presenceFetch(): only heartbeats from inside the online window come back, older ones are silently dropped');
  cloud.session = null;
  srvReset();
  startGame();
  return cloudSignUp('window@example.com','pw123456');
}).then(()=>{
  return presenceSync();
}).then(()=>{
  const uid = cloud.session.user.id;
  ok('sanity: the heartbeat just landed with a fresh timestamp', !!SRV.presence[uid]);
  // A second account whose last heartbeat has aged out of the window.
  SRV.presence['stale_uid'] = { user_id:'stale_uid', username:'GhostVanguard000', last_seen: new Date(Date.now()-PRESENCE_WINDOW_MS-60000).toISOString() };
  // And a third, just inside the window.
  SRV.presence['fresh_uid'] = { user_id:'fresh_uid', username:'FreshScout111', last_seen: new Date(Date.now()-1000).toISOString() };
  return presenceFetch();
}).then(()=>{
  const names = social.online.map(r=>r.username);
  ok('the account that heartbeated moments ago is included', names.indexOf(state.profileName)>=0, names);
  ok('an entry just inside the window is included', names.indexOf('FreshScout111')>=0, names);
  ok('an entry that aged out of the window is silently excluded, not an error', names.indexOf('GhostVanguard000')<0, names);
  ok('most-recent-first ordering', Date.parse(social.online[0].last_seen)>=Date.parse(social.online[social.online.length-1].last_seen));

  console.log('\n[309] missing-migration diagnosis: the presence table/function not installed yet degrades to real guidance, not a blank screen');
  SRV.noPresenceTable = true;
  return presenceFetch();
}).then(()=>{
  ok('a missing presence table produces an actionable error naming step 6', /step 6/i.test(social.onlineError), social.onlineError);
  ok('the online list itself is cleared rather than left stale', social.online.length===0);
  return presenceSync();
}).then(r=>{
  ok('the heartbeat RPC fails the same way when the function is not installed', r.ok===false && /step 6/i.test(r.error), r);
  SRV.noPresenceTable = false;
  return presenceFetch();
}).then(()=>{

  console.log('\n[310] renderOnline(): signed-out prompt, empty state, and a populated list with escaping and "you" called out');
  cloud.session = null;
  srvReset();
  let html = renderOnline();
  ok('signed out shows the standard account prompt, same as Guild and Ladder', /ONLINE NOW/.test(html) && /Sign in/.test(html));

  startGame();
  return cloudSignUp('render@example.com','pw123456');
}).then(()=>{
  social.online = [];
  social.onlineError = '';
  let html = renderOnline();
  ok('signed in with nobody else around shows an honest empty state, not a blank list', /Nobody else is online/.test(html));
  ok('the heading still reports a real zero rather than omitting the count', /0 COMMANDERS ONLINE/.test(html), html);

  const myId = cloud.session.user.id;
  social.online = [
    { user_id: myId, username: state.profileName, last_seen: new Date().toISOString() },
    { user_id: 'other1', username: '<script>alert(1)</script>', last_seen: new Date(Date.now()-120000).toISOString() },
  ];
  let html2 = renderOnline();
  ok('the heading counts everyone currently listed', /2 COMMANDERS ONLINE/.test(html2), html2);
  ok('my own row is called out', html2.indexOf('📡 '+escapeHtml(state.profileName))>=0 && html2.indexOf('← you')>=0, html2);
  ok('a hostile-looking username is escaped, never rendered as live markup', html2.indexOf('<script>')<0 && html2.indexOf('&lt;script&gt;')>=0, html2);
  ok('a real "active X ago" reads for the other row', /active/.test(html2));

  console.log('\n[311] Hub wiring: the button is present, goOnline() syncs then fetches when signed in, and just navigates when signed out');
  const hubHtml = renderHub();
  ok('the Hub carries a button straight into Online Now', hubHtml.indexOf('Online Now')>=0 && hubHtml.indexOf('onclick="goOnline()"')>=0);

  social.online = []; social.onlineError='';
  goOnline();
  ok('goOnline() lands on the screen immediately', state.screen==='online');
  // goOnline() already queued its own sync+fetch; awaiting our own copy of the
  // same two calls is a deterministic proxy for "that chain has settled".
  return presenceSync().then(()=>presenceFetch());
}).then(()=>{
  ok('after opening the screen while signed in, the account\'s own heartbeat is on the list', social.online.some(r=>r.username===state.profileName), social.online);

  cloud.session = null;
  goOnline();
  ok('signed out, goOnline() still navigates to the screen (which then shows the sign-in prompt)', state.screen==='online');

  console.log('\n[312] the shared battle tail pings presence on ordinary stage wins and losses, and skips it exactly where the streak/Caravan already do');
  srvReset();
  startGame();
  return cloudSignUp('battle@example.com','pw123456');
}).then(()=>{
  fillFormation(sixMonsters());
  state.stage = 2;
  const realPresenceSync = presenceSync;
  let calls = 0;
  presenceSync = function(){ calls++; return realPresenceSync(); };

  beginBattle(); forceWin();
  ok('a normal stage win pings presence', calls===1, calls);

  advanceStage();
  beginBattle(); forceLose();
  ok('a normal stage loss pings presence too — activity, not victory, is the signal', calls===2, calls);

  social.opponent = { user_id:'riv1', display_name:'Rival', formation:{units:[]} };
  Math.random = () => 1;
  startDuel();
  checkBattleEnd();
  Math.random = realRandom;
  ok('a duel never pings presence — same shared-tail exclusion as the win streak and the Caravan', calls===2, calls);
  endDuel(); social.opponent = null;

  Math.random = () => 1;
  startRaidRun();
  checkBattleEnd();
  Math.random = realRandom;
  ok('neither does a raid run', calls===2, calls);
  endRaidRun();

  state.trialPick = { stage:1, mods:['blitz'] };
  Math.random = () => 1;
  startTrial();
  checkBattleEnd();
  Math.random = realRandom;
  ok('nor a trial run', calls===2, calls);

  presenceSync = realPresenceSync;

  console.log('\n[313] cloudSelfTest(): reports the presence table\'s install state alongside the guild-hall and council checks');
  return cloudSelfTest();
}).then(r=>{
  ok('a fully-installed project reports the presence table present', r.lines.some(l=>l.ok && /presence table is present/i.test(l.text)), r.lines);
  SRV.noPresenceTable = true;
  return cloudSelfTest();
}).then(r=>{
  ok('a project missing step 6 reports it by name, not a generic failure', r.lines.some(l=>!l.ok && /step 6/i.test(l.text)), r.lines);
  SRV.noPresenceTable = false;

  console.log('\n[314] persistence: a generated username round-trips through a save exactly like any hand-typed legion name');
  startGame();
  state.profileName = 'Legion';
  assignDefaultUsername();
  const generated = state.profileName;
  const saved = serializeSave();
  applySave(saved, 0);
  ok('the generated username survives a save/load round-trip unchanged', state.profileName===generated, [generated, state.profileName]);

  console.log('\n================ '+pass+' passed, '+fail+' failed ================');
  process.exit(fail?1:0);
}).catch(e=>{ console.log('HARNESS ERROR', e); process.exit(1); });
})();
