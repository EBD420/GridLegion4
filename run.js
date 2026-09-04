#!/usr/bin/env node
/*
 * Cross-platform test runner. Needs only node — no bash, no PowerShell,
 * works the same on Windows, macOS and Linux.
 *
 *   node tests/run.js
 *
 * Exits non-zero if anything fails, so it works as a pre-commit hook or in CI.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gridlegion-'));
const H = p => path.join(root, 'tests', 'harness', p);
const S = p => path.join(root, 'tests', 'suites', p);

function cleanup(){ try{ fs.rmSync(tmp, { recursive:true, force:true }); }catch(e){} }
process.on('exit', cleanup);

// The game is one HTML file; pull its script out so node can load it.
const html = fs.readFileSync(path.join(root, 'gridlegion.html'), 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if(!m){ console.error('could not find the script block in gridlegion.html'); process.exit(1); }
const gamePath = path.join(tmp, 'game.js');
fs.writeFileSync(gamePath, m[1]);

try {
  execFileSync(process.execPath, ['--check', gamePath], { stdio:'pipe' });
  console.log('syntax ok');
} catch (e) {
  console.error('SYNTAX ERROR in gridlegion.html');
  console.error(String(e.stderr || e.message).split('\n').slice(0,6).join('\n'));
  process.exit(1);
}

const SUITES = [
  { label:'gameplay',        harness:'dom-storage-server.js',
    files:['01-core.js','02-gauge-exp.js','03-hybrids.js','04-traits-ascension.js',
           '05-deep-run.js','06-persistence.js','07-auth-sync.js'] },
  { label:'config-selftest', harness:'dom-storage-server.js', assert:true, files:['08-config-selftest.js'] },
  { label:'bosses-tribes',   harness:'dom-storage-server.js', assert:true, files:['09-bosses-trials-tribes.js'] },
  { label:'social',          harness:'dom-storage-server.js', assert:true, files:['10-social.js'] },
  { label:'setup-diagnosis', harness:'dom-storage-server.js', assert:true, files:['11-setup-diagnosis.js'] },
  { label:'guild-hall',      harness:'dom-storage-server.js', assert:true, files:['12-guild-hall.js'] },
  { label:'ai-audio-coach',  harness:'dom-storage-server.js', assert:true, files:['13-ai-audio-tutorial.js'] },
  { label:'harvest-codex',   harness:'dom-storage-server.js', assert:true, files:['14-harvest-codex-tactical.js'] },
  { label:'legion-identity', harness:'dom-storage-server.js', assert:true, files:['15-legion-identity.js'] },
  { label:'war-journal',     harness:'dom-storage-server.js', assert:true, files:['16-war-journal.js'] },
  { label:'commander-victory', harness:'dom-storage-server.js', assert:true, files:['17-commander-victory.js'] },
  { label:'warlord-factions',  harness:'dom-storage-server.js', assert:true, files:['18-warlord-factions.js'] },
  { label:'guild-council',     harness:'dom-storage-server.js', assert:true, files:['19-guild-council.js'] },
  { label:'mentor-bonds',      harness:'dom-storage-server.js', assert:true, files:['20-mentor-bonds.js'] },
  { label:'codex-bonuses',     harness:'dom-storage-server.js', assert:true, files:['21-codex-bonuses.js'] },
  { label:'legion-rebirth',    harness:'dom-storage-server.js', assert:true, files:['22-legion-rebirth.js'] },
  { label:'the-forge',         harness:'dom-storage-server.js', assert:true, files:['23-the-forge.js'] },
  { label:'raid-mutators',     harness:'dom-storage-server.js', assert:true, files:['24-raid-mutators.js'] },
  { label:'sprites',           harness:'dom-storage-server.js', assert:true, files:['25-sprites.js'] },
  { label:'battle-ui',         harness:'dom-storage-server.js', assert:true, files:['26-battle-ui.js'] },
  { label:'battle-forged-bonds', harness:'dom-storage-server.js', assert:true, files:['27-battle-forged-bonds.js'] },
  { label:'rustbound-aces',    harness:'dom-storage-server.js', assert:true, files:['28-rustbound-aces.js'] },
  { label:'split-phase-boss',  harness:'dom-storage-server.js', assert:true, files:['29-split-phase-boss.js'] },
  { label:'rustbound-doctrine', harness:'dom-storage-server.js', assert:true, files:['30-rustbound-doctrine.js'] },
  { label:'archive-fragments',  harness:'dom-storage-server.js', assert:true, files:['31-archive-fragments.js'] },
  { label:'depth-chart',        harness:'dom-storage-server.js', assert:true, files:['32-depth-chart.js'] },
  { label:'cascade-overkill',   harness:'dom-storage-server.js', assert:true, files:['33-cascade-overkill.js'] },
  { label:'vanguard-bounty',    harness:'dom-storage-server.js', assert:true, files:['34-vanguard-bounty.js'] },
  { label:'loadout-gambit',     harness:'dom-storage-server.js', assert:true, files:['35-loadout-gambit.js'] },
  { label:'threat-preview',     harness:'dom-storage-server.js', assert:true, files:['36-threat-preview.js'] },
];

let totalPass = 0, totalFail = 0;
const failed = [];

console.log('running suites...');
for (const suite of SUITES) {
  const parts = [ fs.readFileSync(H(suite.harness), 'utf8'), fs.readFileSync(gamePath, 'utf8') ];
  if (suite.assert) parts.push(fs.readFileSync(H('assert.js'), 'utf8'));
  for (const f of suite.files) parts.push(fs.readFileSync(S(f), 'utf8'));
  const bundle = path.join(tmp, suite.label + '.js');
  fs.writeFileSync(bundle, parts.join('\n'));

  let out = '';
  try { out = execFileSync(process.execPath, [bundle], { encoding:'utf8', stdio:'pipe' }); }
  catch (e) { out = String((e.stdout||'') + (e.stderr||'')); }

  const last = out.trim().split('\n').pop() || '';
  const p = (last.match(/(\d+) passed/) || [,'0'])[1] | 0;
  const f = (last.match(/(\d+) failed/) || [,'0'])[1] | 0;
  totalPass += p; totalFail += f;

  if (f > 0 || p === 0) {
    failed.push(suite.label);
    console.log('  ' + suite.label.padEnd(22) + 'FAILED');
    out.split('\n').filter(l => /FAIL|HARNESS ERROR|Error:/.test(l))
       .slice(0, 12).forEach(l => console.log('      ' + l.trim()));
  } else {
    console.log('  ' + suite.label.padEnd(22) + p + ' passed');
  }
}

console.log('');
console.log('================ ' + totalPass + ' passed, ' + totalFail + ' failed ================');
if (failed.length) { console.log('failing suites: ' + failed.join(', ')); process.exit(1); }
