
(function(){

console.log('\n[284] activeSetBonuses(): grouping by family, the 2pc/3pc threshold, and mixed-variant unification');
ok('no parts at all -> no bonuses', activeSetBonuses([]).length===0);
ok('an undefined parts list -> no bonuses, no crash', activeSetBonuses(undefined).length===0);
ok('a single part, alone -> not enough for a set', activeSetBonuses(['scraphound']).length===0);
ok('two different families, one each -> neither reaches 2 -> no bonuses', activeSetBonuses(['scraphound','cinderjaw']).length===0);

let sb = activeSetBonuses(['scraphound','scraphound']);
ok('two of the same family -> exactly one bonus entry', sb.length===1);
ok('the entry names the right family/stat/name, straight off PARTS', sb[0].family==='scraphound' && sb[0].stat==='def' && sb[0].name===PARTS.scraphound.name);
ok('count reflects how many were actually equipped', sb[0].count===2);
ok('two parts is the 2pc rate, not the 3pc rate', sb[0].pct===SET_BONUS_2PC);

sb = activeSetBonuses(['scraphound','scraphound','scraphound']);
ok('three of the same family still yields one entry (not two)', sb.length===1);
ok('three parts is the 3pc rate — REPLACES the 2pc rate, the two are never added together', sb[0].pct===SET_BONUS_3PC);
ok('3pc is a strictly bigger bonus than 2pc', SET_BONUS_3PC > SET_BONUS_2PC);

sb = activeSetBonuses(['scraphound','scraphound','scraphound','scraphound']);
ok('a fourth copy changes nothing further — still the 3pc rate, not some new tier', sb.length===1 && sb[0].pct===SET_BONUS_3PC);
ok('but the count keeps climbing, for display purposes', sb[0].count===4);

sb = activeSetBonuses(['cinderjaw', 'cinderjaw_forged', 'cinderjaw_ace']);
ok('a raw, a forged, and an Ace-marked copy of the same chassis all count as one family (baseKeyOf)', sb.length===1 && sb[0].family==='cinderjaw');
ok('three variant forms together still hit the 3pc threshold', sb[0].count===3 && sb[0].pct===SET_BONUS_3PC);

sb = activeSetBonuses(['thornbot', 'thornbot_vanguard']);
ok('a raw + a Vanguard trophy of the same chassis unify into one 2pc family too', sb.length===1 && sb[0].family==='thornbot' && sb[0].pct===SET_BONUS_2PC);

sb = activeSetBonuses(['scraphound','scraphound','thornbot','thornbot']);
ok('two different families, each at 2+, both report — independent entries', sb.length===2);
const famNames = sb.map(x=>x.family).sort();
ok('both families are actually named', famNames[0]==='scraphound' && famNames[1]==='thornbot');

ok('a garbage/unknown key in the list is ignored rather than crashing the count',
  (function(){ try{ return activeSetBonuses(['scraphound','scraphound','not_a_real_part','']).length===1; }catch(e){ return false; } })());

console.log('\n[285] computeStats(): the set bonus actually lands on the right stat, on top of (not instead of) each part\'s own bonus');
// Every monster here is given the stat-neutral 'keen' trait explicitly — newMonster()
// rolls a random trait when none is given, and stalwart/hardy/swift/savage would each
// quietly perturb the exact stat these assertions hand-compute.
let m2 = newMonster('emberling', 1, 2, {key:'keen'}); // tier 2 -> 3 slots
m2.parts = ['scraphound']; // one only — below the threshold
let base = computeStats(m2);
m2.parts = ['scraphound','scraphound'];
let withTwo = computeStats(m2);
ok('DEF is strictly higher once a second Scrap Plating pushes the family past the 2pc threshold', withTwo.def > base.def, withTwo.def+' vs '+base.def);
// Build the expected number by hand, the same way computeStats does it: per-part first, set bonus last.
let sd = getSpeciesData('emberling', 2);
let mult = 1 + (m2.level-1)*0.12;
let expectDef = Math.round(sd.base.def*mult);
expectDef = Math.round(expectDef*(1+PARTS.scraphound.pct)); // part 1
expectDef = Math.round(expectDef*(1+PARTS.scraphound.pct)); // part 2
let expectDefWithSet = Math.round(expectDef*(1+SET_BONUS_2PC));
ok('the 2pc DEF bonus matches hand-computed math exactly (per-part loop, then the set bonus, in that order)', withTwo.def===expectDefWithSet, withTwo.def+' vs '+expectDefWithSet);
ok('a stat the set bonus does not touch (ATK) is unaffected by it', withTwo.atk===base.atk);

let m3 = newMonster('emberling', 1, 3, {key:'keen'}); // tier 3 -> 4 slots, room for a real 3pc test
m3.parts = ['thornbot','thornbot','thornbot'];
let withThree = computeStats(m3);
let sd3 = getSpeciesData('emberling', 3);
let mult3 = 1 + (m3.level-1)*0.12;
let expectHp = Math.round(sd3.base.hp*mult3);
for(let i=0;i<3;i++) expectHp = Math.round(expectHp*(1+PARTS.thornbot.pct));
expectHp = Math.round(expectHp*(1+SET_BONUS_3PC));
ok('the 3pc HP bonus (12%) matches hand-computed math, applied after all three per-part HP boosts', withThree.hp===expectHp, withThree.hp+' vs '+expectHp);

m3.parts = ['scraphound','scraphound','frostcoil','frostcoil'];
let withBothDef = computeStats(m3);
let expectDef2 = Math.round(sd3.base.def*mult3);
['scraphound','scraphound','frostcoil','frostcoil'].forEach(k=>{ expectDef2 = Math.round(expectDef2*(1+PARTS[baseKeyOf(k)].pct)); });
expectDef2 = Math.round(expectDef2*(1+SET_BONUS_2PC)); // scraphound's own 2pc set bonus
expectDef2 = Math.round(expectDef2*(1+SET_BONUS_2PC)); // frostcoil's own 2pc set bonus, stacked separately
ok('two DIFFERENT families that both happen to boost DEF stack their set bonuses multiplicatively, not as one merged bonus', withBothDef.def===expectDef2, withBothDef.def+' vs '+expectDef2);

m3.parts = [];
let noParts = computeStats(m3);
ok('a monster with no parts at all is untouched by any of this (activeSetBonuses([]) short-circuits cleanly)', noParts.hp===Math.round(sd3.base.hp*mult3));

console.log('\n[286] renderSalvage(): the gold set-bonus line on a monster card, gated by the same threshold');
startGame();
let solo = newMonster('emberling', 1, 2);
solo.parts = ['scraphound'];
state.roster = [solo];
state.parts = [];
let html = renderSalvage();
ok('one part alone renders no set-bonus line at all', html.indexOf('⚙2')<0 && html.indexOf('⚙3')<0);

let paired = newMonster('aqualing', 1, 2);
paired.parts = ['scraphound','scraphound'];
state.roster = [paired];
html = renderSalvage();
ok('two of a kind renders the gold set-bonus line, naming the count, part, percent and stat', html.indexOf(`⚙2 ${PARTS.scraphound.name} +${Math.round(SET_BONUS_2PC*100)}% DEF`)>=0);

let trio = newMonster('terrafang', 1, 3);
trio.parts = ['thornbot','thornbot','thornbot'];
state.roster = [trio];
html = renderSalvage();
ok('three of a kind renders the bigger 3pc percentage instead of 2pc', html.indexOf(`⚙3 ${PARTS.thornbot.name} +${Math.round(SET_BONUS_3PC*100)}% HP`)>=0);
ok('the 2pc figure is not also shown alongside it — one line, one rate', html.indexOf(`+${Math.round(SET_BONUS_2PC*100)}% HP`)<0);

ok('the Salvage Bay intro paragraph itself explains the mechanic', html.indexOf('same chassis')>=0);

state.roster = [solo, paired, trio];
html = renderSalvage();
ok('mixed roster: every card renders correctly side by side, no bleed between monsters', html.indexOf('⚙2 '+PARTS.scraphound.name)>=0 && html.indexOf('⚙3 '+PARTS.thornbot.name)>=0);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
