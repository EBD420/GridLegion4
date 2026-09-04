
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
/* A recipe is well-formed if its shape/accents are all drawn from the live
   tables and eyes/scale are sane numbers — the same shape every entry in
   the data tables (and every reconstituted save) must satisfy. */
function validRecipe(r){
  if(!r || typeof r!=='object') return false;
  if(SPRITE_SHAPES.indexOf(r.shape)<0) return false;
  if(!Array.isArray(r.accents) || !r.accents.every(a=>SPRITE_ACCENT_IDS.indexOf(a)>=0)) return false;
  if(typeof r.eyes!=='number' || r.eyes<1 || r.eyes>4) return false;
  if(r.scale!==undefined && (typeof r.scale!=='number' || r.scale<=0)) return false;
  return true;
}
function wellFormedSvg(html, expectMinShapes){
  if(typeof html!=='string' || !html) return false;
  if(html.indexOf('<svg')!==0) return false;
  if(html.indexOf('</svg>')!==html.length-6) return false;
  if(html.indexOf('viewBox=')<0) return false;
  const opens = (html.match(/<(rect|ellipse|circle|polygon|path|line)\b/g)||[]).length;
  return opens >= (expectMinShapes||2);
}

console.log('\n[114] every data-table entry carries a valid sprite recipe');
SPECIES_IDS.concat(CHAMPION_IDS).forEach(id=>{
  ok('SPECIES.'+id+' has a valid recipe', validRecipe(SPECIES[id].sprite), SPECIES[id].sprite);
});
ENEMY_IDS.forEach(id=>{
  ok('ENEMY_SPECIES.'+id+' has a valid recipe', validRecipe(ENEMY_SPECIES[id].sprite), ENEMY_SPECIES[id].sprite);
});
Object.keys(HYBRID_SPECIES).forEach(id=>{
  ok('HYBRID_SPECIES.'+id+' has a valid recipe', validRecipe(HYBRID_SPECIES[id].sprite), HYBRID_SPECIES[id].sprite);
});
Object.keys(BOSSES).forEach(k=>{
  ok('BOSSES['+k+'] has a valid recipe', validRecipe(BOSSES[k].sprite), BOSSES[k].sprite);
});
ok('DEEP_BOSS has a valid recipe', validRecipe(DEEP_BOSS.sprite), DEEP_BOSS.sprite);
Object.keys(WARLORDS).forEach(k=>{
  ok('WARLORDS.'+k+' has a valid recipe', validRecipe(WARLORDS[k].sprite), WARLORDS[k].sprite);
});
ok('exactly the 40 designed creatures carry a recipe',
   SPECIES_IDS.length + CHAMPION_IDS.length + ENEMY_IDS.length + Object.keys(HYBRID_SPECIES).length
   + Object.keys(BOSSES).length + 1 + Object.keys(WARLORDS).length === 40,
   SPECIES_IDS.length+'/'+CHAMPION_IDS.length+'/'+ENEMY_IDS.length+'/'+Object.keys(HYBRID_SPECIES).length);
ok('GEN_SPRITE (shared boss-generator look) is itself valid', validRecipe(GEN_SPRITE));

console.log('\n[115] spriteSvg() renders well-formed, self-contained SVG');
ok('a plain single-element recipe renders', wellFormedSvg(spriteSvg(SPECIES.emberling.sprite, 'fire', 40)));
ok('every shape family renders without throwing', SPRITE_SHAPES.every(shape=>{
  try { return wellFormedSvg(spriteSvg({shape, accents:[], eyes:2}, 'water', 40)); }
  catch(e){ return false; }
}));
ok('every accent renders without throwing', SPRITE_ACCENT_IDS.every(acc=>{
  try { return wellFormedSvg(spriteSvg({shape:'organic', accents:[acc], eyes:2}, 'nature', 40), 3); }
  catch(e){ return false; }
}));
ok('a recipe with no accents still renders body + eyes', wellFormedSvg(spriteSvg({shape:'mech', accents:[], eyes:1}, 'earth', 40), 2));
ok('scale inflates the rendered pixel box', (()=>{
  const small = spriteSvg({shape:'organic', accents:[], eyes:2, scale:1}, 'fire', 40);
  const big = spriteSvg({shape:'organic', accents:[], eyes:2, scale:1.5}, 'fire', 40);
  const wSmall = +small.match(/width="(\d+)"/)[1], wBig = +big.match(/width="(\d+)"/)[1];
  return wBig > wSmall;
})());
ok('spriteSvg on a falsy recipe returns an empty string, never throws', spriteSvg(null, 'fire', 40)==='');

