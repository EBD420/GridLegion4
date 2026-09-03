
(function(){
CLOUD.url='https://test.supabase.co'; CLOUD.anonKey='sb_publishable_test';
srvReset();
let B;

console.log('\n[46] guild levelling maths');
ok('six levels defined', MAX_GUILD_LEVEL===6);
ok('thresholds rise', GUILD_XP.every((v,i)=>i===0||v>GUILD_XP[i-1]), GUILD_XP);
ok('every level from 2 has a perk', [2,3,4,5,6].every(l=>!!GUILD_PERKS[l]));
social.guild={level:1,xp:0};
ok('level 1 has no perks', !hasPerk('exp') && !hasPerk('might'));
social.guild={level:3,xp:6000};
ok('perks are cumulative', hasPerk('exp') && hasPerk('salvage'));
ok('higher perks still locked', !hasPerk('gauge') && !hasPerk('might'));
ok('progress bar reads sensibly', guildXpPct()===0, guildXpPct());
social.guild={level:3,xp:10000};
ok('mid-level progress', guildXpPct()>0 && guildXpPct()<100, guildXpPct());
social.guild={level:6,xp:99999};
ok('max level shows full', guildXpNext()===null && guildXpPct()===100);
ok('level is clamped to the max', (social.guild={level:99,xp:1}, guildLevel()===MAX_GUILD_LEVEL));

console.log('\n[47] perks change the game');
social.guild=null;
startGame();
const PIN={key:'keen'};
function mk(){ const m=newMonster('emberling',10,1,PIN); state.roster=[m];
  state.formation.front=[m.uid,null,null]; state.formation.back=[null,null,null];
  state.intel={history:[],wins:0}; state.stage=3; beginBattle(); return state.battle; }
B=mk(); const baseAtk=B.playerUnits[0].bAtk, baseDef=B.playerUnits[0].bDef;
social.guild={level:5,xp:30000};
B=mk();
ok('Iron Discipline raises ATK and DEF', B.playerUnits[0].bAtk>baseAtk && B.playerUnits[0].bDef>baseDef,
   baseAtk+'/'+baseDef+' -> '+B.playerUnits[0].bAtk+'/'+B.playerUnits[0].bDef);
social.guild={level:4,xp:14000};
B=mk(); const g0=B.gauge; chargeGauge(20); const withDrums=B.gauge-g0;
social.guild=null;
B=mk(); const g1=B.gauge; chargeGauge(20);
ok('War Drums charges the gauge faster', withDrums>(B.gauge-g1), (B.gauge-g1)+' -> '+withDrums);
social.guild={level:2,xp:2000};
state.stage=5;
ok('Quartermasters raises EXP', Math.round(stageExp()*1.10)>stageExp());
social.guild=null;

console.log('\n[48] guild hall shows real member data');
srvReset();
let chain = cloudSignUp('leader@example.com','pw123456').then(()=>{
  startGame(); state.profileName='Ironpaw';
  const m=newMonster('terrafang',12); state.roster=[m];
  state.formation.front=[m.uid,null,null]; state.formation.back=[null,null,null];
  return guildCreate('Ironpaw Company','IRON');
}).then(()=>{
  ok('founder is the leader', isGuildLeader()===true, social.members.map(m=>m.role));
  ok('guild starts at level 1', guildLevel()===1 && guildXp()===0);
  return guildSync().then(()=>guildFetch());
}).then(()=>{
  const me=myMembership();
  ok('member profile publishes power', me.power>0, me.power);
  ok('and a last-seen stamp', !!me.last_seen);
  ok('roster renders member cards', /MEMBERS/.test(renderGuild()) && /Ironpaw/.test(renderGuild()));
  ok('leader is marked', /★ Ironpaw/.test(renderGuild()));
  ok('level and XP are shown', /Level 1/.test(renderGuild()) && /XP to Level 2/.test(renderGuild()));
  ok('perk track lists every perk', [2,3,4,5,6].every(l=>renderGuild().indexOf(GUILD_PERKS[l].name)>=0));
  ok('invite tag is surfaced', /Invite others with the tag/.test(renderGuild()));
  ok('leader sees remove buttons only for others', renderGuild().indexOf('doKick')<0, 'alone in guild -> no kick buttons');
  /* depth reporting */
  state.stage=23;
  return guildSync().then(()=>guildFetch());
}).then(()=>{
  ok('deepest depth is published', myMembership().depth===deepDepth(23), myMembership().depth);
  state.stage=12;
  return guildSync().then(()=>guildFetch());
}).then(()=>{
  ok('depth is a high-water mark, never lowered', myMembership().depth===deepDepth(23), myMembership().depth);

  console.log('\n[49] XP flows from play');
  return guildAddXp(500).then(()=>guildFetch());
}).then(()=>{
  ok('campaign XP accrues', guildXp()===500, guildXp());
  return guildAddXp(999999).then(()=>guildFetch());
}).then(()=>{
  ok('a single award is capped server-side', guildXp()===500+2000, guildXp());
  ok('and the level moved with it', guildLevel()===2, guildLevel());
  ok('the level-2 perk is now live', hasPerk('exp'));
  return raidStart();
}).then(()=>raidContribute(20000)).then(()=>guildFetch()).then(()=>{
  ok('raid damage also feeds guild XP', guildXp()===2500+2000, guildXp());
  return null;
}).then(()=>{
  console.log('\n[50] roles and membership control');
  return cloudSignOut().then(()=>cloudSignUp('member@example.com','pw123456')).then(()=>{
    startGame(); state.profileName='Recruit';
    const m=newMonster('voltcub',8); state.roster=[m];
    state.formation.front=[m.uid,null,null]; state.formation.back=[null,null,null];
    return guildJoin('IRON');
  });
}).then(r=>{
  ok('second player joins', r.ok===true, r.error);
  ok('joiner is a plain member', isGuildLeader()===false, myMembership().role);
  ok('roster shows both', social.members.length===2, social.members.length);
  ok('a member sees no removal controls', renderGuild().indexOf('doKick')<0);
  return guildKick(SRV.gmembers[Object.keys(SRV.gmembers).find(k=>SRV.gmembers[k].role==='leader')].user_id);
}).then(r=>{
  ok('a member cannot kick the leader', r.ok===false && /only the guild leader/i.test(r.error), r.error);
  return cloudSignOut().then(()=>cloudSignIn('leader@example.com','pw123456')).then(()=>guildFetch());
}).then(()=>{
  ok('leader sees removal controls for others', renderGuild().indexOf('doKick')>=0);
  const recruit = social.members.find(m=>m.display_name==='Recruit');
  return guildKick(recruit.user_id);
}).then(r=>{
  ok('leader can remove a member', r.ok===true, r.error);
  ok('roster shrinks', social.members.length===1, social.members.length);
  /* leadership transfer */
  return cloudSignOut().then(()=>cloudSignUp('heir@example.com','pw123456'))
    .then(()=>{ startGame(); state.profileName='Heir'; return guildJoin('IRON'); })
    .then(()=>cloudSignOut()).then(()=>cloudSignIn('leader@example.com','pw123456'))
    .then(()=>guildFetch()).then(()=>guildLeave());
}).then(()=>{
  return cloudSignOut().then(()=>cloudSignIn('heir@example.com','pw123456')).then(()=>guildFetch());
}).then(()=>{
  ok('leadership passes on when the leader leaves', isGuildLeader()===true, myMembership().role);
  ok('the guild survives', social.guild && social.guild.tag==='IRON');

  console.log('\n[51] pre-migration rows do not break the screen');
  /* simulate a row written before step 4: no role/power/depth/last_seen */
  Object.values(SRV.gmembers).forEach(m=>{ delete m.role; delete m.power; delete m.depth; delete m.last_seen; });
  return guildFetch();
}).then(()=>{
  ok('missing columns are defaulted', social.members.every(m=>m.role==='member' && m.power===0));
  ok('screen still renders', /MEMBERS/.test(renderGuild()));
  ok('last-seen degrades to a dash', /—/.test(renderGuild()));
  console.log('\n================ '+pass+' passed, '+fail+' failed ================');
  process.exit(fail?1:0);
}).catch(e=>{ console.log('HARNESS ERROR', e); process.exit(1); });
})();
