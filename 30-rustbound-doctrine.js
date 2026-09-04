
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

console.log('\n[157] the constants are sane');
ok('sample gate, tier thresholds and tier weight are all sane',
   DOCTRINE_MIN_SAMPLE>0 && Array.isArray(DOCTRINE_TIER_THRESHOLDS) && DOCTRINE_TIER_THRESHOLDS.length>=1 &&
   DOCTRINE_TIER_THRESHOLDS.every((t,i)=> i===0 || t>DOCTRINE_TIER_THRESHOLDS[i-1]) &&
   DOCTRINE_TIER_WEIGHT>0 && DOCTRINE_FORMATION_MIN>0 && DOCTRINE_FORMATION_RATIO>1);

console.log('\n[158] doctrineElement / doctrineTier: pure functions of the persisted tallies');
startGame();
ok('a fresh legion has no doctrine element locked in', doctrineElement()===null);
ok('and sits at tier 0', doctrineTier()===0);
state.doctrine.elementTally = { fire: 3, water: 2 };   // total 5, below DOCTRINE_MIN_SAMPLE (8)
ok('a clear leader below the sample gate still reads as null — not enough history yet', doctrineElement()===null,
   [state.doctrine.elementTally, DOCTRINE_MIN_SAMPLE]);
state.doctrine.elementTally = { fire: 5, water: 3 };   // total 8, at the gate, fire leads
ok('crossing the sample gate locks in the plurality element', doctrineElement()==='fire');
state.doctrine.elementTally = { fire: 4, water: 4 };   // exact tie
ok('an exact tie keeps the first-seen max, same tie-break convention as currentAdaptation', doctrineElement()==='fire');
state.doctrine.wins = 0;
ok('tier 0 below the first threshold', doctrineTier()===0);
state.doctrine.wins = DOCTRINE_TIER_THRESHOLDS[0];
ok('tier 1 exactly at the first threshold', doctrineTier()===1);
state.doctrine.wins = DOCTRINE_TIER_THRESHOLDS[1];
ok('tier 2 exactly at the second threshold', doctrineTier()===2);
state.doctrine.wins = DOCTRINE_TIER_THRESHOLDS[2];
ok('tier 3 exactly at the third threshold', doctrineTier()===3);
state.doctrine.wins = DOCTRINE_TIER_THRESHOLDS[2] + 500;
ok('tier caps at the number of thresholds defined, however many wins pile up', doctrineTier()===DOCTRINE_TIER_THRESHOLDS.length);

console.log('\n[159] doctrineWeight: the extra multiplier only applies to a chassis that actually hard-counters the locked element');
startGame();
ok('no locked element means no bonus weight at all, for anything', doctrineWeight('water', null)===1 && doctrineWeight('fire', null)===1);
ok("an element that doesn't counter the locked one gets no bonus", doctrineWeight('fire', 'fire')===1);
ok('water hard-counters fire (ELEM_BEATS.water===fire), so it gets the bonus once locked in', ELEM_BEATS.water==='fire');
state.doctrine.wins = 0;
ok('tier 0: the countering chassis gets no bonus yet', doctrineWeight('water','fire')===1);
state.doctrine.wins = DOCTRINE_TIER_THRESHOLDS[0];
ok('tier 1: the countering chassis gets exactly +1 tier of bonus weight', doctrineWeight('water','fire')===1+DOCTRINE_TIER_WEIGHT);
state.doctrine.wins = DOCTRINE_TIER_THRESHOLDS[1];
ok('tier 2: the bonus scales linearly with tier', doctrineWeight('water','fire')===1+DOCTRINE_TIER_WEIGHT*2);

console.log('\n[160] doctrineFormationShape: flavour-only read on which row a legion actually leans on');
startGame();
ok('nothing tracked yet reads as no clear shape', doctrineFormationShape()===null);
state.doctrine.formationTally = { front:2, back:1 };   // total 3, below DOCTRINE_FORMATION_MIN (6)
ok('below the sample minimum, no shape is claimed even with a lead', doctrineFormationShape()===null);
state.doctrine.formationTally = { front:3, back:3 };   // balanced, well past the minimum
ok('a balanced split reads as no clear shape', doctrineFormationShape()===null);
state.doctrine.formationTally = { front:10, back:2 };
ok('a real front-heavy lead reads as front', doctrineFormationShape()==='front');
state.doctrine.formationTally = { front:2, back:10 };
ok('a real back-heavy lead reads as back', doctrineFormationShape()==='back');

console.log('\n[161] doctrineKillLeader: the top species by lifetime kills, named and emoji\'d correctly');
startGame();
ok('no kills tracked yet means no leader', doctrineKillLeader()===null);
state.doctrine.kills = { emberling: 3, aqualing: 7 };
const leader = doctrineKillLeader();
ok('the higher tally wins, resolved through SPECIES (mirrors the SPECIES||HYBRID_SPECIES fallback bondCountFor already relies on)',
   leader && leader.speciesId==='aqualing' && leader.count===7 && leader.name===SPECIES.aqualing.name && leader.emoji===SPECIES.aqualing.emoji, leader);
