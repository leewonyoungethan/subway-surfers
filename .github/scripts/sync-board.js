// Copies the live leaderboard into leaderboard.json and repairs the live store if it was wiped or edited.
const fs = require('fs');
const { merge } = require('./board-lib');

(async () => {
  const { url } = JSON.parse(fs.readFileSync('leaderboard-config.json', 'utf8'));
  const backup = JSON.parse(fs.readFileSync('leaderboard.json', 'utf8'));
  let live = [], liveOk = false;
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (r.ok) { const d = await r.json(); live = Array.isArray(d.players) ? d.players : []; liveOk = Array.isArray(d.players); }
    console.log('live status', r.status, 'rows', live.length);
  } catch (e) { console.log('live read failed', e.message); }
  const merged = merge(backup, live);
  const sameLive = liveOk && live.length === merged.length && JSON.stringify(merge(live)) === JSON.stringify(merged);
  if (!sameLive) {
    const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ players: merged }) });
    console.log('repaired live store:', r.status);
  }
  const out = JSON.stringify(merged, null, 1) + '\n';
  if (out !== fs.readFileSync('leaderboard.json', 'utf8')) { fs.writeFileSync('leaderboard.json', out); console.log('backup updated'); }
  console.log('rows', merged.length);
})();
