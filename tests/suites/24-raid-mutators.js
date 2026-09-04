
(function(){
function findBossId(predicate, cap){
  cap = cap || 800;
  for(let i=0;i<cap;i++){
    const id = 'probe'+i;
    if(predicate(raidMutatorsFor(id))) return id;
  }
  return null;
}
function fight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, null];
  state.formation.back=[null,null,null];
  state.intel={history:[],wins:0}; state.stage=stage;
  beginBattle(); return state.battle;
}

console.log('\n[106] deterministic, well-shaped draws');
startGame();
ok('the same boss id always draws the same mutators', JSON.stringify(raidMutatorsFor('bossA'))===JSON.stringify(raidMutatorsFor('bossA')));
ok('no boss id yields nothing', raidMutatorsFor(null).length===0 && raidMutatorsFor('').length===0);
for(let i=0;i<60;i++){
  const muts = raidMutatorsFor('scan'+i);
  ok('draw '+i+' has 1 or 2 entries', muts.length===1 || muts.length===2, muts.length);
  ok('draw '+i+' has no duplicate mutator keys', new Set(muts.map(m=>m.key)).size===muts.length);
  ok('draw '+i+' only uses known mutator keys', muts.every(m=>RAID_MUTATOR_POOL.some(p=>p.key===m.key)));
  ok('draw '+i+' every entry has a name/emoji/desc', muts.every(m=>m.name && m.emoji && m.desc));
  const ward = muts.find(m=>m.key==='warded');
  if(ward) ok('draw '+i+"'s ward names a real element", TRIBE_IDS.indexOf(ward.elem)>=0, ward.elem);
}
ok('currentRaidMutators() is empty with no active boss', (social.raid=null, currentRaidMutators().length===0));
social.raid = { id:'bossA', hp:100, max_hp:100 };
ok('currentRaidMutators() matches raidMutatorsFor() for the active boss', JSON.stringify(currentRaidMutators())===JSON.stringify(raidMutatorsFor('bossA')));
social.raid = null;

console.log('\n[107] different bosses can draw different loadouts');
const idA = 'varyA', idB = findBossId(m=>JSON.stringify(m)!==JSON.stringify(raidMutatorsFor(idA)));
ok('a different boss id was found with a different loadout', !!idB, idB);
ok('and it really does differ', JSON.stringify(raidMutatorsFor(idA))!==JSON.stringify(raidMutatorsFor(idB)));

console.log('\n[108] Elemental Ward reduces only its own element');
const wardedId = findBossId(m=>m.some(x=>x.key==='warded'));
ok('found a boss carrying Elemental Ward', !!wardedId);
const wardElem = raidMutatorsFor(wardedId).find(m=>m.key==='warded').elem;
social.raid = { id:wardedId, hp:1000, max_hp:1000 };   // full HP: Enraged (if co-drawn) never triggers here
let b = { totalDamage:500, elemDamage:{} };
b.elemDamage[wardElem] = 200;
const otherElem = TRIBE_IDS.find(e=>e!==wardElem);
b.elemDamage[otherElem] = 150;
const dealt = computeRaidDamage(b);
ok('warded-element damage is discounted', dealt===500-Math.round(200*RAID_WARD_PENALTY), dealt);
b.elemDamage[wardElem] = 0;
ok('zero damage on the warded element means zero reduction', computeRaidDamage(b)===500);
social.raid = null;

console.log('\n[109] Enraged Past Half only kicks in under 50% HP');
const enragedId = findBossId(m=>m.some(x=>x.key==='enraged'));
ok('found a boss carrying Enraged', !!enragedId);
social.raid = { id:enragedId, hp:500, max_hp:1000 };   // exactly 50%
ok('the bonus applies at exactly 50% HP', computeRaidDamage({totalDamage:100,elemDamage:{}})===Math.round(100*(1+RAID_ENRAGE_BONUS)));
social.raid.hp = 501;   // just above 50%
ok('no bonus one HP above the threshold', computeRaidDamage({totalDamage:100,elemDamage:{}})===100);
social.raid.hp = 100;   // well under half
ok('the bonus applies well under half HP too', computeRaidDamage({totalDamage:100,elemDamage:{}})===Math.round(100*(1+RAID_ENRAGE_BONUS)));
const calmId = findBossId(m=>!m.some(x=>x.key==='enraged'));
social.raid = { id:calmId, hp:10, max_hp:1000 };   // critically low, but this boss never draws Enraged
ok('a boss that never drew Enraged gives no bonus no matter how low its HP is', computeRaidDamage({totalDamage:100,elemDamage:{}})===100);
social.raid = null;