console.log('\n[116] hybrids render genuinely two-toned — body and accent pull different elements');
(()=>{
  const r = { shape:'organic', accents:['tail'], eyes:2 };
  const mono = spriteSvg(r, ['fire'], 40);
  const dual = spriteSvg(r, ['fire','water'], 40);
  ok('a single-element creature uses one color for body and accent', mono.indexOf('var(--fire)')>=0 && mono.indexOf('var(--water)')<0);
  ok('a two-element creature colors its accent from the second element', dual.indexOf('var(--fire)')>=0 && dual.indexOf('var(--water)')>=0);
})();
Object.keys(HYBRID_SPECIES).forEach(id=>{
  const sd = HYBRID_SPECIES[id];
  const svg = spriteSvg(sd.sprite, sd.elements, 40);
  ok(id+' sprite references both parent element colors', sd.elements.every(e=>svg.indexOf('var(--'+e+')')>=0), sd.elements);
});

console.log('\n[117] getSpeciesData() carries the sprite recipe through Prime and Ascended tiers');
['emberling','terrafang'].forEach(id=>{
  const base = getSpeciesData(id, 1), prime = getSpeciesData(id, 2), ascended = getSpeciesData(id, 3);
  ok(id+' base has the recipe', base.sprite===SPECIES[id].sprite);
  ok(id+' Prime carries the SAME recipe through (the bug this feature had to fix)', prime.sprite===SPECIES[id].sprite, prime.sprite);
  ok(id+' Ascended carries the SAME recipe through too', ascended.sprite===SPECIES[id].sprite, ascended.sprite);
});
const hid = Object.keys(HYBRID_SPECIES)[0];
ok('a hybrid Prime also keeps its recipe', getSpeciesData(hid, 2).sprite===HYBRID_SPECIES[hid].sprite);

console.log('\n[118] every unit-builder threads .sprite onto the battle unit it produces');
startGame();
let b = setupFight([newMonster('emberling',10), newMonster('aqualing',10)], 3);
ok('player units carry their species sprite', b.playerUnits.every(u=>validRecipe(u.sprite)), b.playerUnits.map(u=>u.sprite));
ok('plain-stage enemy units carry their species sprite', b.enemyUnits.every(u=>validRecipe(u.sprite)), b.enemyUnits.map(u=>u.sprite));
forceWin();

startGame();
b = setupFight([newMonster('terrafang',20)], 5);   // stage 5: scripted commander fight
ok('boss-stage generators carry the shared GEN_SPRITE', b.enemyUnits.filter(u=>u.isGenerator).every(u=>u.sprite===GEN_SPRITE));
ok('the boss unit itself carries its own recipe', b.enemyUnits.find(u=>u.isBoss).sprite===BOSSES[5].sprite);
forceWin();

startGame();
b = setupFight([newMonster('emberling',5)], 1);
ok('tutorialActive() short-circuits to buildTutorialEnemies — sanity: not tutorial here', !tutorialActive());
const tut = buildTutorialEnemies(TERRAINS.clear);
ok('tutorial enemies carry a sprite too', tut.length===2 && tut.every(u=>validRecipe(u.sprite)));

