
(function(){
CLOUD.url='https://test.supabase.co'; CLOUD.anonKey='sb_publishable_test';
srvReset();

console.log('\n[53] weekKey is stable and deterministic');
const wk1 = weekKey();
ok('weekKey returns a string', typeof wk1==='string' && wk1.length>0, wk1);
ok('weekKey is stable within the same call', weekKey()===wk1);
ok('weekKey has the expected shape', /^W\d+$/.test(wk1), wk1);

console.log('\n[54] council options and tally maths');
ok('two doctrines are defined', Object.keys(COUNCIL_OPTIONS).length===2);
ok('atk and def are both present', !!COUNCIL_OPTIONS.atk && !!COUNCIL_OPTIONS.def);
social.council = [];
ok('no votes yet -> no leader', councilLeadingOption()===null);
ok('empty tally', councilTally().atk===0 && councilTally().def===0);
social.council = [{user_id:'a',option:'atk'},{user_id:'b',option:'atk'},{user_id:'c',option:'def'}];
ok('tally counts correctly', councilTally().atk===2 && councilTally().def===1);
ok('the higher count leads', councilLeadingOption()==='atk');
social.council = [{user_id:'a',option:'atk'},{user_id:'b',option:'def'}];
ok('a tie favours Offensive', councilLeadingOption()==='atk');
social.council = [];

console.log('\n[55] the buff actually changes battle stats');
startGame();
const PIN={key:'keen'};
function mkUnit(){ const m=newMonster('emberling',10,1,PIN); state.roster=[m];
  state.formation.front=[m.uid,null,null]; state.formation.back=[null,null,null];
  state.intel={history:[],wins:0}; state.stage=3; beginBattle(); return state.battle; }
social.council = [];
let B = mkUnit();
const baseAtk = B.playerUnits[0].bAtk, baseDef = B.playerUnits[0].bDef;
social.council = [{user_id:'x',option:'atk'}];
B = mkUnit();
ok('Offensive Doctrine raises ATK only', B.playerUnits[0].bAtk>baseAtk && B.playerUnits[0].bDef===baseDef,
   baseAtk+'/'+baseDef+' -> '+B.playerUnits[0].bAtk+'/'+B.playerUnits[0].bDef);
social.council = [{user_id:'x',option:'def'}];
B = mkUnit();
ok('Defensive Doctrine raises DEF only', B.playerUnits[0].bDef>baseDef && B.playerUnits[0].bAtk===baseAtk,
   baseAtk+'/'+baseDef+' -> '+B.playerUnits[0].bAtk+'/'+B.playerUnits[0].bDef);
social.council = [];

console.log('\n[56] casting and reading votes end-to-end');
let chain = cloudSignUp('council-leader@example.com','pw123456').then(()=>{
  startGame(); state.profileName='Ironpaw';
  const m=newMonster('terrafang',12); state.roster=[m];
  state.formation.front=[m.uid,null,null]; state.formation.back=[null,null,null];
  return guildCreate('Council Co','CNCL');
}).then(()=>{
  ok('starts with no vote cast', myCouncilVote()===null);
  return councilVote('atk');
}).then(r=>{
  ok('vote is accepted', r.ok===true, r.error);
  ok('my vote is now recorded', myCouncilVote()==='atk');
  ok('tally reflects it', councilTally().atk===1);
  ok('leading option is atk', councilLeadingOption()==='atk');
  ok('the guild screen shows the doctrine panel', /GUILD COUNCIL/.test(renderGuild()));
  ok('and marks my vote', /Your vote/.test(renderGuild()));
  /* changing your vote updates rather than duplicates */
  return councilVote('def');
}).then(r=>{
  ok('re-voting succeeds', r.ok===true, r.error);
  ok('vote changed, not duplicated', social.council.length===1, social.council.length);
  ok('my vote is now def', myCouncilVote()==='def');

  console.log('\n[57] a second member votes and the tally combines');
  return cloudSignOut().then(()=>cloudSignUp('council-member@example.com','pw123456')).then(()=>{
    startGame(); state.profileName='Second';
    const m=newMonster('voltcub',8); state.roster=[m];
    state.formation.front=[m.uid,null,null]; state.formation.back=[null,null,null];
    return guildJoin('CNCL');
  });
}).then(()=>councilVote('def')).then(r=>{
  ok('second member votes', r.ok===true, r.error);
  ok('tally now has two def votes', councilTally().def===2 && councilTally().atk===0, councilTally());
  ok('leading option is def', councilLeadingOption()==='def');
  return null;
}).then(()=>{
  console.log('\n[58] invalid input and missing-guild are rejected cleanly');
  return cloudSignOut().then(()=>cloudSignUp('no-guild@example.com','pw123456'));
}).then(()=>{
  startGame();
  return councilVote('def');
}).then(r=>{
  ok('voting without a guild fails', r.ok===false && /not in a guild/i.test(r.error), r.error);
  return rpc('cast_council_vote', {p_week: weekKey(), p_option:'nonsense'});
}).then(r=>{
  ok('the harness itself rejects a bogus option', r.ok===false, r.error);

  console.log('\n[59] step 5 never run — voting fails with real guidance, not silence');
  SRV.noCouncilTable = true;
  return cloudSignOut().then(()=>cloudSignIn('council-leader@example.com','pw123456'));
}).then(()=>guildFetch()).then(()=>{
  social.council=[]; social.councilError='';
  return councilFetch();
}).then(()=>{
  ok('councilFetch reports the real cause', /step 5/i.test(social.councilError) && /SETUP-MULTIPLAYER/.test(social.councilError), social.councilError);
  ok('the guild screen shows it instead of staying blank', renderGuild().indexOf(social.councilError)>=0);
  return councilVote('atk');
}).then(r=>{
  ok('casting a vote also names step 5, not step 2', r.ok===false && /step 5/i.test(r.error), r.error);
  return cloudSelfTest();
}).then(t=>{
  const txt = t.lines.map(l=>l.text).join(' | ');
  ok('self-test flags the missing guild council table', /guild council table is missing/i.test(txt), txt);
  ok('it points at step 5', /step 5/i.test(txt) && /SETUP-MULTIPLAYER/.test(txt), txt);
  SRV.noCouncilTable = false;
  return cloudSelfTest();
}).then(t=>{
  const txt = t.lines.map(l=>l.text).join(' | ');
  ok('self-test confirms the table once migrated', /guild council table is present/i.test(txt), txt);

  console.log('\n================ '+pass+' passed, '+fail+' failed ================');
  process.exit(fail?1:0);
}).catch(e=>{ console.log('HARNESS ERROR', e); process.exit(1); });
})();
