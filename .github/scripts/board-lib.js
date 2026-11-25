// Shared rules for leaderboard records. The game uses the same signature, so edited rows are dropped.
const SALT = 'LR-2026-lantern';
const CHARS = ['mint', 'sunny', 'coco', 'leo'];
const MAPS = ['dusk', 'neon', 'desert', 'snow', 'sakura'];
const MAX_SCORE = 100000, KEEP = 100;

function sign(s) {
  let h = 0x811c9dc5;
  for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
const rowCode = (r) => sign(`${r.id}|${r.name}|${r.score}|${r.char}|${r.map}|${SALT}`);
function valid(r) {
  return !!r && typeof r.id === 'string' && r.id.length <= 40 && typeof r.name === 'string' && r.name.length > 0 && r.name.length <= 12 &&
    Number.isInteger(r.score) && r.score >= 0 && r.score <= MAX_SCORE && CHARS.includes(r.char) && MAPS.includes(r.map) && r.code === rowCode(r);
}
function merge(...lists) {
  const best = new Map();
  for (const list of lists) for (const r of list || []) {
    if (!valid(r)) continue;
    const p = best.get(r.id);
    if (!p || r.score > p.score || (r.score === p.score && (r.at || 0) > (p.at || 0))) best.set(r.id, r);
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, KEEP)
    .map(({ id, name, score, char, map, at, code }) => ({ id, name, score, char, map, at, code }));
}
module.exports = { valid, merge, rowCode };
