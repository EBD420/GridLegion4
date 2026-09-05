
(function(){
CLOUD.url='https://test.supabase.co'; CLOUD.anonKey='sb_publishable_test';
srvReset();
let B;
function fight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null,mons[1]?mons[1].uid:null,null];
  state.formation.back=[mons[2]?mons[2].uid:null,null,null];
  state.stage=stage; state.intel={history:[],wins:0};
  beginBattle(); return state.battle;
}
function sixMonsters(){ return ['emberling','aqualing','terrafang','emberling','aqualing','terrafang'].map(id=>newMonster(id,10,1,{key:'keen'})); }
function fillFormation(mons){
  state.roster = mons;
  state.formation.front=[mons[0].uid, mons[1].uid, mons[2].uid];
  state.formation.back=[mons[3].uid, mons[4].uid, mons[5].uid];
}

console.log('\n[346] computeWarScore(): a win counts for more than a loss off the same raw damage');
ok('a win scores 1.5x the raw damage dealt', computeWarScore({totalDamage:1000}, 'win')===1500);
ok('a loss still scores, just at face value', computeWarScore({totalDamage:1000}, 'lose')===1000);
ok('never negative even off a garbage battle object', computeWarScore({totalDamage:-500}, 'win')===0);
ok('a missing battle object degrades to zero rather than throwing', computeWarScore(null, 'win')===0);

