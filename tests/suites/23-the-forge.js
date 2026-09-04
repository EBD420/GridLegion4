
(function(){
function fillBay(key, n){
  for(let i=0;i<n;i++) state.parts.push({ uid: uid(), key });
}

console.log('\n[97] key resolution: base vs. forged');
ok('a base key resolves through partInfo unchanged', partInfo('scraphound')===PARTS.scraphound);
ok('an unknown key resolves to nothing', partInfo('not_a_real_part')===null);
ok('isForgedKey only flags the suffix', isForgedKey('scraphound'+FORGE_SUFFIX) && !isForgedKey('scraphound'));
ok('baseKeyOf strips the suffix', baseKeyOf('scraphound'+FORGE_SUFFIX)==='scraphound' && baseKeyOf('scraphound')==='scraphound');
const info = partInfo('scraphound'+FORGE_SUFFIX);
ok('a forged key resolves to real data', !!info && info.forged===true);
ok('forged keeps the base emoji/element/desc', info.emoji===PARTS.scraphound.emoji && info.element===PARTS.scraphound.element);
ok('forged name is the crafted name, not the raw part name', info.name===FORGED_PARTS.scraphound.name && info.name!==PARTS.scraphound.name);
ok('forged pct is boosted by FORGE_PCT_MULT', info.pct===Math.round(PARTS.scraphound.pct*FORGE_PCT_MULT*100)/100, info.pct);
ok('forged corruption is cut by FORGE_CORRUPTION_MULT', info.corruption===Math.max(1,Math.round(PARTS.scraphound.corruption*FORGE_CORRUPTION_MULT)), info.corruption);
ok('forged carries a genuinely new bonus stat', info.bonusStat===FORGED_PARTS.scraphound.bonusStat && info.bonusStat!==PARTS.scraphound.stat);
ok('an unforged suffix-less key never carries a bonus stat', !PARTS.scraphound.bonusStat);

console.log('\n[98] forging consumes exactly 3, produces exactly 1');
startGame();
state.parts = [];
fillBay('sparkdrone', 2);
doForge('sparkdrone');
ok('refuses with only 2 in the bay', state.parts.length===2 && state.parts.every(p=>p.key==='sparkdrone'));
ok('a message explains why', /Not enough/.test(state.forgeMsg), state.forgeMsg);
fillBay('sparkdrone', 1);   // now 3
ok('bay has exactly 3 before forging', forgeStock('sparkdrone')===3);
doForge('sparkdrone');
ok('the 3 raw parts are gone', forgeStock('sparkdrone')===0);
ok('exactly 1 forged part appears in their place', state.parts.length===1);
ok('the new part carries the forged key', state.parts[0].key==='sparkdrone'+FORGE_SUFFIX);
ok('the bay message announces it', state.forgeMsg.indexOf(FORGED_PARTS.sparkdrone.name)>=0, state.forgeMsg);

console.log('\n[99] forging with extra stock in the bay only takes what it needs');
startGame();
state.parts = [];
fillBay('cinderjaw', 7);
doForge('cinderjaw');
ok('exactly 3 consumed, 4 raw + 1 forged remain', forgeStock('cinderjaw')===4 && state.parts.filter(p=>p.key==='cinderjaw'+FORGE_SUFFIX).length===1);
ok('net bay size drops by 2 (-3 raw +1 forged)', state.parts.length===5);

console.log('\n[100] a forged part on a monster: stronger primary stat + a real second stat');
startGame();
const NO_TRAIT = { key:'resilient' };
const bare = newMonster('emberling',10,1,NO_TRAIT);
const stBare = computeStats(bare);
const withBase = newMonster('emberling',10,1,NO_TRAIT);
withBase.parts = ['cinderjaw'];   // base: +30% ATK only
const stBase = computeStats(withBase);
const withForged = newMonster('emberling',10,1,NO_TRAIT);
withForged.parts = ['cinderjaw'+FORGE_SUFFIX];   // forged: +36% ATK, +8% DEF
const stForged = computeStats(withForged);
ok('the base part boosts ATK by its own pct', stBase.atk===Math.round(stBare.atk*1.30), stBare.atk+' -> '+stBase.atk);
ok('the base part alone does not touch DEF', stBase.def===stBare.def);
ok('the forged part boosts ATK further than the base part', stForged.atk>stBase.atk, stBase.atk+' vs '+stForged.atk);
ok('the forged ATK matches the documented multiplier', stForged.atk===Math.round(stBare.atk*(1+PARTS.cinderjaw.pct*FORGE_PCT_MULT)), stForged.atk);
ok('the forged part ALSO grants its bonus stat (DEF) — the base part never could', stForged.def===Math.round(stBare.def*(1+FORGED_PARTS.cinderjaw.bonusPct)), stBare.def+' -> '+stForged.def);
ok('the forged part still carries its element like any part', stForged.elements.indexOf(PARTS.cinderjaw.element)>=0);

console.log('\n[101] rust: forged parts run cooler');
startGame();
// pin the trait — a random 'scavenger' roll (-10 rust) would confound the
// exact-value assertion below, same RNG-confound trap as elsewhere in this suite
const NO_RUST_TRAIT = { key:'resilient' };
const rBase = newMonster('emberling',10,1,NO_RUST_TRAIT); rBase.parts=['scraphound'];
const rForged = newMonster('emberling',10,1,NO_RUST_TRAIT); rForged.parts=['scraphound'+FORGE_SUFFIX];
ok('a forged part corrupts less than its raw counterpart', monsterCorruption(rForged) < monsterCorruption(rBase),
   monsterCorruption(rBase)+' vs '+monsterCorruption(rForged));
ok('exactly the documented reduced amount', monsterCorruption(rForged)===Math.max(1,Math.round(PARTS.scraphound.corruption*FORGE_CORRUPTION_MULT)));

console.log('\n[102] forged parts survive a save/load round trip');
startGame();
const carrier = newMonster('terrafang',12);
carrier.parts = ['galekite'+FORGE_SUFFIX];
state.roster = [carrier];
state.formation.front = [carrier.uid,null,null];
state.parts = [{ uid: uid(), key:'thornbot'+FORGE_SUFFIX }];   // one sitting in the bay too
state.slot = 0;
autosave();
startGame();
continueSlot(0);
const revivedMon = state.roster.find(m=>m.speciesId==='terrafang');
ok('an equipped forged part is not stripped on load', !!revivedMon && revivedMon.parts.indexOf('galekite'+FORGE_SUFFIX)>=0, revivedMon&&revivedMon.parts);
ok('a bay-stored forged part is not stripped on load', state.parts.some(p=>p.key==='thornbot'+FORGE_SUFFIX), state.parts);

console.log('\n[103] the codex never sees a forged key as a new bestiary entry');
startGame();
codex();   // lazily initializes state.codex (initGame() leaves it null until first touched)
state.codex.parts = {};
const seen = newMonster('emberling',5);
seen.parts = ['frostcoil'+FORGE_SUFFIX];
codexRecordMonster(seen);
ok('the base type is recorded as discovered', state.codex.parts.frostcoil===true);
ok('the forged key itself is never recorded as a separate entry', !state.codex.parts['frostcoil'+FORGE_SUFFIX]);
ok('codex parts count never exceeds the real total of 6', codexCount('parts')<=codexTotals().parts);

console.log('\n[104] forged parts stay out of the Legion Identity banner picker');
startGame();
codex();
state.codex.parts = { scraphound:true };   // pretend scraphound is unlocked for the banner
ok('a base unlocked part is a valid emblem pick', unlockedPartKeys().indexOf('scraphound')>=0);
ok('a forged key is never offered, even conceptually unlocked', unlockedPartKeys().indexOf('scraphound'+FORGE_SUFFIX)<0);
toggleEmblemPart('scraphound'+FORGE_SUFFIX);
ok('trying to equip a forged key on the banner is a no-op', (state.emblem||[]).indexOf('scraphound'+FORGE_SUFFIX)<0);

console.log('\n[105] rendering: the bay, equipped slots, and the Forge screen itself');
startGame();
state.parts = [{ uid:'x1', key:'galekite'+FORGE_SUFFIX }];
let html = renderSalvage();
ok('the salvage bay renders a forged part without throwing, tagged 🔨', /🔨/.test(html) && html.indexOf(FORGED_PARTS.galekite.name)>=0);
const wearer = newMonster('aqualing',8);
wearer.parts = ['galekite'+FORGE_SUFFIX];
state.roster = [wearer];
html = renderSalvage();
ok('an equipped forged part renders its chip without throwing', html.indexOf(PARTS.galekite.emoji)>=0);

state.parts = [];
fillBay('thornbot', 3);
html = renderForge();
ok('the Forge screen lists all 6 part families', Object.keys(PARTS).every(k=>html.indexOf(PARTS[k].name)>=0));
ok('a ready stack shows a Forge button wired to that part', html.indexOf("doForge('thornbot')")>=0);
ok('the have/need count is shown', /3 in the bay \(need 3\)/.test(html), html);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
