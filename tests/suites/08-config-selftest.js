
(function(){
console.log('\n[32] shipped configuration');
ok('project URL is wired in', /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(CLOUD.url), CLOUD.url);
ok('key is wired in', CLOUD.anonKey.length>20);
ok('key is a publishable key, not a secret one',
   /^sb_publishable_/.test(CLOUD.anonKey) || /^eyJ/.test(CLOUD.anonKey), CLOUD.anonKey.slice(0,16));
ok('no secret key shipped', !/sb_secret_|service_role/i.test(CLOUD.anonKey));
ok('accounts are now switched on', cloudConfigured());
ok('account UI appears on the profiles screen', /Sign in \/ Create account/.test(renderProfiles()));

console.log('\n[33] connection self-test diagnoses each failure');
const realUrl=CLOUD.url, realKey=CLOUD.anonKey;
const texts = r => r.lines.map(l=>l.text).join(' | ');

/* a secret key must be caught before any request goes out */
CLOUD.anonKey='sb_secret_dangerous';
let chain = cloudSelfTest().then(r=>{
  ok('secret key is refused loudly', r.fatal===true && /SECRET KEY/i.test(texts(r)), texts(r));
  ok('and no request was made with it', !SRV.calls.some(c=>c.path.indexOf('/auth/v1/health')===0));
  CLOUD.anonKey=realKey;
  /* unreachable project */
  SRV.online=false;
  return cloudSelfTest();
}).then(r=>{
  ok('unreachable host is reported plainly', /Could not reach/i.test(texts(r)), texts(r));
  ok('and mentions the file:// gotcha', /file:\/\//.test(texts(r)));
  SRV.online=true;
  /* healthy project, table present, RLS on */
  srvReset();
  return cloudSelfTest();
}).then(r=>{
  ok('healthy project passes auth check', r.lines[0].ok===true, texts(r));
  ok('and reports the table looks locked down', /RLS looks correct|locked down/i.test(texts(r)), texts(r));
  /* missing table */
  SRV.tableMissing=true;
  return cloudSelfTest();
}).then(r=>{
  ok('missing table is named exactly', /table is missing/i.test(texts(r)), texts(r));
  ok('and points at the setup step', /SETUP-BACKEND/.test(texts(r)));
  SRV.tableMissing=false;
  /* RLS disabled: a signed-out read returns rows */
  SRV.leakRows=true;
  return cloudSelfTest();
}).then(r=>{
  ok('disabled RLS is caught', /row-level security is NOT/i.test(texts(r)), texts(r));
  ok('and flagged as blocking', /before letting anyone play/i.test(texts(r)));
  SRV.leakRows=false;
  /* bad key */
  SRV.rejectKey=true;
  return cloudSelfTest();
}).then(r=>{
  ok('rejected key is reported', /key was rejected/i.test(texts(r)), texts(r));
  SRV.rejectKey=false;
  return null;
}).then(()=>{
  console.log('\n[34] game still fine with the real config');
  srvReset();
  startGame();
  ok('local play unaffected', state.roster.length===3 && state.stage===1);
  state.slot=0;
  ok('local autosave still works', autosave()===true);
  ok('not signed in yet, so nothing is pushed', !signedIn());
  ok('status line tells the player they are local-only', /Not signed in/.test(cloudStatusText()), cloudStatusText());
  console.log('\n================ '+pass+' passed, '+fail+' failed ================');
  process.exit(fail?1:0);
}).catch(e=>{ console.log('HARNESS ERROR', e); process.exit(1); });
})();