console.log('\n[347] renderGuild()\'s GUILD WAR panel and guildWarStart(): queues when no opponent is waiting, matches immediately once one is, and never queues twice');
let chain = cloudSignUp('alfaleader@example.com','pw123456').then(()=>{
  startGame(); state.profileName='Alfa Leader';
  return guildCreate('Alfa Company','ALFA');
}).then(()=>{
  ok('sanity: guild founded', social.guild && social.guild.tag==='ALFA', social.guild);
  let html = renderGuild();
  ok('a guild with no war yet shows the panel with a Declare War button, not an error', html.indexOf('GUILD WAR')>=0 && html.indexOf('onclick="doGuildWarStart()"')>=0 && html.indexOf('No war is active')>=0, html);
  return guildWarStart();
}).then(r=>{
  ok('queuing with nobody else waiting succeeds but matches nobody yet', r.ok===true && r.matched===false, r);
  return guildWarFetch();
}).then(()=>{
  ok('Alfa is now marked as queued', social.guildWarQueued===true && social.guildWar===null);
  let html = renderGuild();
  ok('the panel reflects the wait rather than offering to queue again', html.indexOf('waiting for another guild')>=0, html);
  return guildWarStart();
}).then(r=>{
  ok('queuing again while already queued is a harmless no-op, not a duplicate entry or an error', r.ok===true && r.matched===false, r);

  return cloudSignOut().then(()=>cloudSignUp('betaleader@example.com','pw123456'));
}).then(()=>{
  startGame(); state.profileName='Beta Leader';
  return guildCreate('Beta Company','BETA');
}).then(()=>{
  return guildWarStart();
}).then(r=>{
  ok('the second guild to queue is matched immediately against the one already waiting', r.ok===true && r.matched===true, r);
  ok('the match is visible right away from Beta\'s side, naming Alfa as the opponent', social.guildWar && (social.guildWar.guild_a_name==='Alfa Company' || social.guildWar.guild_b_name==='Alfa Company'), social.guildWar);
  ok('scores start even', social.guildWar.score_a===0 && social.guildWar.score_b===0);

  return cloudSignOut().then(()=>cloudSignIn('alfaleader@example.com','pw123456'));
}).then(()=>{
  return guildFetch().then(()=>guildWarFetch());
}).then(()=>{
  ok('Alfa also sees the same war now, no longer queued', !!social.guildWar && social.guildWarQueued===false);
  ok('Alfa correctly sees Beta as ITS opponent (sides are not hard-coded, they flip per viewer)', social.guildWar.guild_a_name==='Beta Company' || social.guildWar.guild_b_name==='Beta Company', social.guildWar);
  let html = renderGuild();
  ok('the panel now shows both names, a live score line, and the attack button', html.indexOf('Alfa Company')>=0 && html.indexOf('Beta Company')>=0 && html.indexOf('onclick="startGuildWarRun()"')>=0, html);
  ok('and an honest countdown to when it closes', /Ends in/.test(html), html);

  console.log('\n[348] a third guild queuing while a war is already running just waits, same as the original queue case');
  return cloudSignOut().then(()=>cloudSignUp('gammaleader@example.com','pw123456'));
}).then(()=>{
  startGame();
  return guildCreate('Gamma Company','GAMA');
}).then(()=>{
  return guildWarStart();
}).then(r=>{
  ok('Gamma is queued, not matched against either of the two guilds already at war with each other', r.ok===true && r.matched===false, r);
  return guildWarFetch();
}).then(()=>{
  ok('and Gamma sees no active war of its own yet', social.guildWar===null && social.guildWarQueued===true);

  console.log('\n[349] startGuildWarRun()/endBattle(): an ordinary battle whose score goes to the guild war, skipping the whole shared battle tail');
  return cloudSignOut().then(()=>cloudSignIn('alfaleader@example.com','pw123456'));
}).then(()=>{
  return guildFetch().then(()=>guildWarFetch());
}).then(()=>{
  const beforeStreak=state.streak, beforeJournalLen=state.journal.length, beforeReplayLen=state.replays.length;
  const realPresenceSync=presenceSync; let presenceCalls=0;
  presenceSync=function(){ presenceCalls++; return realPresenceSync(); };

  fillFormation(sixMonsters());
  startGuildWarRun();
  ok('startGuildWarRun() lands on the battle screen with guildWarRun set', state.screen==='battle' && !!state.battle && state.guildWarRun===true);
  B=state.battle;
  B.totalDamage=1000;
  B.enemyUnits.forEach(u=>{u.hp=0; u.fainted=true;});   // a win — scores the full 1.5x
  endBattle('win');
  ok('a won guild-war sortie reports a result tagged guildWar, scored at the 1.5x win rate', state.lastResult.guildWar===true && state.lastResult.scored===1500 && state.lastResult.win===true, state.lastResult);
  ok('none of the ordinary shared-tail bookkeeping ran — win streak untouched', state.streak===beforeStreak);
  ok('no War Journal entry, no Battle Replay, and no presence ping — same exclusions as a raid/World Boss attempt', state.journal.length===beforeJournalLen && state.replays.length===beforeReplayLen && presenceCalls===0);
  presenceSync=realPresenceSync;

  return guildWarFetch();
}).then(()=>{
  const mine = social.guildWar.guild_a_name==='Alfa Company' ? social.guildWar.score_a : social.guildWar.score_b;
  ok('Alfa\'s side of the score actually moved by exactly 1500', mine===1500, social.guildWar);

  console.log('\n[350] guildWarContribute(): scores are capped server-side, and both guilds\' sides accumulate independently');
  return guildWarContribute(999999999);
}).then(()=>{
  const mine = social.guildWar.guild_a_name==='Alfa Company' ? social.guildWar.score_a : social.guildWar.score_b;
  ok('a single contribution is capped, not trusted at face value', mine===1500+20000, mine);

  return cloudSignOut().then(()=>cloudSignIn('betaleader@example.com','pw123456'));
}).then(()=>{
  return guildFetch().then(()=>guildWarFetch());
}).then(()=>{
  return guildWarContribute(4000);
}).then(()=>{
  const mine = social.guildWar.guild_a_name==='Beta Company' ? social.guildWar.score_a : social.guildWar.score_b;
  const opp = social.guildWar.guild_a_name==='Beta Company' ? social.guildWar.score_b : social.guildWar.score_a;
  ok('Beta\'s own contribution lands on Beta\'s side', mine===4000, social.guildWar);
  ok('and Alfa\'s earlier total is completely untouched by it', opp===1500+20000, social.guildWar);
  ok('the score board lists contributions from both sides of the war', social.guildWarBoard.length===2, social.guildWarBoard);

  console.log('\n[351] a war past its end date reads as over, with an honest win/lose/draw verdict and a way to queue another');
  const w = Object.values(SRV.wars).find(x=>(x.guild_a_name==='Alfa Company'||x.guild_b_name==='Alfa Company'));
  w.ends_at = new Date(Date.now()-1000).toISOString();   // force it into the past
  return guildWarFetch();
}).then(()=>{
  let html = renderGuild();   // viewed as Beta, currently signed in — Beta is behind 4000 to Alfa's 21500
  ok('an ended war says so and names the winner rather than still offering to fight', html.indexOf('War over')>=0 && html.indexOf('Alfa Company won this one')>=0, html);
  ok('the attack button is gone, replaced with a way to queue another war', html.indexOf('onclick="startGuildWarRun()"')<0 && html.indexOf('Queue for another war')>=0, html);

  console.log('\n[352] renderResult(): the Guild War result screen, distinct from the World Boss and raid ones');
  fillFormation(sixMonsters());
  return cloudSignOut().then(()=>cloudSignIn('gammaleader@example.com','pw123456'));
}).then(()=>{
  return guildFetch().then(()=>guildWarFetch());
}).then(()=>{
  return guildWarStart();   // Gamma was queued alone — nothing to match against yet, still just waiting
}).then(()=>{
  fillFormation(sixMonsters());
  startGuildWarRun();
  ok('with no active war yet, attempting one still starts an ordinary battle', state.screen==='battle' && state.guildWarRun===true);
  B=state.battle;
  B.totalDamage=500;
  B.playerUnits.forEach(u=>{u.hp=0; u.fainted=true;});
  endBattle('lose');
  let rHtml = renderResult();
  ok('a Guild War loss still shows its own distinct heading and the score logged', /GUILD WAR SORTIE/.test(rHtml) && rHtml.indexOf('500')>=0, rHtml);
  ok('the copy is honest that a loss still scores, just less', /still scores, just less/.test(rHtml), rHtml);
  return guildWarContribute(500);
}).then(r=>{
  ok('logging a score with no active war of your own fails cleanly rather than crediting the wrong war', r.ok===false && /no active guild war/i.test(r.error), r);
  endGuildWarRun();
  ok('endGuildWarRun() returns to the Guild screen, not the Hub', state.screen==='guild');

  console.log('\n[353] missing-migration diagnosis: the guild_wars tables/functions not installed yet degrade to real guidance, not a crash');
  SRV.noGuildWarsTable = true;
  return guildWarFetch();
}).then(()=>{
  ok('a missing table surfaces an actionable error naming step 9', /step 9/i.test(social.guildWarError), social.guildWarError);
  return guildWarStart();
}).then(r=>{
  ok('queuing fails the same way when the functions are not installed', r.ok===false && /step 9/i.test(r.error), r);
  return guildWarContribute(100);
}).then(r=>{
  ok('contributing fails the same way too', r.ok===false && /step 9/i.test(r.error), r);
  SRV.noGuildWarsTable = false;

  console.log('\n[354] cloudSelfTest(): reports the Guild Wars tables\' install state alongside every earlier migration check');
  return cloudSelfTest();
}).then(r=>{
  ok('a fully-installed project reports the Guild Wars tables present', r.lines.some(l=>l.ok && /guild wars tables are present/i.test(l.text)), r.lines);
  SRV.noGuildWarsTable = true;
  return cloudSelfTest();
}).then(r=>{
  ok('a project missing step 9 reports it by name, not a generic failure', r.lines.some(l=>!l.ok && /step 9/i.test(l.text)), r.lines);
  SRV.noGuildWarsTable = false;

  console.log('\n[355] goGuild(): fetches guild-war status alongside the raid and council when opening the Guild screen with a guild, and skips it entirely without one');
  return guildFetch();
}).then(()=>{
  const realGuildWarFetch = guildWarFetch;
  let calls = 0;
  guildWarFetch = function(){ calls++; return realGuildWarFetch.apply(this, arguments); };

  goGuild();
  // goGuild()'s own chain is guildFetch -> guildSync+guildFetch -> raidFetch ->
  // councilFetch -> guildWarFetch -> render(); mirror that exact shape here as a
  // deterministic settle proxy (same trick suite 48 uses for Online Now) rather
  // than a single shorter call that would resolve before goGuild()'s does.
  return guildFetch()
    .then(g=>g?guildSync().then(()=>guildFetch()):null)
    .then(g=>g?raidFetch():null)
    .then(()=>social.guild?councilFetch():null)
    .then(()=>social.guild?realGuildWarFetch():null)
    .then(()=>{
      ok('opening the Guild screen while in a guild also refreshes the war status', calls>=1, calls);
      guildWarFetch = realGuildWarFetch;
      return guildLeave();
    });
}).then(()=>{
  const realGuildWarFetch = guildWarFetch;
  let calls = 0;
  guildWarFetch = function(){ calls++; return realGuildWarFetch.apply(this, arguments); };

  goGuild();
  return guildFetch().then(()=>{   // proxy for goGuild()'s own (shorter, guildless) chain settling
    ok('signed in but guildless, goGuild() never bothers fetching the war panel\'s data', calls===0, calls);
    guildWarFetch = realGuildWarFetch;
  });
}).then(()=>{

  console.log('\n================ '+pass+' passed, '+fail+' failed ================');
  process.exit(fail?1:0);
}).catch(e=>{ console.log('HARNESS ERROR', e); process.exit(1); });
})();