state.doctrine.kills = { nosuchspecies: 99 };
ok('an unknown species id in the tally (should never happen post-sanitize, but the function stays safe) resolves to null rather than throwing',
   doctrineKillLeader()===null);

console.log('\n[162] pickEnemySpecies / buildEnemyUnits: the locked element actually reaches wave composition, not just the flavour text');
startGame();
const realRandom = Math.random;
state.doctrine.elementTally = { fire: 10, water: 2 };   // locks doctrine onto fire
state.doctrine.wins = DOCTRINE_TIER_THRESHOLDS[0];       // tier 1
ok('doctrine is locked onto fire at tier 1 for this check', doctrineElement()==='fire' && doctrineTier()===1);
const counterId = ENEMY_IDS.find(id => ELEM_BEATS[ENEMY_SPECIES[id].element]==='fire');
ok('there really is a chassis in the enemy roster that hard-counters fire', !!counterId, counterId);
const weights = ENEMY_IDS.map(id => ELEM_BEATS[ENEMY_SPECIES[id].element]==='fire' ? (1+DOCTRINE_TIER_WEIGHT*1) : 1);
const total = weights.reduce((s,w)=>s+w,0);
const idx = ENEMY_IDS.indexOf(counterId);
const before = weights.slice(0,idx).reduce((s,w)=>s+w,0);
const centerFrac = (before + weights[idx]/2) / total;
ok('the doctrine-countering chassis really does carry more of the weighted pie than an ordinary one',
   weights[idx] > 1 && centerFrac > 0.18 /* stays clear of ACE_CHANCE so applyAceRoll below cannot interfere */);
Math.random = () => centerFrac;
ok('pickEnemySpecies lands on the doctrine-countering chassis when the draw falls in its (now-larger) slice', pickEnemySpecies(null)===counterId);
const built = buildEnemyUnits(3, terrainForStage(3), null, false, null);
ok('the bias reaches all the way through buildEnemyUnits — every enemy in this wave is the countering chassis, forced draw held constant',
   built.length>0 && built.every(u=>u.speciesKey===counterId), built.map(u=>u.speciesKey));
Math.random = realRandom;

console.log('\n[163] endBattle wiring: a real campaign win folds element, formation, and kills into the persistent tallies');
startGame();
state.doctrine = { elementTally:{}, formationTally:{front:0,back:0}, kills:{}, wins:0 };
let B = setupFight([newMonster('emberling',20,1,{key:'resilient'}), newMonster('aqualing',20,1,{key:'resilient'})], 3);
const atk = B.playerUnits[0];
const victim = B.enemyUnits[0];
victim.dodge=0; atk.missChance=0; victim.shield=false; victim.firstHitReduction=false; victim.hp=1;
applyDamage(atk, victim, false);
ok('the kill lands and is attributed on the battle object first', B.killsBySpecies[atk.speciesId]===1, B.killsBySpecies);
forceWin();
ok('a real win advances doctrine.wins by exactly one', state.doctrine.wins===1);
ok('the kill folds into the persistent per-species tally', state.doctrine.kills[atk.speciesId]===1, state.doctrine.kills);
ok('every deployed unit\'s row folds into the persistent formation tally (both player units were in front)',
   state.doctrine.formationTally.front===2 && state.doctrine.formationTally.back===0, state.doctrine.formationTally);
ok('the battle\'s dominant-damage element folds into the persistent element tally too', Object.values(state.doctrine.elementTally).reduce((s,v)=>s+v,0)===1);

console.log('\n[164] the War Journal narrates a real doctrine shift, and stays quiet on an ordinary win');
startGame();
state.doctrine = { elementTally:{}, formationTally:{front:0,back:0}, kills:{}, wins:0 };
B = setupFight([newMonster('emberling',10,1,{key:'resilient'})], 3);
const beforeLen = state.journal.length;
forceWin();
ok('an ordinary early win (no tier cross, no element lock) adds no doctrine entry — only the usual battle recap',
   state.journal.length===beforeLen+1);

startGame();
state.doctrine = { elementTally:{}, formationTally:{front:0,back:0}, kills:{}, wins:DOCTRINE_TIER_THRESHOLDS[0]-1 };
B = setupFight([newMonster('emberling',10,1,{key:'resilient'})], 3);
const beforeLen2 = state.journal.length;
forceWin();
ok('crossing a tier threshold adds a second entry alongside the usual battle recap', state.journal.length===beforeLen2+2, state.journal.slice(0,2).map(e=>e.text));
ok('that entry reads as an escalation, in Rustbound voice', /Rustbound|directive|escalat/i.test(state.journal[0].text) || /Rustbound|directive|escalat/i.test(state.journal[1].text));

