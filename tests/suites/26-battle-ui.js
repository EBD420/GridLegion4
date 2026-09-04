
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
/* Crude but sufficient HTML slicing: everything before the divider is the
   left (player) half, everything after is the right (enemy) half. */
function splitOnDivider(html){
  const i = html.indexOf('bf-divider');
  return { before: html.slice(0, i), after: html.slice(i) };
}

console.log('\n[124] the battlefield is genuinely positioned: player left, enemy right, front nearest the divider');
startGame();
let b = setupFight([newMonster('emberling',10), newMonster('aqualing',10)], 5);   // stage 5 boss: 2 gens + 1 boss
let html = renderBattle();
ok('renders a player side and an enemy side', html.indexOf('bf-side player')>=0 && html.indexOf('bf-side enemy')>=0);
ok('renders exactly one divider between them', (html.match(/bf-divider/g)||[]).length===1);
const halves = splitOnDivider(html);
ok('the player side comes before the divider (screen-left)', halves.before.indexOf('bf-side player')>=0 && halves.before.indexOf('bf-side enemy')<0);
ok('the enemy side comes after the divider (screen-right)', halves.after.indexOf('bf-side enemy')>=0 && halves.after.indexOf('bf-side player')<0);
(()=>{
  // Within the player half, the FRONT row's unit-row must appear AFTER the
  // BACK row's — .bf-cols lays columns out left-to-right and .bf-side.player
  // right-aligns them, so the later column in source order sits nearest the
  // divider. Locate each row by a name unique to that unit.
  const front = b.playerUnits.find(u=>u.row==='front').name;
  const back = b.playerUnits.find(u=>u.row==='back');
  if(back){
    ok('player: back row appears before front row in the markup (front sits nearest the divider)',
       halves.before.indexOf(back.name) < halves.before.indexOf(front));
  } else {
    ok('player: single-row battle skips the ordering check trivially', true);
  }
})();
(()=>{
  // Mirrored on the enemy side: front (the generators) must appear BEFORE
  // back (the boss) in the markup, since .bf-side.enemy left-aligns and the
  // EARLIER column sits nearest the divider.
  const genName = b.enemyUnits.find(u=>u.isGenerator).name;
  const bossName = b.enemyUnits.find(u=>u.isBoss).name;
  ok('enemy: front (generators) appears before back (boss) in the markup', halves.after.indexOf(genName) < halves.after.indexOf(bossName));
})();
forceWin();

console.log('\n[125] every rendered unit sprite sits in its own motion wrapper');
startGame();
b = setupFight([newMonster('emberling',10)], 3);
html = renderBattle();
const unitCount = b.playerUnits.length + b.enemyUnits.length;
ok('one .unit-motion wrapper per battle unit', (html.match(/unit-motion/g)||[]).length===unitCount, (html.match(/unit-motion/g)||[]).length+' vs '+unitCount);
ok('each sprite carries a deterministic idle-bob delay', /animation-delay:-[0-9.]+s/.test(html));
(()=>{
  const again = renderBattle();
  const delays = s => (s.match(/animation-delay:-[0-9.]+s/g)||[]).sort().join(',');
  ok('the same units get the same delay on a re-render (deterministic, not random jitter)', delays(html)===delays(again));
})();
forceWin();

