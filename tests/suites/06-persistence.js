
(function(){
console.log('\n[18] save round-trip');
startGame();
state.slot=0; state.profileName='Ironpaw';
state.stage=17; state.bestDepth=7;
state.roster=[newMonster('emberling',9,2,{key:'keen'}), newMonster(hybridIdFor('fire','water'),4,1,{key:'bane',elem:'earth'})];
state.roster[0].parts=['cinderjaw','sparkdrone'];
state.formation.front=[state.roster[0].uid,null,state.roster[1].uid];
state.formation.back=[null,null,null];
state.parts=[{uid:'p1',key:'thornbot'}];
state.intel={history:['fire','water'],wins:9};
state.discovered={[hybridIdFor('fire','water')]:true};
ok('autosave writes', autosave()===true);
const before=JSON.stringify(serializeSave());

startGame();               // wipe everything
ok('state really was reset', state.roster.length===3 && state.stage===1);
ok('slot reloads', !!readSlot(0));
continueSlot(0);
ok('name restored', state.profileName==='Ironpaw');
ok('stage restored', state.stage===17);
ok('best depth restored', state.bestDepth===7);
ok('roster restored', state.roster.length===2, state.roster.length);
ok('levels and tiers restored', state.roster[0].level===9 && state.roster[0].tier===2);
ok('installed parts restored', state.roster[0].parts.join(',')==='cinderjaw,sparkdrone');
ok('traits restored', state.roster[0].trait.key==='keen' && state.roster[1].trait.elem==='earth');
ok('hybrid species survives a reload', isHybridId(state.roster[1].speciesId));
ok('formation slots re-linked', state.formation.front[0]===state.roster[0].uid && state.formation.front[2]===state.roster[1].uid);
ok('inventory restored', state.parts.length===1 && state.parts[0].key==='thornbot');
ok('intel restored', state.intel.history.join()==='fire,water' && state.intel.wins===9);
ok('splice index restored', discoveredCount()===1);
ok('battle state not carried over', state.battle===null);
ok('re-serialising matches', JSON.stringify(serializeSave()).replace(/"savedAt":\d+/,'')===before.replace(/"savedAt":\d+/,''));

console.log('\n[19] hostile and broken saves');
ok('missing slot returns null', readSlot(2)===null);
rawStore()[SAVE_PREFIX+'2']='{not json at all';
ok('unparseable save rejected', readSlot(2)===null);
rawStore()[SAVE_PREFIX+'2']=JSON.stringify({v:1,stage:'banana',roster:[],formation:{front:[],back:[]}});
ok('bad stage rejected', readSlot(2)===null);
rawStore()[SAVE_PREFIX+'2']=JSON.stringify({v:1,stage:3,roster:'nope',formation:{front:[null,null,null],back:[null,null,null]}});
ok('bad roster rejected', readSlot(2)===null);
rawStore()[SAVE_PREFIX+'2']=JSON.stringify({v:1,stage:3,roster:[],formation:null});
ok('missing formation rejected', readSlot(2)===null);

/* tampered but structurally valid data is sanitised, not trusted */
applySave({v:1,name:'   ',stage:9999.7,bestDepth:-4,
  roster:[{speciesId:'nonexistent',level:5},{speciesId:'emberling',level:-3,tier:77,parts:['fake','cinderjaw','cinderjaw','cinderjaw'],trait:{key:'godmode'}}],
  parts:[{uid:'x',key:'bogus'},{uid:'y',key:'thornbot'}],
  intel:{history:['fire','notanelement','water'],wins:'lots'},
  formation:{front:['ghost-uid',null,null],back:[null,null,null]},
  discovered:{notaspecies:true}}, 1);
ok('unknown species dropped', state.roster.length===1, state.roster.length);
ok('impossible tier clamped', state.roster[0].tier===1, state.roster[0].tier);
ok('negative level clamped', state.roster[0].level===1, state.roster[0].level);
ok('unknown parts stripped, slots capped', state.roster[0].parts.length===2, state.roster[0].parts);
ok('unknown trait re-rolled to a real one', !!TRAITS[state.roster[0].trait.key], state.roster[0].trait.key);
ok('bogus inventory parts dropped', state.parts.length===1 && state.parts[0].key==='thornbot');
ok('junk intel elements filtered', state.intel.history.join()==='fire,water', state.intel.history);
ok('non-numeric wins reset', state.intel.wins===0);
ok('dangling formation uid cleared', state.formation.front[0]===null);
ok('unknown hybrid discovery dropped', discoveredCount()===0);
ok('blank name falls back', state.profileName==='Legion', state.profileName);
ok('fractional stage floored', state.stage===9999, state.stage);
ok('negative depth floored to 0', state.bestDepth===0, state.bestDepth);

console.log('\n[20] transfer codes');
startGame();
state.slot=0; state.profileName='Deep Runners'; state.stage=23; state.bestDepth=13;
state.roster=[newMonster('voltcub',7,1,{key:'swift'})];
state.formation.front=[state.roster[0].uid,null,null];
const code=exportCode();
ok('code is produced', typeof code==='string' && code.length>20);
ok('code is plain text, safely pasteable', /^[A-Za-z0-9+/=]+$/.test(code));
const decoded=decodeCode(code);
ok('code decodes to a valid save', !!decoded && decoded.stage===23);
ok('whitespace in a pasted code is tolerated', !!decodeCode('  '+code.slice(0,10)+'\n'+code.slice(10)+'  '));
ok('garbage code rejected', decodeCode('total nonsense !!')===null);
ok('truncated code rejected', decodeCode(code.slice(0, Math.floor(code.length/2)))===null);
ok('empty code rejected', decodeCode('')===null);
/* restore it into a fresh browser */
startGame();
Object.keys(rawStore()).forEach(k=>delete rawStore()[k]);
setInput('impcode', code);
importIntoSlot();
ok('imported legion is playable', state.profileName==='Deep Runners' && state.stage===23);
ok('import claimed an empty slot', state.slot===0 && !!readSlot(0));

console.log('\n[21] storage-denied browsers');
blockStorage(true);
_storageOK=null;
ok('storage probe detects the block', hasStorage()===false);
ok('reading a slot degrades quietly', readSlot(0)===null);
ok('writing degrades quietly', writeSlot(0,{a:1})===false);
ok('autosave reports failure without throwing', autosave()===false);
startGame();
state.slot=0;
manualSave();
ok('manual save marks itself unsaved', state.saveState==='unsaved');
ok('status text warns the player', /could not write/i.test(saveStatusText()), saveStatusText());
ok('profiles screen still renders', /LEGIONS/.test(renderProfiles()));
ok('and explains the block', /not letting the game store/i.test(renderProfiles()));
ok('transfer codes still work with no storage', typeof exportCode()==='string');
/* the game itself must stay fully playable */
state.roster=[newMonster('emberling',5)];
state.formation.front=[state.roster[0].uid,null,null]; state.formation.back=[null,null,null];
state.intel={history:[],wins:0}; state.stage=1;
beginBattle();
ok('battles still start with saving denied', !!state.battle && state.battle.playerUnits.length===1);
blockStorage(false); _storageOK=null;

console.log('\n[22] slot isolation');
startGame();
Object.keys(rawStore()).forEach(k=>delete rawStore()[k]);
state.slot=0; state.profileName='Alpha'; state.stage=4; autosave();
startGame();
state.slot=1; state.profileName='Beta'; state.stage=12; autosave();
ok('two legions coexist', readSlot(0).name==='Alpha' && readSlot(1).name==='Beta');
continueSlot(0);
ok('loading slot 0 gets Alpha', state.profileName==='Alpha' && state.stage===4);
wipeSlot(1); wipeSlot(1);
ok('delete needs confirming, then clears', readSlot(1)===null);
ok('deleting one leaves the other', !!readSlot(0));
newSlot(2);
ok('new legion starts fresh', state.stage===1 && state.roster.length===3 && state.slot===2);
ok('and is written immediately', !!readSlot(2));
setInput('pname','Rustbreakers');
newSlot(1);
ok('typed name is used', state.profileName==='Rustbreakers', state.profileName);

})();