startGame();
state.doctrine = { elementTally:{ fire:5, water:2 }, formationTally:{front:0,back:0}, kills:{}, wins:0 };   // total 7, one short of locking in
B = setupFight([newMonster('emberling',10,1,{key:'resilient'})], 3);
B.elemDamage = { fire: 40 };   // this battle's dominant damage, feeds dom -> elementTally.fire
const beforeLen3 = state.journal.length;
ok('doctrine has not locked onto anything yet', doctrineElement()===null);
forceWin();
ok('the element newly locking in (null -> fire) also narrates a shift entry', state.journal.length===beforeLen3+2);
ok('fire is now locked in for real', doctrineElement()==='fire');

console.log('\n[165] persistence: doctrine and archive both ride the save, sanitized on the way back in');
startGame();
state.doctrine = { elementTally:{fire:5,water:3}, formationTally:{front:4,back:1}, kills:{emberling:6}, wins:12 };
let saved = serializeSave();
ok('doctrine rides along in the save verbatim', JSON.stringify(saved.doctrine)===JSON.stringify(state.doctrine));
applySave(saved, 0);
ok('a clean save round-trips exactly', JSON.stringify(state.doctrine)===JSON.stringify({ elementTally:{fire:5,water:3}, formationTally:{front:4,back:1}, kills:{emberling:6}, wins:12 }));

applySave(Object.assign({}, saved, { doctrine: {
  elementTally: { fire: 5, notanelement: 9, water: -3, volt: 'lots' },
  formationTally: { front: 4, back: -2, sideways: 9 },
  kills: { emberling: 6, nosuchspecies: 40, aqualing: -1 },
  wins: -5,
} }), 0);
ok('only real elements with a positive finite count survive the element tally', JSON.stringify(state.doctrine.elementTally)==='{"fire":5}', state.doctrine.elementTally);
ok('only front/back with a positive finite count survive the formation tally (the other key keeps its zero default, "sideways" is dropped)',
   JSON.stringify(state.doctrine.formationTally)==='{"front":4,"back":0}', state.doctrine.formationTally);
ok('only a known species with a positive finite count survives the kill tally', JSON.stringify(state.doctrine.kills)==='{"emberling":6}', state.doctrine.kills);
ok('a negative wins count degrades to zero rather than going negative', state.doctrine.wins===0);

applySave(Object.assign({}, saved, { doctrine: 'not-an-object' }), 0);
ok('a non-object doctrine in the save file degrades to a clean empty structure, not a crash',
   JSON.stringify(state.doctrine)===JSON.stringify({ elementTally:{}, formationTally:{front:0,back:0}, kills:{}, wins:0 }));

console.log('\n[166] doctrine survives a Rebirth on purpose, and only a brand-new legion clears it');
startGame();
state.stage = REBIRTH_MIN_STAGE + 1;
state.doctrine = { elementTally:{fire:9}, formationTally:{front:6,back:1}, kills:{emberling:4}, wins:15 };
doRebirth();   // arm
doRebirth();   // confirm
ok('Rustbound Doctrine survives Rebirth exactly like Battle-Forged Bonds — the faction does not forget just because the roster restarted',
   state.doctrine.wins===15 && state.doctrine.kills.emberling===4, state.doctrine);
ok('intel, by contrast, still resets every Rebirth as before (unchanged behaviour)', state.intel.wins===0 && state.intel.history.length===0);

startGame();
ok('a genuinely fresh legion (initGame) clears doctrine back to nothing', state.doctrine.wins===0 && Object.keys(state.doctrine.elementTally).length===0);

console.log('\n[167] visible on the Hub, in both states');
startGame();
let hubHtml = renderHub();
ok('with no history yet, the banner says so plainly rather than pretending to know something', hubHtml.indexOf('RUSTBOUND DOCTRINE')>=0 && /too thin/i.test(hubHtml));
state.doctrine = { elementTally:{fire:9,water:1}, formationTally:{front:8,back:1}, kills:{emberling:5}, wins:DOCTRINE_TIER_THRESHOLDS[0] };
hubHtml = renderHub();
ok('once locked in, the banner names the element and the escalation tier', hubHtml.indexOf('FIRE')>=0 && hubHtml.indexOf('Escalation tier <b>1</b>')>=0, hubHtml.indexOf('RUSTBOUND DOCTRINE'));
ok('the formation-shape flavour line shows up once there is enough history', /front row does most of the work/i.test(hubHtml));
ok('the kill-leader flavour line names the actual leader, HTML-escaped like every other name on this screen', hubHtml.indexOf(SPECIES.emberling.name)>=0);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
