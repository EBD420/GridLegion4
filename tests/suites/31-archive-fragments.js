
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

console.log('\n[168] the fragment/theory data is well-formed');
ok('twelve fragments — three per theory — keeps the "ambiguous, not a checklist" balance intentional', ARCHIVE_FRAGMENTS.length===12);
ok('every fragment id is unique', new Set(ARCHIVE_FRAGMENTS.map(f=>f.id)).size===ARCHIVE_FRAGMENTS.length);
ok('every fragment names a real theory and carries real text', ARCHIVE_FRAGMENTS.every(f=>ARCHIVE_THEORIES[f.theory] && typeof f.text==='string' && f.text.length>10));
ok('exactly four theories, each with a name and a blurb', Object.keys(ARCHIVE_THEORIES).length===4 &&
   Object.values(ARCHIVE_THEORIES).every(t=>t.name && t.blurb));
const perTheory = {}; ARCHIVE_FRAGMENTS.forEach(f=>perTheory[f.theory]=(perTheory[f.theory]||0)+1);
ok('each theory has at least ARCHIVE_THEORY_MIN fragments behind it, or a leading read could never form for it',
   Object.values(perTheory).every(c=>c>=ARCHIVE_THEORY_MIN), perTheory);
ok('ARCHIVE_FRAGMENT_CHANCE is a real probability', ARCHIVE_FRAGMENT_CHANCE>0 && ARCHIVE_FRAGMENT_CHANCE<1);

console.log('\n[169] archiveFound / archiveFoundCount / undiscoveredFragments basics');
startGame();
ok('a fresh legion has found nothing', archiveFoundCount()===0 && undiscoveredFragments().length===ARCHIVE_FRAGMENTS.length);
state.archive[ARCHIVE_FRAGMENTS[0].id] = true;
ok('marking one found is reflected immediately', archiveFoundCount()===1 && undiscoveredFragments().length===ARCHIVE_FRAGMENTS.length-1);
ok('the found one is excluded from the undiscovered pool', undiscoveredFragments().every(f=>f.id!==ARCHIVE_FRAGMENTS[0].id));

console.log('\n[170] rollArchiveFragment: gated by chance, guaranteed new, quietly stops once everything is found');
startGame();
const realRandom = Math.random;
Math.random = () => ARCHIVE_FRAGMENT_CHANCE;   // exactly at the boundary — the >= check should reject it
ok('a roll landing exactly on the chance threshold does not trigger (the check is >=, not >)', rollArchiveFragment()===null);
Math.random = () => 0;   // always clears the chance gate, always picks index 0 of whatever pool remains
const seen = [];
for(let i=0;i<ARCHIVE_FRAGMENTS.length;i++){
  const f = rollArchiveFragment();
  ok('roll #'+(i+1)+' returns a real, previously-undiscovered fragment', !!f && seen.indexOf(f.id)<0, f);
  if(f) seen.push(f.id);
}
ok('every fragment was found exactly once, none skipped, none repeated', seen.length===ARCHIVE_FRAGMENTS.length && new Set(seen).size===ARCHIVE_FRAGMENTS.length);
ok('the archive is now fully populated', archiveFoundCount()===ARCHIVE_FRAGMENTS.length);
ok('rolling again once everything is found returns null, chance roll or not', rollArchiveFragment()===null);
Math.random = realRandom;

console.log('\n[171] archiveTheoryTally / leadingArchiveTheory: null until there is real evidence, a genuine plurality, or an honest split');
startGame();
ok('nothing found yet reads as no theory at all', leadingArchiveTheory()===null);
const buildersFrags = ARCHIVE_FRAGMENTS.filter(f=>f.theory==='builders');
state.archive[buildersFrags[0].id] = true; state.archive[buildersFrags[1].id] = true;
ok('two fragments found is still below ARCHIVE_THEORY_MIN — no verdict offered', leadingArchiveTheory()===null, archiveTheoryTally());
state.archive[buildersFrags[2].id] = true;   // now three, at the minimum, all "builders"
const lead = leadingArchiveTheory();
ok('a clean plurality reads out cleanly once the minimum is met', !!lead && lead.split===false && lead.key==='builders', lead);

startGame();
const kinFrags = ARCHIVE_FRAGMENTS.filter(f=>f.theory==='kin');
const visitorFrags = ARCHIVE_FRAGMENTS.filter(f=>f.theory==='visitors');
state.archive[kinFrags[0].id] = true; state.archive[kinFrags[1].id] = true;
state.archive[visitorFrags[0].id] = true; state.archive[visitorFrags[1].id] = true;
const tied = leadingArchiveTheory();
ok('a genuine two-way tie reads as split, with no single winning key', !!tied && tied.split===true && tied.key===null, tied);

console.log('\n[172] endBattle wiring: Deep-only, folds a find into state.archive, surfaces it on lastResult');
startGame();
const realRandom2 = Math.random;
Math.random = () => 0;   // always clears ARCHIVE_FRAGMENT_CHANCE when the check runs at all
let B = setupFight([newMonster('emberling',10,1,{key:'resilient'})], 3);   // stage 3: not Deep
forceWin();
ok('a non-Deep win never rolls a fragment, even with the odds forced maximally in its favour', state.lastResult.archiveFragment===null, state.lastResult.archiveFragment);
ok('and state.archive stays untouched', archiveFoundCount()===0);

