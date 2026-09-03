
(function(){

console.log('\n[44] legion identity — banner state starts empty');
startGame();
ok('emblem starts empty', Array.isArray(state.emblem) && state.emblem.length===0, state.emblem);
ok('unlocked parts starts empty', unlockedPartKeys().length===0, unlockedPartKeys());
ok('banner is just the name with no emblem', legionBanner()===state.profileName, legionBanner());

console.log('\n[45] legion identity — the codex gates what can go on the banner');
toggleEmblemPart('scraphound');
ok('a part nobody has fielded cannot be added', state.emblem.length===0, state.emblem);
codexSee('parts','scraphound');
ok('unlockedPartKeys reflects the codex', unlockedPartKeys().indexOf('scraphound')>=0, unlockedPartKeys());
toggleEmblemPart('scraphound');
ok('an unlocked part can be added', state.emblem.indexOf('scraphound')>=0, state.emblem);
ok('banner now carries the glyph', legionBanner()===(PARTS.scraphound.emoji+' '+state.profileName), legionBanner());
toggleEmblemPart('scraphound');
ok('tapping it again removes it', state.emblem.indexOf('scraphound')<0, state.emblem);

console.log('\n[46] legion identity — the banner caps at three and ignores junk');
['scraphound','sparkdrone','cinderjaw','frostcoil'].forEach(k=>codexSee('parts',k));
['scraphound','sparkdrone','cinderjaw','frostcoil'].forEach(k=>toggleEmblemPart(k));
ok('only three slots are kept', state.emblem.length===3, state.emblem);
ok('the fourth one did not bump anything out', state.emblem.indexOf('frostcoil')<0, state.emblem);
toggleEmblemPart('not-a-real-part');
ok('an unknown key is ignored', state.emblem.length===3, state.emblem);

console.log('\n[47] legion identity — name edits are sanitized');
setLegionName('   ');
ok('an all-whitespace name falls back to Commander', state.profileName==='Commander', state.profileName);
setLegionName('  Ironclad Vanguard Company Extra  ');
ok('a long name is trimmed and capped at 18 chars', state.profileName.length<=18, state.profileName);
ok('leading whitespace is trimmed', state.profileName[0]!==' ', JSON.stringify(state.profileName));

console.log('\n[48] legion identity — survives a save/load cycle');
startGame(); state.slot=0;
state.emblem = ['scraphound','sparkdrone'];
const saved = serializeSave();
ok('emblem is written to the save', JSON.stringify(saved.emblem)===JSON.stringify(['scraphound','sparkdrone']), saved.emblem);
startGame();
applySave(saved, 0);
ok('emblem survives a save/load cycle', JSON.stringify(state.emblem)===JSON.stringify(['scraphound','sparkdrone']), state.emblem);
applySave(Object.assign({}, saved, { emblem:['scraphound','not-a-real-part','sparkdrone','cinderjaw','frostcoil','galekite'] }), 0);
ok('an unknown key is dropped and the rest capped at three', JSON.stringify(state.emblem)===JSON.stringify(['scraphound','sparkdrone','cinderjaw']), state.emblem);
applySave(Object.assign({}, saved, { emblem:'not-an-array' }), 0);
ok('a malformed emblem field does not crash loading', Array.isArray(state.emblem) && state.emblem.length===0, state.emblem);

console.log('\n[48b] legion identity — the editor screen renders cleanly');
startGame(); state.slot=0;
state.profileName='Ironpaw';
codexSee('parts','scraphound');
state.emblem=['scraphound'];
const idHtml = renderLegionId();
ok('the identity screen renders', /LEGION IDENTITY/.test(idHtml));
ok('an unlocked part shows its name', idHtml.indexOf(PARTS.scraphound.name)>=0);
ok('a locked part stays hidden behind a lock', idHtml.indexOf(PARTS.sparkdrone.name)<0 && idHtml.indexOf('🔒')>=0);
ok('the preview shows the current banner', idHtml.indexOf(legionBanner())>=0, legionBanner());
ok('the hub save status carries the banner too', saveStatusText().indexOf(legionBanner())>=0, saveStatusText());

console.log('\n[49] legion identity — the banner is what gets published to the cloud');
srvReset();
cloudSignUp('banner@example.com','hunter2').then(()=>{
  startGame();
  state.profileName='Ironpaw';
  codexSee('parts','scraphound');
  toggleEmblemPart('scraphound');
  return guildCreate('Banner Test','BANR');
}).then(r=>{
  ok('guild founded', r.ok===true, r.error);
  ok('the founder row carries the emblem glyph', social.members[0].display_name===(PARTS.scraphound.emoji+' Ironpaw'), social.members[0].display_name);
  return raidStart();
}).then(()=>raidContribute(1000)).then(()=>{
  ok('raid contributions carry the banner too', social.board[0].display_name===(PARTS.scraphound.emoji+' Ironpaw'), social.board[0].display_name);
  return guildLeave();
}).then(()=>{
  const m=newMonster('emberling',10);
  state.roster=[m]; state.formation.front=[m.uid,null,null]; state.formation.back=[null,null,null];
  return ladderPublish();
}).then(()=>ladderFetch()).then(rows=>{
  ok('the ladder shows the banner', rows[0].display_name===(PARTS.scraphound.emoji+' Ironpaw'), rows[0].display_name);

  console.log('\n================ '+pass+' passed, '+fail+' failed ================');
  process.exit(fail?1:0);
}).catch(e=>{ console.log('HARNESS ERROR', e); process.exit(1); });

})();