console.log('\n[110] raid credit never goes negative');
social.raid = { id:wardedId, hp:1000, max_hp:1000 };
b = { totalDamage:10, elemDamage:{} };
b.elemDamage[wardElem] = 999999;
ok('an outsized ward discount floors at zero, never negative', computeRaidDamage(b)===0, computeRaidDamage(b));
social.raid = null;

console.log('\n[111] wired into an actual raid attempt');
startGame();
const salvageId = findBossId(m=>m.some(x=>x.key==='salvage') && !m.some(x=>x.key==='enraged') && !m.some(x=>x.key==='warded'));
ok('found a boss carrying only Salvage Surge (isolating the effect)', !!salvageId);
social.raid = { id:salvageId, hp:1000, max_hp:1000, name:'Test Colossus' };
state.parts = [];
state.raidRun = true; state.duel=null; state.trial=null;
b = fight([newMonster('emberling',14),newMonster('aqualing',14)], 2);
b.totalDamage = 321; b.elemDamage = {};
b.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
endBattle('win');
ok('dealt damage is unmangled with no ward/enrage active', state.lastResult.dealt===321, state.lastResult.dealt);
ok('a raid win with Salvage Surge drops exactly 2 parts', state.lastResult.raidDrops.length===2, state.lastResult.raidDrops);
ok('those parts actually landed in the bay', state.parts.length===2);
ok('the active mutators are reported on the result', state.lastResult.raidMutators.some(m=>m.key==='salvage'));
state.raidRun = false;

startGame();
social.raid = { id:salvageId, hp:1000, max_hp:1000, name:'Test Colossus' };
state.parts = [];
state.raidRun = true; state.duel=null; state.trial=null;
b = fight([newMonster('emberling',14)], 2);
b.totalDamage = 50; b.elemDamage = {};
b.playerUnits.forEach(u=>{u.hp=0;u.fainted=true;});
endBattle('lose');
ok('a lost raid attempt still logs damage', state.lastResult.dealt===50);
ok('but a loss never triggers Salvage Surge', state.lastResult.raidDrops.length===0 && state.parts.length===0);
state.raidRun = false;
social.raid = null;

console.log('\n[112] visible in the Guild screen and on the result screen');
social.guild = { id:'g1', tag:'IRON', name:'Ironpaw Company', xp:0, level:1 };
social.members = [];
social.board = [];
social.council = [];
cloud.session = { access_token:'t', user:{ id:'u1', email:'x@example.com' } };
social.raid = { id:wardedId, hp:800, max_hp:1000, name:'Warded Thing' };
let html = renderGuild();
const wm = raidMutatorsFor(wardedId).find(m=>m.key==='warded');
ok("the guild raid panel names this boss's modifiers", html.indexOf(wm.name)>=0, wm.name);
ok('and shows their description', html.indexOf(wm.desc)>=0);
social.raid = null;
cloud.session = null;

state.lastResult = { raid:true, win:true, dealt:987, dailyDone:[], raidDrops:[{uid:'d1',key:'scraphound'}], raidMutators:[{key:'salvage',name:'Salvage Surge',emoji:'⚙️',desc:'x'}] };
html = renderResult();
ok('the result screen shows the mutators in play', html.indexOf('Salvage Surge')>=0);
ok('and the parts it dropped', html.indexOf(PARTS.scraphound.name)>=0);

console.log('\n[113] a real end-to-end raid boss actually resolves mutators');
srvReset();
let chain = cloudSignUp('mutguild@example.com','hunter2').then(()=>{
  state.profileName='Mut Tester';
  return guildCreate('Mutators Co','MUT');
}).then(()=>raidStart()).then(()=>raidFetch()).then(()=>{
  ok('a real boss was summoned with a real id', !!social.raid && typeof social.raid.id==='string' && social.raid.id.length>0, social.raid);
  const muts = currentRaidMutators();
  ok('it resolves to a valid mutator loadout', muts.length===1 || muts.length===2, muts);
  ok('every entry is a known mutator', muts.every(m=>RAID_MUTATOR_POOL.some(p=>p.key===m.key)));

  console.log('\n================ '+pass+' passed, '+fail+' failed ================');
  process.exit(fail?1:0);
}).catch(e=>{
  ok('end-to-end raid mutator resolution did not throw', false, String(e&&e.stack||e));
  console.log('\n================ '+pass+' passed, '+fail+' failed ================');
  process.exit(fail?1:0);
});
})();
