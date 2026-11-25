// Validates a score submitted through an issue and records it in leaderboard.json.
// Runs inside actions/github-script; the issue text is untrusted and is only parsed as JSON here.
const fs = require('fs');

const SALT = 'LR-2026-lantern';
const CHARS = ['mint', 'sunny', 'coco', 'leo'];
const MAPS = ['dusk', 'neon', 'desert', 'snow', 'sakura'];
const MAX_SCORE = 100000;
const KEEP = 100;

// Same FNV-1a check the game computes. It only stops casual edits of the issue text.
function sign(s) {
  let h = 0x811c9dc5;
  for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

module.exports = async ({ context, core }) => {
  const issue = context.payload.issue;
  const login = issue.user.login;
  let msg = '', changed = false;
  try {
    const m = (issue.body || '').match(/```json\s*([\s\S]*?)```/);
    if (!m) throw new Error('기록 데이터를 찾지 못했어요. 게임의 "등록" 버튼으로 열린 글을 그대로 제출해 주세요.');
    const d = JSON.parse(m[1]);
    const name = String(d.name || '').replace(/[@`<>\[\]()\\]/g, '').trim().slice(0, 12);
    const score = Number(d.score);
    if (!name) throw new Error('닉네임이 비어 있어요.');
    if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) throw new Error('점수가 올바르지 않아요.');
    if (!CHARS.includes(d.char) || !MAPS.includes(d.map)) throw new Error('캐릭터나 맵 정보가 올바르지 않아요.');
    if (d.code !== sign(`${String(d.name || '').trim().slice(0, 12)}|${score}|${d.char}|${d.map}|${SALT}`)) throw new Error('기록 내용이 바뀌어서 등록할 수 없어요.');

    const board = JSON.parse(fs.readFileSync('leaderboard.json', 'utf8'));
    const prev = board.find((r) => r.login === login);
    if (prev && prev.score >= score) {
      prev.name = name;
      msg = `${name}님의 최고 기록 ${prev.score.toLocaleString()}점이 이미 순위에 있어요.`;
    } else {
      if (prev) board.splice(board.indexOf(prev), 1);
      board.push({ login, name, score, char: d.char, map: d.map, at: new Date().toISOString() });
      msg = `${name}님 ${score.toLocaleString()}점 등록 완료!`;
    }
    board.sort((a, b) => b.score - a.score);
    board.length = Math.min(board.length, KEEP);
    const rank = board.findIndex((r) => r.login === login) + 1;
    if (rank) msg += ` 지금 ${rank}위예요. 1~2분 뒤 게임 순위표에 보여요.`;
    fs.writeFileSync('leaderboard.json', JSON.stringify(board, null, 1) + '\n');
    changed = true;
  } catch (e) {
    msg = `등록하지 못했어요: ${e.message}`;
  }
  core.setOutput('changed', String(changed));
  core.setOutput('msg', msg);
};
