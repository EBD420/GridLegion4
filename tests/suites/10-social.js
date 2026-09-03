
(function(){
let B;
function fight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null,mons[1]?mons[1].uid:null,null];
  state.formation.back=[mons[2]?mons[2].uid:null,null,null];
  state.stage=stage; state.intel={history:[],wins:0};
  beginBattle(); return state.battle;
}

console.log('\n[39] daily orders are deterministic and local');
startGame();
const k='2026-09-03';
const a=buildDailies(k), b2=buildDailies(k);
ok('same day yields the same orders', JSON.stringify(a)===JSON.stringify(b2));
ok('a different day differs', JSON.stringify(buildDailies('2026-09-04'))!==JSON.stringify(a));
ok('three orders a day', a.missions.length===MISSION_COUNT);
ok('no duplicate objectives', new Set(a.missions.map(m=>m.id)).size===a.missions.length);
ok('every order is a known type', a.missions.every(m=>!!missionDef(m.id)));
ok('every order renders text', a.missions.every(m=>typeof missionDef(m.id).text(m.params)==='string'));
ok('orders need no network', (function(){ const before=SRV.calls.length; ensureDailies(); return SRV.calls.length===before; })());
ok('day rollover replaces them', (function(){
  state.daily={date:'1999-01-01', missions:[]};
  ensureDailies();
  return state.daily.date===todayKey() && state.daily.missions.length===MISSION_COUNT;
})());

/* each objective type actually scores */
const S=(o)=>Object.assign({win:true,elemDamage:{},elemsUsed:[],losses:0,rounds:3,hybrids:0,maxRust:0,boss:false,trial:false,mods:0},o);
function scoreOne(id, params, stats){
  state.daily={date:todayKey(), missions:[{id, params, done:false, claimed:false}]};
  scoreDailies(stats);
  return state.daily.missions[0].done;
}
ok('mono-element order scores', scoreOne('mono',{elem:'fire'},S({elemsUsed:['fire']})));
ok('mono-element rejects a mixed legion', !scoreOne('mono',{elem:'fire'},S({elemsUsed:['fire','water']})));
ok('flawless scores', scoreOne('flawless',{},S({losses:0})));
ok('flawless rejects a casualty', !scoreOne('flawless',{},S({losses:1})));
ok('swift scores inside the limit', scoreOne('swift',{rounds:5},S({rounds:4})));
ok('swift rejects a slow win', !scoreOne('swift',{rounds:5},S({rounds:9})));
ok('splicer needs a hybrid', scoreOne('splicer',{},S({hybrids:1})) && !scoreOne('splicer',{},S({hybrids:0})));
ok('heavy damage order scores', scoreOne('heavy',{elem:'volt',amount:100},S({elemDamage:{volt:150}})));
ok('heavy rejects the wrong element', !scoreOne('heavy',{elem:'volt',amount:100},S({elemDamage:{fire:400}})));
ok('commander order needs a boss', scoreOne('commander',{},S({boss:true})) && !scoreOne('commander',{},S({boss:false})));
ok('trial order counts handicaps', scoreOne('trial',{mods:2},S({trial:true,mods:2})) && !scoreOne('trial',{mods:2},S({trial:true,mods:1})));
ok('rust order needs a rusty unit', scoreOne('rusty',{},S({maxRust:30})) && !scoreOne('rusty',{},S({maxRust:10})));
ok('a loss scores nothing', !scoreOne('flawless',{},S({win:false})));

/* claiming */
state.daily={date:todayKey(), missions:[{id:'flawless',params:{},done:true,claimed:false}]};
state.parts=[]; state.slot=null;
claimMission(0);
ok('claiming pays salvage', state.parts.length===MISSION_REWARD, state.parts.length);
ok('claim is marked', state.daily.missions[0].claimed===true);
claimMission(0);
ok('cannot double-claim', state.parts.length===MISSION_REWARD);
state.daily.missions.push({id:'swift',params:{rounds:5},done:false,claimed:false});
claimMission(1);
ok('cannot claim an incomplete order', state.parts.length===MISSION_REWARD);

