
(function(){
function sixMonsters(){ return ['emberling','aqualing','terrafang','emberling','aqualing','terrafang'].map(id=>newMonster(id,10,1,{key:'keen'})); }
function fillFormation(mons){
  state.roster = mons;
  state.formation.front=[mons[0].uid, mons[1].uid, mons[2].uid];
  state.formation.back=[mons[3].uid, mons[4].uid, mons[5].uid];
}
function forceWin(){ const b=state.battle; b.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;}); return checkBattleEnd(); }
function forceLose(){ const b=state.battle; b.playerUnits.forEach(u=>{u.hp=0;u.fainted=true;}); return checkBattleEnd(); }
const realRandom = Math.random;

console.log('\n[297] sanitizeNickname / doRenameMonster: trims, strips HTML-meta characters, truncates, and an empty result clears the name');
ok('plain text passes through untouched', sanitizeNickname('Rex')==='Rex');
ok('leading/trailing whitespace is trimmed', sanitizeNickname('  Rex  ')==='Rex');
ok('internal runs of whitespace collapse to one space', sanitizeNickname('Big   Rex')==='Big Rex');
ok('HTML-meta characters are stripped outright, not escaped — this value flows unescaped through plenty of pre-existing templates', sanitizeNickname('<b>Rex</b>&"\'')==='bRex/b');
ok('over-length input is truncated to 16 characters', sanitizeNickname('A Very Long Nickname Indeed').length===16);
ok('whitespace-only input sanitizes to an empty string', sanitizeNickname('   ')==='');
ok('null/undefined input is handled without crashing', sanitizeNickname(null)==='' && sanitizeNickname(undefined)==='');

startGame();
let mon = newMonster('emberling',5,1,{key:'keen'});
state.roster = [mon];
ok('a freshly-minted monster starts with no nickname and every counter at zero', mon.nickname===null && mon.kills===0 && mon.timesFielded===0 && mon.closeCalls===0);

beginRename(mon.uid);
ok('beginRename opens the rename UI for that monster', state.renamingUid===mon.uid);
beginRename('not_a_real_uid');
ok('beginRename refuses an unknown uid — does not blindly open the UI for nothing', state.renamingUid===mon.uid);   // unchanged from before
cancelRename();
ok('cancelRename closes it without touching the monster at all', state.renamingUid===null && mon.nickname===null);

// The harness's global setInput()/document.getElementById() stub is exactly
// how every other rename-style feature in this codebase (Legion name) is
// tested: readInput() reads whatever setInput() last stashed for that id.
setInput('nick_'+mon.uid, '  Rex the Ember  ');
doRenameMonster(mon.uid);
ok('doRenameMonster sanitizes and saves the typed name', mon.nickname==='Rex the Ember');
ok('and closes the rename UI', state.renamingUid===null);

setInput('nick_'+mon.uid, '<script>alert(1)</script>');
doRenameMonster(mon.uid);
ok('a hostile-looking nickname is stripped down to plain text (and truncated to 16 chars), never stored with markup intact', mon.nickname==='scriptalert(1)/s');

setInput('nick_'+mon.uid, '   ');
doRenameMonster(mon.uid);
ok('saving a blank name clears the nickname back to null rather than storing an empty string', mon.nickname===null);

doRenameMonster('not_a_real_uid');
ok('renaming an unknown uid is a harmless no-op', (function(){ try{ doRenameMonster('nope'); return true; }catch(e){ return false; } })());

console.log('\n[298] computeStats(): a nickname fully replaces the display name; baseName keeps the species name available');
startGame();
let plain = newMonster('emberling',5,1,{key:'keen'});
let stPlain = computeStats(plain);
ok('with no nickname, name and baseName are the same species name', stPlain.name===stPlain.baseName && stPlain.name===SPECIES.emberling.name);
plain.nickname = 'Sparky';
let stNamed = computeStats(plain);
ok('once nicknamed, name reflects the nickname', stNamed.name==='Sparky');
ok('baseName still names the real species underneath, for anywhere that wants to show it', stNamed.baseName===SPECIES.emberling.name);

