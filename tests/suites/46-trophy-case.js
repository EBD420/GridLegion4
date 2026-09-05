
(function(){
function setupFight(mons, stage){
  state.roster=mons;
  state.formation.front=[mons[0]?mons[0].uid:null, mons[1]?mons[1].uid:null, mons[2]?mons[2].uid:null];
  state.formation.back=[mons[3]?mons[3].uid:null, mons[4]?mons[4].uid:null, mons[5]?mons[5].uid:null];
  state.intel={history:[],wins:0}; state.stage=stage;
  beginBattle(); return state.battle;
}
function sixMonsters(){ return ['emberling','aqualing','terrafang','emberling','aqualing','terrafang'].map(id=>newMonster(id,10,1,{key:'keen'})); }
function fillFormation(mons){
  state.roster = mons;
  state.formation.front=[mons[0].uid, mons[1].uid, mons[2].uid];
  state.formation.back=[mons[3].uid, mons[4].uid, mons[5].uid];
}
function forceWin(){ const b=state.battle; b.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;}); return checkBattleEnd(); }
function forceLose(){ const b=state.battle; b.playerUnits.forEach(u=>{u.hp=0;u.fainted=true;}); return checkBattleEnd(); }
const realRandom = Math.random;
const ELITE_STAGE = CAMPAIGN_LENGTH + 5;   // depth 5: a real elite wave, no boss (matches the Vanguard Bounty suite)

console.log('\n[293] noteTrophy via grantAceDrop/grantVanguardBounty: recorded only on an actual drop, kept at the toughest (highest-stage) kill');
startGame();
let B = setupFight([newMonster('emberling',30)], 3);
let ace = B.enemyUnits[0];
ace.isAce = true; ace.name = 'Ironclad ' + ace.name;
state.parts = [];
grantAceDrop(ace);
ok('a successful Ace drop records a trophy', !!state.trophyAce);
ok('the trophy names the fallen unit and its species', state.trophyAce.name===ace.name && state.trophyAce.speciesKey===ace.speciesKey);
ok('the trophy remembers the stage it fell at', state.trophyAce.stage===3);

startGame();
B = setupFight([newMonster('emberling',30)], 2);   // a shallower, easier stage
let weakerAce = B.enemyUnits[0];
weakerAce.isAce = true; weakerAce.name = 'Voltbound ' + weakerAce.name;
state.parts = [];
state.trophyAce = { name:'Old Champion', speciesKey:'scraphound', stage:3 };
grantAceDrop(weakerAce);
ok('a lower-stage kill afterward does not overwrite a tougher trophy already on record', state.trophyAce.name==='Old Champion' && state.trophyAce.stage===3);

startGame();
B = setupFight([newMonster('emberling',30)], 4);   // a deeper, tougher stage (no boss/warlord in the way)
let strongerAce = B.enemyUnits[0];
strongerAce.isAce = true; strongerAce.name = 'Rustking ' + strongerAce.name;
state.parts = [];
state.trophyAce = { name:'Old Champion', speciesKey:'scraphound', stage:3 };
grantAceDrop(strongerAce);
ok('a higher-stage kill afterward DOES replace the record', state.trophyAce.name===strongerAce.name && state.trophyAce.stage===4, state.trophyAce);

startGame();
B = setupFight([newMonster('emberling',30)], 3);
let deniedAce = B.enemyUnits[0];
deniedAce.isAce = true;
state.parts = Array.from({length:14}, (_,i)=>({uid:'full'+i, key:'scraphound'}));
state.trophyAce = null;
grantAceDrop(deniedAce);
ok('a full salvage bay denies the loot AND the trophy — you only get credit for what you actually walked away with', state.trophyAce===null);

startGame();
B = setupFight([newMonster('emberling',40)], ELITE_STAGE);
let vg = B.enemyUnits[0];
vg.isVanguard = true; vg.name = 'Vanguard ' + vg.name;
state.parts = [];
state.trophyAce = { name:'Standing Ace Record', speciesKey:'scraphound', stage:6 };   // known value, unrelated to this Vanguard kill
grantVanguardBounty(vg);
ok('a successful Vanguard bounty records its own separate trophy', !!state.trophyVanguard);
ok('it names the fallen escort leader and its species, independent of the Ace trophy above', state.trophyVanguard.name===vg.name && state.trophyVanguard.speciesKey===vg.speciesKey);
ok('the Ace trophy is a completely separate field — a Vanguard kill never touches it', state.trophyAce && state.trophyAce.name==='Standing Ace Record');

startGame();
B = setupFight([newMonster('emberling',40)], ELITE_STAGE);
let deniedVg = B.enemyUnits[0];
deniedVg.isVanguard = true;
state.parts = Array.from({length:14}, (_,i)=>({uid:'full'+i, key:'scraphound'}));
state.trophyVanguard = null;
grantVanguardBounty(deniedVg);
ok('same denial rule for the Vanguard bounty — a full bay means no trophy either', state.trophyVanguard===null);

console.log('\n[294] state.bestStreak: a permanent high-water mark that a losing streak can never touch');
startGame();
fillFormation(sixMonsters());
state.stage = 2;
ok('starts at 0, same as the streak itself', state.bestStreak===0);
beginBattle(); forceWin();
ok('a first win sets the record to 1, tracking the streak', state.bestStreak===1 && state.streak===1);
advanceStage();
beginBattle(); forceWin();
advanceStage();
beginBattle(); forceWin();
ok('the record keeps pace with a growing streak', state.bestStreak===3 && state.streak===3);
advanceStage();
beginBattle(); forceLose();
ok('a loss resets the live streak but the record stays exactly where it peaked', state.streak===-1 && state.bestStreak===3);
retryStage();
beginBattle(); forceLose();
retryStage();
beginBattle(); forceLose();
retryStage();
beginBattle(); forceLose();
ok('an even longer LOSING streak never moves the win-streak record at all', state.streak===-4 && state.bestStreak===3);
retryStage();
beginBattle(); forceWin();
advanceStage();
beginBattle(); forceWin();
advanceStage();
beginBattle(); forceWin();
advanceStage();
beginBattle(); forceWin();
ok('a later run that actually beats the old record does update it', state.streak===4 && state.bestStreak===4);