const duelUnits = buildDuelUnits({ units:[
  { speciesId:'emberling', level:8, tier:1, parts:[], trait:null, row:'front' },
  { speciesId:'aqualing', level:8, tier:1, parts:[], trait:null, row:'front' },
]}, TERRAINS.clear);
ok('a rebuilt duel opponent unit carries its sprite', duelUnits.length===2 && duelUnits.every(u=>validRecipe(u.sprite)), duelUnits.map(u=>u.sprite));

console.log('\n[119] computeStats() surfaces .sprite so every roster/formation card can use it');
startGame();
const mon = newMonster('galekit', 6);
const st = computeStats(mon);
ok('computeStats result carries the species recipe', st.sprite===SPECIES.galekit.sprite);
mon.tier = 2;
const stPrime = computeStats(Object.assign(newMonster('galekit',6),{tier:2}));
ok('a Prime monster still resolves a sprite through computeStats', validRecipe(stPrime.sprite));

console.log('\n[120] spriteOrEmoji() / unitSpriteHtml() gate correctly');
ok('unknown entries never render — always the placeholder', spriteOrEmoji(SPECIES.emberling, false, 40)==='❓');
ok('a known entry with a recipe renders svg', wellFormedSvg(spriteOrEmoji(SPECIES.emberling, true, 40)));
ok('a known entry with no recipe at all falls back to its emoji, never throws', spriteOrEmoji({emoji:'🙂', element:'fire'}, true, 40)==='🙂');
ok('unitSpriteHtml on a unit with a recipe renders svg', wellFormedSvg(unitSpriteHtml({sprite:SPECIES.emberling.sprite, element:'fire', elements:['fire']}, 40)));
ok('unitSpriteHtml on a unit with no recipe falls back to its emoji', unitSpriteHtml({sprite:null, emoji:'💥'}, 40)==='💥');
ok('unitSpriteHtml on a nullish unit returns empty, never throws', unitSpriteHtml(null, 40)==='');

console.log('\n[121] reviveSpriteRecipe() is a real sanitizer, not a passthrough');
const clean = { shape:'mech', accents:['horns','legs'], eyes:2, scale:1.3 };
ok('a clean recipe survives intact', JSON.stringify(reviveSpriteRecipe(clean))===JSON.stringify(clean));
ok('a bogus shape is rejected outright', reviveSpriteRecipe({shape:'not_a_shape', accents:[], eyes:2})===null);
ok('null/non-object input is rejected', reviveSpriteRecipe(null)===null && reviveSpriteRecipe('mech')===null);
ok('unknown accent names are quietly dropped, known ones kept', (()=>{
  const r = reviveSpriteRecipe({shape:'organic', accents:['ears','not_a_real_accent','tail'], eyes:2});
  return r.accents.length===2 && r.accents.indexOf('ears')>=0 && r.accents.indexOf('tail')>=0;
})());
ok('accents list is capped at 4', reviveSpriteRecipe({shape:'organic', accents:['ears','horns','wings','tail','fin','crest'], eyes:2}).accents.length<=4);
ok('eyes out of range clamps into 1-4', reviveSpriteRecipe({shape:'organic', accents:[], eyes:99}).eyes===4
   && reviveSpriteRecipe({shape:'organic', accents:[], eyes:-3}).eyes===1);
ok('a missing eyes count defaults to 2', reviveSpriteRecipe({shape:'organic', accents:[]}).eyes===2);
ok('scale out of range clamps into 0.5-2.5', reviveSpriteRecipe({shape:'organic', accents:[], eyes:2, scale:99}).scale===2.5
   && reviveSpriteRecipe({shape:'organic', accents:[], eyes:2, scale:0.01}).scale===0.5);
ok('a missing scale defaults to 1', reviveSpriteRecipe({shape:'organic', accents:[], eyes:2}).scale===1);

