
(function(){
console.log('\n[356] renderHub(): the button flood is now grouped behind five tabs, one group visible at a time');
startGame();
ok('a fresh legion defaults to the Legion tab', hubTab==='legion');
let h = renderHub();
ok('the Legion tab shows roster/formation/salvage/forge/tribes/identity', h.indexOf('onclick="goRoster()"')>=0 && h.indexOf('onclick="goFormation()"')>=0 && h.indexOf('onclick="goSalvage()"')>=0 && h.indexOf('onclick="goForge()"')>=0 && h.indexOf('onclick="goTribes()"')>=0 && h.indexOf('onclick="goLegionId()"')>=0, h);
ok('other tabs\' buttons are not in the DOM at all while Legion is active, not just hidden', h.indexOf('onclick="goCodex()"')<0 && h.indexOf('onclick="goGuild()"')<0 && h.indexOf('onclick="goMissions()"')<0 && h.indexOf('onclick="manualSave()"')<0, h);
ok('the tab bar itself carries all five tabs', h.indexOf('⚔ Legion')>=0 && h.indexOf('📖 Records')>=0 && h.indexOf('🧭 Campaign')>=0 && h.indexOf('📡 Online')>=0 && h.indexOf('⚙ Settings')>=0);
ok('the active tab is marked with the primary style', h.indexOf(`class="btn small primary" onclick="hubTab='legion'; render();"`)>=0, h);
ok('an inactive tab carries no primary style', h.indexOf(`class="btn small " onclick="hubTab='progress'; render();"`)>=0, h);

console.log('\n[357] switching tabs swaps the visible button group and nothing else');
hubTab = 'progress';
h = renderHub();
ok('the Records tab shows bestiary/archive/journal/depth chart/trophy case/replays/commander rank', h.indexOf('onclick="goCodex()"')>=0 && h.indexOf('onclick="goArchive()"')>=0 && h.indexOf('onclick="goJournal()"')>=0 && h.indexOf('onclick="goDepthChart()"')>=0 && h.indexOf('onclick="goTrophyCase()"')>=0 && h.indexOf('onclick="goReplays()"')>=0 && h.indexOf('onclick="goCommanderRank()"')>=0, h);
ok('the Legion tab\'s own buttons are gone now', h.indexOf('onclick="goRoster()"')<0 && h.indexOf('onclick="goFormation()"')<0);
ok('the Records tab is now the one marked active', h.indexOf(`class="btn small primary" onclick="hubTab='progress'; render();"`)>=0);

hubTab = 'campaign';
h = renderHub();
ok('the Campaign tab shows orders/campaign map/the camp unconditionally', h.indexOf('onclick="goMissions()"')>=0 && h.indexOf('onclick="goCampaignMap()"')>=0 && h.indexOf('onclick="goCamp()"')>=0, h);
ok('Trials and Redeployment stay absent on a fresh legion with nothing cleared, same rule as before tabs existed', h.indexOf('goTrials()')<0 && h.indexOf('goRedeploy()')<0);
state.cleared = {3:true};
h = renderHub();
ok('once something is cleared, Trials and Redeployment appear on the Campaign tab', h.indexOf('onclick="goTrials()"')>=0 && h.indexOf('onclick="goRedeploy()"')>=0, h);
state.cleared = {};

hubTab = 'online';
h = renderHub();
ok('the Online tab shows guild/ladder/online now/world boss', h.indexOf('onclick="goGuild()"')>=0 && h.indexOf('onclick="goLadder()"')>=0 && h.indexOf('onclick="goOnline()"')>=0 && h.indexOf('onclick="goWorldBoss()"')>=0, h);

hubTab = 'settings';
h = renderHub();
ok('the Settings tab shows tactical/sfx/music/save/transfer/legions toggles', h.indexOf('onclick="toggleTactical()"')>=0 && h.indexOf('onclick="toggleSfx()"')>=0 && h.indexOf('onclick="toggleMusic()"')>=0 && h.indexOf('onclick="manualSave()"')>=0 && h.indexOf('onclick="goTransfer()"')>=0 && h.indexOf('onclick="leaveToProfiles()"')>=0, h);
ok('Account only shows up on the Settings tab when the cloud is actually configured', (h.indexOf('onclick="goAccount()"')>=0) === cloudConfigured(), h);

console.log('\n[358] a stale or corrupted hubTab value degrades to the Legion tab instead of rendering blank or throwing');
hubTab = 'some-old-tab-id-from-a-future-version';
let threw = null, h2 = '';
try{ h2 = renderHub(); }catch(e){ threw = e; }
ok('renderHub() never throws on an unrecognized hubTab', threw===null, threw && threw.stack);
ok('it silently falls back to the Legion tab rather than showing nothing', hubTab==='legion' && h2.indexOf('onclick="goRoster()"')>=0, h2);

console.log('\n[359] everything outside the tabbed area — top banners, save status, and Deploy to Battle — is unaffected by which tab is active');
state.streak = 4;
hubTab = 'legion';
const hLegion = renderHub();
hubTab = 'online';
const hOnline = renderHub();
ok('the terrain/Intel/Doctrine banners render identically no matter the active tab', hLegion.indexOf('TERRAIN:')>=0 && hOnline.indexOf('TERRAIN:')>=0 && hLegion.indexOf('RUSTBOUND INTEL')>=0 && hOnline.indexOf('RUSTBOUND INTEL')>=0);
ok('the save status line renders under the tab content on every tab', hLegion.indexOf(saveStatusText())>=0 && hOnline.indexOf(saveStatusText())>=0);
ok('DEPLOY TO BATTLE and the win-streak line live outside the tabs, present on both', hLegion.indexOf('onclick="goGambitOrBattle()"')>=0 && hOnline.indexOf('onclick="goGambitOrBattle()"')>=0 && hLegion.indexOf('4 in a row')>=0 && hOnline.indexOf('4 in a row')>=0);
state.streak = 0;

console.log('\n[360] hubTab is a UI-only concern: it is not game save data, and a fresh legion does not reset it');
hubTab = 'settings';
startGame();
ok('starting a brand-new legion does not snap the tab back to Legion — it is not part of the reset game state', hubTab==='settings');
ok('confirmed by looking at the actual save shape: hubTab is never written to it', JSON.stringify(serializeSave()).indexOf('hubTab')<0);
hubTab = 'legion';

console.log('\n================ '+pass+' passed, '+fail+' failed ================');
process.exit(fail?1:0);
})();
