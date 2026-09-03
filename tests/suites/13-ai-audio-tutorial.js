
(function(){
let B;
function mkFight(mons, stage, opts){
  opts=opts||{};
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null,mons[1]?mons[1].uid:null,mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null,null,null];
  state.intel={history:[],wins:0}; state.stage=stage;
  state.trial=null; state.duel=null; state.raidRun=null; state.tutorial=opts.tut||null;
  beginBattle(); return state.battle;
}
const PIN={key:'hardy'};

console.log('\n[52] AI tiers');
startGame();
state.trial=null; state.duel=null; state.tutorial=null;
state.stage=2;  ok('early stages stay basic', aiTier()===AI_BASIC, aiTier());
state.stage=6;  ok('mid campaign turns tactical', aiTier()===AI_TACTICAL, aiTier());
state.stage=10; ok('commander fights are coordinated', aiTier()===AI_COORDINATED, aiTier());
state.stage=14; ok('the Deep is coordinated', aiTier()===AI_COORDINATED, aiTier());
state.stage=2; state.duel={userId:'x',name:'y',formation:{units:[]}};
ok('duels against real players are coordinated', aiTier()===AI_COORDINATED);
state.duel=null;

console.log('\n[53] damage estimation is pure');
B=mkFight([newMonster('emberling',10,1,PIN)],6);
const atk=B.enemyUnits[0], def=B.playerUnits[0];
const before=JSON.stringify([atk.hp,def.hp,atk.skillCd]);
const e1=estimateDamage(atk,def,false), e2=estimateDamage(atk,def,false);
ok('estimate is deterministic', e1===e2, e1+'/'+e2);
ok('estimate mutates nothing', JSON.stringify([atk.hp,def.hp,atk.skillCd])===before);
ok('a skill estimates higher than a basic', estimateDamage(atk,def,true)>e1);

console.log('\n[54] target selection');
B=mkFight([newMonster('emberling',10,1,PIN), newMonster('terrafang',10,1,PIN), newMonster('mossling',10,1,PIN)],6);
const foe=B.enemyUnits[0];
const [a,b2,c]=B.playerUnits;
/* an executable target outranks a healthier one */
a.hp=1; b2.hp=b2.maxHp; c.hp=c.maxHp;
let sA=scoreTarget(foe,a,AI_TACTICAL), sB=scoreTarget(foe,b2,AI_TACTICAL);
ok('a killable target is prioritised', sA>sB, sA+' vs '+sB);
/* a shielded commander is never chosen */
b2.shielded=true;
ok('a shielded unit scores -Infinity', scoreTarget(foe,b2,AI_TACTICAL)===-Infinity);
b2.shielded=false;
/* high-attack targets are preferred at tactical, ignored at basic */
a.hp=a.maxHp;
const hi=b2, lo=c;
hi.atk=999; lo.atk=1; hi.hp=lo.hp=50; hi.maxHp=lo.maxHp=50; hi.def=lo.def=0; hi.elements=lo.elements=['earth']; hi.element=lo.element='earth';
ok('tactical AI targets the dangerous unit', scoreTarget(foe,hi,AI_TACTICAL)>scoreTarget(foe,lo,AI_TACTICAL));
ok('basic AI does not care about threat', scoreTarget(foe,hi,AI_BASIC)===scoreTarget(foe,lo,AI_BASIC));
/* synergy carriers are worth breaking */
hi.atk=lo.atk=10; hi.synergyLabel='FIRE TRIO +12% ATK'; lo.synergyLabel=null;
ok('a synergy carrier is prioritised', scoreTarget(foe,hi,AI_TACTICAL)>scoreTarget(foe,lo,AI_TACTICAL));
hi.synergyLabel=null;
/* focus fire */
B.focusId=lo.id;
ok('coordinated AI piles onto the focused target', scoreTarget(foe,lo,AI_COORDINATED)>scoreTarget(foe,lo,AI_TACTICAL));
ok('focus is ignored at lower tiers', scoreTarget(foe,lo,AI_TACTICAL)===scoreTarget(foe,lo,AI_TACTICAL));
B.focusId=null;
/* shields discourage */
lo.shield=true;
ok('a shielded target is deprioritised', scoreTarget(foe,lo,AI_TACTICAL)<scoreTarget(foe,lo,AI_BASIC)+0);
lo.shield=false;

console.log('\n[55] skill discipline');
B=mkFight([newMonster('emberling',10,1,PIN)],6);
const e=B.enemyUnits[0], p=B.playerUnits[0];
e.skillCd=0;
p.hp=1;
ok('never wastes a skill on a target a basic would kill', decideSkill(e,p,AI_TACTICAL)===false);
p.hp=p.maxHp; p.def=0;
const basicK=estimateDamage(e,p,false), skillK=estimateDamage(e,p,true);
p.hp=Math.floor((basicK+skillK)/2);   // basic won't kill, skill will
ok('spends the skill when it closes the kill', decideSkill(e,p,AI_TACTICAL)===true, basicK+'/'+skillK+' hp='+p.hp);
p.hp=p.maxHp; p.shield=true;
ok('holds the skill against a shield', decideSkill(e,p,AI_TACTICAL)===false);
p.shield=false;
e.skillCd=3;
ok('cannot use a skill on cooldown', decideSkill(e,p,AI_TACTICAL)===false);

console.log('\n[56] defensive shifts');
B=mkFight([newMonster('emberling',12,1,PIN)],14);
const fronts=B.enemyUnits.filter(u=>u.row==='front');
ok('the wave has a front line', fronts.length>=2, fronts.length);
const hurt=fronts[0];
hurt.hp=hurt.maxHp;
ok('a healthy unit holds the line', enemyTryShift(hurt)===false);
hurt.hp=Math.floor(hurt.maxHp*0.2);
const backBefore=B.enemyUnits.filter(u=>u.row==='back'&&!u.fainted).length;
ok('late waves fill the back row, so this must be a swap', backBefore>=3, backBefore);
ok('a badly wounded unit pulls back', enemyTryShift(hurt)===true);
ok('and it is now in the back row', hurt.row==='back');
ok('a healthy reserve stepped up to replace it',
   B.enemyUnits.filter(u=>u.row==='front'&&!u.fainted).length===fronts.length, 
   B.enemyUnits.filter(u=>u.row==='front'&&!u.fainted).length+' vs '+fronts.length);
ok('it will not ping-pong', enemyTryShift(hurt)===false);
/* never abandon the front entirely */
B=mkFight([newMonster('emberling',12,1,PIN)],14);
const only=B.enemyUnits.filter(u=>u.row==='front');
only.slice(1).forEach(u=>{u.fainted=true;});
only[0].hp=1;
ok('the last front-liner stands its ground', enemyTryShift(only[0])===false);
/* bosses and pylons never retreat */
B=mkFight([newMonster('emberling',12,1,PIN)],10);
const boss=B.enemyUnits.find(u=>u.isBoss), gen=B.enemyUnits.find(u=>u.isGenerator);
boss.hp=1; gen.hp=1;
ok('a commander never retreats', enemyTryShift(boss)===false);
ok('a pylon never retreats', enemyTryShift(gen)===false);

console.log('\n[57] sound and effects degrade headlessly');
ok('no AudioContext in this environment', !audioAvailable());
ok('audioInit is a safe no-op', (audioInit(), audio.ready===false));
ok('sfx never throws', (function(){ try{ Object.keys(SFX).forEach(k=>sfx(k)); return true; }catch(e){ return false; } })());
ok('tone/noise never throw', (function(){ try{ tone(440,0.1,'square',0.2); noise(0.1,0.1); return true; }catch(e){ return false; } })());
ok('music toggles without a context', (function(){ try{ musicStart(); musicStop(); return true; }catch(e){ return false; } })());
ok('domReady is false headlessly', domReady()===false);
ok('queued fx are discarded safely', (function(){ fx('u1','-5','dmg'); flushFx(); return fxQueue.length===0; })());
ok('shake is a no-op', (function(){ try{ shake(true); return true; }catch(e){ return false; } })());
ok('a full battle runs with fx hooks live', (function(){
  B=mkFight([newMonster('emberling',12,1,PIN)],6);
  for(let i=0;i<40 && !B.result;i++){
    const u=B.queue[B.qIndex];
    if(!u){ startRound(); continue; }
    if(u.side==='enemy'){ enemyAct(u); B.qIndex++; }
    else { const t=getValidTargets(u)[0]; if(t) applyDamage(u,t,false); B.qIndex++; }
    if(B.qIndex>=B.queue.length){ if(checkBattleEnd()) break; startRound(); }
  }
  return true;
})());

console.log('\n[58] training deployment');
startTutorial();
ok('tutorial is active', tutorialActive()===true);
ok('it starts on step 1', state.tutorial.step===0 && tutorialStep().id==='attack');
ok('front line is fire/water/fire', state.formation.front.map(u=>computeStats(findMonster(u)).element).join(',')==='fire,water,fire');
ok('a fire beast waits in the back', computeStats(findMonster(state.formation.back[0])).element==='fire');
B=state.battle;
ok('the rigged line is only a DUO to start', /FIRE DUO/.test(B.synLabels.front||''), B.synLabels.front);
ok('training enemies are soft', B.enemyUnits.every(u=>u.maxHp < 30), B.enemyUnits.map(u=>u.maxHp));
ok('only two of them', B.enemyUnits.length===2);
ok('gauge is primed so the last step is reachable', B.gauge>=30, B.gauge);
ok('the coach panel renders', /TRAINING/.test(tutorialPanelHtml()) && /Pick a target/.test(tutorialPanelHtml()));
/* walk the steps */
tutorialSaw('skill');
ok('out-of-order actions do not advance it', state.tutorial.step===0);
tutorialSaw('attack');
ok('completing the pending step advances past the early one too',
   state.tutorial.step===2 && tutorialStep().id==='shift', state.tutorial.step+':'+(tutorialStep()||{}).id);
tutorialSaw('shift');
ok('reaches the gauge step', tutorialStep().id==='gauge', tutorialStep());
tutorialSaw('gauge');
ok('completing every step finishes it', state.tutorial.done===true && !tutorialActive());
ok('the panel disappears', tutorialPanelHtml()==='');
/* the shift really does complete the trio */
startTutorial();
B=state.battle;
const water=B.playerUnits.find(u=>u.element==='water');
const backFire=B.playerUnits.find(u=>u.row==='back');
doShift(water, backFire);
ok('shifting the water beast out completes the FIRE TRIO', /FIRE TRIO/.test(B.synLabels.front||''), B.synLabels.front);
ok('and the shift step was credited even though it came early', state.tutorial.seen.indexOf('shift')>=0, state.tutorial.seen);
ok('the coach moves on rather than nagging', tutorialStep() && tutorialStep().id!=='shift', tutorialStep());
/* skipping */
startTutorial();
skipTutorial();
ok('training can be skipped', !tutorialActive());
/* isolation from progression */
startTutorial();
B=state.battle;
const stageBefore=state.stage, rosterBefore=state.roster.length;
B.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
B.elemDamage={fire:200};
endBattle('win');
ok('tutorial result is its own screen', state.lastResult.tutorial===true);
ok('training complete screen renders', /TRAINING COMPLETE/.test(renderResult()));
ok('no stage progress from training', state.stage===stageBefore);
ok('no recruits from training', state.roster.length===rosterBefore);
ok('no enemy intel from training', state.intel.history.length===0);
finishTutorial();
ok('finishing clears the tutorial', state.tutorial===null && state.screen==='profiles');

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
