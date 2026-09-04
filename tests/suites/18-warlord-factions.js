
(function(){
function setupFight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.intel={history:[],wins:0}; state.stage=stage;
  beginBattle(); return state.battle;
}

console.log('\n[70] warlord data and scheduling');
startGame();
ok('three warlords defined', Object.keys(WARLORDS).length===3);
ok('each warlord looks like a boss', Object.keys(WARLORDS).every(k=>{
  const w=WARLORDS[k];
  return w.name && w.emoji && w.element && w.skill && w.mult && w.gens>=1 && w.genName && w.genEmoji && w.genElement && w.isWarlord===true && !!w.faction;
}));
ok('stage 7 always gives Warlord Ashclaw', warlordForStage(7)===WARLORDS.ashclaw);
ok('no other campaign stage triggers a warlord directly', [1,2,3,4,6,8].every(s=>warlordForStage(s)===null));
ok('scripted commander stages take priority and never collide with a warlord', [5,9,10].every(s=>!!BOSSES[s] && warlordForStage(s)===null));
ok('bossForStage(7) resolves to the warlord (no scripted boss there)', bossForStage(7)===WARLORDS.ashclaw);
ok('bossForStage still returns the scripted commander on 5/9/10', bossForStage(5)===BOSSES[5] && bossForStage(9)===BOSSES[9] && bossForStage(10)===BOSSES[10]);

console.log('\n[71] the Deep cadence cycles through all three, offset from elites and the Foundry Core');
// depth 7 -> ashclaw, depth 17 -> tidewrack, depth 27 -> galevane, depth 37 -> ashclaw again
ok('depth 7 is Ashclaw', warlordForStage(CAMPAIGN_LENGTH+7)===WARLORDS.ashclaw);
ok('depth 17 is Tidewrack', warlordForStage(CAMPAIGN_LENGTH+17)===WARLORDS.tidewrack);
ok('depth 27 is Galevane', warlordForStage(CAMPAIGN_LENGTH+27)===WARLORDS.galevane);
ok('depth 37 cycles back to Ashclaw', warlordForStage(CAMPAIGN_LENGTH+37)===WARLORDS.ashclaw);
ok('a depth that is not %10==7 has no warlord', warlordForStage(CAMPAIGN_LENGTH+8)===null && warlordForStage(CAMPAIGN_LENGTH+16)===null);
for(let d=1; d<=100; d++){
  const stage = CAMPAIGN_LENGTH+d;
  const hasWarlord = !!warlordForStage(stage);
  const isElite = isEliteStage(stage);
  const isCore = d%10===0;
  if(hasWarlord){
    ok('a warlord depth ('+d+') never doubles as an elite wave', !isElite, d);
    ok('a warlord depth ('+d+') never doubles as the Foundry Core', !isCore, d);
  }
}

console.log('\n[72] a warlord fight runs through the exact same boss rig as a scripted commander');
let B = setupFight([newMonster('emberling',20), newMonster('aqualing',20)], 7);
const boss = B.enemyUnits.find(u=>u.isBoss), gens = B.enemyUnits.filter(u=>u.isGenerator);
ok('Warlord Ashclaw is fielded as the boss unit', boss && boss.name==='Warlord Ashclaw' && boss.emoji==='🐉');
ok('its one Kindling Drone pylon is fielded', gens.length===1 && gens[0].name==='Kindling Drone');
ok('the warlord starts shielded like any commander', boss.shielded===true);
ok('the warlord sits in the back, its pylon in front', boss.row==='back' && gens[0].row==='front');
gens[0].hp=0; gens[0].fainted=true;
updateBossShield();
ok('dropping its only pylon breaks the shield, same as any commander', boss.shielded===false);
ok('the collapse is logged with its own flavour text', B.log.some(l=>l.indexOf('Kindling Drone')>=0 && /shield collapses/i.test(l)));
const front = B.playerUnits.find(u=>u.row==='front');
const targets = getValidTargets(front);
ok('once exposed, the warlord itself is targetable', targets.indexOf(boss)>=0);

console.log('\n[73] a Deep warlord fight (Tidewrack) is built the same way, mid-cycle');
B = setupFight([newMonster('emberling',30), newMonster('aqualing',30)], CAMPAIGN_LENGTH+17);
const boss2 = B.enemyUnits.find(u=>u.isBoss), gens2 = B.enemyUnits.filter(u=>u.isGenerator);
ok('Warlord Tidewrack is fielded at depth 17', boss2 && boss2.name==='Warlord Tidewrack' && boss2.element==='water');
ok('its two Ballast Drones are fielded', gens2.length===2 && gens2.every(g=>g.name==='Ballast Drone'));

console.log('\n[74] the codex bestiary lists warlords once encountered, and counts them');
startGame();
ok('the total boss count includes all three warlords', codexTotals().bosses === Object.keys(BOSSES).length + 1 + Object.keys(WARLORDS).length,
   codexTotals().bosses);
let bestiary = renderCodex();
ok('an unmet warlord shows as unknown', bestiary.indexOf('Warlord Ashclaw')<0);
B = setupFight([newMonster('emberling',20)], 7);
codexRecordBattle();
bestiary = renderCodex();
ok('after the fight, the warlord is revealed in the bestiary', bestiary.indexOf('Warlord Ashclaw')>=0, bestiary.indexOf('Warlord Ashclaw'));
ok('its faction generator is shown alongside it', bestiary.indexOf('Kindling Drone')>=0);
ok('a warlord never met yet still stays hidden', bestiary.indexOf('Warlord Tidewrack')<0);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
