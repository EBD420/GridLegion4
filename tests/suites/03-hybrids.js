
console.log('\n[11] hybrid species');
startGame();
ok('all 15 element pairs exist', Object.keys(HYBRID_SPECIES).length===15, Object.keys(HYBRID_SPECIES).length);
const steam=HYBRID_SPECIES[hybridIdFor('fire','water')];
ok('fire+water is Steamling', steam.name==='Steamling', steam.name);
ok('pair order does not matter', hybridIdFor('water','fire')===hybridIdFor('fire','water'));
ok('hybrid carries both elements', steam.elements.sort().join(',')==='fire,water', steam.elements);
const eb=SPECIES.emberling.base, aq=SPECIES.aqualing.base;
ok('stats blend the parents x1.25', steam.base.hp===Math.round((eb.hp+aq.hp)/2*1.25), steam.base.hp);
ok('hybrids are not wild-catchable', !SPECIES_IDS.includes(hybridIdFor('fire','water')));

console.log('\n[12] cross-species fusion');
startGame();
const p1=newMonster('emberling',3), p2=newMonster('aqualing',3);
state.roster=[p1,p2];
fuseSelection=[p1.uid,p2.uid];
var plan2=fusionPlan();
ok("two elements -> hybrid plan", plan2 && plan2.kind==="hybrid", plan2&&plan2.kind);
ok('plan names the result', plan2.resultName==="Steamling", plan2.resultName);
ok('plan lists inherited traits', plan2.traits.join()==='burn immunity,slow immunity', plan2.traits);
doFuse();
ok('parents consumed, hybrid created', state.roster.length===1 && isHybridId(state.roster[0].speciesId));
const hyb=state.roster[0];
ok('hybrid starts at Lv.1', hyb.level===1);
ok('discovery recorded', discoveredCount()===1);
const hs=computeStats(hyb);
ok('hybrid stats expose both elements', hs.elements.join(',')==='fire,water', hs.elements);
ok('flagged as hybrid', hs.hybrid===true);

/* guards */
startGame();
const q1=newMonster('emberling',3), q2=newMonster('emberling',3), q3=newMonster('emberling',1);
state.roster=[q1,q2,q3];
fuseSelection=[q1.uid,q3.uid];
ok('under-levelled pair blocked', fusionPlan()===null);
fuseSelection=[q1.uid,q2.uid];
ok('identical species still makes a Prime', fusionPlan().kind==='prime');
doFuse();
const prime=state.roster.find(m=>m.tier===2);
ok('prime path intact', !!prime && prime.tier===2);
const h1=newMonster(hybridIdFor('fire','water'),3), h2=newMonster('mossling',3);
state.roster=[h1,h2]; fuseSelection=[h1.uid,h2.uid];
ok('hybrid cannot be spliced again', fusionPlan()===null);
ok('block reason explains why', /hybrid/i.test(fusionBlockReason()), fusionBlockReason());
const h3=newMonster(hybridIdFor('fire','water'),3);
state.roster=[h1,h3]; fuseSelection=[h1.uid,h3.uid];
ok('two identical hybrids -> Prime hybrid', fusionPlan().kind==='prime', fusionPlan());
doFuse();
const ph=state.roster[0];
ok('Prime hybrid keeps both elements', computeStats(ph).elements.join(',')==='fire,water', computeStats(ph).elements);
ok('Prime hybrid is named', /Prime Steamling/.test(computeStats(ph).name), computeStats(ph).name);

