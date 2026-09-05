
(function(){
const T=(s)=>s; let B;
function setupFight(mons, stage){
  state.roster=mons; 
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.intel={history:[],wins:0}; state.stage=stage;
  beginBattle(); return state.battle;
}

console.log('\n[35] commander fights');
startGame();
ok('boss stages are declared', !!bossForStage(5) && !!bossForStage(9) && !!bossForStage(10));
// Stage 7 now always fields Warlord Ashclaw (see 18-warlord-factions.js) — it is
// a boss stage too, just not one of the scripted commanders in BOSSES.
ok('ordinary stages have none', !bossForStage(1) && !bossForStage(4) && !bossForStage(6));
ok('the Deep has a boss every 10 depths', !!bossForStage(20) && !!bossForStage(30) && !bossForStage(25));
B=setupFight([newMonster('emberling',12), newMonster('aqualing',12)], 10);
const boss=B.enemyUnits.find(u=>u.isBoss), gens=B.enemyUnits.filter(u=>u.isGenerator);
ok('encounter is one commander plus pylons', !!boss && gens.length===3, gens.length);
ok('commander starts shielded', boss.shielded===true);
ok('commander sits in the back, pylons in front', boss.row==='back' && gens.every(g=>g.row==='front'));
ok('commander is far beefier than a pylon', boss.maxHp > gens[0].maxHp*3, boss.maxHp+' vs '+gens[0].maxHp);

/* the shield actually gates targeting */
const front=B.playerUnits.find(u=>u.row==='front');
let targets=getValidTargets(front);
ok('shielded commander is not targetable', targets.indexOf(boss)<0);
ok('pylons are the only targets', targets.length===3 && targets.every(t=>t.isGenerator));
gens.slice(0,2).forEach(g=>{ g.hp=0; g.fainted=true; });
updateBossShield();
ok('shield holds while one pylon stands', boss.shielded===true);
targets=getValidTargets(front);
ok('and the commander is still untouchable', targets.indexOf(boss)<0);
gens[2].hp=0; gens[2].fainted=true;
updateBossShield();
ok('dropping the last pylon breaks the shield', boss.shielded===false);
ok('the collapse is announced', B.log.some(l=>/shield collapses/i.test(l)));
targets=getValidTargets(front);
ok('now the commander can be hit', targets.indexOf(boss)>=0, targets.length);

/* reboot mechanic */
B=setupFight([newMonster('emberling',12)], 10);
const boss2=B.enemyUnits.find(u=>u.isBoss), gens2=B.enemyUnits.filter(u=>u.isGenerator);
gens2.forEach(g=>{ g.hp=0; g.fainted=true; });
boss2.repairCd=1;
enemyAct(boss2);
ok('commander reboots a downed pylon', gens2.some(g=>!g.fainted), gens2.map(g=>g.fainted));
const revived=gens2.find(g=>!g.fainted);
ok('rebooted at half power', revived.hp===Math.max(1,Math.round(revived.maxHp*0.5)), revived.hp+'/'+revived.maxHp);
ok('reboot is logged', B.log.some(l=>/reboots/i.test(l)));
ok('reboot timer resets', boss2.repairCd===BOSS_REPAIR_EVERY);
/* once the shield is broken it stays broken */
gens2.forEach(g=>{ g.hp=0; g.fainted=true; });
updateBossShield();
ok('shield broken for good', boss2.shielded===false && boss2.shieldBroken===true);
boss2.repairCd=1; enemyAct(boss2);
ok('no more reboots after the collapse', gens2.every(g=>g.fainted), gens2.map(g=>g.fainted));
/* the fight is winnable */
B.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
ok('killing everything ends the fight', checkBattleEnd()===true);

console.log('\n[36] trials');
startGame();
ok('no trials before anything is cleared', clearedStages().length===0);
ok('trials screen says so', /Clear a stage first/.test(renderTrials()));
state.cleared={3:true, 7:true};
ok('cleared stages are listed', clearedStages().join()==='3,7');
hubTab='campaign';
ok('hub offers trials once something is cleared', /Trials \(2\)/.test(renderHub()));
state.trialPick={stage:7, mods:[]};
ok('reward scales with stage', trialReward(30) > trialReward(3), trialReward(3)+' -> '+trialReward(30));
toggleMod('blitz'); toggleMod('glass');
ok('handicaps stack', state.trialPick.mods.join()==='blitz,glass');
toggleMod('glass');
ok('and can be removed', state.trialPick.mods.join()==='blitz');
toggleMod('glass');

state.roster=[newMonster('emberling',10), newMonster('aqualing',10), newMonster('mossling',10), newMonster('voltcub',10)];
state.formation.front=[state.roster[0].uid,state.roster[1].uid,null];
state.formation.back=[state.roster[2].uid,state.roster[3].uid,null];
state.stage=12; state.intel={history:[],wins:0};
startTrial();
B=state.battle;
ok('trial runs the chosen stage, not the current one', state.stage===7 && state.stageBeforeTrial===12);
ok('trial is flagged on the battle', !!state.trial && state.trial.mods.length===2);

/* modifier effects */
ok('blitz doubles enemy speed', (function(){
  /* enemy species are drawn at random, so average many waves */
  const meanSpd=(n)=>{ let t=0,c=0; for(let i=0;i<n;i++) buildEnemyUnits(7,TERRAINS.clear,null,false).forEach(u=>{t+=u.spd;c++;}); return t/c; };
  state.trial={stage:7,mods:['blitz'],reward:1};
  const fast=meanSpd(200);
  state.trial=null;
  const slow=meanSpd(200);
  const ratio=fast/slow;
  return ratio>1.85 && ratio<2.15;
})());
state.trial={stage:7,mods:['vanguard'],reward:1};
B=setupFight(state.roster, 7);
ok('vanguard forces everyone into the front line', B.playerUnits.every(u=>u.row==='front'));
state.trial={stage:7,mods:['glass'],reward:1};
const rr=Math.random; Math.random=()=>0.5;
const atkr={element:'fire',elements:['fire'],attackElements:['fire'],atk:100,side:'player'};
const defr={element:'fire',elements:['fire'],def:0};
const glassDmg=computeDamage(atkr,defr,false).dmg;
state.trial=null;
const normDmg=computeDamage(atkr,defr,false).dmg;
Math.random=rr;
ok('glass field raises damage', glassDmg>normDmg, normDmg+' -> '+glassDmg);
state.trial={stage:7,mods:['corrosion'],reward:1};
B=setupFight([newMonster('terrafang',10)], 7);
ok('corrosion loads the legion with rust', B.playerUnits[0].corruption>=20, B.playerUnits[0].corruption);
state.trial={stage:7,mods:['hardened'],reward:1};
(function(){
  const m=newMonster('emberling',10);
  state.roster=[m];
  state.formation.front=[m.uid,null,null]; state.formation.back=[null,null,null];
  state.intel={history:[],wins:0}; state.stage=7;   // deliberately NO intel yet
  beginBattle(); B=state.battle;
})();
ok('hardened plates against your element with no intel at all', B.enemyUnits.every(u=>u.plating==='fire'), B.enemyUnits.map(u=>u.plating));
ok('and says so in the log', B.log.some(l=>/Hardened Steel/.test(l)));
state.trial=null;
(function(){
  const m=newMonster('emberling',10);
  state.roster=[m]; state.formation.front=[m.uid,null,null]; state.formation.back=[null,null,null];
  state.intel={history:[],wins:0}; state.stage=7;
  beginBattle(); B=state.battle;
})();
ok('without the handicap there is no early plating', B.enemyUnits.every(u=>!u.plating));

/* trial payout and isolation from progression */
state.trial={stage:7,mods:['blitz','glass'],reward:4};
state.stageBeforeTrial=12; state.stage=7;
state.parts=[]; const rosterN=state.roster.length; const clearedN=clearedStages().length;
const intelN=state.intel.history.length;
B=setupFight(state.roster, 7);
B.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
B.elemDamage={fire:100};
endBattle('win');
ok('trial win pays salvage', state.parts.length===4, state.parts.length);
ok('trial result is flagged', state.lastResult.trial===true);
ok('no recruits from a trial', state.roster.length===rosterN);
ok('trial does not mark stages cleared', clearedStages().length===clearedN);
ok('trial does not feed enemy intel', state.intel.history.length===intelN);
ok('result screen names the handicaps', /Blitzkrieg/.test(renderResult()) && /Glass Field/.test(renderResult()));
endTrial();
ok('returning restores the real stage', state.stage===12 && state.trial===null);
/* losing a trial costs nothing */
state.trial={stage:7,mods:['blitz'],reward:2}; state.stageBeforeTrial=12; state.stage=7;
const partsN=state.parts.length;
B=setupFight(state.roster,7);
B.playerUnits.forEach(u=>{u.hp=0;u.fainted=true;});
endBattle('lose');
ok('trial loss pays nothing', state.parts.length===partsN);
ok('and is reported as a failed trial', /TRIAL FAILED/.test(renderResult()));
endTrial();
ok('stage restored after a loss too', state.stage===12);

console.log('\n[37] tribe reputation');
startGame();
ok('six tribes', TRIBE_IDS.length===6);
ok('each element has a tribe', TRIBE_IDS.every(e=>!!ELEM_BEATS[e]));
ok('favour starts at zero', TRIBE_IDS.every(e=>favorOf(e)===0));
ok('champions are registered as species', CHAMPION_IDS.every(id=>!!SPECIES[id]));
ok('champions cannot be caught in the wild', WILD_IDS.every(id=>!isChampionId(id)));
ok('champion is stronger than a starter', SPECIES.pyrelord.base.atk > SPECIES.emberling.base.atk);

/* favour is earned by fighting */
state.roster=[newMonster('emberling',10), newMonster('voltcub',10)];
state.formation.front=[state.roster[0].uid,state.roster[1].uid,null];
state.formation.back=[null,null,null];
state.stage=3; state.intel={history:[],wins:0}; state.trial=null;
B=setupFight(state.roster,3);
B.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
B.elemDamage={fire:400};
endBattle('win');
ok('the tribe you fought with gains favour', favorOf('fire')>0, favorOf('fire'));
ok('favour gain is reported', !!state.lastResult.favorGains.fire);
ok('a deployed but idle tribe gains a token amount', favorOf('volt')>0, favorOf('volt'));
ok('an absent tribe gains nothing', favorOf('nature')===0);
ok('favour is capped', (addFavor('fire',999), favorOf('fire')===FAVOR_MAX));

/* champion unlock */
state.favor={}; addFavor('water', FAVOR_CHAMPION-1);
ok('champion locked just below threshold', !championUnlocked('water'));
addFavor('water',1);
ok('champion unlocks at the threshold', championUnlocked('water'));
const before=state.roster.length;
recruitChampion('water');
ok('champion joins the roster', state.roster.length===before+1);
ok('champion is the right species', state.roster[state.roster.length-1].speciesId==='tidewarden');
recruitChampion('water');
ok('champion can only be called once', state.roster.length===before+1);

/* blessings */
ok('blessing still locked', !blessingUnlocked('water'));
setBlessing('water');
ok('a locked blessing cannot be invoked', activeBlessing()===null);
addFavor('water', FAVOR_BLESSING-FAVOR_CHAMPION);
ok('blessing unlocks', blessingUnlocked('water'));
setBlessing('water');
ok('blessing invoked', activeBlessing()==='water');
addFavor('earth', FAVOR_BLESSING);
setBlessing('earth');
ok('only one blessing at a time', activeBlessing()==='earth');
/* effects */
const PIN={key:'keen'};   // pin the trait: a rolled Stalwart would move the baseline
state.blessing='earth';
B=setupFight([newMonster('emberling',10,1,PIN)],3);
const withB=B.playerUnits[0].bDef;
state.blessing=null;
B=setupFight([newMonster('emberling',10,1,PIN)],3);
ok('earth blessing raises DEF', withB > B.playerUnits[0].bDef, B.playerUnits[0].bDef+' -> '+withB);
state.blessing='fire'; addFavor('fire',FAVOR_BLESSING);
B=setupFight([newMonster('emberling',10,1,PIN)],3);
const atkB=B.playerUnits[0].bAtk;
state.blessing=null;
B=setupFight([newMonster('emberling',10,1,PIN)],3);
ok('fire blessing raises ATK', atkB > B.playerUnits[0].bAtk, B.playerUnits[0].bAtk+' -> '+atkB);
addFavor('water',FAVOR_BLESSING); state.blessing='water';
B=setupFight([newMonster('emberling',10,1,PIN)],3);
ok('water blessing shields the front line', B.playerUnits[0].shield===true);
addFavor('wind',FAVOR_BLESSING); state.blessing='wind';
B=setupFight([newMonster('emberling',10,1,PIN)],3);
ok('wind blessing grants dodge', B.playerUnits[0].dodge>=0.08, B.playerUnits[0].dodge);
addFavor('nature',FAVOR_BLESSING); state.blessing='nature';
B=setupFight([newMonster('emberling',10,1,PIN)],3);
ok('nature blessing grants regen', B.playerUnits[0].regen>=0.02, B.playerUnits[0].regen);
addFavor('volt',FAVOR_BLESSING); state.blessing='volt';
B=setupFight([newMonster('emberling',10,1,PIN)],3);
const g0=B.gauge; chargeGauge(20);
const voltGain=B.gauge-g0;
state.blessing=null;
B=setupFight([newMonster('emberling',10,1,PIN)],3);
const g1=B.gauge; chargeGauge(20);
ok('volt blessing fills the gauge faster', voltGain > (B.gauge-g1), (B.gauge-g1)+' -> '+voltGain);
addFavor('wind',FAVOR_BLESSING); state.blessing='wind';
B=setupFight([newMonster('emberling',10,1,PIN)],3);
applySynergyRefresh();
ok('blessing survives a synergy recompute', B.playerUnits[0].dodge>=0.08);
state.blessing=null;

console.log('\n[38] tribes survive a save cycle');
startGame();
state.slot=0;
addFavor('fire',60); addFavor('volt',FAVOR_BLESSING);
state.blessing='volt'; state.recruited={fire:true};
state.cleared={2:true,5:true};
autosave();
startGame();
continueSlot(0);
ok('favour persists', favorOf('fire')===60 && favorOf('volt')===FAVOR_BLESSING, favorOf('fire'));
ok('blessing persists', activeBlessing()==='volt');
ok('called champions stay called', state.recruited.fire===true);
ok('cleared stages persist', clearedStages().join()==='2,5');
applySave({v:1,name:'x',stage:1,roster:[],formation:{front:[null,null,null],back:[null,null,null]},
  favor:{fire:'lots', volt:-5, notatribe:99, wind:500}, blessing:'notatribe', cleared:{banana:true, 4:true}}, 0);
ok('junk favour values dropped', favorOf('fire')===0 && favorOf('volt')===0);
ok('out-of-range favour clamped', favorOf('wind')===FAVOR_MAX, favorOf('wind'));
ok('unknown tribe ignored', !state.favor.notatribe);
ok('invalid blessing dropped', state.blessing===null);
ok('junk cleared keys dropped', clearedStages().join()==='4');

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
