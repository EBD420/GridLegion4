
(function(){
function fillArchive(){ ARCHIVE_FRAGMENTS.forEach(f=>{ state.archive[f.id]=true; }); }

console.log('\n[432] HQ_PROPS: every prop\'s unlock condition reads an existing permanent record — nothing new to grind, just a new way to display what\'s already earned');
startGame();
ok('a brand-new legion has not unlocked a single prop', Object.keys(HQ_PROPS).every(k=>HQ_PROPS[k].unlocked()===false));
state.trophyAce = { name:'Test Ace', stage:3 };
ok('felling an Ace unlocks its trophy, and only its trophy', HQ_PROPS.ace_trophy.unlocked()===true &&
   Object.keys(HQ_PROPS).filter(k=>k!=='ace_trophy').every(k=>HQ_PROPS[k].unlocked()===false));
state.trophyAce = null;
state.trophyVanguard = { name:'Test Vanguard', stage:3 };
ok('felling a Vanguard unlocks its shield', HQ_PROPS.vanguard_trophy.unlocked()===true);
state.trophyVanguard = null;
state.bestDepth = 1;
ok('any real Deep progress unlocks the Deep Survey Banner', HQ_PROPS.deep_banner.unlocked()===true);
state.bestDepth = 0;
state.bestStreak = 4;
ok('a streak under 5 does not yet unlock the Win Streak Flag', HQ_PROPS.streak_flag.unlocked()===false);
state.bestStreak = 5;
ok('a streak of exactly 5 does', HQ_PROPS.streak_flag.unlocked()===true);
state.bestStreak = 0;
state.cleared[5] = true;
ok('clearing Stage 5 unlocks its own Commander Skull, and not the Stage 9 one', HQ_PROPS.commander5_skull.unlocked()===true && HQ_PROPS.commander9_skull.unlocked()===false);
state.cleared[9] = true;
ok('clearing Stage 9 unlocks its skull too', HQ_PROPS.commander9_skull.unlocked()===true);
ok('but the finale relic stays locked until Stage 10 specifically', HQ_PROPS.gate_relic.unlocked()===false);
state.cleared[CAMPAIGN_LENGTH] = true;
ok('clearing the finale unlocks the Gate relic', HQ_PROPS.gate_relic.unlocked()===true);
ok('the Archive shelf stays locked with fragments still missing', HQ_PROPS.archive_shelf.unlocked()===false);
fillArchive();
ok('and unlocks only once every fragment is recovered', HQ_PROPS.archive_shelf.unlocked()===true);
state.badgesUnlocked = ['streak3'];
ok('any earned Legion Banner unlocks the Badge Case', HQ_PROPS.badge_case.unlocked()===true);
state.badgesUnlocked = [];
state.gauntletBest = 1;
ok('any Gauntlet wave ever cleared unlocks the Gauntlet Marker', HQ_PROPS.gauntlet_marker.unlocked()===true);

console.log('\n[433] toggleHqProp(): add/remove like the emblem picker it\'s modeled on, refuses a still-locked prop outright, and caps at HQ_SLOT_COUNT');
startGame();
toggleHqProp('ace_trophy');
ok('toggling a still-locked prop does nothing at all', (state.hqDisplay||[]).length===0);
state.trophyAce = { name:'Test Ace', stage:2 };
toggleHqProp('ace_trophy');
ok('toggling an unlocked prop adds it to the display', state.hqDisplay.indexOf('ace_trophy')>=0);
toggleHqProp('ace_trophy');
ok('toggling it again removes it', state.hqDisplay.indexOf('ace_trophy')<0);
state.trophyVanguard = { name:'Test Vanguard', stage:2 };
state.bestDepth = 1; state.bestStreak = 5;
state.cleared[5]=true; state.cleared[9]=true; state.cleared[CAMPAIGN_LENGTH]=true;
fillArchive();
state.badgesUnlocked = ['streak3'];
state.gauntletBest = 1;
ok('sanity: every prop is unlocked now', Object.keys(HQ_PROPS).every(k=>HQ_PROPS[k].unlocked()===true));
Object.keys(HQ_PROPS).forEach(k=>toggleHqProp(k));
ok('exactly HQ_SLOT_COUNT made it onto the display, not all ten unlocked props', state.hqDisplay.length===HQ_SLOT_COUNT, state.hqDisplay);
const overflowKey = Object.keys(HQ_PROPS).find(k=>state.hqDisplay.indexOf(k)<0);
toggleHqProp(overflowKey);
ok('once full, toggling one more unlocked-but-not-displayed prop is simply refused rather than evicting an existing one', state.hqDisplay.indexOf(overflowKey)<0 && state.hqDisplay.length===HQ_SLOT_COUNT);
const displayedKey = state.hqDisplay[0];
toggleHqProp(displayedKey);
ok('but removing one frees a slot', state.hqDisplay.length===HQ_SLOT_COUNT-1);
toggleHqProp(displayedKey);
ok('...that a previously-blocked prop can now take', state.hqDisplay.indexOf(displayedKey)>=0 && state.hqDisplay.length===HQ_SLOT_COUNT);

console.log('\n[434] renderLegionHQ(): the diorama shows exactly what\'s on display and nothing else, and the earn-list distinguishes locked, unlocked-but-put-away and on-display');
startGame();
let html = renderLegionHQ();
ok('an empty diorama shows all six slots as empty', (html.match(/— empty —/g)||[]).length===HQ_SLOT_COUNT);
ok('a still-locked prop shows only as a mystery, never its real name', html.indexOf('🔒 ???')>=0 && html.indexOf(HQ_PROPS.ace_trophy.name)<0);
state.trophyAce = { name:'Test Ace', stage:2 };
toggleHqProp('ace_trophy');
html = renderLegionHQ();
ok('once unlocked and displayed, the real name appears in the diorama itself', html.indexOf(escapeHtml(HQ_PROPS.ace_trophy.name))>=0);
ok('the earned-props count reflects exactly one on display', html.indexOf('1/'+HQ_SLOT_COUNT+' on display')>=0);
toggleHqProp('ace_trophy');
html = renderLegionHQ();
ok('put away (unlocked but not displayed) still shows its real name in the earn-list, just not "on display"', html.indexOf(escapeHtml(HQ_PROPS.ace_trophy.name))>=0 && html.indexOf('tap to display')>=0);

console.log('\n[435] Hub navigation: Legion HQ is reachable from the Records tab, and Trophy Case links across to it');
startGame();
hubTab = 'progress';
html = renderHub();
ok('the Records tab carries a Legion HQ entry point', html.indexOf('goLegionHQ()')>=0);
html = renderTrophyCase();
ok('Trophy Case itself cross-links into Legion HQ', html.indexOf('goLegionHQ()')>=0);
goLegionHQ();
ok('navigating there sets the screen', state.screen==='legionhq');

console.log('\n[436] persistence: the display list survives a save/reload filtered against the live catalog, resets for a brand-new legion, and survives Rebirth exactly because every underlying record it reads already does');
startGame();
state.trophyAce = { name:'Test Ace', stage:2 };
toggleHqProp('ace_trophy');
let saved = serializeSave();
ok('the display rides along in a save, exactly as arranged', JSON.stringify(saved.hqDisplay)===JSON.stringify(['ace_trophy']));
applySave(saved, 0);
ok('a clean round-trip restores it exactly', JSON.stringify(state.hqDisplay)===JSON.stringify(['ace_trophy']));
applySave(Object.assign({}, saved, { hqDisplay: ['ace_trophy', 'not_a_real_prop', 'vanguard_trophy'] }), 0);
ok('a save naming a prop this build no longer recognizes drops just that entry, keeping the rest', JSON.stringify(state.hqDisplay)===JSON.stringify(['ace_trophy','vanguard_trophy']));
applySave({v:1, name:'x', stage:1, roster:[], formation:{front:[null,null,null],back:[null,null,null]}}, 0);
ok('a save from before this feature existed loads with an empty diorama, not a crash', Array.isArray(state.hqDisplay) && state.hqDisplay.length===0);

startGame();
state.trophyAce = { name:'Test Ace', stage:2 };
toggleHqProp('ace_trophy');
state.stage = REBIRTH_MIN_STAGE;
doRebirth(); // arm
doRebirth(); // confirm
ok('a Rebirth never clears the display — the trophy it points at survives Rebirth too, same as bestDepth/bestStreak', JSON.stringify(state.hqDisplay)===JSON.stringify(['ace_trophy']));
ok('and the underlying record itself is untouched', !!state.trophyAce);

startGame();
ok('starting a brand-new legion clears the diorama', Array.isArray(state.hqDisplay) && state.hqDisplay.length===0);

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
