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
  guilds: {}, gmembers: {}, bosses: {}, rdamage: {}, ladder: {},
  online: true,
  requireConfirm: false,
  tokens: {},             // access -> {userId}
  refreshes: {},          // refresh -> userId
  calls: [],
  nextId: 1,
};
function srvReset(){
  SRV.users={}; SRV.rows={};
  SRV.guilds={}; SRV.gmembers={}; SRV.bosses={}; SRV.rdamage={}; SRV.ladder={};
  SRV.online=true; SRV.requireConfirm=false; SRV.tokens={}; SRV.refreshes={};
  SRV.calls=[]; SRV.nextId=1; SRV.tableMissing=false; SRV.leakRows=false; SRV.rejectKey=false;
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
    return res(404,{message:'no function '+fn});
  }

  /* ---------- REST reads ---------- */
  if(path.indexOf('/rest/v1/guild_members')===0){
    if(!who) return res(401,{message:'not signed in'});
    const uid=who.userId;
    const gm=path.match(/guild_id=eq\.([^&]+)/);
    if(gm){
      const mine=SRV.gmembers[uid];
      if(!mine || mine.guild_id!==gm[1]) return res(200,[]);   // RLS: members only
      return res(200, Object.values(SRV.gmembers).filter(m=>m.guild_id===gm[1])
        .sort((a,c)=>a.joined_at.localeCompare(c.joined_at))
        .map(m=>({user_id:m.user_id,display_name:m.display_name,joined_at:m.joined_at,
                  role:m.role,power:m.power,depth:m.depth,last_seen:m.last_seen})));
    }
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
  if(path.indexOf('/rest/v1/ladder')===0){
    if(!who) return res(401,{message:'not signed in'});
    return res(200, Object.values(SRV.ladder).sort((a,c)=>c.rating-a.rating)
      .map(l=>({user_id:l.user_id,display_name:l.display_name,rating:l.rating,power:l.power})));
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