console.log('\n[122] the Victory Portrait carries sprites through a save/load round trip');
startGame();
b = setupFight([newMonster('emberling',20)], 7);   // stage 7: guaranteed warlord (Ashclaw)
b.dmgByUnitId[b.playerUnits[0].id] = 999;
forceWin();
ok('a fresh portrait carries a boss sprite', !!state.lastResult.portrait && validRecipe(state.lastResult.portrait.bossSprite), state.lastResult.portrait);
ok('and it is literally the Ashclaw recipe', state.lastResult.portrait.bossSprite===WARLORDS.ashclaw.sprite);
const revived = reviveJournal(JSON.parse(JSON.stringify(state.journal)));
ok('the sprite survives a JSON round trip with an equivalent (not identical) object', JSON.stringify(revived[0].portrait.bossSprite)===JSON.stringify(WARLORDS.ashclaw.sprite));
ok('mvpSprite also survives the round trip', validRecipe(revived[0].portrait.mvpSprite));

const badPortrait = { element:'fire', label:'Stage 7', mvpSprite:{shape:'evil_shape', accents:['xyz'], eyes:400} };
const badJournalEntry = [{ id:'jx', stage:7, win:true, text:'t', at:Date.now(), portrait: badPortrait }];
const revivedBad = reviveJournal(badJournalEntry);
ok('a bogus mvpSprite shape is sanitized to null rather than rejecting the whole portrait', revivedBad[0].portrait!==null && revivedBad[0].portrait.mvpSprite===null, revivedBad[0].portrait);

console.log('\n[123] the real render sites accept sprites without throwing and actually draw one');
startGame();
codex();
SPECIES_IDS.concat(CHAMPION_IDS).forEach(id=>state.codex.species[id]=true);
ENEMY_IDS.forEach(id=>state.codex.enemies[id]=true);
Object.keys(HYBRID_SPECIES).forEach(id=>state.codex.hybrids[id]=true);
let codexHtml;
ok('renderCodex() does not throw with everything discovered', (()=>{ try{ codexHtml = renderCodex(); return true; }catch(e){ return false; } })());
ok('and it actually contains rendered sprite svgs, not just emoji',
   (codexHtml.match(/<svg/g)||[]).length === Object.keys(SPECIES).length + ENEMY_IDS.length + Object.keys(HYBRID_SPECIES).length,
   (codexHtml.match(/<svg/g)||[]).length);

startGame();
const carrier = newMonster('voltcub', 9);
state.roster = [carrier];
state.formation.front = [carrier.uid, null, null];
let rosterHtml;
ok('renderRoster() does not throw', (()=>{ try{ rosterHtml = renderRoster(); return true; }catch(e){ return false; } })());
ok('the roster card renders an svg sprite for a real monster', /<svg/.test(rosterHtml));

startGame();
b = setupFight([newMonster('emberling',10)], 5);
let battleHtml;
ok('renderBattle() does not throw with a live boss fight on screen', (()=>{ try{ battleHtml = renderBattle(); return true; }catch(e){ return false; } })());
// Every unit card draws its own sprite, AND the turn-order timeline (added
// in the battle-UI rework) draws a small preview sprite per upcoming actor.
const timelineChips = Math.min(8, b.queue.slice(b.qIndex).filter(u=>!u.fainted).length);
ok('every unit on the field, plus every timeline chip, rendered its own svg sprite',
   (battleHtml.match(/<svg/g)||[]).length === b.playerUnits.length + b.enemyUnits.length + timelineChips,
   (battleHtml.match(/<svg/g)||[]).length+' vs '+(b.playerUnits.length+b.enemyUnits.length+timelineChips));
forceWin();

startGame();
b = setupFight([newMonster('emberling',20)], 7);
b.dmgByUnitId[b.playerUnits[0].id] = 999;
forceWin();
const resultHtml = renderResult();
ok('the result screen\'s Victory Portrait renders an svg sprite for the warlord', /<svg/.test(resultHtml));

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
