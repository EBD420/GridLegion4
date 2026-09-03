
(function(){
function pass_(){ }
console.log('\n[23] unconfigured fallback');
(function(){
  const u=CLOUD.url, k=CLOUD.anonKey;
  CLOUD.url=''; CLOUD.anonKey='';
  ok('blanking the config disables accounts', !cloudConfigured());
  ok('account screen explains how to enable it', /not switched on/i.test(renderAccount()));
  ok('profiles screen hides account UI when off', !/Sign in/.test(renderProfiles()));
  ok('cloudInit is a no-op when off', (cloudInit(), cloud.status==='off'));
  ok('local saving still works with no backend', (startGame(), state.slot=0, autosave()===true));
  CLOUD.url=u; CLOUD.anonKey=k;
})();

srvReset();

console.log('\n[24] sign up and sign in');
let done=false;
cloudSignUp('brandon@example.com','hunter2').then(r=>{
  ok('sign up succeeds', r.ok===true && !!r.session, r.error);
  ok('session is held', signedIn());
  ok('session persisted for next visit', !!loadStoredSession());
  return cloudSignOut();
}).then(()=>{
  ok('sign out clears the session', !signedIn());
  ok('and clears stored session', loadStoredSession()===null);
  return cloudSignIn('brandon@example.com','wrongpass');
}).then(r=>{
  ok('wrong password rejected', r.ok===false);
  ok('and the reason is shown to the player', /invalid login/i.test(r.error), r.error);
  ok('still signed out after a failure', !signedIn());
  return cloudSignIn('nobody@example.com','hunter2');
}).then(r=>{
  ok('unknown account rejected', r.ok===false);
  return cloudSignUp('brandon@example.com','hunter2');
}).then(r=>{
  ok('duplicate signup rejected', r.ok===false && /already registered/i.test(r.error), r.error);
  return cloudSignIn('brandon@example.com','hunter2');
}).then(r=>{
  ok('correct password works', r.ok===true && signedIn());

  console.log('\n[25] client-side credential checks');
  cloud.busy=false;
  setInput('acc_email','notanemail'); setInput('acc_pass','longenough');
  doSignIn();
  ok('malformed email caught before any request', /email address/i.test(cloud.message), cloud.message);
  setInput('acc_email','a@b.com'); setInput('acc_pass','123');
  doSignIn();
  ok('short password caught locally', /6 characters/i.test(cloud.message), cloud.message);

  console.log('\n[26] cloud save round-trip');
  startGame();
  state.slot=0; state.profileName='CloudLegion'; state.stage=19; state.bestDepth=9;
  autosave();
  flushTimers();
  return new Promise(r2=>setImmediate(()=>setImmediate(()=>r2())));
}).then(()=>{
  const mine=SRV.rows[cloud.session.user.id];
  ok('autosave pushed to the cloud', !!mine && !!mine[0], Object.keys(SRV.rows));
  ok('cloud row carries the legion', mine[0].data.name==='CloudLegion' && mine[0].data.stage===19);

  /* simulate a brand-new device: wipe local storage, keep the account */
  Object.keys(rawStore()).forEach(k=>{ if(k.indexOf(SAVE_PREFIX)===0) delete rawStore()[k]; });
  ok('new device starts with no local legions', readSlot(0)===null);
  return cloudSyncDown();
}).then(sum=>{
  ok('sync pulled the legion down', sum.restored===1, JSON.stringify(sum));
  ok('legion is now on this device', !!readSlot(0) && readSlot(0).name==='CloudLegion');
  continueSlot(0);
  ok('and is playable', state.stage===19 && state.profileName==='CloudLegion');

  console.log('\n[27] conflict resolution');
  /* local is newer than cloud */
  const uid0=cloud.session.user.id;
  SRV.rows[uid0][0]={ data:{v:1,name:'Stale',stage:3,roster:[],formation:{front:[null,null,null],back:[null,null,null]},savedAt:1000}, updated_at:'x' };
  writeSlot(0, {v:1,name:'Fresh',stage:22,roster:[],formation:{front:[null,null,null],back:[null,null,null]},savedAt:9000});
  return cloudSyncDown();
}).then(()=>{
  ok('newer local save is kept over older cloud', readSlot(0).name==='Fresh', readSlot(0).name);
  /* cloud is newer than local */
  const uid0=cloud.session.user.id;
  SRV.rows[uid0][0]={ data:{v:1,name:'Newer Cloud',stage:30,roster:[],formation:{front:[null,null,null],back:[null,null,null]},savedAt:99000}, updated_at:'x' };
  return cloudSyncDown();
}).then(()=>{
  ok('newer cloud save wins over older local', readSlot(0).name==='Newer Cloud', readSlot(0).name);
  /* corrupt cloud row must not poison the device */
  const uid0=cloud.session.user.id;
  const before=readSlot(0).name;
  SRV.rows[uid0][1]={ data:{garbage:true}, updated_at:'x' };
  return cloudSyncDown().then(()=>{
    ok('invalid cloud row ignored', readSlot(1)===null);
    ok('and the good slot is untouched', readSlot(0).name===before);
  });
}).then(()=>{
  console.log('\n[28] expired tokens');
  const realTok=cloud.session.access_token;
  delete SRV.tokens[realTok];              // server now rejects it with 401
  return cloudPullSlots().then(rows=>{
    ok('a 401 is recovered by refreshing', Array.isArray(rows), rows);
    ok('and the session was replaced', cloud.session.access_token!==realTok);
  });
}).then(()=>{
  /* a dead refresh token must sign the player out cleanly, not loop */
  SRV.refreshes={}; delete SRV.tokens[cloud.session.access_token];
  return cloudPullSlots().then(rows=>{
    ok('unrecoverable auth failure returns no data', rows===null);
    ok('and does not leave a broken session', !signedIn());
  });
}).then(()=>{
  console.log('\n[29] offline behaviour');
  srvReset();
  return cloudSignUp('offline@example.com','hunter2');
}).then(()=>{
  SRV.online=false;
  startGame(); state.slot=0; state.profileName='Offliner'; state.stage=7;
  const okLocal=autosave();
  ok('local save still succeeds with the network down', okLocal===true);
  flushTimers();
  return new Promise(r=>setImmediate(()=>setImmediate(()=>r())));
}).then(()=>{
  ok('cloud push reports offline', cloud.status==='offline', cloud.status);
  ok('player is told it will retry', /retry/i.test(cloud.message), cloud.message);
  ok('the push is still queued', cloud.pendingPush===true);
  ok('game remains playable offline', (state.roster=[newMonster('emberling',5)],
     state.formation.front=[state.roster[0].uid,null,null], state.formation.back=[null,null,null],
     state.intel={history:[],wins:0}, state.stage=1, beginBattle(), !!state.battle));
  return cloudSyncDown();
}).then(sum=>{
  ok('sync down degrades gracefully offline', sum.offline===true);
  ok('local legion survived', readSlot(0).name==='Offliner');
  SRV.online=true;
  autosave(); flushTimers();
  return new Promise(r=>setImmediate(()=>setImmediate(()=>r())));
}).then(()=>{
  ok('reconnecting pushes the backlog', cloud.status==='ready', cloud.status);
  ok('cloud now holds the legion', !!SRV.rows[cloud.session.user.id][0]);

  console.log('\n[30] email confirmation projects');
  srvReset(); SRV.requireConfirm=true; saveSession(null);
  return cloudSignUp('confirm@example.com','hunter2');
}).then(r=>{
  ok('confirmation flow reported, not treated as failure', r.ok===true && r.needsConfirm===true);
  ok('no session yet', !signedIn());

  console.log('\n[31] account isolation');
  srvReset();
  return cloudSignUp('alice@example.com','alicepw');
}).then(()=>{
  writeSlot(0,{v:1,name:'Alice Legion',stage:5,roster:[],formation:{front:[null,null,null],back:[null,null,null]},savedAt:5000});
  return cloudSyncUp();
}).then(()=>cloudSignOut()).then(()=>cloudSignUp('bob@example.com','bobpw')).then(()=>{
  Object.keys(rawStore()).forEach(k=>{ if(k.indexOf(SAVE_PREFIX)===0) delete rawStore()[k]; });
  return cloudSyncDown();
}).then(sum=>{
  ok('a new account sees none of the other account\'s legions', sum.pulled===0, JSON.stringify(sum));
  ok('and nothing was written locally', readSlot(0)===null);
    console.log('\n================ '+pass+' passed, '+fail+' failed ================');
  process.exit(fail?1:0);
}).catch(e=>{ console.log('HARNESS ERROR', e); process.exit(1); });
})();
