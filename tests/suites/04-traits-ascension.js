
(function(){

console.log('\n[15] trait rolls');
startGame();
ok('starters roll traits', state.roster.every(m=>m.trait&&TRAITS[m.trait.key]), state.roster.map(m=>m.trait.key));
const seen={};
for(let i=0;i<4000;i++){ seen[rollTrait().key]=1; }
ok('every trait is reachable', Object.keys(seen).length===TRAIT_IDS.length, Object.keys(seen).length);
let baneRolls=0, withElem=0;
for(let i=0;i<4000;i++){ const t=rollTrait(); if(t.key==='bane'){baneRolls++; if(t.elem&&ELEM_BEATS[t.elem])withElem++;} }
ok('bane always names a real element', baneRolls>0 && baneRolls===withElem, baneRolls+'/'+withElem);
ok('bane is named after its element', traitName({key:'bane',elem:'fire'})==='Firebane', traitName({key:'bane',elem:'fire'}));

/* stat traits move the numbers */
const base=newMonster('emberling',10,1,{key:'keen'});
const savage=newMonster('emberling',10,1,{key:'savage'});
const hardy=newMonster('emberling',10,1,{key:'hardy'});
const swift=newMonster('emberling',10,1,{key:'swift'});
const stal=newMonster('emberling',10,1,{key:'stalwart'});
ok('savage raises ATK', computeStats(savage).atk>computeStats(base).atk);
ok('hardy raises HP',   computeStats(hardy).hp >computeStats(base).hp);
ok('swift raises SPD',  computeStats(swift).spd>computeStats(base).spd);
ok('stalwart raises DEF',computeStats(stal).def>computeStats(base).def);
ok('keen leaves stats alone', computeStats(base).atk===computeStats(newMonster('emberling',10,1,{key:'resilient'})).atk);

/* scavenger absorbs rust */
const sc=newMonster('terrafang',5,1,{key:'scavenger'}); sc.parts=['cinderjaw'];
const nn=newMonster('terrafang',5,1,{key:'keen'});      nn.parts=['cinderjaw'];
ok('scavenger carries 10 less rust', monsterCorruption(sc)===monsterCorruption(nn)-10, monsterCorruption(sc)+'/'+monsterCorruption(nn));

/* combat-side traits */
state.roster=[base,swift]; state.formation.front=[base.uid,swift.uid,null]; state.formation.back=[null,null,null];
state.intel={history:[],wins:0}; state.stage=1;
beginBattle(); B=state.battle;
ok('keen unit carries crit bonus', B.playerUnits[0].critBonus===0.08, B.playerUnits[0].critBonus);
const qs=newMonster('emberling',5,1,{key:'quickstart'});
state.roster=[qs]; state.formation.front=[qs.uid,null,null];
beginBattle(); B=state.battle;
ok('quickstart shortens cooldown', B.playerUnits[0].skillMaxCd===2, B.playerUnits[0].skillMaxCd);
const rs=newMonster('emberling',5,1,{key:'resilient'});
state.roster=[rs]; state.formation.front=[rs.uid,null,null];
beginBattle(); B=state.battle;
setStatus(B.playerUnits[0],'burn',4);
ok('resilient shortens afflictions', B.playerUnits[0].status.turnsLeft===3, B.playerUnits[0].status.turnsLeft);
const bn=newMonster('emberling',5,1,{key:'bane',elem:'earth'});
state.roster=[bn]; state.formation.front=[bn.uid,null,null];
beginBattle(); B=state.battle;
const bu=B.playerUnits[0];
ok('bane element reaches the unit', bu.baneElem==='earth', bu.baneElem);
const rr=Math.random; Math.random=()=>0.5;
const vsEarth=computeDamage(bu,{element:'earth',elements:['earth'],def:0},false).dmg;
const vsVolt =computeDamage(bu,{element:'volt', elements:['volt'], def:0},false).dmg;
Math.random=rr;
ok('bane bites only its element', vsEarth>vsVolt, vsEarth+' vs '+vsVolt);

console.log('\n[16] Tier 3 ascension');
startGame();
const a1=newMonster('emberling',3,2,{key:'keen'}), a2=newMonster('emberling',3,2,{key:'savage'}), a3=newMonster('emberling',3,2,{key:'swift'});
state.roster=[a1,a2,a3];
fuseSelection=[a1.uid,a2.uid,a3.uid];
var pl=fusionPlan();
ok('three Primes ascend', pl && pl.kind==='ascend', pl&&pl.kind);
ok('result is named Ascended', pl.resultName==='Ascended Emberling', pl.resultName);
doFuse();
ok('all three consumed', state.roster.length===1);
const asc=state.roster[0];
ok('tier 3 reached', asc.tier===3, asc.tier);
const as=computeStats(asc);
ok('ascended has a crown', /👑/.test(as.emoji), as.emoji);
ok('skill is double-empowered', /\+\+$/.test(as.skill), as.skill);
ok('four part slots', partSlots(asc)===4, partSlots(asc));
ok('inherits a parent trait', ['keen','savage','swift'].indexOf(asc.trait.key)>=0, asc.trait.key);
const p1s=computeStats(newMonster('emberling',1,2)), a1s=computeStats(newMonster('emberling',1,3));
ok('ascended out-scales Prime', a1s.atk>p1s.atk && a1s.hp>p1s.hp, p1s.atk+'->'+a1s.atk);

/* guards */
state.roster=[a1,a2]; fuseSelection=[a1.uid,a2.uid];
ok('two Primes are not enough', fusionPlan()===null);
ok('and it says why', /three/i.test(fusionBlockReason()), fusionBlockReason());
const z1=newMonster('emberling',3,1), z2=newMonster('emberling',3,1), z3=newMonster('emberling',3,1);
state.roster=[z1,z2,z3]; fuseSelection=[z1.uid,z2.uid,z3.uid];
ok('three base monsters cannot ascend', fusionPlan()===null);
ok('told to evolve first', /Prime/.test(fusionBlockReason()), fusionBlockReason());
const c1=newMonster('emberling',3,2), c2=newMonster('emberling',3,2), c3=newMonster('aqualing',3,2);
state.roster=[c1,c2,c3]; fuseSelection=[c1.uid,c2.uid,c3.uid];
ok('mismatched species blocked', fusionPlan()===null);
const d1=newMonster('emberling',3,3), d2=newMonster('emberling',3,3);
state.roster=[d1,d2]; fuseSelection=[d1.uid,d2.uid];
ok('ascended is the end of the line', fusionPlan()===null);
ok('end-of-line message', /end of the line/i.test(fusionBlockReason()), fusionBlockReason());
/* hybrids can ascend too */
const hid=hybridIdFor('fire','water');
const e1=newMonster(hid,3,2), e2=newMonster(hid,3,2), e3=newMonster(hid,3,2);
state.roster=[e1,e2,e3]; fuseSelection=[e1.uid,e2.uid,e3.uid];
ok('hybrids can ascend', fusionPlan().kind==='ascend');
doFuse();
ok('ascended hybrid keeps both elements', computeStats(state.roster[0]).elements.join(',')==='fire,water');
ok('named Ascended Steamling', /Ascended Steamling/.test(computeStats(state.roster[0]).name), computeStats(state.roster[0]).name);
/* selection cap */
startGame();
fuseSelection=[];
state.roster.forEach(m=>toggleFuseSelect(m.uid));
ok('selection caps at three', fuseSelection.length===3, fuseSelection.length);

/* trait inheritance through splicing */
const t1=newMonster('emberling',3,1,{key:'keen'}), t2=newMonster('aqualing',3,1,{key:'hardy'});
state.roster=[t1,t2]; fuseSelection=[t1.uid,t2.uid];
doFuse();
ok('hybrid inherits a parent trait', ['keen','hardy'].indexOf(state.roster[0].trait.key)>=0, state.roster[0].trait.key);


})();
