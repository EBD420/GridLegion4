
(function(){
console.log('\n[17] campaign finale + deep run');
startGame();
ok('campaign is 10 stages', CAMPAIGN_LENGTH===10);
ok('stage 10 is not deep', !isDeep(10));
ok('stage 11 is depth 1', isDeep(11) && deepDepth(11)===1);
ok('elite every 5th depth', isEliteStage(15)&&isEliteStage(20)&&!isEliteStage(16)&&!isEliteStage(11), [15,16,20].map(isEliteStage));
ok('campaign story is scripted', storyForStage(1)===STAGE_STORY[0]);
ok('deep story comes from its own pool', DEEP_STORY.indexOf(storyForStage(11))>=0, storyForStage(11));
ok('deep story cycles, never repeats the campaign ending',
   storyForStage(11)!==storyForStage(12) && DEEP_STORY.indexOf(storyForStage(30))>=0);
ok('terrain keeps cycling deep', !!terrainForStage(37) && !!terrainForStage(112));

/* elite waves hit harder */
state.roster=[newMonster('emberling',5)];
state.formation.front=[state.roster[0].uid,null,null]; state.formation.back=[null,null,null];
state.intel={history:[],wins:0};
const terrain=TERRAINS.clear;
/* enemy species are drawn at random, so average many waves to cancel composition noise */
const meanHp=(stage,n)=>{ let t=0,c=0; for(let i=0;i<n;i++){ state.stage=stage; buildEnemyUnits(stage,terrain,null,false).forEach(u=>{t+=u.maxHp;c++;}); } return t/c; };
const mNormal=meanHp(14,300), mElite=meanHp(15,300);
const ratio=mElite/mNormal;
ok('elite wave is ~25% beefier than the depth before it', ratio>1.18 && ratio<1.34, ratio.toFixed(3));

/* finale flag */
startGame();
state.stage=10;
state.roster=[newMonster('emberling',5)];
state.formation.front=[state.roster[0].uid,null,null];
beginBattle(); let B=state.battle;
B.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;}); B.elemDamage={fire:20};
endBattle('win');
ok('stage 10 win is flagged as the finale', state.lastResult.finale===true);
ok('finale screen renders the ending', /THE GATE FALLS/.test(renderResult()));
ok('finale offers the descent', /DESCEND INTO THE DEEP/.test(renderResult()));
advanceStage();
ok('descending lands on depth 1', state.stage===11 && isDeep(state.stage));

/* elite rewards */
state.stage=15;
state.parts=[];
state.roster=[newMonster('emberling',5)];
state.formation.front=[state.roster[0].uid,null,null];
const rosterBefore=state.roster.length;
beginBattle(); B=state.battle;
B.enemyUnits.forEach(u=>{u.hp=0;u.fainted=true;}); B.elemDamage={fire:20};
endBattle('win');
ok('elite win is flagged', state.lastResult.elite===true);
ok('elite drops double salvage', state.parts.length===2, state.parts.length);
ok('elite guarantees a recruit', state.roster.length===rosterBefore+1, state.roster.length);
ok('normal victory screen still renders', /held the line at Depth 5/.test(renderResult()), 'depth naming');

})();
