
(function(){
function setupFight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.intel={history:[],wins:0}; state.stage=stage;
  beginBattle(); return state.battle;
}
function forceWin(){
  const b = state.battle;
  b.enemyUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
  return checkBattleEnd();
}
function forceLose(){
  const b = state.battle;
  b.playerUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
  return checkBattleEnd();
}
const NO_ATK_TRAIT = { key:'resilient' };   // pins out the random trait roll, same trick 20-mentor-bonds.js uses

console.log('\n[132] pair-key canonicalization and the constants');
ok('the threshold and bonus constants are sane', BOND_FORGE_THRESHOLD>0 && BOND_FORGE_ATK_BONUS>0 && BOND_FORGE_DEF_BONUS>0);
ok('bondPairKey is order-independent', bondPairKey('aqualing','emberling')===bondPairKey('emberling','aqualing'));
ok('bondPairKey is canonically sorted (a before e... alphabetically)', bondPairKey('emberling','aqualing')==='aqualing|emberling');
startGame();
ok('a fresh legion starts with no bond history', Object.keys(state.bondCounts).length===0, state.bondCounts);
ok('bondCountFor is 0 for an untracked pair', bondCountFor('emberling','aqualing')===0);

console.log('\n[133] recordBattleBonds: every pair of survivors, once per call, never the fainted');
startGame();
state.bondCounts = {};
const uA = {speciesId:'emberling'}, uB = {speciesId:'aqualing'}, uC = {speciesId:'terrafang'};
recordBattleBonds([uA, uB, uC]);
ok('all three pairs from a 3-survivor win are recorded', bondCountFor('emberling','aqualing')===1 && bondCountFor('emberling','terrafang')===1 && bondCountFor('aqualing','terrafang')===1,
   state.bondCounts);
recordBattleBonds([uA, uB, uC]);
ok('fighting together again increments, does not reset', bondCountFor('emberling','aqualing')===2);
recordBattleBonds([uA]);
ok('a lone survivor forms no new pairs', bondCountFor('emberling','aqualing')===2);
recordBattleBonds([]);
ok('an empty survivor list is a safe no-op', bondCountFor('emberling','aqualing')===2);
recordBattleBonds([uA, {noSpeciesId:true}, uB]);
ok('a unit missing speciesId is skipped defensively, not crashed on', bondCountFor('emberling','aqualing')===3);

console.log('\n[134] applyBattleBonds: gated strictly on the threshold, only the bonded pair is touched');
startGame();
state.bondCounts = {};
let units = [
  Object.assign(baseUnitDefaults(), {id:'u1', speciesId:'emberling', bAtk:100, bDef:50}),
  Object.assign(baseUnitDefaults(), {id:'u2', speciesId:'aqualing',  bAtk:100, bDef:50}),
  Object.assign(baseUnitDefaults(), {id:'u3', speciesId:'terrafang', bAtk:100, bDef:50}),
];
applyBattleBonds(units);
ok('below the threshold, nobody is bonded', units.every(u=>!u.battleBond) && units.every(u=>u.bAtk===100 && u.bDef===50), units);

state.bondCounts[bondPairKey('emberling','aqualing')] = BOND_FORGE_THRESHOLD - 1;
units = [
  Object.assign(baseUnitDefaults(), {id:'u1', speciesId:'emberling', bAtk:100, bDef:50}),
  Object.assign(baseUnitDefaults(), {id:'u2', speciesId:'aqualing',  bAtk:100, bDef:50}),
];
applyBattleBonds(units);
ok('one battle short of the threshold: still no bond', units.every(u=>!u.battleBond && u.bAtk===100));

state.bondCounts[bondPairKey('emberling','aqualing')] = BOND_FORGE_THRESHOLD;
units = [
  Object.assign(baseUnitDefaults(), {id:'u1', speciesId:'emberling', bAtk:100, bDef:50}),
  Object.assign(baseUnitDefaults(), {id:'u2', speciesId:'aqualing',  bAtk:100, bDef:50}),
  Object.assign(baseUnitDefaults(), {id:'u3', speciesId:'terrafang', bAtk:100, bDef:50}),
];
applyBattleBonds(units);
const [e1,a1,t1] = units;
ok('at the threshold, exactly the forged pair is flagged', e1.battleBond===true && a1.battleBond===true && !t1.battleBond);
ok('the documented +4% ATK is applied to both halves', e1.bAtk===Math.round(100*(1+BOND_FORGE_ATK_BONUS)) && a1.bAtk===Math.round(100*(1+BOND_FORGE_ATK_BONUS)),
   [e1.bAtk, a1.bAtk]);
ok('the documented +4% DEF is applied to both halves', e1.bDef===Math.round(50*(1+BOND_FORGE_DEF_BONUS)) && a1.bDef===Math.round(50*(1+BOND_FORGE_DEF_BONUS)));
ok('the third, unpaired unit is left completely untouched', t1.bAtk===100 && t1.bDef===50);

console.log('\n[135] full buildPlayerUnits()/beginBattle() integration — bonus is baked in before synergy runs, like the mentor buff');
startGame();
const solo = newMonster('terrafang', 20, 1, NO_ATK_TRAIT);
state.roster=[solo]; state.formation.front=[solo.uid,null,null]; state.formation.back=[null,null,null];
state.intel={history:[],wins:0}; state.stage=2; beginBattle();
const baselineAtk = state.battle.playerUnits[0].bAtk, baselineDef = state.battle.playerUnits[0].bDef;

startGame();
state.bondCounts = {};
state.bondCounts[bondPairKey('emberling','terrafang')] = BOND_FORGE_THRESHOLD;
let B = setupFight([newMonster('emberling',20,1,NO_ATK_TRAIT), newMonster('terrafang',20,1,NO_ATK_TRAIT)], 2);
ok('speciesId rides along on every player unit', B.playerUnits.every(u=>!!u.speciesId), B.playerUnits.map(u=>u.speciesId));
const forgedPair = B.playerUnits.filter(u=>u.battleBond);
ok('a preseeded pair goes live the moment they are deployed together', forgedPair.length===2, B.playerUnits);
ok('the terrafang half hits harder than the same monster solo, by the documented bonus',
   B.playerUnits.find(u=>u.speciesId==='terrafang').bAtk === Math.round(baselineAtk*(1+BOND_FORGE_ATK_BONUS)),
   [B.playerUnits.find(u=>u.speciesId==='terrafang').bAtk, baselineAtk]);
ok('and takes less damage too', B.playerUnits.find(u=>u.speciesId==='terrafang').bDef === Math.round(baselineDef*(1+BOND_FORGE_DEF_BONUS)));

startGame();
state.bondCounts = {};
B = setupFight([newMonster('emberling',20,1,NO_ATK_TRAIT), newMonster('terrafang',20,1,NO_ATK_TRAIT)], 2);
ok('with no history at all, nobody is bonded and nobody is boosted', !B.playerUnits.some(u=>u.battleBond) && B.playerUnits.find(u=>u.speciesId==='terrafang').bAtk===baselineAtk);

console.log('\n[136] a real win records it; a loss never can (checkBattleEnd makes it structurally impossible)');
startGame();
state.bondCounts = {};
B = setupFight([newMonster('emberling',10), newMonster('aqualing',10)], 2);
ok('no history yet for this pair', bondCountFor('emberling','aqualing')===0);
forceWin();
ok('a won fight with both units still standing records the pair once', bondCountFor('emberling','aqualing')===1);

startGame();
state.bondCounts = {};
B = setupFight([newMonster('emberling',10), newMonster('aqualing',10)], 2);
forceLose();
ok('a lost fight — where every player unit is by definition fainted — records nothing',
   bondCountFor('emberling','aqualing')===0, state.bondCounts);

startGame();
state.bondCounts = {};
B = setupFight([newMonster('emberling',10), newMonster('aqualing',10), newMonster('terrafang',10)], 2);
B.playerUnits[0].hp = 0; B.playerUnits[0].fainted = true;   // one casualty, two survivors
forceWin();
ok('a partial win only pairs the units that actually survived to see it',
   bondCountFor('aqualing','terrafang')===1 && bondCountFor('emberling','aqualing')===0 && bondCountFor('emberling','terrafang')===0,
   state.bondCounts);

console.log('\n[137] persistence: saved, sanitized on load, and survives a Rebirth on purpose');
startGame();
state.bondCounts = { 'aqualing|emberling': 6, 'galekit|terrafang': 2 };
const saved = serializeSave();
ok('bondCounts rides along in the save', JSON.stringify(saved.bondCounts)===JSON.stringify(state.bondCounts));

applySave(saved, 0);
ok('a clean save round-trips exactly', bondCountFor('aqualing','emberling')===6 && bondCountFor('galekit','terrafang')===2);

applySave(Object.assign({}, saved, { bondCounts: {
  'aqualing|emberling': 6,             // valid — kept
  'emberling|aqualing': 4,             // wrong order (not canonical) — dropped
  'aqualing|nosuchspecies': 3,         // unknown species — dropped
  'terrafang|terrafang': 5,            // same species twice is legitimate (two individuals) — kept
  'galekit|voltcub': 0,                // non-positive — dropped
  'galekit|mossling': 'lots',          // non-numeric — dropped
  'aqualing|terrafang': 50000,         // absurd value — clamped, not dropped
} }), 0);
ok('a malformed save keeps only the well-formed entries', Object.keys(state.bondCounts).sort().join(',')==='aqualing|emberling,aqualing|terrafang,terrafang|terrafang',
   state.bondCounts);
ok('the surviving valid entry keeps its real value', bondCountFor('aqualing','emberling')===6);
ok('a same-species pair is valid (two individuals of one species)', bondCountFor('terrafang','terrafang')===5);
ok('an oversized value is clamped rather than trusted outright', bondCountFor('aqualing','terrafang')===999);

applySave(Object.assign({}, saved, { bondCounts: 'not-an-object' }), 0);
ok('a non-object bondCounts in the save file degrades to empty, not a crash', Object.keys(state.bondCounts).length===0);

startGame();
state.stage = REBIRTH_MIN_STAGE + 2;
state.bondCounts = { 'aqualing|emberling': 9 };
doRebirth();   // arm
doRebirth();   // confirm
ok('Battle-Forged Bonds survive a Rebirth on purpose — collected history, not the grind', bondCountFor('aqualing','emberling')===9);

startGame();
ok('but a genuinely fresh legion (initGame via startGame) starts clean', Object.keys(state.bondCounts).length===0);

console.log('\n[138] visible on the battlefield, quietly — only once a bond is actually live');
startGame();
state.bondCounts = {};
state.bondCounts[bondPairKey('emberling','aqualing')] = BOND_FORGE_THRESHOLD;
setupFight([newMonster('emberling',10,1,NO_ATK_TRAIT), newMonster('aqualing',10,1,NO_ATK_TRAIT)], 2);
ok('a live bond shows its badge in battle', renderBattle().indexOf('🔗')>=0);

startGame();
state.bondCounts = {};
setupFight([newMonster('emberling',10,1,NO_ATK_TRAIT), newMonster('aqualing',10,1,NO_ATK_TRAIT)], 2);
ok('no history at all means no badge — quiet by design, no partial-progress clutter', renderBattle().indexOf('🔗')<0);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
