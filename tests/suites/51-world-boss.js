
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

console.log('\n[338] renderWorldBoss(): the account gate, an honest no-boss state, and a populated boss with an HP bar and damage board');
startGame();
let html = renderWorldBoss();
ok('signed out shows the standard account prompt, same as Guild/Ladder/Online/Replays', /WORLD BOSS/.test(html) && /Sign in/.test(html));

return cloudSignUp('wb1@example.com','pw123456').then(()=>{
  return worldBossFetch();
}).then(()=>{
  ok('a fresh project with nobody having summoned one yet shows no active boss', social.worldBoss===null);
  let h = renderWorldBoss();
  ok('the no-boss state offers a summon button rather than a blank panel', h.indexOf('No World Boss is active')>=0 && h.indexOf('onclick="doWorldBossStart()"')>=0, h);

  console.log('\n[339] worldBossStart(): summons when none is active, refuses a second one, and scales HP with how many have already fallen');
  return worldBossStart();
}).then(r=>{
  ok('summoning succeeds against a fresh project', r.ok===true, r.error);
  ok('the boss starts at full HP', social.worldBoss.hp===social.worldBoss.max_hp && social.worldBoss.hp>0, social.worldBoss);
  ok('a fresh server-wide boss starts at the base HP — nobody has fallen before it', social.worldBoss.max_hp===300000, social.worldBoss);
  return worldBossStart();
}).then(r=>{
  ok('a second summon is refused while one is still active', r.ok===false, r);

  let h = renderWorldBoss();
  ok('an active boss renders its name, an HP bar, and the attack button, not the summon button', h.indexOf('☠')>=0 && h.indexOf('gauge-fill')>=0 && h.indexOf('onclick="startWorldBossRun()"')>=0, h);
  ok('the damage board starts out empty and honest about it', h.indexOf('No damage logged yet')>=0);

  console.log('\n[340] startWorldBossRun()/endBattle(): an ordinary battle whose damage report goes to the World Boss instead of the campaign — and skips the whole shared battle tail (streak, War Journal, Replays, presence)');
  const beforeStreak = state.streak, beforeBestStreak = state.bestStreak, beforeJournalLen = state.journal.length, beforeReplayLen = state.replays.length;
  const realPresenceSync = presenceSync;
  let presenceCalls = 0;
  presenceSync = function(){ presenceCalls++; return realPresenceSync(); };

  fillFormation(sixMonsters());
  startWorldBossRun();
  ok('startWorldBossRun() lands on the battle screen with a live battle object', state.screen==='battle' && !!state.battle && state.worldBossRun===true);
  B = state.battle;
  B.totalDamage = 4242;
  B.playerUnits.forEach(u=>{u.hp=0; u.fainted=true;});   // a losing fight — damage should still count
  endBattle('lose');
  ok('a losing World Boss attempt still reports a result tagged worldBoss, with the damage dealt', state.lastResult.worldBoss===true && state.lastResult.dealt===4242 && state.lastResult.win===false, state.lastResult);
  ok('the result screen lands immediately, before the network call resolves', state.screen==='result');
  ok('none of the ordinary shared-tail bookkeeping ran — win streak untouched', state.streak===beforeStreak && state.bestStreak===beforeBestStreak);
  ok('no War Journal entry was added', state.journal.length===beforeJournalLen);
  ok('no Battle Replay was captured either, even though this "loss" is otherwise unremarkable', state.replays.length===beforeReplayLen);
  ok('presence was never pinged by a World Boss attempt — same exclusion as a duel/raid/trial', presenceCalls===0);
  presenceSync = realPresenceSync;

  return worldBossFetch();
}).then(()=>{
  ok('the boss actually lost 4242 HP from that attempt', social.worldBoss.max_hp - social.worldBoss.hp===4242, social.worldBoss);
  ok('the damage board now shows the one contribution', social.worldBossBoard.length===1 && social.worldBossBoard[0].damage===4242, social.worldBossBoard);

  console.log('\n[341] worldBossContribute(): a single hit is capped server-side, contributions from the same account accumulate, and the boss can actually be brought down');
  return worldBossContribute(999999999);
}).then(()=>{
  ok('a single contribution is capped, not trusted at face value', social.worldBossBoard[0].damage===4242+20000, social.worldBossBoard[0]);
  const before = social.worldBoss.hp;
  return worldBossContribute(1000).then(()=>({before}));
}).then(ctx=>{
  ok('a second contribution from the same account adds to its own running total rather than creating a new row', social.worldBossBoard.length===1 && social.worldBossBoard[0].damage===4242+20000+1000, social.worldBossBoard);
  ok('and the shared HP pool actually dropped by that amount', social.worldBoss.hp===ctx.before-1000, social.worldBoss.hp+' vs '+ctx.before);

  // The 20000-per-hit cap means finishing off a 300000 HP boss takes several
  // hits — keep swinging until it actually falls, same as a determined
  // server full of players eventually would.
  function finishIt(){
    if(social.worldBoss.defeated_at || social.worldBoss.hp<=0) return Promise.resolve();
    return worldBossContribute(20000).then(finishIt);
  }
  return finishIt();
}).then(()=>{
  ok('the boss is fully defeated, HP at zero', social.worldBoss.hp===0 && !!social.worldBoss.defeated_at, social.worldBoss);
  ok('the finishing blow is credited to whoever landed it', social.worldBoss.last_hit_by===legionBanner(), social.worldBoss);

  let h = renderWorldBoss();
  ok('a defeated boss offers to summon the next one instead of an attack button', h.indexOf('DEFEATED')>=0 && h.indexOf('onclick="doWorldBossStart()"')>=0 && h.indexOf('onclick="startWorldBossRun()"')<0, h);
  ok('the victory message calls out who finished it', h.indexOf(escapeHtml(social.worldBoss.last_hit_by))>=0, h);

  return worldBossStart();
}).then(r=>{
  ok('the next boss can be summoned once the last one fell', r.ok===true, r);
  ok('it scales up harder than the last one, since one has already fallen', social.worldBoss.max_hp===300000+150000, social.worldBoss);

  console.log('\n[342] renderResult(): the World Boss result screen, win and lose, distinct from the Guild raid one');
  fillFormation(sixMonsters());
  startWorldBossRun();
  B = state.battle;
  B.totalDamage = 999;
  B.enemyUnits.forEach(u=>{u.hp=0; u.fainted=true;});
  endBattle('win');
  let rHtml = renderResult();
  ok('a World Boss win shows its own distinct heading and the damage dealt', /WORLD BOSS ATTEMPT/.test(rHtml) && rHtml.indexOf('999')>=0, rHtml);
  ok('a button returns to the World Boss screen, not the Guild', rHtml.indexOf('onclick="endWorldBossRun()"')>=0, rHtml);
  endWorldBossRun();
  ok('endWorldBossRun() returns to the World Boss screen, not the Hub', state.screen==='worldboss');

  console.log('\n[343] missing-migration diagnosis: the world_boss table/functions not installed yet degrade to real guidance, not a crash');
  SRV.noWorldBossTable = true;
  return worldBossFetch();
}).then(()=>{
  ok('a missing table surfaces an actionable error naming step 8', /step 8/i.test(social.worldBossError), social.worldBossError);
  return worldBossStart();
}).then(r=>{
  ok('summoning fails the same way when the function is not installed', r.ok===false && /step 8/i.test(r.error), r);
  return worldBossContribute(100);
}).then(r=>{
  ok('contributing fails the same way too', r.ok===false && /step 8/i.test(r.error), r);
  SRV.noWorldBossTable = false;

  console.log('\n[344] cloudSelfTest(): reports the World Boss table\'s install state alongside every earlier migration check');
  return cloudSelfTest();
}).then(r=>{
  ok('a fully-installed project reports the World Boss table present', r.lines.some(l=>l.ok && /world boss table is present/i.test(l.text)), r.lines);
  SRV.noWorldBossTable = true;
  return cloudSelfTest();
}).then(r=>{
  ok('a project missing step 8 reports it by name, not a generic failure', r.lines.some(l=>!l.ok && /step 8/i.test(l.text)), r.lines);
  SRV.noWorldBossTable = false;

  console.log('\n[345] Hub wiring: the button is present, and goWorldBoss() fetches when signed in but just navigates when signed out');
  hubTab='online';
  let hubHtml = renderHub();
  ok('the Hub carries a button straight into World Boss', hubHtml.indexOf('World Boss')>=0 && hubHtml.indexOf('onclick="goWorldBoss()"')>=0);

  social.worldBoss = null;
  goWorldBoss();
  ok('goWorldBoss() lands on the screen immediately', state.screen==='worldboss');
  return worldBossFetch();
}).then(()=>{
  ok('after opening the screen while signed in, the active boss is on hand', !!social.worldBoss);

  cloud.session = null;
  social.worldBoss = null;
  goWorldBoss();
  ok('signed out, goWorldBoss() still navigates to the screen (which then shows the sign-in prompt)', state.screen==='worldboss');
  ok('but it never bothers fetching anything while signed out', social.worldBoss===null);

  console.log('\n================ '+pass+' passed, '+fail+' failed ================');
  process.exit(fail?1:0);
}).catch(e=>{ console.log('HARNESS ERROR', e); process.exit(1); });
})();
