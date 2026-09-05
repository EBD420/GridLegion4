
(function(){
let B, e;
function fight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null,mons[1]?mons[1].uid:null,null];
  state.formation.back=[mons[2]?mons[2].uid:null,null,null];
  state.stage=stage; state.intel={history:[],wins:0};
  beginBattle(); return state.battle;
}

console.log('\n[50] war journal — starts empty, a stage win writes one entry');
startGame();
ok('journal starts empty', Array.isArray(state.journal) && state.journal.length===0, state.journal);

B = fight([newMonster('emberling',14)], 1);
B.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
endBattle('win');
ok('a stage win writes exactly one entry', state.journal.length===1, state.journal.length);
e = state.journal[0];
ok('the entry is for the right stage', e.stage===1 && e.deep===false, e);
ok('the entry records a win', e.win===true, e);
ok('not a boss entry on a normal stage', e.boss===null, e);
ok('the entry has readable text', typeof e.text==='string' && e.text.length>10, e.text);
ok('the entry has an id and a timestamp', typeof e.id==='string' && typeof e.at==='number', e);

console.log('\n[51] war journal — the recap reflects what actually happened');
startGame();
const m1=newMonster('emberling',14), m2=newMonster('aqualing',14);
B = fight([m1,m2], 1);
const u1 = B.playerUnits.find(u=>u.monsterUid===m1.uid);
const u2 = B.playerUnits.find(u=>u.monsterUid===m2.uid);
B.dmgByUnitId[u1.id] = 500;      // u1 is the clear MVP
B.dmgByUnitId[u2.id] = 40;
B.lastKillId = u2.id;            // but u2 landed the finishing blow
B.lowestSurvivorId = u1.id;
B.lowestSurvivorPct = 0.08;      // u1 nearly fainted along the way
B.rounds = 6;
B.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
endBattle('win');
e = state.journal[0];
ok('the MVP is named', e.text.indexOf(u1.name)>=0, e.text);
ok('the finishing blow is credited to the right unit', e.text.indexOf(u2.name)>=0, e.text);
ok('the close call mentions the percentage', /8%/.test(e.text), e.text);
ok('the round count appears', /6 round/.test(e.text), e.text);

console.log('\n[51b] war journal — a minor scratch is not dressed up as a close call');
startGame();
const m3=newMonster('emberling',14);
B = fight([m3], 1);
const u3 = B.playerUnits.find(u=>u.monsterUid===m3.uid);
B.dmgByUnitId[u3.id] = 50;
B.lowestSurvivorId = u3.id;
B.lowestSurvivorPct = 0.99;   // barely grazed — not a real close call
B.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
endBattle('win');
e = state.journal[0];
ok('a 99% scratch does not get "close call" phrasing', !/inch of fainting|closest call/.test(e.text), e.text);

console.log('\n[52] war journal — boss fights and losses');
startGame();
B = fight([newMonster('emberling',30)], 5);   // stage 5 carries a commander fight
B.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;});
endBattle('win');
e = state.journal[0];
const boss5 = bossForStage(5);
ok('a boss win names the boss', e.boss===boss5.name && e.text.indexOf(boss5.name)>=0, e);

startGame();
B = fight([newMonster('emberling',5)], 1);
B.playerUnits.forEach(u=>{u.hp=0;u.fainted=true;});
endBattle('lose');
e = state.journal[0];
ok('a loss is recorded too', e.win===false, e);
ok('a loss mentions the casualty count', /fainted/.test(e.text), e.text);

console.log('\n[53] war journal — only real stage battles write entries');
startGame();
let before = state.journal.length;
B = fight([newMonster('emberling',10)], 1);
B.playerUnits.forEach(u=>{u.hp=0;u.fainted=true;});
state.raidRun = true;
endBattle('lose');
ok('a raid run does not write an entry', state.journal.length===before, state.journal.length);
state.raidRun = false;

startGame();
before = state.journal.length;
const dm=newMonster('emberling',12);
state.roster=[dm]; state.formation.front=[dm.uid,null,null]; state.formation.back=[null,null,null];
state.duel = { userId:'someone', name:'Rival', formation:{units:[]} };
state.stage=1; state.intel={history:[],wins:0};
beginBattle();
state.battle.enemyUnits.forEach(u=>{u.hp=0; u.fainted=true;});
endBattle('win');
ok('a duel does not write an entry', state.journal.length===before, state.journal.length);
state.duel = null;

startGame();
before = state.journal.length;
fight([newMonster('emberling',10)], 1);
state.trial = { stage:1, mods:[], reward:1 };
endBattle('win');
ok('a trial does not write an entry', state.journal.length===before, state.journal.length);
state.trial = null;

startGame();
before = state.journal.length;
fight([newMonster('emberling',10)], 1);
state.tutorial = { step:0 };
endBattle('win');
ok('the tutorial does not write an entry', state.journal.length===before, state.journal.length);
state.tutorial = null;

console.log('\n[54] war journal — caps at '+JOURNAL_CAP+' and survives a save/load cycle');
startGame(); state.slot=0;
for(let i=0;i<JOURNAL_CAP+5;i++){
  journalAdd({ id:'j'+i, stage:1, deep:false, win:true, boss:null, text:'entry '+i, at:i });
}
ok('the journal is capped', state.journal.length===JOURNAL_CAP, state.journal.length);
ok('the newest entries are the ones kept', state.journal[0].text==='entry '+(JOURNAL_CAP+4), state.journal[0]);

const saved = serializeSave();
ok('the save carries the journal', saved.journal.length===JOURNAL_CAP, saved.journal.length);
startGame();
applySave(saved, 0);
ok('the journal survives a save/load cycle', state.journal.length===JOURNAL_CAP && state.journal[0].text===saved.journal[0].text, state.journal.length);

applySave(Object.assign({}, saved, { journal:[{stage:1,text:'ok one'}, {stage:'bad',text:'bad stage'}, {text:'no stage at all'}, null, 'not an object'] }), 0);
ok('malformed entries are dropped, valid ones kept', state.journal.length===1 && state.journal[0].text==='ok one', state.journal);

applySave(Object.assign({}, saved, { journal:'not-an-array' }), 0);
ok('a malformed journal field does not crash loading', Array.isArray(state.journal) && state.journal.length===0, state.journal);

console.log('\n[55] war journal — the screen and hub render cleanly');
startGame();
const emptyHtml = renderJournal();
ok('empty state renders a hint', /Nothing recorded yet/.test(emptyHtml));
state.journal = [{id:'x',stage:3,deep:false,win:true,boss:null,text:'A clean fight — no close calls.',at:Date.now()}];
const filledHtml = renderJournal();
ok('an entry renders its text', filledHtml.indexOf('A clean fight')>=0);
hubTab='progress';
ok('the hub shows the journal button', renderHub().indexOf('War Journal')>=0);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