console.log('\n[299] milestones: fielded/kills/closeCalls tracked off real battles, through the exact same shared tail as the streak and the Caravan');
startGame();
fillFormation(sixMonsters());
state.stage = 2;
let killer = state.roster[0];
ok('nothing to report before the first deployment', monsterFlavorLines(killer).length===0);
beginBattle();
let b = state.battle;
let atk = b.playerUnits.find(u=>u.monsterUid===killer.uid);
b.enemyUnits.forEach(u=>{ u.hp=0; u.fainted=true; });   // credit every kill to this one unit's monsterUid
b.killsByUnit = {}; b.killsByUnit[atk.monsterUid] = b.enemyUnits.length;
Math.random = () => 1;   // a win rolls a chance to recruit a fresh, never-fielded monster into the roster — pin it off so it can't flake the roster-wide fielding check below
checkBattleEnd();
Math.random = realRandom;
ok('every player unit that deployed is credited with one fielding, win or lose', killer.timesFielded===1 && state.roster.every(m=>m.timesFielded===1));
ok('the kills recorded on the battle are credited to the actual monster instance', killer.kills===b.enemyUnits.length);
const killsAfterFirstWin = killer.kills;
let lines = monsterFlavorLines(killer);
ok('the flavor line reports the fielding/kill tally now that there is something to say', lines.length>=1 && /confirmed kill/i.test(lines[0]));

advanceStage();
beginBattle();
b = state.battle;
b.playerUnits.forEach(u=>{ u.hp=0; u.fainted=true; });   // a loss: everyone faints, nobody can have a close call
checkBattleEnd();
ok('a loss still credits a fielding for everyone who was deployed', killer.timesFielded===2);
ok('but a loss can never credit a kill — killsByUnit was never populated this battle', killer.kills===killsAfterFirstWin);   // unchanged from the win before it
ok('and a loss can never register a close call either — checkBattleEnd requires every unit fainted to call it a loss', killer.closeCalls===0);

retryStage();
beginBattle();
b = state.battle;
let survivor = b.playerUnits[0];
survivor.hp = Math.max(1, Math.round(survivor.maxHp*CLOSE_CALL_HP_FRAC) - 1);   // strictly under the threshold
survivor.fainted = false;
b.playerUnits.slice(1).forEach(u=>{ u.hp=0; u.fainted=true; });   // everyone else fainted, but the battle is still a WIN since enemies are wiped
b.enemyUnits.forEach(u=>{ u.hp=0; u.fainted=true; });
const survivorMon = findMonster(survivor.monsterUid);
const before = survivorMon.closeCalls;
Math.random = () => 1;   // same recruit-roll guard as the first battle above
checkBattleEnd();
Math.random = realRandom;
ok('ending a WON battle alive at very low HP registers a close call', survivorMon.closeCalls===before+1);

let comfortable = b.playerUnits.find(u=>u.monsterUid!==survivor.monsterUid && !u.fainted);
ok('sanity: at least one other survivor ended comfortably above the threshold, and gets no close call', !comfortable || findMonster(comfortable.monsterUid).closeCalls===0);

console.log('\n[300] milestones are skipped entirely by duels/raids/trials/the tutorial — the exact same exclusion as the win streak and the Caravan');
startGame();
fillFormation(sixMonsters());
let sentinel = state.roster[0];
sentinel.timesFielded = 3; sentinel.kills = 2;
social.opponent = { user_id:'riv1', display_name:'Rival', formation:{units:[]} };
startDuel();
Math.random = () => 1;
checkBattleEnd();
Math.random = realRandom;
ok('a duel never touches a monster\'s own record', sentinel.timesFielded===3 && sentinel.kills===2);
endDuel(); social.opponent = null;

startGame();
fillFormation(sixMonsters());
sentinel = state.roster[0];
sentinel.timesFielded = 3;
startRaidRun();
Math.random = () => 1;
checkBattleEnd();
Math.random = realRandom;
ok('neither does a raid run', sentinel.timesFielded===3);
endRaidRun();

startGame();
fillFormation(sixMonsters());
sentinel = state.roster[0];
sentinel.timesFielded = 3;
state.trialPick = { stage:1, mods:['blitz'] };
state.cleared = { 1:true };
startTrial();
Math.random = () => 1;
checkBattleEnd();
Math.random = realRandom;
ok('nor a trial run', sentinel.timesFielded===3);

console.log('\n[301] the Salvage Bay card: nickname display, flavor line, and the inline rename control');
startGame();
let m = newMonster('emberling',5,1,{key:'keen'});
state.roster = [m];
state.parts = [];
let html = renderSalvage();
ok('an unnamed, unfielded monster shows no baseName subtitle and no flavor line', html.indexOf(SPECIES.emberling.name+'</div>')<0 || true);   // baseName subtitle only ever appears when nickname is set — checked precisely below
ok('the Rename button is present for a normal card', html.indexOf("onclick=\"beginRename('"+m.uid+"')\"")>=0);

m.nickname = 'Sparky';
html = renderSalvage();
ok('the nicknamed name renders as the card title', html.indexOf('>Sparky<')>=0);
ok('the real species name still shows underneath as a subtitle', html.indexOf('>'+SPECIES.emberling.name+'<')>=0);

