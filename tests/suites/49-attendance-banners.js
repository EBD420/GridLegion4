
(function(){
const RealDate = Date;
let fakeNowMs = null;
function FakeDate(...args){
  if(args.length===0 && fakeNowMs!==null) return new RealDate(fakeNowMs);
  return new RealDate(...args);
}
FakeDate.now = () => (fakeNowMs!==null ? fakeNowMs : RealDate.now());
FakeDate.UTC = RealDate.UTC;
FakeDate.parse = RealDate.parse;
FakeDate.prototype = RealDate.prototype;
Date = FakeDate;
function setNow(ms){ fakeNowMs = ms; }
function restoreNow(){ fakeNowMs = null; }
const DAY = 24*60*60*1000;
// A fixed UTC midnight to build test days from, well clear of month/year boundaries.
const BASE = Date.UTC(2026, 5, 15, 12, 0, 0); // June 15 2026, 12:00 UTC

console.log('\n[315] dateKeyFor()/todayKey(): plain UTC yyyy-mm-dd, and todayKey() tracks the (fakeable) current time');
ok('dateKeyFor formats a known instant correctly', dateKeyFor(new RealDate(Date.UTC(2026,0,5)))==='2026-01-05');
setNow(BASE);
ok('todayKey() reads through to "now" — including a faked one', todayKey()==='2026-06-15', todayKey());
restoreNow();

console.log('\n[316] ensureAttendance(): day 1 the moment a fresh legion first renders the hub, a consecutive day, a same-day no-op, and a gap resets to 1');
setNow(BASE);
startGame();   // startGame() renders the hub immediately, which itself calls ensureAttendance() — this IS the "first login"
ok('a brand-new legion already shows day 1, stamped to the date it was created', state.loginStreak===1 && state.lastLoginDay==='2026-06-15', [state.loginStreak, state.lastLoginDay]);
ensureAttendance();
ok('calling again the same day is a no-op — the streak does not double-count', state.loginStreak===1);
setNow(BASE + DAY);
ensureAttendance();
ok('the very next calendar day extends the streak to 2', state.loginStreak===2 && state.lastLoginDay==='2026-06-16', state.loginStreak);
setNow(BASE + DAY*2);
ensureAttendance();
ok('a third straight day extends it again, to 3', state.loginStreak===3, state.loginStreak);
setNow(BASE + DAY*5);   // skipped two days
ensureAttendance();
ok('a gap (missed days) resets the running streak back to 1, not to 0', state.loginStreak===1, state.loginStreak);
ok('the calendar date still advances to whatever day it actually is', state.lastLoginDay==='2026-06-20', state.lastLoginDay);
restoreNow();

console.log('\n[317] bestLoginStreak: a permanent high-water mark that a later reset does not erase');
setNow(BASE);
startGame();   // logs day 1 at BASE via the hub render, same as above
setNow(BASE+DAY); ensureAttendance();
setNow(BASE+DAY*2); ensureAttendance();
ok('three days running sets the best mark to 3', state.bestLoginStreak===3, state.bestLoginStreak);
setNow(BASE+DAY*10);   // a big gap, streak resets to 1
ensureAttendance();
ok('the running streak dropped back to 1 after the gap', state.loginStreak===1);
ok('but the best-ever mark still remembers the 3-day run', state.bestLoginStreak===3, state.bestLoginStreak);
restoreNow();

console.log('\n[318] checkBadgeUnlocks(): each condition grants exactly its own badge, and nothing else');
startGame();
ok('a fresh legion has no badges', (state.badgesUnlocked||[]).length===0);
state.bestLoginStreak = 3; checkBadgeUnlocks();
ok('a 3-day best streak grants "streak3" only, not the 7/30 tiers', state.badgesUnlocked.indexOf('streak3')>=0 && state.badgesUnlocked.indexOf('streak7')<0 && state.badgesUnlocked.indexOf('streak30')<0);
state.bestLoginStreak = 30; checkBadgeUnlocks();
ok('reaching 30 grants every lower streak tier as well (3 and 7), since 30 already implies them', ['streak3','streak7','streak30'].every(k=>state.badgesUnlocked.indexOf(k)>=0), state.badgesUnlocked);
startGame();
state.bestStreak = 10; checkBadgeUnlocks();
ok('a 10-win battle streak grants "warstreak10"', state.badgesUnlocked.indexOf('warstreak10')>=0);
ok('it does not also grant the unrelated login-streak badges', state.badgesUnlocked.indexOf('streak3')<0);
startGame();
state.trophyAce = { name:'Test Ace', speciesKey:null, stage:3 };
checkBadgeUnlocks();
ok('felling only an Ace (no Vanguard yet) does not grant "slayer"', state.badgesUnlocked.indexOf('slayer')<0);
state.trophyVanguard = { name:'Test Vanguard', speciesKey:null, stage:4 };
checkBadgeUnlocks();
ok('felling both grants "slayer"', state.badgesUnlocked.indexOf('slayer')>=0);
startGame();
social.rank = 25;
checkBadgeUnlocks();
ok('rank 25 does not grant "ranked10"', state.badgesUnlocked.indexOf('ranked10')<0);
social.rank = 10;
checkBadgeUnlocks();
ok('cracking exactly rank 10 grants "ranked10"', state.badgesUnlocked.indexOf('ranked10')>=0);
social.rank = 400;
checkBadgeUnlocks();
ok('dropping back out of the top 10 later does NOT revoke an already-earned badge — it is a permanent record like the trophy case', state.badgesUnlocked.indexOf('ranked10')>=0);
social.rank = null;

console.log('\n[319] toggleBadge(): wear/remove a badge you have, and locked or unknown badges refuse to equip');
startGame();
toggleBadge('streak3');
ok('a badge that has not been earned yet cannot be worn', state.badge===null);
toggleBadge('not_a_real_badge');
ok('an unrecognized key is silently ignored', state.badge===null);
state.badgesUnlocked = ['streak3','warstreak10'];
toggleBadge('streak3');
ok('an earned badge can be worn', state.badge==='streak3');
toggleBadge('streak3');
ok('tapping the worn badge again takes it off', state.badge===null);
toggleBadge('warstreak10');
toggleBadge('streak3');
ok('wearing a second badge simply replaces the first — only one slot', state.badge==='streak3');

console.log('\n[320] legionBanner(): the badge glyph leads, ahead of the emblem and the rebirth mark, and is absent entirely when nothing is worn');
startGame();
state.profileName = 'Ironpaws';
ok('no badge, no emblem: plain name only', legionBanner()==='Ironpaws');
state.badgesUnlocked = ['slayer'];
state.badge = 'slayer';
ok('a worn badge is prepended with its emoji and a space', legionBanner()===('🏆 Ironpaws'), legionBanner());
state.parts.push({ uid:'p1', key: unlockedPartKeys.length?Object.keys(PARTS)[0]:Object.keys(PARTS)[0] });
state.emblem = [Object.keys(PARTS)[0]];
const withEmblem = legionBanner();
ok('badge and emblem combine, badge first', withEmblem.indexOf('🏆')===0 && withEmblem.indexOf('Ironpaws') > withEmblem.indexOf(PARTS[Object.keys(PARTS)[0]].emoji), withEmblem);
state.rebirth = { count: 1 };
ok('the rebirth star still lands at the very end', legionBanner().slice(-1)==='★', legionBanner());
state.badge = null; state.emblem = []; state.rebirth = { count:0 };

console.log('\n[321] renderHub(): the login-streak line shows only while a streak is actually running, with the right wording');
startGame();
let hubHtml = renderHub();
ok('a brand-new legion (streak 1 the moment the hub renders) shows the streak line', /Login streak/.test(hubHtml));
ok('singular "day" wording at exactly 1', hubHtml.indexOf('1</b> day running')>=0 || /1<\/b> day running/.test(hubHtml), hubHtml.match(/streak.{0,40}/i));
state.loginStreak = 0; state.lastLoginDay = null; state.bestLoginStreak = 0;
// force ensureAttendance() not to immediately re-stamp today by pre-dating lastLoginDay to "today" with streak reset — instead just check the raw render helper directly by simulating a state where a prior call already ran and gap-reset happened away from "today".
hubHtml = renderHub();
ok('renderHub() re-establishes today\'s login on its own via ensureAttendance(), so the line reappears', /Login streak/.test(hubHtml));

console.log('\n[322] renderLegionId(): badge chips render locked, unlocked-but-unworn, and worn states distinctly');
startGame();
let idHtml = renderLegionId();
ok('a locked badge shows as a mystery entry, not its real name', idHtml.indexOf('🔒 ???')>=0);
ok('a locked badge does not leak its emoji into the page', idHtml.indexOf(BADGES.slayer.emoji)<0);
state.badgesUnlocked = ['slayer'];
idHtml = renderLegionId();
ok('an unlocked-but-unworn badge shows its real name and a "tap to wear" hint', idHtml.indexOf(BADGES.slayer.name)>=0 && idHtml.indexOf('tap to wear')>=0);
state.badge = 'slayer';
idHtml = renderLegionId();
ok('a worn badge is called out as worn, with a way to remove it', idHtml.indexOf('worn')>=0 && idHtml.indexOf('tap to remove')>=0);

console.log('\n[323] persistence: streak/badge fields round-trip through save/load, with bad or foreign data sanitized rather than trusted');
startGame();
state.profileName = 'SaveTest';
state.loginStreak = 4; state.bestLoginStreak = 9; state.lastLoginDay = '2026-03-01';
state.badgesUnlocked = ['streak3','streak7']; state.badge = 'streak7';
const saved = serializeSave();
ok('serializeSave carries every new field', saved.loginStreak===4 && saved.bestLoginStreak===9 && saved.lastLoginDay==='2026-03-01' && saved.badge==='streak7' && saved.badgesUnlocked.length===2);
startGame();   // wipe in-memory state to prove applySave is what restores it, not leftover globals
applySave(saved, 0);
ok('applySave restores the running streak, the best mark, and the day stamp', state.loginStreak===4 && state.bestLoginStreak===9 && state.lastLoginDay==='2026-03-01');
ok('applySave restores which badges are unlocked and which is worn', state.badgesUnlocked.indexOf('streak3')>=0 && state.badgesUnlocked.indexOf('streak7')>=0 && state.badge==='streak7');

const dirty = Object.assign({}, saved, {
  lastLoginDay: 'not-a-date', loginStreak: -5, bestLoginStreak: 'nine',
  badgesUnlocked: ['streak3', 'totally_made_up_badge', 42], badge: 'totally_made_up_badge',
});
startGame();
applySave(dirty, 0);
ok('a malformed date string is rejected back to null rather than trusted verbatim', state.lastLoginDay===null, state.lastLoginDay);
ok('a negative streak is rejected back to 0', state.loginStreak===0, state.loginStreak);
ok('a non-numeric best streak is rejected back to 0', state.bestLoginStreak===0, state.bestLoginStreak);
ok('an unlocked-badges list is filtered against the real catalog — junk entries drop out, real ones survive', state.badgesUnlocked.length===1 && state.badgesUnlocked[0]==='streak3', state.badgesUnlocked);
ok('a worn badge that did not survive the filter is not equipped either', state.badge===null, state.badge);

console.log('\n[324] initGame() resets every new field for a brand-new legion; doRebirth() leaves them alone');
setNow(BASE);
startGame();
state.loginStreak = 7; state.bestLoginStreak = 12; state.lastLoginDay = '2026-01-01';
state.badgesUnlocked = ['streak3','streak7','streak30']; state.badge = 'streak30';
startGame();   // starting a fresh legion calls initGame() (wiping those fields), then immediately
                // renders the hub, which logs day 1 right back — so the real post-condition is
                // "day 1 as of right now", not "nothing at all".
ok('a brand-new legion resets the running history, not carrying over the old one', state.loginStreak===1 && state.bestLoginStreak===1 && state.lastLoginDay==='2026-06-15', [state.loginStreak, state.bestLoginStreak, state.lastLoginDay]);
ok('a brand-new legion starts with no badges and nothing worn', state.badgesUnlocked.length===0 && state.badge===null);

setNow(BASE);
startGame();
state.stage = REBIRTH_MIN_STAGE;
state.loginStreak = 5; state.bestLoginStreak = 8; state.lastLoginDay = todayKey();   // matches "now", so Rebirth's own render() won't advance it
state.badgesUnlocked = ['slayer']; state.badge = 'slayer';
doRebirth();               // first call just arms the confirmation
doRebirth();               // second call actually performs it
ok('Rebirth wipes the roster grind but leaves the attendance record untouched, same as bestStreak/trophyAce', state.loginStreak===5 && state.bestLoginStreak===8 && state.lastLoginDay===todayKey(), [state.loginStreak,state.bestLoginStreak,state.lastLoginDay]);
restoreNow();
ok('Rebirth leaves earned badges and the worn one alone too', state.badgesUnlocked.indexOf('slayer')>=0 && state.badge==='slayer');

Date = RealDate;
console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
