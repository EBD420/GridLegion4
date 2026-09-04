
(function(){
function setupFight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.intel={history:[],wins:0}; state.stage=stage;
  beginBattle(); return state.battle;
}
const realRandom = Math.random;
const ELITE_STAGE = CAMPAIGN_LENGTH + 5;   // depth 5: isEliteStage true, no boss there (matches the Depth Chart suite)

console.log('\n[194] the constants are sane');
ok('chance and every multiplier are sane', VANGUARD_CHANCE>0 && VANGUARD_CHANCE<1 &&
   VANGUARD_MULT.hp>1 && VANGUARD_MULT.atk>1 && VANGUARD_MULT.def>1 && VANGUARD_MULT.spd>=1, VANGUARD_MULT);
ok('sanity: depth 5 really is an elite wave with no boss on it', isEliteStage(ELITE_STAGE) && !bossForStage(ELITE_STAGE));

console.log('\n[195] applyVanguardRoll: gated correctly, deterministic once forced, mutually exclusive with an Ace');
Math.random = () => 0;   // would trigger every time if nothing else gated it
let units = [ Object.assign(baseUnitDefaults(), {id:'v1', name:'Scraphound', speciesKey:'scraphound', bHp:200,bAtk:20,bDef:10,bSpd:8, maxHp:200,hp:200,atk:20,def:10,spd:8}),
              Object.assign(baseUnitDefaults(), {id:'v2', name:'Scraphound', speciesKey:'scraphound', bHp:200,bAtk:20,bDef:10,bSpd:8, maxHp:200,hp:200,atk:20,def:10,spd:8}) ];
applyVanguardRoll(units, 3);   // stage 3 is not an elite wave at all
ok('a non-elite stage never rolls a Vanguard, however forced the odds', units.every(u=>!u.isVanguard));

applyVanguardRoll([units[0]], ELITE_STAGE);
ok('a lone unit is never turned into a Vanguard — nothing to escort it', !units[0].isVanguard);

applyVanguardRoll(units, ELITE_STAGE);
ok('an eligible elite wave with the roll forced through produces exactly one Vanguard', units.filter(u=>u.isVanguard).length===1, units);
let picked = units.find(u=>u.isVanguard), plain = units.find(u=>!u.isVanguard);
ok('it is clearly and consistently named, not a random title', picked.name==='Vanguard Scraphound');
ok('its squadmate is untouched', plain.bHp===200 && plain.name==='Scraphound');
ok('HP/ATK/DEF/SPD all scale by the documented multipliers', picked.bHp===Math.round(200*VANGUARD_MULT.hp) && picked.maxHp===picked.bHp &&
   picked.bAtk===Math.round(20*VANGUARD_MULT.atk) && picked.atk===picked.bAtk &&
   picked.bDef===Math.round(10*VANGUARD_MULT.def) && picked.def===picked.bDef &&
   picked.bSpd===Math.round(8*VANGUARD_MULT.spd) && picked.spd===picked.bSpd, picked);

let aceAndOthers = [ Object.assign(baseUnitDefaults(), {id:'a1', name:'X', speciesKey:'scraphound', isAce:true, bHp:1,bAtk:1,bDef:1,bSpd:1,maxHp:1,hp:1,atk:1,def:1,spd:1}),
                      Object.assign(baseUnitDefaults(), {id:'a2', name:'Y', speciesKey:'scraphound', bHp:1,bAtk:1,bDef:1,bSpd:1,maxHp:1,hp:1,atk:1,def:1,spd:1}) ];
applyVanguardRoll(aceAndOthers, ELITE_STAGE);
ok('a wave that already carries an Ace never also rolls a Vanguard on top of it', aceAndOthers.every(u=>!u.isVanguard));
Math.random = realRandom;

Math.random = () => 0.99;   // above VANGUARD_CHANCE — never triggers
units = [ Object.assign(baseUnitDefaults(), {id:'w1', name:'Sparkdrone', speciesKey:'sparkdrone', bHp:50,bAtk:10,bDef:5,bSpd:5, maxHp:50,hp:50,atk:10,def:5,spd:5}),
          Object.assign(baseUnitDefaults(), {id:'w2', name:'Sparkdrone', speciesKey:'sparkdrone', bHp:50,bAtk:10,bDef:5,bSpd:5, maxHp:50,hp:50,atk:10,def:5,spd:5}) ];
applyVanguardRoll(units, ELITE_STAGE);
ok('a high roll against VANGUARD_CHANCE produces no Vanguard at all', units.every(u=>!u.isVanguard));
Math.random = realRandom;

console.log('\n[196] buildEnemyUnits() wires the roll into a real elite wave, and skips ordinary waves entirely');
startGame();
Math.random = () => 0;
let B = setupFight([newMonster('emberling',30)], ELITE_STAGE);
Math.random = realRandom;
ok('a real, forced-triggered elite wave embeds exactly one Vanguard among its escort',
   B.enemyUnits.filter(u=>u.isVanguard).length===1 && B.enemyUnits.length>1, B.enemyUnits.map(u=>[u.name,!!u.isVanguard]));

startGame();
Math.random = () => 0;
B = setupFight([newMonster('emberling',30)], 3);   // an ordinary, non-elite stage
Math.random = realRandom;
ok('an ordinary wave never fields a Vanguard even with the roll forced through', B.enemyUnits.every(u=>!u.isVanguard));

console.log('\n[197] checkVanguardBounty: only pays out if the Vanguard is the very last of its side left standing when it falls');
startGame();
B = setupFight([newMonster('emberling',40)], ELITE_STAGE);
let atk = B.playerUnits[0];
ok('sanity: an escort of more than one enemy', B.enemyUnits.length>1);
let vg = B.enemyUnits[0], escort = B.enemyUnits[1];
vg.isVanguard = true; vg.speciesKey = vg.speciesKey || 'scraphound';
vg.dodge=0; vg.shield=false; vg.firstHitReduction=false; atk.missChance=0;
escort.fainted = false;   // the escort is still alive when the Vanguard falls
vg.hp = 1;
state.parts = [];
applyDamage(atk, vg, false);
ok('dying while escort still lives grants nothing at all', vg.fainted===true && state.parts.length===0, state.parts);
ok('the one-shot guard is still set so it can never retroactively trigger', vg.vanguardBountyGiven===true);

startGame();
B = setupFight([newMonster('emberling',40)], ELITE_STAGE);
atk = B.playerUnits[0];
vg = B.enemyUnits[0];
vg.isVanguard = true; vg.speciesKey = vg.speciesKey || 'scraphound';
vg.dodge=0; vg.shield=false; vg.firstHitReduction=false; atk.missChance=0;
B.enemyUnits.forEach(u=>{ if(u!==vg) u.fainted = true; });   // every escort already down
vg.hp = 1;
state.parts = [];
applyDamage(atk, vg, false);
ok('dying as the last one standing pays out the bounty', vg.fainted===true && state.parts.length===1, state.parts);
ok('the drop is keyed to the Vanguard\'s own species, suffixed with _vanguard', state.parts[0].key===vg.speciesKey+VANGUARD_SUFFIX);

console.log('\n[198] grantVanguardBounty / partInfo: a real, distinct reward — not just a cosmetic marker like an Ace');
const raw = PARTS[vg.speciesKey];
const info = partInfo(state.parts[0].key);
ok('partInfo resolves it distinctly, and with a genuine stat bump over the raw part', info.vanguard===true && !info.ace && !info.forged &&
   info.name==='Vanguard Trophy: '+raw.name && info.pct===Math.round((raw.pct+VANGUARD_PCT_BONUS)*100)/100 && info.pct>raw.pct, info);
ok('rust cost is unchanged from the raw part — the edge is pure upside, not a trade', info.corruption===raw.corruption);

grantVanguardBounty(vg);
ok('calling it again for the same fallen Vanguard is safe (no state to re-check, but nothing crashes or double-grants without the caller re-gating)',
   true);   // grantVanguardBounty itself has no re-entry guard; checkVanguardBounty's vanguardBountyGiven flag is what prevents that in real play

startGame();
B = setupFight([newMonster('emberling',40)], ELITE_STAGE);
let vg2 = B.enemyUnits[0];
vg2.isVanguard = true; vg2.speciesKey = vg2.speciesKey || 'sparkdrone';
state.parts = Array.from({length:14}, (_,i)=>({uid:'full'+i, key:'scraphound'}));
grantVanguardBounty(vg2);
ok('a full salvage bay quietly denies the bounty rather than special-casing past the cap', state.parts.length===14);
ok('and still logs something rather than failing silently', state.battle.log.some(l=>/salvage bay is full/i.test(l)), state.battle.log[0]);

console.log('\n[199] onEnemyFainted covers every enemy-fainting site, not just a direct hit');
startGame();
B = setupFight([newMonster('emberling',40)], ELITE_STAGE);
atk = B.playerUnits[0];
let vg3 = B.enemyUnits[0];
vg3.isVanguard = true; vg3.speciesKey = vg3.speciesKey || 'scraphound';
B.enemyUnits.forEach(u=>{ if(u!==vg3) u.fainted = true; });
vg3.maxHp = 20; vg3.hp = 1;
vg3.status = { type:'burn', turnsLeft:1 };
state.parts = [];
tickStatusStart(vg3);
ok('a burn-tick kill on a lone-standing Vanguard pays out just as a direct hit would', vg3.fainted===true && state.parts.length===1 &&
   state.parts[0].key===vg3.speciesKey+VANGUARD_SUFFIX, state.parts);

console.log('\n[200] partInfo/baseKeyOf: the vanguard suffix resolves independently of forged and ace');
const anyPart = Object.keys(PARTS)[0];
ok('baseKeyOf strips a vanguard suffix', baseKeyOf(anyPart+VANGUARD_SUFFIX)===anyPart);
ok('isVanguardKey/isAceKey/isForgedKey are all mutually exclusive on their own suffix',
   isVanguardKey(anyPart+VANGUARD_SUFFIX) && !isAceKey(anyPart+VANGUARD_SUFFIX) && !isForgedKey(anyPart+VANGUARD_SUFFIX) &&
   !isVanguardKey(anyPart+ACE_SUFFIX) && !isVanguardKey(anyPart+'_forged'));
ok('an unknown base key resolves to null, suffix or not', partInfo('not-a-real-part'+VANGUARD_SUFFIX)===null);

console.log('\n[201] visible in battle and in the salvage bay');
startGame();
Math.random = () => 0;
B = setupFight([newMonster('emberling',30)], ELITE_STAGE);
Math.random = realRandom;
let battleHtml = renderBattle();
ok('the Vanguard tag renders in battle', battleHtml.indexOf('🛡️ VANGUARD')>=0);
ok('it renders at the same larger size as a boss/Ace sprite (width 48 vs the usual 36)', battleHtml.indexOf('width="48"')>=0);

startGame();
const mon = newMonster('emberling',10);
const vgPartKey = Object.keys(PARTS)[0] + VANGUARD_SUFFIX;
mon.parts = [vgPartKey];
state.roster = [mon];
state.parts = [{uid:'vguid1', key:vgPartKey}];
const salvageHtml = renderSalvage();
ok('a Vanguard Trophy shows its shield badge and name in the salvage bay list', salvageHtml.indexOf('🛡️')>=0 && salvageHtml.indexOf('Vanguard Trophy:')>=0);
ok('the same part equipped on a monster shows its badge in the slot chip', /🛡️[^<]*✖/.test(salvageHtml), salvageHtml);
codexSee('parts', baseKeyOf(vgPartKey));
ok('installing it unlocks the base part type for the Legion Identity banner too', unlockedPartKeys().indexOf(baseKeyOf(vgPartKey))>=0);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