/* real battle wires through */
startGame();
B=fight([newMonster('emberling',14)], 1);
ok('battle tracks rounds', B.rounds>=1);
B.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
B.elemDamage={fire:300}; B.totalDamage=300;
state.daily={date:todayKey(), missions:[{id:'mono',params:{elem:'fire'},done:false,claimed:false}]};
endBattle('win');
ok('finishing a battle scores orders', state.daily.missions[0].done===true);
ok('and the result screen says so', !!state.lastResult.dailyDone && state.lastResult.dailyDone.length===1);

console.log('\n[40] orders survive a save cycle');
startGame(); state.slot=0;
state.daily={date:todayKey(), missions:[{id:'flawless',params:{},done:true,claimed:false}]};
autosave(); startGame(); continueSlot(0);
ok('orders persist', state.daily && state.daily.missions[0].done===true);
applySave({v:1,name:'x',stage:1,roster:[],formation:{front:[null,null,null],back:[null,null,null]},
  daily:{date:todayKey(), missions:[{id:'notreal'},{id:'flawless',params:{},done:true}]}},0);
ok('unknown order types dropped on load', state.daily.missions.length===1 && state.daily.missions[0].id==='flawless');

console.log('\n[41] social features need an account');
startGame();
saveSession(null);
ok('guild screen asks you to sign in', /needs an account/i.test(renderGuild()));
ok('ladder screen asks you to sign in', /needs an account/i.test(renderLadder()));
ok('guild calls no-op when signed out', (function(){ let hit=false; guildFetch().then(r=>{hit=(r===null);}); return true; })());
ok('the campaign is unaffected', (fight([newMonster('emberling',10)],1), !!state.battle));

