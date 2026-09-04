
(function(){
function setupFight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.intel={history:[],wins:0}; state.stage=stage;
  beginBattle(); return state.battle;
}

console.log('\n[75] pairing rules');
startGame();
ok('the gap and bonus constants are sane', MENTOR_LEVEL_GAP>0 && MENTOR_ROOKIE_EXP_BONUS>0 && MENTOR_VETERAN_BUFF>0);

let B = setupFight([newMonster('emberling',1), newMonster('aqualing',20)], 1);
let rookie = B.playerUnits.find(u=>u.level===1), veteran = B.playerUnits.find(u=>u.level===20);
ok('a wide enough level gap forms a bond', rookie.mentorRookie===true && veteran.mentorVeteran===true);
ok('each half points at its partner', rookie.mentorPartnerId===veteran.id && veteran.mentorPartnerId===rookie.id);

B = setupFight([newMonster('emberling',1), newMonster('aqualing',5)], 1);
ok('a gap under the threshold forms no bond', !B.playerUnits.some(u=>u.mentorRookie || u.mentorVeteran),
   B.playerUnits.map(u=>u.level));

B = setupFight([newMonster('emberling',8), newMonster('aqualing',16)], 1);
ok('a gap exactly at the threshold still qualifies', B.playerUnits.every(u=>u.mentorRookie||u.mentorVeteran));
B = setupFight([newMonster('emberling',8), newMonster('aqualing',15)], 1);
ok('one level short of the threshold does not', !B.playerUnits.some(u=>u.mentorRookie||u.mentorVeteran),
   B.playerUnits.map(u=>u.level));

console.log('\n[76] multiple pairs and a leftover middle unit');
B = setupFight([newMonster('emberling',1), newMonster('aqualing',5), newMonster('terrafang',9), newMonster('voltcub',30)], 1);
const byLvl = B.playerUnits.slice().sort((a,b)=>a.level-b.level);
ok('the widest pair (1 & 30) bonds', byLvl[0].mentorRookie===true && byLvl[3].mentorVeteran===true);
ok('the inner pair (5 & 9) does not — its own gap is under the threshold', !byLvl[1].mentorRookie && !byLvl[1].mentorVeteran && !byLvl[2].mentorRookie && !byLvl[2].mentorVeteran,
   byLvl.map(u=>u.level+':'+(u.mentorRookie||u.mentorVeteran||false)));

B = setupFight([newMonster('emberling',1), newMonster('aqualing',10), newMonster('terrafang',20)], 1);
const trio = B.playerUnits.slice().sort((a,b)=>a.level-b.level);
ok('with three units the extremes bond', trio[0].mentorRookie===true && trio[2].mentorVeteran===true);
ok('the middle unit is left unpaired, not double-bonded', !trio[1].mentorRookie && !trio[1].mentorVeteran);
ok('a unit is never both a rookie and a veteran', B.playerUnits.every(u=>!(u.mentorRookie && u.mentorVeteran)));

console.log('\n[77] the veteran fights sharper, the buff survives mid-battle recomputes');
// A fixed trait on both instances keeps the comparison to just the mentor
// buff — traits are rolled randomly per monster and several of them (e.g.
// Savage, +8% ATK) would otherwise swamp a clean 5% signal.
const NO_ATK_TRAIT = { key:'resilient' };
// Baseline first: the very same species/level fielded solo, so there is no
// partner and no buff — captured before the paired battle overwrites state.battle.
startGame();
const soloVetMonster = newMonster('terrafang',25,1,NO_ATK_TRAIT);
state.roster=[soloVetMonster]; state.formation.front=[soloVetMonster.uid,null,null]; state.formation.back=[null,null,null];
state.intel={history:[],wins:0}; state.stage=1; beginBattle();
const unbondedAtk = state.battle.playerUnits[0].bAtk;

startGame();
B = setupFight([newMonster('emberling',1,1,NO_ATK_TRAIT), newMonster('aqualing',1,1,NO_ATK_TRAIT), newMonster('terrafang',25,1,NO_ATK_TRAIT)], 1);
const vet = B.playerUnits.find(u=>u.mentorVeteran);
ok('a bonded veteran exists', !!vet);
ok('the same monster hits harder when mentoring than when solo', vet.bAtk > unbondedAtk,
   vet.bAtk+' (mentoring) vs '+unbondedAtk+' (solo)');
ok('the buff is the documented +5%', vet.bAtk===Math.round(unbondedAtk*(1+MENTOR_VETERAN_BUFF)), vet.bAtk+' vs '+Math.round(unbondedAtk*1.05));
// force a mid-battle recompute (the same path a row Shift or a faint triggers)
// on this same battle, and confirm the buff survives it
applySynergyRefresh();
ok('the veteran buff survives a synergy recompute', state.battle.playerUnits.find(u=>u.mentorVeteran).bAtk >= vet.bAtk);

console.log('\n[78] the rookie earns bonus EXP, everyone else does not');
// High starting levels push the level-up threshold (level*10) well above the
// test award, so a straight before/after exp delta is meaningful.
startGame();
B = setupFight([newMonster('emberling',50), newMonster('aqualing',80)], 1);
const r2 = B.playerUnits.find(u=>u.mentorRookie), v2 = B.playerUnits.find(u=>u.mentorVeteran);
ok('a bond formed at these levels', !!r2 && !!v2, [r2,v2].map(u=>u&&u.level));
const m2r = findMonster(r2.monsterUid), m2v = findMonster(v2.monsterUid);
m2r.exp=0; m2v.exp=0;
awardExp([r2,v2], 40);
ok('the rookie gets 60 (40 * 1.5)', m2r.exp===60, m2r.exp);
ok('the veteran gets a flat 40, no bonus', m2v.exp===40, m2v.exp);

startGame();
const solo = setupFight([newMonster('emberling',5), newMonster('aqualing',8)], 1); // gap under threshold, no bond
ok('no bond at this gap', !solo.playerUnits.some(u=>u.mentorRookie||u.mentorVeteran));
const u0 = solo.playerUnits[0], mon0 = findMonster(u0.monsterUid);
mon0.exp=0;
awardExp([u0], 40);
ok('an unbonded unit just gets the flat amount', mon0.exp===40, mon0.exp);

console.log('\n[79] visible on the battlefield and in the log');
startGame();
B = setupFight([newMonster('emberling',1), newMonster('aqualing',20)], 1);
ok('forming a bond is announced in the battle log', B.log.some(l=>/mentors/i.test(l)), B.log);
const battleHtml = renderBattle();
ok('the rookie is tagged in the UI', battleHtml.indexOf('🌱')>=0);
ok('the veteran is tagged in the UI', battleHtml.indexOf('🎓')>=0);
startGame();
B = setupFight([newMonster('emberling',5), newMonster('aqualing',8)], 1);
ok('no mentor tags when no bond formed', renderBattle().indexOf('🌱')<0 && renderBattle().indexOf('🎓')<0);
ok('and nothing is logged either', !B.log.some(l=>/mentors/i.test(l)));

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