console.log('\n[126] the turn-order timeline reflects b.queue/b.qIndex live');
startGame();
b = setupFight([newMonster('emberling',10), newMonster('aqualing',10), newMonster('galekit',10)], 3);
const activeUnit = b.qIndex<b.queue.length ? b.queue[b.qIndex] : null;
let tl = renderTurnTimeline(b, activeUnit);
ok('renders a NEXT strip while units remain', tl.indexOf('turnline')>=0);
const expectedChips = Math.min(8, b.queue.slice(b.qIndex).filter(u=>!u.fainted).length);
ok('one chip per upcoming living unit (capped at 8)', (tl.match(/turn-chip /g)||[]).length===expectedChips, expectedChips);
ok('the first chip (the acting unit) is marked "now"', /turn-chip [a-z]+ now"/.test(tl));
ok('exactly one chip is marked "now"', (tl.match(/ now"/g)||[]).length===1);
ok('player and enemy chips are tagged with their side', tl.indexOf('turn-chip player')>=0 && tl.indexOf('turn-chip enemy')>=0);
// Fainting everyone but one unit collapses the strip correctly.
b.enemyUnits.forEach(u=>u.fainted=true);
b.playerUnits.slice(1).forEach(u=>u.fainted=true);
tl = renderTurnTimeline(b, b.queue[b.qIndex]);
ok('fainted units never appear in the timeline', (tl.match(/turn-chip /g)||[]).length<=1);
ok('an empty upcoming list renders nothing rather than an empty shell', renderTurnTimeline({queue:[], qIndex:0}, null)==='');
forceWin();

console.log('\n[127] applyDamage() queues a motion event for every attack, shaped correctly');
startGame();
b = setupFight([newMonster('emberling',20)], 3);
const atk = b.playerUnits[0], def = b.enemyUnits[0];

fxMotionQueue.length = 0;
def.dodge = 0; atk.missChance = 0; def.shield=false; def.firstHitReduction=false;
applyDamage(atk, def, false);
ok('a normal hit queues exactly one motion event', fxMotionQueue.length===1, fxMotionQueue);
(()=>{
  const it = fxMotionQueue[0];
  ok('it names the real attacker and defender', it.attackerId===atk.id && it.defenderId===def.id);
  ok('it carries each unit\'s side', it.attackerSide==='player' && it.defenderSide==='enemy');
  ok('a real hit is flagged hit:true and carries the strike element', it.hit===true && !!it.elem);
})();

fxMotionQueue.length = 0; fxQueue.length = 0;
atk.missChance = 1;
applyDamage(atk, def, false);
ok('a guaranteed miss still queues a motion event (the attacker still lunges)', fxMotionQueue.length===1);
ok('but it is flagged hit:false — no knockback, no particles for a whiff', fxMotionQueue[0].hit===false);
atk.missChance = 0;

fxMotionQueue.length = 0;
def.dodge = 1;
applyDamage(atk, def, false);
ok('a guaranteed dodge also queues an attacker-only motion event', fxMotionQueue.length===1 && fxMotionQueue[0].hit===false);
def.dodge = 0;

fxMotionQueue.length = 0;
def.shield = true;
applyDamage(atk, def, false);
ok('a shield-blocked hit (0 damage) queues motion but never flags hit:true', fxMotionQueue.length===1 && fxMotionQueue[0].hit===false);
def.shield = false;

console.log('\n[128] direction helpers point the right way for each side');
ok('a player unit lunges toward the right (the enemy sits on the right)', towardCenter('player')==='lunge-right');
ok('an enemy unit lunges toward the left (the player sits on the left)', towardCenter('enemy')==='lunge-left');
ok('a hit player unit knocks back left (away from the enemy)', awayFromCenter('player')==='knock-left');
ok('a hit enemy unit knocks back right (away from the player)', awayFromCenter('enemy')==='knock-right');

console.log('\n[129] flushMotion()/spawnParticles() are safe no-ops headlessly, like the existing fx system');
ok('domReady is false in this harness (same as the rest of the fx system)', domReady()===false);
fxMotionQueue.push({ attackerId:'x', attackerSide:'player', defenderId:'y', defenderSide:'enemy', elem:'fire', hit:true });
ok('flushMotion drains the queue without touching a real DOM', (()=>{ try{ flushMotion(); return fxMotionQueue.length===0; }catch(e){ return false; } })());
ok('spawnParticles never throws even with no #fx layer available', (()=>{ try{ spawnParticles({getBoundingClientRect:()=>({left:0,top:0,width:10,height:10})}, 'water'); return true; }catch(e){ return false; } })());

console.log('\n[130] the Alpha Strike ultimate (the one path that bypasses applyDamage) gets the same treatment');
startGame();
b = setupFight([newMonster('emberling',30)], 3);
ok('the fast, high-level solo unit went first, so it is awaiting input already', b.awaitingInput===true && b.queue[b.qIndex].side==='player', b.queue.map(u=>u.side));
b.gauge = 100;
b.pendingAction = 'gauge_alpha';
const target = b.enemyUnits[0];
fxQueue.length = 0; fxMotionQueue.length = 0;
// playerTarget() ends by calling render(), which for the battle screen
// drains fxQueue/fxMotionQueue via flushFx()/flushMotion() same as any
// other turn — stub it out for this one call so the queues can still be
// inspected afterward, the same trick real DOM tooling would need here.
const realRender = render;
render = function(){};
try{ playerTarget(target.id); } finally { render = realRender; }
ok('Alpha Strike posts a floating damage number', fxQueue.length>=1 && /^-\d+!$/.test(fxQueue[fxQueue.length-1].text), fxQueue);
ok('Alpha Strike queues a motion/particle event too, not just the basic attack path', fxMotionQueue.length>=1 && fxMotionQueue[fxMotionQueue.length-1].hit===true, fxMotionQueue);
fxQueue.length = 0; fxMotionQueue.length = 0;

console.log('\n[131] a full live battle still runs clean start to finish with the new battle UI wired in');
startGame();
b = setupFight([newMonster('emberling',15), newMonster('aqualing',15), newMonster('galekit',15)], 9);   // stage 9: a bigger boss fight
let steps = 0, threw = null;
try{
  while(state.battle && !state.battle.result && steps<300){
    const bb = state.battle;
    if(bb.awaitingInput){
      const u = bb.qIndex<bb.queue.length ? bb.queue[bb.qIndex] : null;
      const targets = u ? getValidTargets(u) : [];
      if(u && targets.length) playerTarget(targets[0].id);
      else { bb.awaitingInput=false; bb.qIndex++; nextTurn(); }
    } else {
      flushTimers();   // runs whatever's pending: enemy turns, stun ticks, pacing delays
    }
    steps++;
  }
} catch(e){ threw = e; }
ok('the fight resolves without throwing', threw===null, threw && (threw.stack||String(threw)));
ok('and actually concludes (win or lose) rather than stalling out', !!(state.battle && state.battle.result), {steps, result: state.battle&&state.battle.result});
ok('the loop made real progress rather than looping on nothing', steps>0 && steps<300, steps);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