console.log('\n[295] renderTrophyCase(): four cards plus the Archive tally, empty vs. populated');
startGame();
let html = renderTrophyCase();
ok('a totally fresh legion still renders the screen, with placeholders rather than blank cards', html.indexOf('TROPHY CASE')>=0 && html.indexOf('Deepest Reach')>=0);
ok('deepest reach shows the em-dash placeholder before any Deep run', html.indexOf('Clear Stage 10 and keep going')>=0);
ok('win streak shows its own placeholder', html.indexOf('Win a couple of stages back to back')>=0);
ok('neither named-elite card claims a kill that never happened', html.indexOf('Rare named elites start turning up')>=0 && html.indexOf('Escort leaders show up on Elite Waves')>=0);
ok('the Archive tally lists all four theories, all at zero', Object.keys(ARCHIVE_THEORIES).every(k=>html.indexOf(ARCHIVE_THEORIES[k].name+': 0/')>=0));
ok('a link back to the full Archive screen is present', html.indexOf('onclick="goArchive()"')>=0);

state.bestDepth = 4;
state.bestStreak = 6;
state.trophyAce = { name:'Ironclad Scraphound', speciesKey:'scraphound', stage:9 };
state.trophyVanguard = { name:'Vanguard Sparkdrone', speciesKey:'sparkdrone', stage:14 };
state.archive.frag_forge_seal = true;
html = renderTrophyCase();
ok('deepest reach renders the real depth', html.indexOf('Depth 4')>=0);
ok('win streak renders the real record', html.indexOf('6 in a row')>=0);
ok('the Ace card names the trophy and the stage it fell at', html.indexOf('Ironclad Scraphound')>=0 && html.indexOf('Stage 9')>=0);
ok('the Vanguard card does the same, independently', html.indexOf('Vanguard Sparkdrone')>=0 && html.indexOf('Stage 14')>=0);
ok('the Archive tally reflects the one fragment found, filed under its real theory', html.indexOf(ARCHIVE_THEORIES.builders.name+': 1/')>=0);

hubTab='progress';
let hubHtml = renderHub();
ok('the Hub carries a button straight into the Trophy Case', hubHtml.indexOf('Trophy Case')>=0 && hubHtml.indexOf('onclick="goTrophyCase()"')>=0);
goTrophyCase();
ok('goTrophyCase actually lands on the screen', state.screen==='trophycase');

console.log('\n[296] persistence: a clean round-trip, safe degradation, and survival through Rebirth (unlike Draft Augments)');
startGame();
state.bestStreak = 5;
state.trophyAce = { name:'Ironclad Scraphound', speciesKey:'scraphound', stage:9 };
state.trophyVanguard = { name:'Vanguard Sparkdrone', speciesKey:'sparkdrone', stage:14 };
let saved = serializeSave();
ok('all three ride along in the save', saved.bestStreak===5 && saved.trophyAce.name==='Ironclad Scraphound' && saved.trophyVanguard.stage===14);
applySave(saved, 0);
ok('a clean save round-trips exactly', state.bestStreak===5 && state.trophyAce.stage===9 && state.trophyVanguard.speciesKey==='sparkdrone');

applySave(Object.assign({}, saved, { bestStreak:'lots' }), 0);
ok('a malformed bestStreak degrades to 0, not a crash', state.bestStreak===0);
applySave(Object.assign({}, saved, { bestStreak:-3 }), 0);
ok('a negative bestStreak is rejected back to 0 — this is a high-water mark, never negative', state.bestStreak===0);
applySave(Object.assign({}, saved, { trophyAce:{ name:'X', speciesKey:'not_a_real_species', stage:3 } }), 0);
ok('an unknown speciesKey degrades the trophy to null, not a crash', state.trophyAce===null);
applySave(Object.assign({}, saved, { trophyAce:{ name:'', speciesKey:'scraphound', stage:3 } }), 0);
ok('an empty name degrades the trophy to null too', state.trophyAce===null);
applySave(Object.assign({}, saved, { trophyVanguard:'garbage' }), 0);
ok('a totally malformed trophy field degrades quietly', state.trophyVanguard===null);
applySave({v:1, name:'x', stage:1, roster:[], formation:{front:[null,null,null],back:[null,null,null]}}, 0);
ok('a save from before this feature ever existed loads with nothing on record, not a crash', state.bestStreak===0 && state.trophyAce===null && state.trophyVanguard===null);

startGame();
state.stage = REBIRTH_MIN_STAGE;
state.bestStreak = 5;
state.trophyAce = { name:'Ironclad Scraphound', speciesKey:'scraphound', stage:9 };
state.trophyVanguard = { name:'Vanguard Sparkdrone', speciesKey:'sparkdrone', stage:14 };
doRebirth(); // arm
doRebirth(); // confirm
ok('every trophy survives a Rebirth untouched — collected history, same as Doctrine, the Archive and bestDepth', state.bestStreak===5 && state.trophyAce.stage===9 && state.trophyVanguard.stage===14);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
