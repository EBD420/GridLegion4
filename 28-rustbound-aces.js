
(function(){
function setupFight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.intel={history:[],wins:0}; state.stage=stage;
  beginBattle(); return state.battle;
}

console.log('\n[139] the constants are sane and the title pool is real');
ok('minimum stage, chance and multipliers are all sane', ACE_MIN_STAGE>=1 && ACE_CHANCE>0 && ACE_CHANCE<1 &&
   ACE_MULT.hp>1 && ACE_MULT.atk>1 && ACE_MULT.def>1 && ACE_MULT.spd>=1, ACE_MULT);
ok('a real pool of titles exists to name one', Array.isArray(ACE_TITLES) && ACE_TITLES.length>=5, ACE_TITLES);

console.log('\n[140] applyAceRoll: gated correctly, deterministic once forced');
const realRandom = Math.random;

Math.random = () => 0;   // would trigger every time if nothing else gated it
let units = [ Object.assign(baseUnitDefaults(), {id:'x1', name:'Scraphound', bHp:100,bAtk:20,bDef:10,bSpd:8, maxHp:100,hp:100,atk:20,def:10,spd:8}),
              Object.assign(baseUnitDefaults(), {id:'x2', name:'Scraphound', bHp:100,bAtk:20,bDef:10,bSpd:8, maxHp:100,hp:100,atk:20,def:10,spd:8}) ];
applyAceRoll(units, ACE_MIN_STAGE-1);
ok('below the minimum stage, no Ace ever appears', units.every(u=>!u.isAce));

applyAceRoll(units, 15);   // depth 5 of the Deep — an elite wave
ok('an already-elite wave never also rolls an Ace on top of it', units.every(u=>!u.isAce));

applyAceRoll([units[0]], ACE_MIN_STAGE);
ok('a lone unit is never turned into an embedded Ace — nothing to embed it among', !units[0].isAce);

applyAceRoll(units, ACE_MIN_STAGE);
ok('an eligible wave with the roll forced through does produce exactly one Ace', units.filter(u=>u.isAce).length===1, units);
const picked = units.find(u=>u.isAce), plain = units.find(u=>!u.isAce);
ok('the Ace is the deterministically-picked unit (index 0, since Math.random is forced to 0)', picked===units[0]);
ok('its name is prefixed with a title from the pool', ACE_TITLES.some(t=>picked.name===t+' Scraphound'), picked.name);
ok('its squadmate is completely untouched', plain.bHp===100 && plain.bAtk===20 && plain.bDef===10 && plain.bSpd===8 && !plain.name.includes(' '));
ok('HP scales by the documented multiplier', picked.bHp===Math.round(100*ACE_MULT.hp) && picked.maxHp===picked.bHp, picked.bHp);
ok('ATK scales by the documented multiplier', picked.bAtk===Math.round(20*ACE_MULT.atk) && picked.atk===picked.bAtk);
ok('DEF scales by the documented multiplier', picked.bDef===Math.round(10*ACE_MULT.def) && picked.def===picked.bDef);
ok('SPD scales by the documented multiplier', picked.bSpd===Math.round(8*ACE_MULT.spd) && picked.spd===picked.bSpd);

Math.random = () => 0.99;   // above ACE_CHANCE — never triggers
units = [ Object.assign(baseUnitDefaults(), {id:'y1', name:'Sparkdrone', bHp:50,bAtk:10,bDef:5,bSpd:5, maxHp:50,hp:50,atk:10,def:5,spd:5}),
          Object.assign(baseUnitDefaults(), {id:'y2', name:'Sparkdrone', bHp:50,bAtk:10,bDef:5,bSpd:5, maxHp:50,hp:50,atk:10,def:5,spd:5}) ];
applyAceRoll(units, ACE_MIN_STAGE);
ok('a high roll against ACE_CHANCE produces no Ace at all', units.every(u=>!u.isAce));
Math.random = realRandom;

console.log('\n[141] buildEnemyUnits() wires the roll in for real waves only');
startGame();
Math.random = () => 0;
let B = setupFight([newMonster('emberling',10)], ACE_MIN_STAGE);
ok('a real, forced-triggered wave embeds exactly one Ace among ordinary squadmates',
   B.enemyUnits.filter(u=>u.isAce).length===1 && B.enemyUnits.length>1, B.enemyUnits.map(u=>[u.name,!!u.isAce]));
Math.random = realRandom;

startGame();
Math.random = () => 0;
B = setupFight([newMonster('emberling',10)], 1);   // below ACE_MIN_STAGE
ok('the very first stages stay calm even with the roll forced through', B.enemyUnits.every(u=>!u.isAce));
Math.random = realRandom;

console.log('\n[142] grantAceDrop / onEnemyFainted: guaranteed once, uniquely marked, capped by the same 14-slot bay as anything else');
startGame();
Math.random = () => 0.99;   // guarantee this wave rolls no Ace of its own — this test is about an ORDINARY kill
B = setupFight([newMonster('emberling',30)], 3);
Math.random = realRandom;
let atk = B.playerUnits[0], plainEnemy = B.enemyUnits[0];
ok('sanity: this wave really did not roll an Ace on its own', !plainEnemy.isAce);
plainEnemy.dodge=0; atk.missChance=0; plainEnemy.shield=false; plainEnemy.firstHitReduction=false; plainEnemy.hp=1;
state.parts = [];
applyDamage(atk, plainEnemy, false);
ok('killing an ordinary enemy grants no bonus drop', plainEnemy.fainted===true && state.parts.length===0, state.parts);

startGame();
B = setupFight([newMonster('emberling',30)], 3);
atk = B.playerUnits[0];
const ace = B.enemyUnits[0];
ace.isAce = true; ace.name = 'Ironclad ' + ace.name;
ace.dodge=0; atk.missChance=0; ace.shield=false; ace.firstHitReduction=false; ace.hp=1;
state.parts = [];
applyDamage(atk, ace, false);
ok('killing an Ace guarantees exactly one drop', ace.fainted===true && state.parts.length===1, state.parts);
ok('the drop is keyed to the Ace\'s own species, suffixed with _ace', state.parts[0].key===ace.speciesKey+ACE_SUFFIX, [state.parts[0], ace.speciesKey]);
const raw = PARTS[ace.speciesKey], info = partInfo(state.parts[0].key);
ok('partInfo resolves it distinctly (Ace-Marked) but with identical stats to the raw part — no power creep',
   info.ace===true && !info.forged && info.name==='Ace-Marked '+raw.name && info.pct===raw.pct && info.corruption===raw.corruption, info);

grantAceDrop(ace);
ok('a second call for the same fallen Ace grants nothing further (the aceLootGiven guard)', state.parts.length===1);

startGame();
B = setupFight([newMonster('emberling',30)], 3);
const ace2 = B.enemyUnits[0];
ace2.isAce = true;
state.parts = Array.from({length:14}, (_,i)=>({uid:'full'+i, key:'scraphound'}));
grantAceDrop(ace2);
ok('a full salvage bay quietly denies the guaranteed drop rather than special-casing past the cap', state.parts.length===14);
ok('and it still logs something rather than failing silently', state.battle.log.some(l=>/salvage bay is full/i.test(l)), state.battle.log);

console.log('\n[143] onEnemyFainted covers every enemy-fainting site, not just a direct hit');
startGame();
B = setupFight([newMonster('emberling',30)], 3);
const burnAce = B.enemyUnits[0];
burnAce.isAce = true; burnAce.name = 'Voltbound ' + burnAce.name;
burnAce.maxHp = 20; burnAce.hp = 1;
burnAce.status = { type:'burn', turnsLeft:1 };
state.parts = [];
tickStatusStart(burnAce);
ok('a burn-tick kill on an Ace is just as guaranteed as a direct hit', burnAce.fainted===true && state.parts.length===1 &&
   state.parts[0].key===burnAce.speciesKey+ACE_SUFFIX, state.parts);

console.log('\n[144] partInfo/baseKeyOf: forged and Ace suffixes resolve independently and correctly');
const anyPart = Object.keys(PARTS)[0];
ok('baseKeyOf strips a forged suffix', baseKeyOf(anyPart+'_forged')===anyPart);
ok('baseKeyOf strips an Ace suffix', baseKeyOf(anyPart+ACE_SUFFIX)===anyPart);
ok('baseKeyOf leaves a raw key alone', baseKeyOf(anyPart)===anyPart);
ok('isForgedKey/isAceKey are mutually exclusive and correctly identify their own suffix',
   isForgedKey(anyPart+'_forged') && !isAceKey(anyPart+'_forged') && isAceKey(anyPart+ACE_SUFFIX) && !isForgedKey(anyPart+ACE_SUFFIX));
ok('an unknown base key resolves to null, suffix or not', partInfo('not-a-real-part'+ACE_SUFFIX)===null);

console.log('\n[145] visible in battle and in the salvage bay');
startGame();
Math.random = () => 0;
B = setupFight([newMonster('emberling',10)], ACE_MIN_STAGE);
Math.random = realRandom;
let battleHtml = renderBattle();
ok('the Ace tag renders in battle', battleHtml.indexOf('⭐ ACE')>=0, battleHtml.indexOf('⭐ ACE'));
ok('the Ace renders at the same larger size as a boss sprite (width 48 vs the usual 36)', battleHtml.indexOf('width="48"')>=0);

startGame();
const mon = newMonster('emberling',10);
const acePartKey = Object.keys(PARTS)[0] + ACE_SUFFIX;
mon.parts = [acePartKey];
state.roster = [mon];
state.parts = [{uid:'aceuid1', key:acePartKey}];
const salvageHtml = renderSalvage();
ok('an Ace-Marked part shows its star badge and name in the salvage bay list', salvageHtml.indexOf('⭐')>=0 && salvageHtml.indexOf('Ace-Marked')>=0);
ok('the same part equipped on a monster shows its star badge in the slot chip', /⭐[^<]*✖/.test(salvageHtml), salvageHtml);
codexSee('parts', baseKeyOf(acePartKey));
ok('installing it unlocks the base part type for the Legion Identity banner too (baseKeyOf reuse)',
   unlockedPartKeys().indexOf(baseKeyOf(acePartKey))>=0, unlockedPartKeys());

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