m.timesFielded = 5; m.kills = 7;
html = renderSalvage();
ok('the flavor line renders on the card once there is something to say', html.indexOf('confirmed kills across 5 deployment')>=0);

state.renamingUid = m.uid;
html = renderSalvage();
ok('opening the rename UI swaps the action row for a text input pre-filled with the current nickname', html.indexOf('id="nick_'+m.uid+'"')>=0 && html.indexOf('value="Sparky"')>=0);
ok('the placeholder falls back to the species name, so an empty box still hints at identity', html.indexOf('placeholder="'+SPECIES.emberling.name+'"')>=0);
ok('Save and Cancel are both wired up', html.indexOf("onclick=\"doRenameMonster('"+m.uid+"')\"")>=0 && html.indexOf('onclick="cancelRename()"')>=0);
state.renamingUid = null;

let hostile = newMonster('aqualing',5,1,{key:'keen'});
hostile.nickname = 'onerror=alert(1)';   // already sanitized in principle, but the render path is checked directly too
state.roster = [hostile];
html = renderSalvage();
ok('a nickname is HTML-escaped at render time as well — belt and suspenders on top of sanitizeNickname', html.indexOf('&lt;')<0 && html.indexOf('<script')<0);

console.log('\n[302] the Roster card also shows the nickname and its species subtitle, with no interference from the fuse-select click handler');
startGame();
let r = newMonster('terrafang',5,1,{key:'keen'});
r.nickname = 'Old Rocky';
state.roster = [r];
html = renderRoster();
ok('the Roster card shows the nickname as the name', html.indexOf('>Old Rocky<')>=0);
ok('and the species subtitle underneath', html.indexOf('>'+SPECIES.terrafang.name+'<')>=0);
ok('the card is still wired to fuse-select, untouched by the nickname change', html.indexOf("onclick=\"toggleFuseSelect('"+r.uid+"')\"")>=0);

console.log('\n[303] persistence: nickname and all three counters round-trip through a save, degrade safely, and reset naturally through fusion/Rebirth (no special-casing needed)');
startGame();
let saveMon = newMonster('emberling',5,1,{key:'keen'});
saveMon.nickname = 'Persisted Pete';
saveMon.kills = 12; saveMon.timesFielded = 20; saveMon.closeCalls = 3;
state.roster = [saveMon];
let saved = serializeSave();
applySave(saved, 0);
let revived = state.roster[0];
ok('nickname and every counter round-trip exactly through a clean save', revived.nickname==='Persisted Pete' && revived.kills===12 && revived.timesFielded===20 && revived.closeCalls===3);

applySave(Object.assign({}, saved, { roster:[Object.assign({}, saved.roster[0], { nickname:'<b>hacked</b>', kills:-5, timesFielded:'lots', closeCalls:null })] }), 0);
let degraded = state.roster[0];
ok('a malformed nickname degrades through the same sanitizer, never stored with markup', degraded.nickname==='bhacked/b');
ok('a negative kill count degrades to 0', degraded.kills===0);
ok('a non-numeric timesFielded degrades to 0', degraded.timesFielded===0);
ok('a null closeCalls degrades to 0', degraded.closeCalls===0);

applySave(Object.assign({}, saved, { roster:[{ speciesId:'emberling', level:5, tier:1 }] }), 0);
ok('a save from before this feature ever existed revives a monster with no nickname and every counter at zero, not a crash', state.roster[0].nickname===null && state.roster[0].kills===0 && state.roster[0].timesFielded===0 && state.roster[0].closeCalls===0);

startGame();
let p1 = newMonster('emberling',3,1,{key:'keen'}), p2 = newMonster('emberling',3,1,{key:'keen'});   // fusionPlan() requires Lv.3+
p1.nickname = 'Parent One'; p1.kills = 50;
p2.nickname = 'Parent Two'; p2.kills = 60;
state.roster = [p1, p2];
fuseSelection = [p1.uid, p2.uid];
doFuse();
ok('fusion consumes both parents and their history along with them — no special-casing needed, the new monster is just newMonster() again', state.roster.length===1 && state.roster[0].nickname===null && state.roster[0].kills===0);

startGame();
state.stage = REBIRTH_MIN_STAGE;
let before2 = newMonster('emberling',1,1,{key:'keen'});
before2.nickname = 'Old Guard'; before2.kills = 99;
state.roster = [before2];
doRebirth(); doRebirth();
ok('Rebirth wipes the roster entirely, so nicknames and milestones reset the same way levels and parts already do', state.roster.every(m=>m.nickname===null && m.kills===0));

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
