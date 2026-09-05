
(function(){
function sixMonsters(){ return ['emberling','aqualing','terrafang','emberling','aqualing','terrafang'].map(id=>newMonster(id,10)); }
function fillFormation(mons){
  state.roster = mons;
  state.formation.front=[mons[0].uid, mons[1].uid, mons[2].uid];
  state.formation.back=[mons[3].uid, mons[4].uid, mons[5].uid];
}
function forceWin(){
  const b = state.battle;
  b.enemyUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
  return checkBattleEnd();
}
function forceLose(){
  const b = state.battle;
  b.playerUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
  return checkBattleEnd();
}
function ageSlot(i, awayMs){
  const d = readSlot(i);
  d.savedAt = Date.now() - awayMs;
  writeSlot(i, d);
}
const realRandom = Math.random;
const RANGE = CAMP_MAX_AWAY_MS - CAMP_MIN_AWAY_MS;

console.log('\n[264] campAwayFrac: a hard floor, a linear ramp, and a hard cap');
ok('below the minimum away-time, no fraction at all', campAwayFrac(CAMP_MIN_AWAY_MS-1)===0);
ok('exactly at the minimum, still zero (the ramp starts just past it)', campAwayFrac(CAMP_MIN_AWAY_MS)===0);
ok('halfway through the ramp is exactly 0.5', campAwayFrac(CAMP_MIN_AWAY_MS + RANGE/2)===0.5);
ok('at the max away-time, the fraction caps at 1', campAwayFrac(CAMP_MAX_AWAY_MS)===1);
ok('well past the max, still capped at 1 — camping longer buys nothing more', campAwayFrac(CAMP_MAX_AWAY_MS*5)===1);
ok('zero, negative, null, undefined and NaN all read as no time away',
  campAwayFrac(0)===0 && campAwayFrac(-500)===0 && campAwayFrac(null)===0 && campAwayFrac(undefined)===0 && campAwayFrac(NaN)===0);

console.log('\n[265] campWelcomeBonus: gated by the floor, scaled by the fraction, capped, and never crashes on a full salvage bay');
startGame();
state.parts = [];
ok('too little time away grants nothing at all', campWelcomeBonus(CAMP_MIN_AWAY_MS-1)===null);
ok('and mutates nothing', state.parts.length===0);
ok('no away-time (fresh legion, brand new save) grants nothing', campWelcomeBonus(null)===null);

const midAway = CAMP_MIN_AWAY_MS + RANGE/2; // frac === 0.5
Math.random = () => 0; // index 0 of ['exp','favor','salvage'] -> 'exp'
let mon = newMonster('emberling',1,1); mon.exp = 0;
state.roster = [mon];
let bonus = campWelcomeBonus(midAway);
Math.random = realRandom;
ok('picks the exp reward when the roll lands on it', bonus && bonus.type==='exp');
ok('the exp amount scales with the away fraction (4 + frac*10, halfway = 9)', bonus.amount===9, bonus.amount);
ok('exp is actually applied to the roster', mon.exp===9);

Math.random = () => 1/3 + 0.001; // pushes just past index 0 into index 1 of 3 -> 'favor'
state.favor = {};
bonus = campWelcomeBonus(midAway);
Math.random = realRandom;
ok('picks the favor reward when the roll lands there', bonus && bonus.type==='favor');
ok('a real tribe id was granted favor', TRIBE_IDS.indexOf(bonus.element)>=0);
ok('the favor amount scales the same way (2 + frac*4, halfway = 4)', bonus.amount===4, bonus.amount);
ok('favor was actually added', favorOf(bonus.element)===4);

state.parts = [];
Math.random = () => 0.9999; // last of 3 options -> 'salvage'
bonus = campWelcomeBonus(midAway);
Math.random = realRandom;
ok('picks the salvage reward when the roll lands there and the bay has room', bonus && bonus.type==='salvage');
ok('a part was actually added to the bay', state.parts.length===1 && state.parts[0].key===bonus.key);

state.parts = [];
for(let i=0;i<14;i++) state.parts.push({uid:'full'+i, key:Object.keys(PARTS)[0]});
Math.random = () => 0.9999; // would pick salvage if it were offered
bonus = campWelcomeBonus(CAMP_MAX_AWAY_MS); // frac === 1, capped
Math.random = realRandom;
ok('with the bay full, salvage is never offered at all — no crash, no out-of-range pick', bonus && bonus.type!=='salvage');
ok('the bay is untouched', state.parts.length===14);
ok('at the fully-capped fraction, the exp/favor formulas cap too (favor: 2+1*4=6, exp: 4+1*10=14)',
  (bonus.type==='favor' && bonus.amount===6) || (bonus.type==='exp' && bonus.amount===14));

console.log('\n[266] continueSlot(): a real "while you were out" round-trip, and the fix against rolling it twice');
startGame();
state.slot = 0;
let m1 = newMonster('emberling',3,1), m2 = newMonster('aqualing',3,1);
state.roster = [m1, m2];
state.formation.front = [m1.uid, m2.uid, null];
autosave();
ageSlot(0, midAway);
startGame(); // wipe in-memory state, exactly like the player closing and reopening
Math.random = () => 0; // force the exp branch, deterministically
continueSlot(0);
Math.random = realRandom;
ok('continueSlot lands on the Camp screen, not straight to the Hub', state.screen==='camp');
ok('a real bonus was computed from the save\'s own savedAt', state.campWelcome && state.campWelcome.type==='exp' && state.campWelcome.amount===9);
ok('the loaded roster actually received it', state.roster.every(m=>m.exp===9));
const restampedAt = readSlot(0).savedAt;
ok('continuing immediately re-saves, stamping a fresh savedAt', Date.now()-restampedAt < 5000, Date.now()-restampedAt);

Math.random = () => 0.9999; // would grant something if the gate let it through
continueSlot(0);
Math.random = realRandom;
ok('continuing again right away (no real time passed) grants nothing — closes the double-dip', state.campWelcome===null);
ok('still lands on the Camp screen every time, bonus or not', state.screen==='camp');

writeSlot(1, {v:1, name:'NoTimestamp', stage:1, roster:[], formation:{front:[null,null,null],back:[null,null,null]}});
startGame();
continueSlot(1);
ok('a save with no savedAt at all degrades quietly — no bonus, no crash', state.campWelcome===null && state.screen==='camp');

startGame();
newSlot(2);
ok('a brand-new legion goes straight to the Hub — Camp is only for returning to an existing one', state.screen==='hub' && state.campWelcome===null);

console.log('\n[267] the win streak: tracks real consecutive stage results, ignores duels, and survives a save round-trip');
startGame();
fillFormation(sixMonsters());
state.stage = 2;
ok('a fresh legion starts at streak 0', state.streak===0);
beginBattle(); forceWin();
ok('first win sets the streak to 1', state.streak===1);
advanceStage();
beginBattle(); forceWin();
ok('a second consecutive win extends it to 2', state.streak===2);
advanceStage();
beginBattle(); forceWin();
ok('a third keeps climbing, not resetting', state.streak===3);
advanceStage();
beginBattle(); forceLose();
ok('a loss breaks a win streak and starts a fresh loss streak at -1 (not 0, not -4)', state.streak===-1);
retryStage();
beginBattle(); forceLose();
ok('a second consecutive loss extends the loss streak to -2', state.streak===-2);
retryStage();
beginBattle(); forceWin();
ok('a win breaks a loss streak the same way, landing back at 1', state.streak===1);
advanceStage();

const streakBeforeDuel = state.streak;
social.opponent = { user_id:'riv1', display_name:'Rival', formation:{units:[]} };
startDuel();
ok('sanity: the duel actually started', !!state.duel && !!state.battle);
checkBattleEnd(); // an opponent with zero units resolves as an immediate win
ok('a duel win never touches the campaign win streak — endBattle returns early for duels', state.streak===streakBeforeDuel);
endDuel();
social.opponent = null;

startGame();
state.streak = 7;
let saved = serializeSave();
ok('the streak rides along in the save', saved.streak===7);
applySave(saved, 0);
ok('a clean save round-trips exactly', state.streak===7);
applySave(Object.assign({}, saved, { streak: -3 }), 0);
ok('a negative (loss) streak round-trips too', state.streak===-3);
applySave(Object.assign({}, saved, { streak: 'not-a-number' }), 0);
ok('a malformed streak in the save file degrades to 0, not a crash', state.streak===0);
applySave(Object.assign({}, saved, { streak: 999999 }), 0);
ok('an absurd streak value is clamped, not trusted outright', state.streak===9999);
applySave({v:1, name:'x', stage:1, roster:[], formation:{front:[null,null,null],back:[null,null,null]}}, 0);
ok('a save from before this feature existed loads with streak 0, not a crash', state.streak===0);

console.log('\n[268] campCommentary(): always says something, and only the lines the data actually supports');
startGame();
state.streak = 0;
cloud.session = null;
let lines = campCommentary();
ok('a totally fresh legion (no doctrine, no streak, not signed in) still gets a line, not an empty screen', lines.length===1);
ok('and it reads as a generic, quiet-camp line rather than claiming any real history', /quiet/i.test(lines[0].text));

state.doctrine = { elementTally:{fire:8}, formationTally:{front:0,back:0}, kills:{}, wins:8 };
lines = campCommentary();
let doctLine = lines.find(l=>l.emoji===TRIBES.fire.emoji);
ok('once Doctrine has locked onto an element, a tribe voice comments on it', !!doctLine);
ok('the element is named, uppercased, matching how the Hub itself presents it', doctLine.text.indexOf('FIRE')>=0);
ok('below the first escalation threshold, no tier is mentioned', !/tier/i.test(doctLine.text));
state.doctrine.wins = 10;
doctLine = campCommentary().find(l=>l.emoji===TRIBES.fire.emoji);
ok('once tier 1 is reached, the commentary says so', /tier 1/i.test(doctLine.text));

state.doctrine = { elementTally:{}, formationTally:{front:0,back:0}, kills:{}, wins:0 };
state.streak = 1;
ok('a single win reads as singular, not "1 wins"', /1 win running/i.test(campCommentary().find(l=>l.emoji==='🔥').text));
state.streak = 3;
ok('a modest streak gets modest phrasing', /3 wins running/i.test(campCommentary().find(l=>l.emoji==='🔥').text));
state.streak = 6;
ok('a long streak (5+) gets the escalated phrasing instead', /stages clear in a row/i.test(campCommentary().find(l=>l.emoji==='🔥').text));
state.streak = -1;
ok('a single loss reads as singular too', /1 rough stage in a row/i.test(campCommentary().find(l=>l.emoji==='🩹').text));
state.streak = -3;
ok('multiple losses read as plural', /3 rough stages in a row/i.test(campCommentary().find(l=>l.emoji==='🩹').text));
state.streak = 0;

cloud.session = { access_token:'t', user:{ id:'u1', email:'x@example.com' } };
social.ladder = [];
ok('signed in but no ladder data loaded yet -> no ladder line, no crash', !campCommentary().some(l=>l.emoji==='🏆'));
social.ladder = [{ user_id:'u9', display_name:'Rustkiller', rating:1500 }];
social.rank = null;
let ladderLine = campCommentary().find(l=>l.emoji==='🏆');
ok('once ladder data exists, a line names the current leader', ladderLine && ladderLine.text.indexOf('Rustkiller')>=0);
ok('with no known rank of your own, the line still reads cleanly without one', ladderLine.text.indexOf('#')<0);
social.rank = 4;
ladderLine = campCommentary().find(l=>l.emoji==='🏆');
ok('once your own rank is known, it is included too', ladderLine.text.indexOf('#4')>=0);
cloud.session = null; social.ladder = []; social.rank = null;

console.log('\n[269] renderCamp(): the bonus box is conditional, commentary is HTML-escaped, and the Hub button is always on the Hub');
startGame();
state.campWelcome = null;
let html = renderCamp();
ok('with no bonus this visit, no "while you were out" box renders', html.indexOf('WHILE YOU WERE OUT')<0);
ok('the commentary section always renders', html.indexOf('AROUND THE FIRE')>=0);
state.campWelcome = { type:'exp', amount:9, levelled:0, text:'+9 EXP to every monster in the roster.' };
html = renderCamp();
ok('with a bonus this visit, the box renders and names it', html.indexOf('WHILE YOU WERE OUT')>=0 && html.indexOf('+9 EXP')>=0);
ok('the button hands control back through leaveCamp(), which is what actually clears the bonus and returns to the Hub', html.indexOf('onclick="leaveCamp()"')>=0);

cloud.session = { access_token:'t', user:{ id:'u1', email:'x@example.com' } };
social.ladder = [{ user_id:'u9', display_name:'<b>Evil</b>', rating:1500 }];
social.rank = null;
html = renderCamp();
ok('a hostile display name from the ladder is escaped, not injected as real markup', html.indexOf('&lt;b&gt;Evil&lt;/b&gt;')>=0 && html.indexOf('<b>Evil</b>')<0);
cloud.session = null; social.ladder = []; social.rank = null;

state.campWelcome = { type:'exp', amount:5, levelled:0, text:'x' };
leaveCamp();
ok('leaveCamp clears the bonus so a later manual visit shows commentary only', state.campWelcome===null);
ok('and returns to the Hub', state.screen==='hub');
goCamp();
ok('goCamp opens the Camp screen directly (used by the Hub button, no bonus attached)', state.screen==='camp' && state.campWelcome===null);

startGame();
hubTab='campaign';
let hubHtml = renderHub();
ok('the Camp button is on the Hub even for a totally fresh legion with nothing cleared yet', hubHtml.indexOf('The Camp')>=0 && hubHtml.indexOf('onclick="goCamp()"')>=0);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
