
(function(){
console.log('\n[44] missing-function diagnosis');
CLOUD.url='https://test.supabase.co'; CLOUD.anonKey='sb_publishable_test';
srvReset();
SRV.noFunctions = true;   // tables installed, step 2 never run

let chain = cloudSignUp('setup@example.com','hunter2').then(()=>{
  state.profileName='Ironpaw';
  return guildCreate('Ironpaw Company','IRON');
}).then(r=>{
  ok('guild creation fails cleanly', r.ok===false);
  ok('error names the real cause, not PostgREST jargon',
     /multiplayer functions are not installed/i.test(r.error), r.error);
  ok('error points at the exact step', /step 2/i.test(r.error) && /SETUP-MULTIPLAYER/.test(r.error), r.error);
  ok('raw schema-cache wording is not shown to the player', !/schema cache/i.test(r.error.split('—')[0]), r.error);
  return raidStart();
}).then(r=>{
  ok('raid summon gives the same guidance', /step 2/i.test(r.error), r.error);
  return ladderPublish();
}).then(r=>{
  ok('ladder publish gives the same guidance', /step 2/i.test(r.error), r.error);
  return cloudSelfTest();
}).then(t=>{
  const txt=t.lines.map(l=>l.text).join(' | ');
  ok('self-test flags the missing functions', /functions are NOT installed/i.test(txt), txt);
  ok('self-test still says the table is fine', /table exists/i.test(txt), txt);
  ok('the two failures are reported separately', t.lines.length>=3, t.lines.length);

  /* now install them */
  SRV.noFunctions = false;
  return cloudSelfTest();
}).then(t=>{
  const txt=t.lines.map(l=>l.text).join(' | ');
  ok('self-test confirms once installed', /functions are installed/i.test(txt), txt);
  ok('the probe created nothing', Object.keys(SRV.guilds).length===0, Object.keys(SRV.guilds));
  ok('the probe joined nothing', Object.keys(SRV.gmembers).length===0, Object.keys(SRV.gmembers));
  ok('the probe published nothing to the ladder', Object.keys(SRV.ladder).length===0);
  return guildCreate('Ironpaw Company','IRON');
}).then(r=>{
  ok('guild creation now works', r.ok===true, r.error);
  ok('guild is live', social.guild && social.guild.tag==='IRON');

  console.log('\n[45] other server errors still surface honestly');
  return rpc('create_guild', {p_name:'Dup', p_tag:'IRON', p_display:'x'});
}).then(r=>{
  ok('a real rejection is passed through, not masked', r.ok===false && /already in a guild/i.test(r.error), r.error);

  console.log('\n[46] guild-hall migration (step 4) diagnosis');
  SRV.preGuildHall = true;   // steps 1+2 done, step 4 (guild levels/profiles) never run
  return cloudSelfTest();
}).then(t=>{
  const txt=t.lines.map(l=>l.text).join(' | ');
  ok('self-test flags the missing guild-hall migration', /guild-hall upgrade has NOT been run/i.test(txt), txt);
  ok('it points at the exact step', /step 4/i.test(txt) && /SETUP-MULTIPLAYER/.test(txt), txt);
  ok('the earlier checks still pass', /functions are installed/i.test(txt), txt);

  /* the same failure, hit live through the guild screen rather than the diagnostic probe */
  social.guild=null; social.members=[]; social.guildError='';
  return guildFetch();
}).then(()=>{
  ok('guildFetch does not silently give up', social.guildError, social.guildError);
  ok('the error names the real cause', /guild-hall upgrade/i.test(social.guildError), social.guildError);
  const html = renderGuild();
  ok('the guild screen shows the warning instead of staying blank', html.indexOf(social.guildError)>=0, html);
  ok('the join/found form is still usable underneath it', /Found guild/.test(html));

  SRV.preGuildHall = false;
  return cloudSelfTest();
}).then(t=>{
  const txt=t.lines.map(l=>l.text).join(' | ');
  ok('self-test confirms the columns once migrated', /Guild-hall columns are present/i.test(txt), txt);

  console.log('\n================ '+pass+' passed, '+fail+' failed ================');
  process.exit(fail?1:0);
}).catch(e=>{ console.log('HARNESS ERROR', e); process.exit(1); });
})();