console.log('\n[13] one hybrid completes two lines');
startGame();
const sl=newMonster(hybridIdFor('fire','water'),8);
const fr=newMonster('emberling',8), wa=newMonster('aqualing',8);
state.roster=[sl,fr,wa];
state.formation.front=[sl.uid,fr.uid,wa.uid]; state.formation.back=[null,null,null];
const lblA=formationRowSynergyLabel('front');
ok('row reports TWO synergies at once', /FIRE DUO/.test(lblA)&&/WATER DUO/.test(lblA), lblA);
state.intel={history:[],wins:0}; state.stage=1;
beginBattle(); B=state.battle;
const fu=B.playerUnits.find(u=>u.name==='Emberling');
ok('both bonuses reach the units', /FIRE DUO/.test(B.synLabels.front)&&/WATER DUO/.test(B.synLabels.front), B.synLabels.front);
/* fire DUO = +5% atk, water DUO = +5% def; both should be on */
ok('fire bonus applied to ATK', fu.atk===Math.round(fu.bAtk*1.05), fu.bAtk+'->'+fu.atk);
ok('water bonus applied to DEF', fu.def===Math.round(fu.bDef*1.05), fu.bDef+'->'+fu.def);
/* a triple: two hybrids + a fire gives FIRE TRIO and WATER DUO */
const sl2=newMonster(hybridIdFor('fire','water'),8);
state.roster=[sl,sl2,fr];
state.formation.front=[sl.uid,sl2.uid,fr.uid];
const lbl2=formationRowSynergyLabel('front');
ok('trio + duo from two hybrids', /FIRE TRIO/.test(lbl2)&&/WATER DUO/.test(lbl2), lbl2);

console.log('\n[14] hybrid combat');
startGame();
state.roster=[sl]; state.formation.front=[sl.uid,null,null]; state.formation.back=[null,null,null];
state.intel={history:[],wins:0}; state.stage=1;
beginBattle(); B=state.battle;
const su=B.playerUnits[0];
ok('unit knows its innate attack elements', su.attackElements.join(',')==='fire,water', su.attackElements);
ok('inherits burn immunity from fire', su.burnImmune===true);
ok('inherits slow immunity from water', su.slowImmune===true);
const natureFoe={element:'nature', elements:['nature'], def:0, side:'enemy'};
const fireFoe={element:'fire', elements:['fire'], def:0, side:'enemy'};
ok('strikes nature with its fire half', multiplierVs(su,natureFoe).elem==='fire' && multiplierVs(su,natureFoe).mult===1.4);
ok('strikes fire with its water half', multiplierVs(su,fireFoe).elem==='water' && multiplierVs(su,fireFoe).mult===1.4);
/* parts must NOT grant offence */
const pm=newMonster('mossling',5); pm.parts=['cinderjaw']; // +fire plating
state.roster=[pm]; state.formation.front=[pm.uid,null,null];
beginBattle(); B=state.battle;
const pu=B.playerUnits[0];
ok('part adds a defensive element only', pu.elements.join(',')==='nature,fire' && pu.attackElements.join(',')==='nature', pu.attackElements);
ok('plated unit still attacks as nature', multiplierVs(pu,natureFoe).elem==='nature');
/* immunity actually blocks */
const im=newMonster(hybridIdFor('volt','water'),5);
state.roster=[im]; state.formation.front=[im.uid,null,null];
beginBattle(); B=state.battle;
const iu=B.playerUnits[0];
ok('volt hybrid is stun-immune', iu.stunImmune===true);
setStatus(iu,'stun',1);
ok('stun is refused', iu.status===null);
setStatus(iu,'slow',2);
ok('slow is refused too', iu.status===null);
setStatus(iu,'burn',3);
ok('burn still lands (not its element)', iu.status && iu.status.type==='burn');
/* traits survive a synergy recompute */
const wh=newMonster(hybridIdFor('nature','wind'),5);
state.roster=[wh]; state.formation.front=[wh.uid,null,null];
beginBattle(); B=state.battle;
const wu=B.playerUnits[0];
const dodgeBefore=wu.dodge, regenBefore=wu.regen;
ok('wind half grants dodge', dodgeBefore>=0.10, dodgeBefore);
ok('nature half grants regen', regenBefore>=0.03, regenBefore);
applySynergyRefresh(); applySynergyRefresh();
ok('traits survive recomputes', wu.dodge===dodgeBefore && wu.regen===regenBefore, wu.dodge+'/'+wu.regen);
/* earth hybrid bulwark */
const eh=newMonster(hybridIdFor('earth','fire'),5);
state.roster=[eh]; state.formation.front=[eh.uid,null,null];
beginBattle(); B=state.battle;
ok('earth half opens with a shield', B.playerUnits[0].shield===true);

