let renderCount=0;
const _inputs={};
global.document = {
  getElementById: (id) => (id==='app'
    ? { set innerHTML(v){ renderCount++; }, get innerHTML(){ return ''; } }
    : (_inputs[id]!==undefined ? { value:_inputs[id] } : null)),
};
const _timers=[];
global.setTimeout = (fn,ms)=>{ const t={fn}; _timers.push(t); return t; };
function flushTimers(){ const ts=_timers.splice(0); ts.forEach(t=>t.fn()); }
function setInput(id,v){ _inputs[id]=v; }
let _store={}, _blocked=false;
global.window = { localStorage: {
  setItem:(k,v)=>{ if(_blocked) throw new Error('denied'); _store[k]=String(v); },
  getItem:(k)=>{ if(_blocked) throw new Error('denied'); return Object.prototype.hasOwnProperty.call(_store,k)?_store[k]:null; },
  removeItem:(k)=>{ if(_blocked) throw new Error('denied'); delete _store[k]; },
}};
function blockStorage(b){ _blocked=b; }
function rawStore(){ return _store; }
global.btoa = (s)=>Buffer.from(s,'binary').toString('base64');
global.atob = (b)=>Buffer.from(b,'base64').toString('binary');

/* ---- fake Supabase ---- */
const SRV = {
  users: {},              // email -> {id,password}
  rows: {},               // userId -> {slot: {data, updated_at}}
  guilds: {}, gmembers: {}, bosses: {}, rdamage: {}, ladder: {}, cvotes: {}, presence: {},
  replays: {},            // id -> {id,user_id,display_name,data,created_at}
  worldBoss: {},          // id -> {id,name,max_hp,hp,started_at,defeated_at,last_hit_by}
  worldBossDamage: {},    // "bossId|userId" -> {boss_id,user_id,display_name,damage}
  warQueue: {},           // guildId -> {guild_id,queued_at}
  wars: {},               // id -> {id,guild_a,guild_b,guild_a_name,guild_a_tag,guild_b_name,guild_b_tag,score_a,score_b,starts_at,ends_at}
  warContrib: {},         // "warId|userId" -> {war_id,user_id,display_name,score}
  projects: {},           // guildId -> {guild_id,total}
  projectContrib: {},     // "guildId|userId" -> {guild_id,user_id,display_name,amount}
  online: true,
  requireConfirm: false,
  tokens: {},             // access -> {userId}
  refreshes: {},          // refresh -> userId
  calls: [],
  nextId: 1,
};
function srvReset(){
  SRV.users={}; SRV.rows={};
  SRV.guilds={}; SRV.gmembers={}; SRV.bosses={}; SRV.rdamage={}; SRV.ladder={}; SRV.cvotes={}; SRV.presence={};
  SRV.replays={}; SRV.worldBoss={}; SRV.worldBossDamage={}; SRV.warQueue={}; SRV.wars={}; SRV.warContrib={};
  SRV.projects={}; SRV.projectContrib={};
  SRV.online=true; SRV.requireConfirm=false; SRV.tokens={}; SRV.refreshes={};
  SRV.calls=[]; SRV.nextId=1; SRV.tableMissing=false; SRV.leakRows=false; SRV.rejectKey=false;
  SRV.preGuildHall=false;   // tables/functions installed, but step 4 (guild-hall upgrade) never run
  SRV.noCouncilTable=false; // steps 1/2/4 done, but step 5 (guild council) never run
  SRV.noPresenceTable=false; // steps 1/2/4/5 done, but step 6 (online now) never run
  SRV.noReplaysTable=false;   // ...but step 7 (battle replays) never run
  SRV.noWorldBossTable=false; // ...but step 8 (world boss) never run
  SRV.noGuildWarsTable=false; // ...but step 9 (guild wars) never run
  SRV.noGuildProjectsTable=false; // ...but step 10 (guild projects) never run
}
function lvlFor(xp){ return xp>=60000?6:xp>=30000?5:xp>=14000?4:xp>=6000?3:xp>=2000?2:1; }
function mkSession(userId,email){
  const a='acc_'+(SRV.nextId++), r='ref_'+(SRV.nextId++);
  SRV.tokens[a]={userId}; SRV.refreshes[r]=userId;
  return {access_token:a, refresh_token:r, expires_in:3600, user:{id:userId, email}};
}
function res(status, body){ return Promise.resolve({ ok:status>=200&&status<300, status, text:()=>Promise.resolve(body===undefined?'':JSON.stringify(body)) }); }
global.fetch = function(url, opts){
  opts=opts||{}; const body=opts.body?JSON.parse(opts.body):null;
  const path=url.replace(/^https:\/\/[a-z0-9-]+\.supabase\.co/,'');
  SRV.calls.push({path, method:opts.method||'GET'});
  if(!SRV.online) return Promise.reject(new Error('network down'));
  if(SRV.rejectKey) return res(401,{message:'Invalid API key'});
  if(path.indexOf('/auth/v1/health')===0) return res(200,{name:'GoTrue'});
  const auth=(opts.headers&&opts.headers.Authorization)||'';
  const tok=auth.replace('Bearer ','');
  const who=SRV.tokens[tok];

  if(path.indexOf('/auth/v1/signup')===0){
    if(SRV.users[body.email]) return res(400,{msg:'User already registered'});
    const id='u'+(SRV.nextId++);
    SRV.users[body.email]={id, password:body.password};
    if(SRV.requireConfirm) return res(200,{user:{id,email:body.email}});   // no tokens yet
    return res(200, mkSession(id, body.email));
  }
  if(path.indexOf('/auth/v1/token?grant_type=password')===0){
    const u=SRV.users[body.email];
    if(!u||u.password!==body.password) return res(400,{error_description:'Invalid login credentials'});
    return res(200, mkSession(u.id, body.email));
  }
  if(path.indexOf('/auth/v1/token?grant_type=refresh_token')===0){
    const uid=SRV.refreshes[body.refresh_token];
    if(!uid) return res(400,{error_description:'Invalid refresh token'});
    const email=Object.keys(SRV.users).find(e=>SRV.users[e].id===uid);
    return res(200, mkSession(uid,email));
  }
  if(path.indexOf('/auth/v1/logout')===0) return res(204);

  /* ---------- RPCs: these mirror the plpgsql functions in SETUP-MULTIPLAYER.md ---------- */
  if(path.indexOf('/rest/v1/rpc/')===0){
    /* a project where step 1 ran but step 2 did not: tables exist, functions do not */
    if(SRV.noFunctions) return res(404,{message:"Could not find the function public."+path.replace('/rest/v1/rpc/','')+"(p_display, p_name, p_tag) in the schema cache"});
    if(!who) return res(401,{message:'not signed in'});
    const uid=who.userId, fn=path.replace('/rest/v1/rpc/','');
    const myGuild=()=>SRV.gmembers[uid]?SRV.gmembers[uid].guild_id:null;

    if(fn==='create_guild'){
      if(myGuild()) return res(400,{message:'you are already in a guild'});
      const tag=String(body.p_tag||'').toUpperCase();
      if(Object.values(SRV.guilds).some(g=>g.tag===tag)) return res(400,{message:'tag already taken'});
      const id='g'+(SRV.nextId++);
      SRV.guilds[id]={id,tag,name:body.p_name,created_by:uid,xp:0,level:1};
      SRV.gmembers[uid]={guild_id:id,user_id:uid,display_name:body.p_display||'Commander',
        role:'leader',power:0,depth:0,stage:1,last_seen:new Date().toISOString(),joined_at:new Date(Date.now()+SRV.nextId).toISOString()};
      return res(200,id);
    }
    if(fn==='join_guild'){
      const tag=String(body.p_tag||'').toUpperCase();
      const g=Object.values(SRV.guilds).find(x=>x.tag===tag);
      if(!g) return res(400,{message:'no guild with that tag'});
      SRV.gmembers[uid]={guild_id:g.id,user_id:uid,display_name:body.p_display||'Commander',
        role:'member',power:0,depth:0,stage:1,last_seen:new Date().toISOString(),joined_at:new Date(Date.now()+SRV.nextId).toISOString()};
      return res(200,g.id);
    }
    if(fn==='leave_guild'){
      const mine=SRV.gmembers[uid]; if(!mine) return res(200,null);
      const g=mine.guild_id, wasLeader=mine.role==='leader';
      delete SRV.gmembers[uid];
      if(wasLeader){
        const heir=Object.values(SRV.gmembers).filter(m=>m.guild_id===g)
                   .sort((a,c)=>a.joined_at.localeCompare(c.joined_at))[0];
        if(heir) heir.role='leader';
      }
      return res(200,null);
    }
    if(fn==='kick_member'){
      const mine=SRV.gmembers[uid];
      if(!mine || mine.role!=='leader') return res(400,{message:'only the guild leader can remove members'});
      if(body.p_user===uid) return res(400,{message:'use Leave guild instead'});
      const t=SRV.gmembers[body.p_user];
      if(t && t.guild_id===mine.guild_id) delete SRV.gmembers[body.p_user];
      return res(200,null);
    }
    if(fn==='sync_member_profile'){
      const mine=SRV.gmembers[uid]; if(!mine) return res(200,null);
      if(body.p_display) mine.display_name=body.p_display;
      mine.power=Math.min(Math.max(Number(body.p_power)||0,0),100000000);
      mine.depth=Math.max(mine.depth, Math.min(Math.max(Number(body.p_depth)||0,0),100000));
      mine.stage=Math.min(Math.max(Number(body.p_stage)||1,1),100000);
      mine.last_seen=new Date().toISOString();
      return res(200,null);
    }
    if(fn==='add_guild_xp'){
      const mine=SRV.gmembers[uid]; if(!mine) return res(200,null);
      const g=SRV.guilds[mine.guild_id];
      const gained=Math.min(Math.max(Number(body.p_xp)||0,0),2000);   // server-side cap
      g.xp+=gained; g.level=lvlFor(g.xp);
      return res(200,g.level);
    }

    if(fn==='cast_council_vote'){
      if(SRV.noCouncilTable) return res(404,{message:"Could not find the function public.cast_council_vote(p_option, p_week) in the schema cache"});
      const g=myGuild(); if(!g) return res(400,{message:'you are not in a guild'});
      const opt=body.p_option;
      if(opt!=='atk' && opt!=='def') return res(400,{message:'not a valid doctrine'});
      const week=String(body.p_week||'').slice(0,32);
      const k=g+'|'+uid+'|'+week;
      SRV.cvotes[k]={guild_id:g,user_id:uid,week,option:opt,voted_at:new Date().toISOString()};
      return res(200,null);
    }
    if(fn==='start_raid'){
      const g=myGuild(); if(!g) return res(400,{message:'you are not in a guild'});
      if(Object.values(SRV.bosses).some(b=>b.guild_id===g && !b.defeated_at))
        return res(400,{message:'a boss is already active'});
      const n=Object.values(SRV.gmembers).filter(m=>m.guild_id===g).length;
      const hp=40000+n*20000, id='b'+(SRV.nextId++);
      SRV.bosses[id]={id,guild_id:g,name:'Rustbound Colossus',max_hp:hp,hp:hp,
                      started_at:String(1000000+SRV.nextId),defeated_at:null};
      return res(200,id);
    }
    if(fn==='contribute_raid'){
      const g=myGuild(); if(!g) return res(400,{message:'you are not in a guild'});
      const boss=Object.values(SRV.bosses).filter(b=>b.guild_id===g && !b.defeated_at)
                  .sort((a,c)=>c.started_at.localeCompare(a.started_at))[0];
      if(!boss) return res(400,{message:'no active boss'});
      const dmg=Math.min(Math.max(Number(body.p_damage)||0,0),20000);   // server-side cap
      boss.hp=Math.max(0,boss.hp-dmg);                                   // single atomic statement
      const gg=SRV.guilds[g]; gg.xp+=Math.floor(dmg/10); gg.level=lvlFor(gg.xp);
      if(boss.hp<=0) boss.defeated_at='now';
      const k=boss.id+'|'+uid;
      SRV.rdamage[k]=SRV.rdamage[k]||{boss_id:boss.id,user_id:uid,display_name:body.p_display||'Commander',damage:0};
      SRV.rdamage[k].damage+=dmg;
      SRV.rdamage[k].display_name=body.p_display||SRV.rdamage[k].display_name;
      return res(200,[{remaining:boss.hp,contributed:dmg}]);
    }
    if(fn==='publish_formation'){
      SRV.ladder[uid]=SRV.ladder[uid]||{user_id:uid,rating:1000};
      SRV.ladder[uid].display_name=body.p_display||'Commander';
      SRV.ladder[uid].formation=body.p_formation;
      SRV.ladder[uid].power=Math.min(Math.max(Number(body.p_power)||0,0),1000000);
      return res(200,null);
    }
    if(fn==='find_opponent'){
      const mine=SRV.ladder[uid], myR=mine?mine.rating:1000;
      const cands=Object.values(SRV.ladder).filter(l=>l.user_id!==uid)
                  .sort((a,c)=>Math.abs(a.rating-myR)-Math.abs(c.rating-myR));
      return res(200, cands.length?[cands[0]]:[]);
    }
    if(fn==='report_duel'){
      if(body.p_opponent===uid) return res(400,{message:'you cannot duel yourself'});
      if(!SRV.ladder[body.p_opponent]) return res(400,{message:'no such opponent'});
      SRV.ladder[uid]=SRV.ladder[uid]||{user_id:uid,display_name:'Commander',rating:1000,formation:{units:[]},power:0};
      const d=body.p_won?16:-16;   // magnitude decided by the server, not the client
      SRV.ladder[uid].rating=Math.max(0,Math.min(4000,SRV.ladder[uid].rating+d));
      SRV.ladder[body.p_opponent].rating=Math.max(0,Math.min(4000,SRV.ladder[body.p_opponent].rating-d));
      return res(200,SRV.ladder[uid].rating);
    }
    if(fn==='heartbeat'){
      if(SRV.noPresenceTable) return res(404,{message:"Could not find the function public.heartbeat(p_display) in the schema cache"});
      SRV.presence[uid]={user_id:uid, username:body.p_display||'Commander', last_seen:new Date().toISOString()};
      return res(200,null);
    }
    if(fn==='start_world_boss'){
      if(SRV.noWorldBossTable) return res(404,{message:"Could not find the function public.start_world_boss() in the schema cache"});
      const active = Object.values(SRV.worldBoss).find(w=>!w.defeated_at);
      if(active) return res(400,{message:'a world boss is already active'});
      const defeatedCount = Object.values(SRV.worldBoss).filter(w=>w.defeated_at).length;
      const hp = 300000 + defeatedCount*150000;
      const id = 'wb'+(SRV.nextId++);
      SRV.worldBoss[id] = { id, name:'Rustbound Sovereign', max_hp:hp, hp,
        started_at:String(1000000+SRV.nextId), defeated_at:null, last_hit_by:null };
      return res(200, id);
    }
    if(fn==='contribute_world_boss'){
      if(SRV.noWorldBossTable) return res(404,{message:"Could not find the function public.contribute_world_boss(p_damage, p_display) in the schema cache"});
      const boss = Object.values(SRV.worldBoss).filter(w=>!w.defeated_at)
                   .sort((a,c)=>c.started_at.localeCompare(a.started_at))[0];
      if(!boss) return res(400,{message:'no active world boss'});
      const dmg = Math.min(Math.max(Number(body.p_damage)||0,0),20000);
      boss.hp = Math.max(0, boss.hp-dmg);
      if(boss.hp<=0){ boss.defeated_at='now'; boss.last_hit_by = body.p_display||'Commander'; }
      const k = boss.id+'|'+uid;
      SRV.worldBossDamage[k]=SRV.worldBossDamage[k]||{boss_id:boss.id,user_id:uid,display_name:body.p_display||'Commander',damage:0};
      SRV.worldBossDamage[k].damage+=dmg;
      SRV.worldBossDamage[k].display_name=body.p_display||SRV.worldBossDamage[k].display_name;
      return res(200,[{remaining:boss.hp, contributed:dmg}]);
    }
    if(fn==='start_guild_war'){
      if(SRV.noGuildWarsTable) return res(404,{message:"Could not find the function public.start_guild_war() in the schema cache"});
      const g_id = myGuild(); if(!g_id) return res(400,{message:'you are not in a guild'});
      const activeWar = Object.values(SRV.wars).find(w=>(w.guild_a===g_id||w.guild_b===g_id) && Date.parse(w.ends_at) > Date.now());
      if(activeWar) return res(200, activeWar.id);
      const myInfo = SRV.guilds[g_id];
      const oppEntry = Object.values(SRV.warQueue).filter(q=>q.guild_id!==g_id)
                       .sort((a,c)=>a.queued_at.localeCompare(c.queued_at))[0];
      if(oppEntry){
        const oppInfo = SRV.guilds[oppEntry.guild_id];
        delete SRV.warQueue[oppEntry.guild_id];
        delete SRV.warQueue[g_id];
        const id = 'war'+(SRV.nextId++);
        SRV.wars[id] = { id, guild_a:g_id, guild_b:oppEntry.guild_id,
          guild_a_name: myInfo.name, guild_a_tag: myInfo.tag,
          guild_b_name: oppInfo.name, guild_b_tag: oppInfo.tag,
          score_a:0, score_b:0, starts_at:new Date().toISOString(),
          ends_at:new Date(Date.now()+48*3600*1000).toISOString() };
        return res(200, id);
      }
      SRV.warQueue[g_id] = { guild_id:g_id, queued_at:new Date().toISOString() };
      return res(200, null);
    }
    if(fn==='contribute_guild_war'){
      if(SRV.noGuildWarsTable) return res(404,{message:"Could not find the function public.contribute_guild_war(p_score, p_display) in the schema cache"});
      const g_id = myGuild(); if(!g_id) return res(400,{message:'you are not in a guild'});
      const w = Object.values(SRV.wars).find(x=>(x.guild_a===g_id||x.guild_b===g_id) && Date.parse(x.ends_at) > Date.now());
      if(!w) return res(400,{message:'no active guild war'});
      const amt = Math.min(Math.max(Number(body.p_score)||0,0),20000);
      if(w.guild_a===g_id) w.score_a+=amt; else w.score_b+=amt;
      const k = w.id+'|'+uid;
      SRV.warContrib[k]=SRV.warContrib[k]||{war_id:w.id,user_id:uid,display_name:body.p_display||'Commander',score:0};
      SRV.warContrib[k].score+=amt;
      SRV.warContrib[k].display_name=body.p_display||SRV.warContrib[k].display_name;
      return res(200,[{my_score: w.guild_a===g_id?w.score_a:w.score_b, opp_score: w.guild_a===g_id?w.score_b:w.score_a}]);
    }
    if(fn==='contribute_guild_project'){
      if(SRV.noGuildProjectsTable) return res(404,{message:"Could not find the function public.contribute_guild_project(p_amount, p_display) in the schema cache"});
      const g_id = myGuild(); if(!g_id) return res(400,{message:'you are not in a guild'});
      const amt = Math.min(Math.max(Number(body.p_amount)||0,0),14);   // server-side cap, mirrors the salvage bay's own max
      if(amt<=0) return res(400,{message:'nothing to contribute'});
      const proj = SRV.projects[g_id] = SRV.projects[g_id] || { guild_id:g_id, total:0 };
      proj.total += amt;
      const k = g_id+'|'+uid;
      SRV.projectContrib[k]=SRV.projectContrib[k]||{guild_id:g_id,user_id:uid,display_name:body.p_display||'Commander',amount:0};
      SRV.projectContrib[k].amount+=amt;
      SRV.projectContrib[k].display_name=body.p_display||SRV.projectContrib[k].display_name;
      return res(200, proj.total);
    }
    return res(404,{message:'no function '+fn});
  }

  /* ---------- REST reads ---------- */
  if(path.indexOf('/rest/v1/guilds')===0 && path.indexOf('/rest/v1/guild_members')!==0){
    // Plain (non-embedded) guilds probe — used by the self-test to detect step 4.
    if(SRV.preGuildHall) return res(400,{message:'column guilds.xp does not exist'});
    return res(200, Object.values(SRV.guilds).slice(0,1).map(g=>({xp:g.xp,level:g.level})));
  }
  if(path.indexOf('/rest/v1/guild_members')===0){
    if(!who) return res(401,{message:'not signed in'});
    const uid=who.userId;
    const gm=path.match(/guild_id=eq\.([^&]+)/);
    if(gm){
      // The member-list query asks for role/power/depth/last_seen — columns step 4 adds.
      if(SRV.preGuildHall) return res(400,{message:'column guild_members.role does not exist'});
      const mine=SRV.gmembers[uid];
      if(!mine || mine.guild_id!==gm[1]) return res(200,[]);   // RLS: members only
      return res(200, Object.values(SRV.gmembers).filter(m=>m.guild_id===gm[1])
        .sort((a,c)=>a.joined_at.localeCompare(c.joined_at))
        .map(m=>({user_id:m.user_id,display_name:m.display_name,joined_at:m.joined_at,
                  role:m.role,power:m.power,depth:m.depth,last_seen:m.last_seen})));
    }
    // The header query embeds guilds(id,tag,name,xp,level) — xp/level are step 4 columns.
    if(SRV.preGuildHall) return res(400,{message:'column guilds.xp does not exist'});
    const mine=SRV.gmembers[uid];
    if(!mine) return res(200,[]);
    return res(200,[{guild_id:mine.guild_id,display_name:mine.display_name,guilds:SRV.guilds[mine.guild_id]}]);
  }
  if(path.indexOf('/rest/v1/raid_bosses')===0){
    if(!who) return res(401,{message:'not signed in'});
    const gm=path.match(/guild_id=eq\.([^&]+)/);
    const mine=SRV.gmembers[who.userId];
    if(!gm || !mine || mine.guild_id!==gm[1]) return res(200,[]);
    const list=Object.values(SRV.bosses).filter(b=>b.guild_id===gm[1])
               .sort((a,c)=>c.started_at.localeCompare(a.started_at));
    return res(200, list.slice(0,1));
  }
  if(path.indexOf('/rest/v1/raid_damage')===0){
    if(!who) return res(401,{message:'not signed in'});
    const bm=path.match(/boss_id=eq\.([^&]+)/);
    if(!bm) return res(200,[]);
    return res(200, Object.values(SRV.rdamage).filter(d=>d.boss_id===bm[1])
      .sort((a,c)=>c.damage-a.damage).map(d=>({display_name:d.display_name,damage:d.damage})));
  }
  if(path.indexOf('/rest/v1/guild_council_votes')===0){
    if(SRV.noCouncilTable) return res(404,{message:"Could not find the table 'public.guild_council_votes' in the schema cache"});
    const gm=path.match(/guild_id=eq\.([^&]+)/);
    if(!gm){
      // Bare self-test probe (no guild filter) — just checks the table exists.
      return res(200, Object.values(SRV.cvotes).slice(0,1).map(v=>({option:v.option})));
    }
    if(!who) return res(401,{message:'not signed in'});
    const mine=SRV.gmembers[who.userId];
    if(!mine || mine.guild_id!==gm[1]) return res(200,[]);   // RLS: members only
    const wm=path.match(/week=eq\.([^&]+)/);
    const week = wm ? decodeURIComponent(wm[1]) : null;
    return res(200, Object.values(SRV.cvotes)
      .filter(v=>v.guild_id===gm[1] && (week===null || v.week===week))
      .map(v=>({user_id:v.user_id,option:v.option,voted_at:v.voted_at})));
  }
  if(path.indexOf('/rest/v1/ladder')===0){
    if(!who) return res(401,{message:'not signed in'});
    return res(200, Object.values(SRV.ladder).sort((a,c)=>c.rating-a.rating)
      .map(l=>({user_id:l.user_id,display_name:l.display_name,rating:l.rating,power:l.power})));
  }
  if(path.indexOf('/rest/v1/presence')===0){
    if(SRV.noPresenceTable) return res(404,{message:"Could not find the table 'public.presence' in the schema cache"});
    // Bare self-test probe (?select=username&limit=1, no last_seen filter): just checks the table exists.
    const gte=path.match(/last_seen=gte\.([^&]+)/);
    if(!gte) return res(200, Object.values(SRV.presence).slice(0,1).map(p=>({username:p.username})));
    if(!who) return res(401,{message:'not signed in'});
    const cutoff=decodeURIComponent(gte[1]);
    return res(200, Object.values(SRV.presence).filter(p=>p.last_seen>=cutoff)
      .sort((a,c)=>c.last_seen.localeCompare(a.last_seen))
      .map(p=>({user_id:p.user_id,username:p.username,last_seen:p.last_seen})));
  }
  if(path.indexOf('/rest/v1/replays')===0){
    if(SRV.noReplaysTable) return res(404,{message:"Could not find the table 'public.replays' in the schema cache"});
    if((opts.method||'GET')==='POST'){
      if(!who) return res(401,{message:'not signed in'});
      const id='rep'+(SRV.nextId++);
      SRV.replays[id] = { id, user_id: body.user_id, display_name: body.display_name,
        data: body.data, created_at: body.created_at || new Date().toISOString() };
      return res(201);
    }
    // Bare self-test probe (?select=display_name&limit=1, no order): just checks the table exists.
    if(path.indexOf('order=')<0) return res(200, Object.values(SRV.replays).slice(0,1).map(r=>({display_name:r.display_name})));
    if(!who) return res(401,{message:'not signed in'});
    return res(200, Object.values(SRV.replays)
      .sort((a,c)=>c.created_at.localeCompare(a.created_at))
      .map(r=>({display_name:r.display_name, data:r.data, created_at:r.created_at})));
  }
  // world_boss_damage must be checked before world_boss below — its path is
  // a prefix match of "/rest/v1/world_boss" too.
  if(path.indexOf('/rest/v1/world_boss_damage')===0){
    if(SRV.noWorldBossTable) return res(404,{message:"Could not find the table 'public.world_boss_damage' in the schema cache"});
    if(!who) return res(401,{message:'not signed in'});
    const bm=path.match(/boss_id=eq\.([^&]+)/);
    if(!bm) return res(200,[]);
    return res(200, Object.values(SRV.worldBossDamage).filter(d=>d.boss_id===bm[1])
      .sort((a,c)=>c.damage-a.damage).map(d=>({display_name:d.display_name,damage:d.damage})));
  }
  if(path.indexOf('/rest/v1/world_boss')===0){
    if(SRV.noWorldBossTable) return res(404,{message:"Could not find the table 'public.world_boss' in the schema cache"});
    // Bare self-test probe (?select=id&limit=1, no order): just checks the table exists.
    if(path.indexOf('order=')<0) return res(200, Object.values(SRV.worldBoss).slice(0,1).map(w=>({id:w.id})));
    if(!who) return res(401,{message:'not signed in'});
    return res(200, Object.values(SRV.worldBoss)
      .sort((a,c)=>c.started_at.localeCompare(a.started_at)).slice(0,1)
      .map(w=>({id:w.id,name:w.name,hp:w.hp,max_hp:w.max_hp,defeated_at:w.defeated_at,started_at:w.started_at,last_hit_by:w.last_hit_by})));
  }
  if(path.indexOf('/rest/v1/guild_war_queue')===0){
    if(SRV.noGuildWarsTable) return res(404,{message:"Could not find the table 'public.guild_war_queue' in the schema cache"});
    if(!who) return res(401,{message:'not signed in'});
    const gm=path.match(/guild_id=eq\.([^&]+)/);
    if(!gm) return res(200,[]);
    const row = SRV.warQueue[gm[1]];
    return res(200, row ? [{guild_id:row.guild_id}] : []);
  }
  if(path.indexOf('/rest/v1/guild_war_contributions')===0){
    if(SRV.noGuildWarsTable) return res(404,{message:"Could not find the table 'public.guild_war_contributions' in the schema cache"});
    if(!who) return res(401,{message:'not signed in'});
    const wm=path.match(/war_id=eq\.([^&]+)/);
    if(!wm) return res(200,[]);
    return res(200, Object.values(SRV.warContrib).filter(c=>c.war_id===wm[1])
      .sort((a,c)=>c.score-a.score).map(c=>({display_name:c.display_name,score:c.score})));
  }
  if(path.indexOf('/rest/v1/guild_wars')===0){
    if(SRV.noGuildWarsTable) return res(404,{message:"Could not find the table 'public.guild_wars' in the schema cache"});
    // Bare self-test probe (?select=id&limit=1, no order): just checks the table exists.
    if(path.indexOf('order=')<0) return res(200, Object.values(SRV.wars).slice(0,1).map(w=>({id:w.id})));
    if(!who) return res(401,{message:'not signed in'});
    const mine=SRV.gmembers[who.userId];
    const gId = mine ? mine.guild_id : null;
    const visible = Object.values(SRV.wars).filter(w=>w.guild_a===gId || w.guild_b===gId);
    return res(200, visible.sort((a,c)=>c.starts_at.localeCompare(a.starts_at)).slice(0,1)
      .map(w=>({id:w.id,guild_a:w.guild_a,guild_b:w.guild_b,guild_a_name:w.guild_a_name,guild_a_tag:w.guild_a_tag,
                guild_b_name:w.guild_b_name,guild_b_tag:w.guild_b_tag,score_a:w.score_a,score_b:w.score_b,
                starts_at:w.starts_at,ends_at:w.ends_at})));
  }

  if(path.indexOf('/rest/v1/guild_project_contributions')===0){
    if(SRV.noGuildProjectsTable) return res(404,{message:"Could not find the table 'public.guild_project_contributions' in the schema cache"});
    if(!who) return res(401,{message:'not signed in'});
    const gm=path.match(/guild_id=eq\.([^&]+)/);
    if(!gm) return res(200,[]);
    return res(200, Object.values(SRV.projectContrib).filter(c=>c.guild_id===gm[1])
      .sort((a,c)=>c.amount-a.amount).map(c=>({display_name:c.display_name,amount:c.amount})));
  }
  if(path.indexOf('/rest/v1/guild_projects')===0){
    if(SRV.noGuildProjectsTable) return res(404,{message:"Could not find the table 'public.guild_projects' in the schema cache"});
    // Bare self-test probe (?select=guild_id&limit=1, no filter): just checks the table exists.
    const gm=path.match(/guild_id=eq\.([^&]+)/);
    if(!gm) return res(200, Object.values(SRV.projects).slice(0,1).map(p=>({guild_id:p.guild_id})));
    if(!who) return res(401,{message:'not signed in'});
    const row = SRV.projects[gm[1]];
    return res(200, row ? [{guild_id:row.guild_id, total:row.total}] : []);
  }

  if(path.indexOf('/rest/v1/legions')===0){
    if(SRV.tableMissing) return res(404,{message:"Could not find the table 'public.legions' in the schema cache"});
    if(SRV.leakRows && (opts.method||'GET')==='GET') return res(200,[{slot:0,data:{}},{slot:1,data:{}}]);
    /* real PostgREST: no Authorization header = anon, RLS filters to [].
       An Authorization header carrying a bad/expired token = 401. */
    if(!who && !auth && (opts.method||'GET')==='GET') return res(200,[]);
    if(!who) return res(401,{message:'JWT expired'});
    const mine=SRV.rows[who.userId]||(SRV.rows[who.userId]={});
    if((opts.method||'GET')==='GET'){
      return res(200, Object.keys(mine).map(sl=>({slot:Number(sl), data:mine[sl].data, updated_at:mine[sl].updated_at})));
    }
    if(opts.method==='POST'){ mine[body.slot]={data:body.data, updated_at:body.updated_at}; return res(201); }
    if(opts.method==='DELETE'){ const m=path.match(/slot=eq\.(\d+)/); if(m) delete mine[m[1]]; return res(204); }
  }
  return res(404,{message:'no route'});
};