startGame();
const deepStage = CAMPAIGN_LENGTH + 1;   // an ordinary Deep wave — not a boss, warlord or elite depth
ok('depth 1 really is an ordinary wave for this check', isDeep(deepStage) && !isEliteStage(deepStage) && !bossForStage(deepStage));
B = setupFight([newMonster('emberling',10,1,{key:'resilient'})], deepStage);
forceWin();
ok('a Deep win with the odds forced does roll a fragment', !!state.lastResult.archiveFragment, state.lastResult.archiveFragment);
ok('and it is recorded in state.archive immediately', archiveFoundCount()===1 && state.archive[state.lastResult.archiveFragment.id]===true);

startGame();
ARCHIVE_FRAGMENTS.forEach(f=>{ state.archive[f.id]=true; });   // exhaust the archive first
B = setupFight([newMonster('emberling',10,1,{key:'resilient'})], deepStage);
forceWin();
ok('once everything is found, a Deep win quietly stops offering fragments rather than erroring', state.lastResult.archiveFragment===null);
Math.random = realRandom2;

console.log('\n[173] persistence: the archive rides the save, sanitized on the way back in');
startGame();
state.archive[ARCHIVE_FRAGMENTS[0].id]=true; state.archive[ARCHIVE_FRAGMENTS[3].id]=true;
let saved = serializeSave();
ok('archive rides along in the save', JSON.stringify(saved.archive)===JSON.stringify(state.archive));
applySave(saved, 0);
ok('a clean save round-trips exactly', archiveFoundCount()===2 && state.archive[ARCHIVE_FRAGMENTS[0].id]===true && state.archive[ARCHIVE_FRAGMENTS[3].id]===true);

const malformed = {}; malformed[ARCHIVE_FRAGMENTS[0].id]=true; malformed[ARCHIVE_FRAGMENTS[1].id]=false; malformed['notarealfragment']=true;
applySave(Object.assign({}, saved, { archive: malformed }), 0);
ok('only known fragment ids with a truthy value survive revival', JSON.stringify(Object.keys(state.archive))===JSON.stringify([ARCHIVE_FRAGMENTS[0].id]), state.archive);

applySave(Object.assign({}, saved, { archive: 'not-an-object' }), 0);
ok('a non-object archive in the save file degrades to empty, not a crash', Object.keys(state.archive).length===0);

console.log('\n[174] the archive survives Rebirth on purpose ("everything collected stays"); only a brand-new legion clears it');
startGame();
state.stage = REBIRTH_MIN_STAGE + 1;
state.archive[ARCHIVE_FRAGMENTS[0].id]=true; state.archive[ARCHIVE_FRAGMENTS[1].id]=true;
doRebirth(); doRebirth();
ok('the Archive survives Rebirth exactly like the Bestiary and Battle-Forged Bonds — lore learned stays learned', archiveFoundCount()===2);

startGame();
ok('a genuinely fresh legion (initGame) clears the archive back to nothing', archiveFoundCount()===0);

console.log('\n[175] the Archive screen, the Hub button, and the Result-screen callout');
startGame();
let archiveHtml = renderArchive();
ok('an empty archive shows the right progress header', archiveHtml.indexOf('RUSTBOUND ARCHIVE — 0/'+ARCHIVE_FRAGMENTS.length)>=0);
ok('every fragment shows as an unrevealed placeholder', (archiveHtml.match(/❓ \?\?\?/g)||[]).length===ARCHIVE_FRAGMENTS.length);
ok('no fragment text has leaked through yet', ARCHIVE_FRAGMENTS.every(f=>archiveHtml.indexOf(escapeHtml(f.text))<0));
ok('the leading-theory panel is honest about having nothing to go on', /Not enough of the archive/.test(archiveHtml));

const bFrags = ARCHIVE_FRAGMENTS.filter(f=>f.theory==='builders');
state.archive[bFrags[0].id]=true; state.archive[bFrags[1].id]=true; state.archive[bFrags[2].id]=true;
archiveHtml = renderArchive();
ok('a discovered fragment shows its real text (HTML-escaped like every other name/desc on this screen)', archiveHtml.indexOf(escapeHtml(bFrags[0].text))>=0);
ok('a clean plurality names its leading theory', archiveHtml.indexOf('Leading theory: '+ARCHIVE_THEORIES.builders.name)>=0);
ok("and shows that theory's blurb", archiveHtml.indexOf(ARCHIVE_THEORIES.builders.blurb)>=0);

hubTab='progress';
let hubHtml = renderHub();
ok('the Hub button reflects the live fragment count', hubHtml.indexOf('📜 Archive (3/'+ARCHIVE_FRAGMENTS.length+')')>=0, hubHtml);

startGame();
state.stage = CAMPAIGN_LENGTH+1;
state.lastResult = { win:true, expGain:10, captured:null, part:null, drops:[], dom:null, levelled:[], finale:false, elite:false, boss:null,
                      favorGains:{}, newChampions:[], newBlessings:[], dailyDone:null, archiveFragment: ARCHIVE_FRAGMENTS[0] };
let resultHtml = renderResult();
ok('the Result screen calls out a recovered fragment', resultHtml.indexOf('Archive fragment recovered')>=0);
state.lastResult.archiveFragment = null;
resultHtml = renderResult();
ok('and says nothing at all when there is nothing to call out', resultHtml.indexOf('Archive fragment recovered')<0);

state.screen = 'hub';
let threw = null;
try{ goArchive(); }catch(e){ threw = e; }   // navigates and calls render() internally
ok('goArchive() navigates to the archive screen and render() dispatches it without throwing',
   threw===null && state.screen==='archive', threw && threw.stack);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
