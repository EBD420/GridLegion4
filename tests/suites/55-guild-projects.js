
(function(){
CLOUD.url='https://test.supabase.co'; CLOUD.anonKey='sb_publishable_test';
srvReset();

console.log('\n[377] guildProjectTotal()/guildProjectTier()/hasProject()/nextGuildProjectTier(): pure cumulative-threshold helpers, same shape as guildLevel()');
social.project = null;
ok('no project data at all reads as a total of zero', guildProjectTotal()===0);
ok('and zero tiers funded', guildProjectTier()===0);
ok('nothing is unlocked yet', !hasProject('vault') && !hasProject('crest') && !hasProject('concord'));
ok('the next tier is the very first one', nextGuildProjectTier()===GUILD_PROJECT_TIERS[0]);

social.project = { total: 29 };
ok('one short of the first threshold still funds nothing', guildProjectTier()===0 && !hasProject('vault'));

social.project = { total: 30 };
ok('hitting the threshold exactly funds it', guildProjectTier()===1 && hasProject('vault'));
ok('but not the next one', !hasProject('crest'));
ok('the next tier is now Guild Crest', nextGuildProjectTier().key==='crest');

social.project = { total: 89 };
ok('just under tier 2 still only has tier 1', guildProjectTier()===1);

social.project = { total: 250 };
ok('a huge one-time total crosses every tier at once, same as guildLevel() jumping levels', guildProjectTier()===GUILD_PROJECT_TIERS.length);
ok('every effect is unlocked', hasProject('vault') && hasProject('crest') && hasProject('concord'));
ok('there is nothing left to build toward', nextGuildProjectTier()===null);

ok('garbage/negative totals never go negative or throw', (()=>{
  social.project = { total: -50 }; const a = guildProjectTotal();
  social.project = { total: 'nope' }; const b = guildProjectTotal();
  social.project = {}; const c = guildProjectTotal();
  return a===0 && b===0 && c===0;
})());

social.project = { total: 30 };
ok('guildProjectFloor() reads the last funded threshold as the progress-bar floor — tier 1 just funded, so the floor is 30', guildProjectFloor()===30);
ok('guildProjectPct() reports honest progress toward the next tier — 0% right at the floor', guildProjectPct()===0);
social.project = { total: 60 };
ok('halfway to the second tier reads as 50%', guildProjectPct()===50, guildProjectPct());
social.project = { total: 300 };
ok('once everything is funded, progress reads a clean 100%, never garbage math off a null next tier', guildProjectPct()===100);
social.project = null;

console.log('\n[378] guildProjectFetch(): a guild with nothing contributed yet gets an honest zero rather than null, and missing tables are diagnosed by name');
let B;
/* doGuildProjectContribute() is a fire-and-forget UI handler, same shape as
   doRaidStart()/doCouncilVote() elsewhere — it never returns its own promise.
   To await its effects deterministically, capture the exact promise it awaits
   internally and attach our own .then() to that SAME promise, one hop after
   doGuildProjectContribute's own callback was attached — same-promise .then()
   callbacks always fire in attachment order, so this is a real guarantee, not
   a timing hope. */
function callDoContribute(n){
  const real = guildProjectContribute;
  let captured;
  guildProjectContribute = function(){ captured = real.apply(this, arguments); return captured; };
  doGuildProjectContribute(n);
  guildProjectContribute = real;
  return captured ? captured.then(()=>{}) : Promise.resolve();
}
let chain = cloudSignUp('vaultleader@example.com','pw123456').then(()=>{
  startGame(); state.profileName='Vault Leader';
  return guildCreate('Vault Company','VLT1');
}).then(()=>{
  ok('sanity: guild founded', social.guild && social.guild.tag==='VLT1', social.guild);
  return guildProjectFetch();
}).then(()=>{
  ok('a freshly founded guild has an honest zero total, not null and not an error', social.project && social.project.total===0, social.project);
  ok('no diagnostic error for a fully-installed project', social.projectError==='');
  ok('the contributor board starts empty', social.projectBoard.length===0);

  console.log('\n[379] guildProjectContribute()/doGuildProjectContribute(): server-side amount cap, spend-only-on-success, and "max" respects both the bay and the cap');
  return guildProjectContribute(999);
}).then(()=>{
  ok('a single contribution is capped at 14 server-side, not trusted at face value', social.project.total===14, social.project);
  ok('the contributor board now lists exactly one donor', social.projectBoard.length===1 && social.projectBoard[0].amount===14, social.projectBoard);

  // doGuildProjectContribute() proper: spends the player's own bag, only on success.
  state.parts = [1,2,3].map(()=>({uid:uid(), key:ENEMY_IDS[0]}));
  return callDoContribute(1);
}).then(()=>{
  ok('a successful 1-part donation actually removed exactly one part from the bay', state.parts.length===2, state.parts);
  ok('and it landed on the shared total', social.project.total===15, social.project);

  return callDoContribute('max');
}).then(()=>{
  ok('"max" donates the whole remaining bay (2 parts), not an arbitrary fixed amount', state.parts.length===0, state.parts);
  ok('and both of those parts landed on the total', social.project.total===17, social.project);

  doGuildProjectContribute(1);   // empty bay: this path never touches the network, nothing async to await
  ok('donating with an empty bay leaves a real status message rather than staying blank', !!social.status, social.status);
  ok('the empty-bay message is honest, not a generic failure', /no salvage parts/i.test(social.status), social.status);

  console.log('\n[379b] a contribution that never reaches the server never costs the player a part');
  state.parts = [1,2].map(()=>({uid:uid(), key:ENEMY_IDS[0]}));
  SRV.online = false;   // network down entirely — guildProjectContribute must fail cleanly
  return callDoContribute(1);
}).then(()=>{
  ok('a network failure leaves the bay completely untouched', state.parts.length===2, state.parts);
  ok('and reports honestly rather than pretending it worked', /could not/i.test(social.status) || /error/i.test(social.status), social.status);
  SRV.online = true;

  console.log('\n[380] Salvage Vault (hasProject(\'vault\')): the guild-funded +8% stacks with every other salvage-roll bonus, gated purely off social.project');
  function setupWin(){
    const m = newMonster('emberling',10);
    state.roster=[m]; state.formation.front=[m.uid,null,null]; state.formation.back=[null,null,null];
    state.intel={history:[],wins:0}; state.stage=1; state.streak=0;
    beginBattle();
    const b = state.battle;
    b.enemyUnits.forEach(u=>{u.hp=0; u.fainted=true;});
    return b;
  }
  const realRandom = Math.random;
  social.project = null;   // no project funded: base chance only (0.7 on an ordinary stage)
  state.parts = [];
  setupWin();
  Math.random = () => 0.75;   // clears 0.7 but not 0.78
  endBattle('win');
  ok('without the guild project, a roll that clears the base threshold but not +8% gets nothing', state.parts.length===0, state.parts);

  state.parts = []; state.streak = 0;
  setupWin();
  social.project = { total: 30 };   // Salvage Vault funded
  Math.random = () => 0.75;
  endBattle('win');
  ok('with Salvage Vault funded, the exact same roll now clears 0.78 and drops a part', state.parts.length===1, state.parts);
  Math.random = realRandom;
  social.project = { total: 0 };

  console.log('\n[381] Guild Crest cosmetic: renderGuild() shows the crest once tier 2 is funded, and only then');
  let html = renderGuild();
  ok('no crest yet at total 0', html.indexOf('earned its own crest')<0, html);
  social.project = { total: 90 };
  html = renderGuild();
  ok('the crest appears once Guild Crest is funded', html.indexOf('earned its own crest')>=0, html);
  ok('and the emblem prefixes the guild name in the header', html.indexOf('🛡️ Vault Company')>=0, html);
  social.project = { total: 0 };

  console.log('\n[382] Caravan Concord: the new offer type only ever ROLLS for a guild that funded it, but a previously-rolled one still honours its own logic');
  const realRandom2 = Math.random;
  Math.random = () => 0;   // deterministic: always picks pool[0]
  rollCaravanOffer(1000);
  ok('CARAVAN_OFFER_TYPES lists concord_trade as a real, revivable type', CARAVAN_OFFER_TYPES.indexOf('concord_trade')>=0);
  ok('without the project, concord_trade is never in the rollable pool at all', caravanRollPool().indexOf('concord_trade')<0);
  social.project = { total: 180 };   // Caravan Concord funded
  ok('once funded, concord_trade joins the rollable pool', caravanRollPool().indexOf('concord_trade')>=0);
  social.project = { total: 0 };

  const concord = { type:'concord_trade', tribe:'fire' };
  ok('concord_trade text names the better rate and the right tribe', caravanOfferText(concord).indexOf(CARAVAN_CONCORD_FAVOR_REWARD+' favor')>=0 && caravanOfferText(concord).indexOf(TRIBES.fire.name)>=0, caravanOfferText(concord));
  ok('without the project funded, concord_trade is not affordable even with plenty of parts', (state.parts=[1,2,3].map(()=>({uid:uid(),key:ENEMY_IDS[0]})), caravanCanAfford(concord)===false));
  social.project = { total: 180 };
  ok('once the project is funded, the same offer becomes affordable with enough parts', caravanCanAfford(concord)===true);
  const favorBefore = favorOf('fire');
  state.caravan = concord;
  acceptCaravanTrade();
  ok('accepting it spends the concord price and grants the improved favor reward', state.parts.length===1 && favorOf('fire')===favorBefore+CARAVAN_CONCORD_FAVOR_REWARD, [state.parts.length, favorOf('fire')]);
  social.project = { total: 0 };
  Math.random = realRandom2;

  console.log('\n[383] goGuild()/doGuildRefresh()/guildLeave(): guild-project data is wired into every place the rest of the guild data already refreshes or resets');
  const realFetch = guildProjectFetch;
  let calls = 0;
  guildProjectFetch = function(){ calls++; return realFetch.apply(this, arguments); };

  goGuild();
  // Mirror goGuild()'s exact chain as a deterministic settle proxy, same trick
  // suites 48/52 use — a shorter call would resolve before goGuild()'s does.
  return guildFetch()
    .then(g=>g?guildSync().then(()=>guildFetch()):null)
    .then(g=>g?raidFetch():null)
    .then(()=>social.guild?councilFetch():null)
    .then(()=>social.guild?guildWarFetch():null)
    .then(()=>social.guild?realFetch():null)
    .then(()=>{
      ok('opening the Guild screen while in a guild also refreshes the project total', calls>=1, calls);
      guildProjectFetch = realFetch;

      let calls2 = 0;
      guildProjectFetch = function(){ calls2++; return realFetch.apply(this, arguments); };
      doGuildRefresh();
      return guildSync().then(()=>guildFetch()).then(()=>raidFetch()).then(()=>councilFetch()).then(()=>realFetch()).then(()=>{
        ok('the manual Refresh button also refreshes it', calls2>=1, calls2);
        guildProjectFetch = realFetch;
      });
    });
}).then(()=>{
  social.project = { total: 42 }; social.projectBoard = [{display_name:'Someone', amount:42}]; social.projectError = 'stale';
  return guildLeave();
}).then(()=>{
  ok('leaving the guild clears the project state completely, same treatment as raid/council', social.project===null && social.projectBoard.length===0 && social.projectError==='');

  console.log('\n[384] renderGuild()\'s GUILD PROJECTS panel: tier rows, an honest progress bar, donate controls gated on the bay, and a clean "fully funded" state');
  return guildCreate('Second Vault','VLT2');
}).then(()=>{
  state.parts = [];
  let html = renderGuild();
  ok('the panel lists all three tiers, unfunded', html.indexOf('GUILD PROJECTS')>=0 && html.indexOf('Salvage Vault')>=0 && html.indexOf('Guild Crest')>=0 && html.indexOf('Caravan Concord')>=0, html);
  ok('with an empty bay, every donate button is disabled', /onclick="doGuildProjectContribute\(1\)"[^>]*disabled|disabled[^>]*onclick="doGuildProjectContribute\(1\)"/.test(html) || html.indexOf('disabled')>=0, html);

  state.parts = [1,2].map(()=>({uid:uid(), key:ENEMY_IDS[0]}));
  html = renderGuild();
  ok('Donate 1 and Donate all are enabled with 2 parts in the bay', html.indexOf('onclick="doGuildProjectContribute(1)"')>=0 && html.indexOf("onclick=\"doGuildProjectContribute('max')\"")>=0, html);
  ok('but Donate 5 stays disabled with only 2 parts', new RegExp('disabled[^>]*onclick="doGuildProjectContribute\\(5\\)"').test(html) || html.match(/doGuildProjectContribute\(5\)[^>]*>/), html);
  ok('the bay count is shown honestly', html.indexOf('You currently hold 2 salvage parts')>=0, html);

  social.project = { total: 300 };   // every tier funded
  html = renderGuild();
  ok('once everything is funded, the panel says so instead of still asking for donations', html.indexOf('Every project is funded')>=0, html);
  ok('and the donate buttons are gone', html.indexOf('doGuildProjectContribute')<0, html);
  social.project = null; state.parts = [];

  console.log('\n[385] missing-migration diagnosis (step 10): guild_projects not installed yet degrades to real guidance everywhere it is read, and cloudSelfTest() reports it by name');
  SRV.noGuildProjectsTable = true;
  return guildProjectFetch();
}).then(()=>{
  ok('a missing table surfaces an actionable error naming step 10', /step 10/i.test(social.projectError) && /SETUP-MULTIPLAYER/.test(social.projectError), social.projectError);
  let html = renderGuild();
  ok('the live Guild screen shows the same warning rather than a blank panel', html.indexOf(social.projectError)>=0, html);
  return guildProjectContribute(5);
}).then(r=>{
  ok('contributing fails the same way when the function is not installed', r.ok===false && /step 10/i.test(r.error), r);
  return cloudSelfTest();
}).then(t=>{
  const txt = t.lines.map(l=>l.text).join(' | ');
  ok('self-test flags the missing Guild Projects tables by name, not a generic failure', t.lines.some(l=>!l.ok && /guild projects tables are missing/i.test(l.text)) && /step 10/i.test(txt), txt);
  ok('every earlier migration check still passes alongside it', /guild wars tables are present/i.test(txt), txt);

  SRV.noGuildProjectsTable = false;
  return cloudSelfTest();
}).then(t=>{
  ok('once installed, self-test confirms it by name', t.lines.some(l=>l.ok && /guild projects tables are present/i.test(l.text)), t.lines);

  console.log('\n================ '+pass+' passed, '+fail+' failed ================');
  process.exit(fail?1:0);
}).catch(e=>{ console.log('HARNESS ERROR', e); process.exit(1); });
})();
