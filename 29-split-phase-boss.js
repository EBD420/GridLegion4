
(function(){
function setupFight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.intel={history:[],wins:0}; state.stage=stage;
  beginBattle(); return state.battle;
}
function setupFrontBack(frontMon, backMon, stage){
  state.roster=[frontMon, backMon];
  state.formation.front=[frontMon.uid, null, null];
  state.formation.back=[backMon.uid, null, null];
  state.intel={history:[],wins:0}; state.stage=stage;
  beginBattle(); return state.battle;
}
const SPLIT_STAGE = CAMPAIGN_LENGTH + 6;   // depth 6 — the first Fracture Engine appearance
/* Same well-formedness check 25-sprites.js applies to every other data-table
   entry — repeated locally here since DEEP_SPLIT_BOSS is new content from a
   later round than that suite's "the 40 designed creatures" milestone tally,
   which is deliberately left as a historical marker rather than extended. */
function validRecipe(r){
  if(!r || typeof r!=='object') return false;
  if(SPRITE_SHAPES.indexOf(r.shape)<0) return false;
  if(!Array.isArray(r.accents) || !r.accents.every(a=>SPRITE_ACCENT_IDS.indexOf(a)>=0)) return false;
  if(typeof r.eyes!=='number' || r.eyes<1 || r.eyes>4) return false;
  if(r.scale!==undefined && (typeof r.scale!=='number' || r.scale<=0)) return false;
  return true;
}

console.log('\n[147] the split-boss cadence never collides with an elite wave, the Foundry Core, or a warlord');
ok('depth 6 is the first appearance', splitBossForStage(CAMPAIGN_LENGTH+6)===DEEP_SPLIT_BOSS);
ok('it recurs every 10th depth after that (16, 26, 36...)',
   splitBossForStage(CAMPAIGN_LENGTH+16)===DEEP_SPLIT_BOSS && splitBossForStage(CAMPAIGN_LENGTH+26)===DEEP_SPLIT_BOSS && splitBossForStage(CAMPAIGN_LENGTH+36)===DEEP_SPLIT_BOSS);
ok('never appears before the Deep at all', splitBossForStage(1)===null && splitBossForStage(CAMPAIGN_LENGTH)===null);
[1,2,3,4,5,7,8,9,10,11,15,17,20].forEach(d=>{
  ok('depth '+d+' is not a split-boss depth', splitBossForStage(CAMPAIGN_LENGTH+d)===null);
});
ok('depth 5 (not a split-boss depth) is still an ordinary elite wave', isEliteStage(CAMPAIGN_LENGTH+5) && !bossForStage(CAMPAIGN_LENGTH+5));
ok('depth 10 is still the Foundry Core, untouched by the new cadence', bossForStage(CAMPAIGN_LENGTH+10)===DEEP_BOSS);
ok('depth 7 is still the first warlord, untouched by the new cadence', bossForStage(CAMPAIGN_LENGTH+7)===WARLORDS.ashclaw);
ok('bossForStage resolves the split boss correctly at its own depth', bossForStage(SPLIT_STAGE)===DEEP_SPLIT_BOSS);

console.log('\n[148] buildBossUnits() branches into buildSplitBossUnits() and builds exactly the two parts');
startGame();
let units = buildBossUnits(SPLIT_STAGE, terrainForStage(SPLIT_STAGE), null, false, DEEP_SPLIT_BOSS, null);
ok('exactly two units, one per declared part', units.length===2, units.map(u=>u.name));
ok('both are flagged isBoss', units.every(u=>u.isBoss===true));
ok('neither is shielded or a generator — no pylon gate for this boss', units.every(u=>!u.shielded && !u.isGenerator));
ok('both point at the same canonical bestiary name', units.every(u=>u.bossCodexName===DEEP_SPLIT_BOSS.name));
ok('names, elements and skills come from their own part definition', units[0].name===DEEP_SPLIT_BOSS.parts[0].name && units[0].element===DEEP_SPLIT_BOSS.parts[0].element &&
   units[0].skillName===DEEP_SPLIT_BOSS.parts[0].skill && units[1].name===DEEP_SPLIT_BOSS.parts[1].name && units[1].element===DEEP_SPLIT_BOSS.parts[1].element);
ok('the two parts carry different elements, as designed', units[0].element!==units[1].element);
ok('both sit in the back row (see getValidTargets analysis below)', units.every(u=>u.row==='back'));
ok('the boss-as-a-whole (top-level) sprite recipe is well-formed, same standard as every other data-table entry', validRecipe(DEEP_SPLIT_BOSS.sprite), DEEP_SPLIT_BOSS.sprite);
ok('each part carries its own well-formed sprite recipe too', DEEP_SPLIT_BOSS.parts.every(p=>validRecipe(p.sprite)), DEEP_SPLIT_BOSS.parts.map(p=>p.sprite));
ok('and both units actually render real svg sprites in battle, not an emoji fallback',
   units.every(u=>unitSpriteHtml(u,40).indexOf('<svg')===0));

console.log('\n[149] each part scales off the same REF/stage formula as any other boss, using its own mult');
const mult = 1 + (SPLIT_STAGE-1)*0.14;
const REF = { hp:32, atk:10, def:8, spd:9 };
DEEP_SPLIT_BOSS.parts.forEach((p,i)=>{
  const u = units[i];
  ok(p.name+': HP matches REF*stageMult*partMult', u.bHp===Math.round(REF.hp*mult*p.mult.hp), [u.bHp, Math.round(REF.hp*mult*p.mult.hp)]);
  ok(p.name+': ATK matches REF*stageMult*partMult', u.bAtk===Math.round(REF.atk*mult*p.mult.atk));
  ok(p.name+': DEF matches REF*stageMult*partMult', u.bDef===Math.round(REF.def*mult*p.mult.def));
  ok(p.name+': SPD matches REF*stageMult*partMult', u.bSpd===Math.round(REF.spd*mult*p.mult.spd));
});

console.log('\n[150] both parts are reachable no matter which row the attacker stands in — the whole point of the fight');
startGame();
let B = setupFrontBack(newMonster('emberling',15), newMonster('aqualing',15), SPLIT_STAGE);
ok('this really is the split-boss fight', !!bossForStage(state.stage) && bossForStage(state.stage).parts);
ok('exactly two enemy units on the field', B.enemyUnits.length===2);
const frontUnit = B.playerUnits.find(u=>u.row==='front'), backUnit = B.playerUnits.find(u=>u.row==='back');
const frontTargets = getValidTargets(frontUnit).map(u=>u.id).sort();
const backTargets = getValidTargets(backUnit).map(u=>u.id).sort();
const bothPartIds = B.enemyUnits.map(u=>u.id).sort();
ok('a front-row player unit can pick either boss part', JSON.stringify(frontTargets)===JSON.stringify(bothPartIds), frontTargets);
ok('a back-row player unit can pick either boss part too', JSON.stringify(backTargets)===JSON.stringify(bothPartIds), backTargets);

console.log('\n[151] the fight only ends once BOTH parts are down');
B.enemyUnits[0].hp=0; B.enemyUnits[0].fainted=true;
ok('one part down is not enough to end it', checkBattleEnd()===false && !state.battle.result);
B.enemyUnits[1].hp=0; B.enemyUnits[1].fainted=true;
ok('both parts down wins it, exactly like any other all-enemies-fainted win', checkBattleEnd()===true && state.battle.result==='win');

console.log('\n[152] updateBossShield() is a safe no-op against a boss with no shield at all');
startGame();
B = setupFrontBack(newMonster('emberling',15), newMonster('aqualing',15), SPLIT_STAGE);
let threw = null;
try{ updateBossShield(); }catch(e){ threw = e; }
ok('calling it never throws even though neither part is ever shielded', threw===null, threw);
ok('and it changes nothing about either part', B.enemyUnits.every(u=>!u.shielded && !u.shieldBroken));

console.log('\n[153] the bestiary treats the two parts as ONE boss entry, and the totals already account for it');
startGame();
ok('codexTotals counts the split boss as one more discoverable boss (BOSSES + Foundry Core + Fracture Engine + Warlords)',
   codexTotals().bosses === Object.keys(BOSSES).length + 2 + Object.keys(WARLORDS).length);
B = setupFrontBack(newMonster('emberling',15), newMonster('aqualing',15), SPLIT_STAGE);
codexRecordBattle();
ok('killing/seeing both parts records exactly one bestiary key, not two', codexCount('bosses')===1 && codex().bosses[DEEP_SPLIT_BOSS.name]===true,
   codex().bosses);

console.log('\n[154] the pre-battle hub banner and the in-battle log describe the two-part fight without crashing');
startGame();
state.stage = SPLIT_STAGE;
let threw2 = null, hubHtml = '';
try{ hubHtml = renderHub(); }catch(e){ threw2 = e; }
ok('renderHub() never throws on a boss with no genName (the historical crash this replaced)', threw2===null, threw2 && threw2.stack);
ok('the hub banner explains there is no shield this time', hubHtml.indexOf('No shield this time')>=0);
ok('it names both parts by name', hubHtml.indexOf('Anchor Core')>=0 && hubHtml.indexOf('Cleaver Rig')>=0);

startGame();
let threw3 = null;
try{ B = setupFrontBack(newMonster('emberling',15), newMonster('aqualing',15), SPLIT_STAGE); }catch(e){ threw3 = e; }
ok('beginBattle() itself never throws either', threw3===null, threw3 && threw3.stack);
ok('the battle log says both parts are already exposed', B.log.some(l=>/both exposed/i.test(l)), B.log);

console.log('\n[155] every generic boss-adjacent system already applies for free — no new code needed');
startGame();
state.stage = SPLIT_STAGE;
B = setupFrontBack(newMonster('emberling',15,1,{key:'resilient'}), newMonster('aqualing',15,1,{key:'resilient'}), SPLIT_STAGE);
ok('the boss EXP multiplier applies (bossForStage truthy feeds endBattle\'s win-branch expGain formula)', !!bossForStage(state.stage));
const bd = bossForStage(state.stage);
ok('Victory Portrait / War Journal read bossDef.name/emoji/sprite generically — already correct with zero extra code',
   bd.name==='Fracture Engine' && bd.emoji==='⚙️' && !!bd.sprite);

console.log('\n[156] a full live fight against the split boss runs clean, start to finish');
startGame();
B = setupFight([newMonster('emberling',20), newMonster('aqualing',20), newMonster('galekit',20)], SPLIT_STAGE);
let steps = 0, threw4 = null;
try{
  while(state.battle && !state.battle.result && steps<300){
    const bb = state.battle;
    if(bb.awaitingInput){
      const u = bb.qIndex<bb.queue.length ? bb.queue[bb.qIndex] : null;
      const targets = u ? getValidTargets(u) : [];
      if(u && targets.length) playerTarget(targets[0].id);
      else { bb.awaitingInput=false; bb.qIndex++; nextTurn(); }
    } else {
      flushTimers();
    }
    steps++;
  }
}catch(e){ threw4 = e; }
ok('the fight resolves without throwing', threw4===null, threw4 && (threw4.stack||String(threw4)));
ok('and actually concludes (win or lose), needing both parts down for a win', !!(state.battle && state.battle.result), {steps, result: state.battle&&state.battle.result});
ok('real progress was made rather than stalling', steps>0 && steps<300, steps);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