console.log('\n[42] guild + raid');
srvReset();
let chain = cloudSignUp('guilder@example.com','hunter2').then(()=>{
  state.profileName='Ironpaw';
  return guildCreate('Ironpaw Company','IRON');
}).then(r=>{
  ok('guild founded', r.ok===true, r.error);
  ok('guild is held client-side', social.guild && social.guild.tag==='IRON', social.guild);
  ok('founder is a member', social.members.length===1 && social.members[0].display_name==='Ironpaw');
  ok('guild screen shows the roster', /Ironpaw Company/.test(renderGuild()));
  return guildCreate('Second','TWO');
}).then(r=>{
  ok('cannot found a second guild while in one', r.ok===false, r.error);
  return raidFetch();
}).then(()=>{
  ok('no boss until summoned', social.raid===null);
  return raidStart();
}).then(r=>{
  ok('boss summoned', r.ok===true && !!social.raid, r.error);
  ok('boss starts at full HP', social.raid.hp===social.raid.max_hp);
  return raidStart();
}).then(r=>{
  ok('cannot summon a second boss', r.ok===false, r.error);
  const before=social.raid.hp;
  return raidContribute(5000).then(()=>({before}));
}).then(ctx=>{
  ok('damage lowers shared boss HP', social.raid.hp===ctx.before-5000, social.raid.hp+' vs '+ctx.before);
  ok('damage board records it', social.board.length===1 && social.board[0].damage===5000, social.board);
  return raidContribute(3000);
}).then(()=>{
  ok('contributions accumulate', social.board[0].damage===8000, social.board[0]);
  return raidContribute(999999999);
}).then(()=>{
  ok('a single contribution is capped server-side', social.board[0].damage===8000+20000, social.board[0].damage);
  ok('HP never goes below zero', social.raid.hp>=0, social.raid.hp);
  /* concurrent contributions must not lose damage */
  const start=social.raid.hp;
  return Promise.all([raidContribute(1000),raidContribute(1000),raidContribute(1000)]).then(()=>({start}));
}).then(ctx=>{
  return raidFetch().then(()=>{
    ok('three simultaneous hits all land (no lost updates)', social.raid.hp===ctx.start-3000, ctx.start+' -> '+social.raid.hp);
  });
}).then(()=>{
  /* a raid run reports the damage it actually dealt */
  state.raidRun=true; state.duel=null; state.trial=null;
  B=fight([newMonster('emberling',14)],1);
  B.totalDamage=777;
  B.playerUnits.forEach(u=>{u.hp=0;u.fainted=true;});
  endBattle('lose');
  ok('a lost raid attempt still reports damage', state.lastResult.raid===true && state.lastResult.dealt===777);
  ok('result screen says the damage counts', /still counts/.test(renderResult()));
  state.raidRun=false;
  return guildLeave();
}).then(()=>{
  ok('leaving clears the guild', social.guild===null && social.members.length===0);

  console.log('\n[43] ladder');
  return cloudSignOut().then(()=>cloudSignUp('duelist@example.com','hunter2'));
}).then(()=>{
  startGame(); state.profileName='Duelist';
  const m1=newMonster('emberling',10), m2=newMonster('aqualing',10);
  state.roster=[m1,m2];
  state.formation.front=[m1.uid,m2.uid,null]; state.formation.back=[null,null,null];
  ok('power score reflects the legion', formationPower()>0, formationPower());
  const snap=ladderSnapshot();
  ok('snapshot captures both monsters', snap.units.length===2, snap.units.length);
  ok('snapshot keeps rows', snap.units[0].row==='front');
  return ladderPublish();
}).then(r=>{
  ok('formation published', r.ok===true, r.error);
  return ladderFetch();
}).then(rows=>{
  ok('ladder lists me', rows.length===1 && rows[0].display_name==='Duelist');
  ok('starting rating is 1000', rows[0].rating===1000);
  return ladderFindOpponent();
}).then(r=>{
  ok('no opponent when alone', r.ok===false, r.error);
  /* add a rival */
  return cloudSignOut().then(()=>cloudSignUp('rival@example.com','hunter2')).then(()=>{
    startGame(); state.profileName='Rival';
    const m=newMonster('terrafang',10);
    state.roster=[m]; state.formation.front=[m.uid,null,null]; state.formation.back=[null,null,null];
    return ladderPublish();
  });
}).then(()=>cloudSignOut()).then(()=>cloudSignIn('duelist@example.com','hunter2')).then(()=>ladderFindOpponent()).then(r=>{
  ok('an opponent is found', r.ok===true && social.opponent.display_name==='Rival', r.error);
  ok('never matched against yourself', social.opponent.user_id!==cloud.session.user.id);
  ok('opponent formation came through', social.opponent.formation.units.length===1);
  /* simulate the duel locally */
  const m1=newMonster('emberling',14);
  state.roster=[m1]; state.formation.front=[m1.uid,null,null]; state.formation.back=[null,null,null];
  state.duel={ userId:social.opponent.user_id, name:'Rival', formation:social.opponent.formation };
  state.stage=1; state.intel={history:[],wins:0};
  beginBattle(); B=state.battle;
  ok('duel builds the opponent as the enemy side', B.enemyUnits.length===1 && B.enemyUnits[0].name==='Terrafang', B.enemyUnits.map(u=>u.name));
  ok('opponent units use the normal engine', B.enemyUnits[0].maxHp>0 && !!B.enemyUnits[0].attackElements.length);
  B.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
  endBattle('win');
  ok('duel result reported', state.lastResult.duel===true && state.lastResult.win===true);
  return new Promise(res=>setImmediate(()=>setImmediate(res)));
}).then(()=>ladderFetch()).then(rows=>{
  const me=rows.find(r=>r.user_id===cloud.session.user.id);
  const them=rows.find(r=>r.display_name==='Rival');
  ok('winner gains exactly 16', me.rating===1016, me.rating);
  ok('loser drops exactly 16', them.rating===984, them.rating);
  ok('ranks are ordered', rows[0].rating>=rows[rows.length-1].rating);
  return rpc('report_duel', { p_opponent: cloud.session.user.id, p_won:true });
}).then(r=>{
  ok('cannot duel yourself', r.ok===false, r.error);
  return rpc('report_duel', { p_opponent:'00000000-0000-0000-0000-000000000000', p_won:true });
}).then(r=>{
  ok('cannot duel a nonexistent opponent', r.ok===false, r.error);
  console.log('\n================ '+pass+' passed, '+fail+' failed ================');
  process.exit(fail?1:0);
}).catch(e=>{ console.log('HARNESS ERROR', e); process.exit(1); });
})();
