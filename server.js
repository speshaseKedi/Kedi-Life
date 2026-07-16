const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));
app.get('/healthz', (req, res) => res.send('ok'));

const SPEED = process.env.FAST ? 0.04 : 1;
const FINISH_BONUS = [15, 10, 5, 0];
const CAT_KEYS = ['tuxedo', 'orange', 'white', 'calico', 'gray', 'siamese'];
const BOT_NAMES = ['Mochi', 'Coco', 'Nabi', 'Tora'];
const PAW_WIN = 3;

function glog(s) {
  const L = CUR.log;
  L.push({ t: Date.now(), s });
  if (L.length > 400) L.shift();
}

function escHtml(s) { return String(s).replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch])); }

app.get('/log', (req, res) => {
  const KEY = process.env.ADMIN_KEY;
  if (!KEY) {
    return res.status(503).send('<html lang="ko"><meta charset="UTF-8"><body style="font-family:system-ui;background:#FDF3E3;color:#4A342A;padding:24px;">' +
      '<h3>🔒 기록 페이지 잠금</h3><p>Render 대시보드 → 이 서비스 → Environment 에서<br><b>ADMIN_KEY</b> 환경변수를 추가하면 이 페이지가 열립니다.</p></body></html>');
  }
  if (req.query.key !== KEY) {
    return res.status(404).send('<html><meta charset="UTF-8"><body style="font-family:system-ui;background:#FDF3E3;color:#4A342A;padding:24px;text-align:center;">' +
      '<div style="font-size:44px;">🐱💤</div><p>Nothing here but a sleepy cat.</p></body></html>');
  }
  const key = req.query.key;
  const sections = ROOM_CODES.map(code => {
    const r = rooms[code];
    const online = socketsInRoom(code).length;
    const rows = r.log.slice().reverse().map(e => {
      const time = new Date(e.t).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
      return '<div class="row"><span class="tm">' + time + '</span><span>' + escHtml(e.s) + '</span></div>';
    }).join('');
    return '<h2>방 ' + code + ' <span class="on">👥 ' + online + '</span></h2>' +
      (rows || '<p class="empty">아직 기록이 없어요.</p>');
  }).join('');
  res.send('<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta http-equiv="refresh" content="20"><title>Kedi 관리자 기록</title><style>' +
    'body{font-family:system-ui,sans-serif;background:#FDF3E3;color:#4A342A;max-width:620px;margin:0 auto;padding:18px 14px;}' +
    'h1{font-size:20px;margin:0 0 4px;}h2{font-size:16px;margin:22px 0 8px;border-top:1px solid #EAD9BC;padding-top:14px;}' +
    '.on{font-size:12px;color:#2E8B7A;font-weight:800;margin-left:6px;}' +
    'p.top{font-size:12.5px;color:#8A7362;margin:0 0 6px;line-height:1.5;}.empty{font-size:12.5px;color:#8A7362;}' +
    '.row{display:flex;gap:10px;background:#FFF9EE;border:1px solid #EAD9BC;border-radius:10px;padding:7px 10px;margin-bottom:6px;font-size:13px;line-height:1.45;}' +
    '.tm{color:#8A7362;flex:none;font-variant-numeric:tabular-nums;}' +
    '</style></head><body><h1>🐾 Kedi 관리자 기록</h1>' +
    '<p class="top">방별 접속 현황과 기록 (한국시간 · 20초마다 자동 새로고침)<br>무료 서버 특성상 15분간 접속이 없어 서버가 잠들면 기록은 초기화돼요.</p>' +
    sections + '</body></html>');
});

const N = [];
function add(x, y, def) { const id = N.length; N.push(Object.assign({ id, x, y, next: [] }, def)); return id; }
function link(a, b) { N[a].next.push(b); }

const START = add(0, 0, { t: 'start', label: 'Start', icon: '🏁' });
const n1 = add(1, 0, { t: 'gain', v: 5, text: 'Treat time! +5 snacks', icon: '🍪' });
const n2 = add(2, 0, { t: 'gain', v: 7, text: 'Caught a mouse! +7 snacks', icon: '🐭' });
const F1 = add(3, 0, { t: 'fork', text: 'Choose your street!', icon: '🪧' });
const g1 = add(3, 1, { t: 'gain', v: 3, text: 'Pretty flowers! +3 snacks', icon: '🌼' });
const g2 = add(2, 1, { t: 'gain', v: 4, text: 'Belly rubs! +4 snacks', icon: '🐾' });
const g3 = add(1, 1, { t: 'gain', v: 3, text: 'A bowl of milk! +3 snacks', icon: '🥛' });
const g4 = add(1, 2, { t: 'gain', v: 2, text: 'A butterfly friend! +2 snacks', icon: '🦋' });
const g5 = add(2, 2, { t: 'gain', v: 3, text: 'A warm sunny spot! +3 snacks', icon: '☀️' });
const a1 = add(4, 0, { t: 'lose', v: 7, text: 'A dog took your snacks! -7', icon: '🐶' });
const a2 = add(4, 1, { t: 'gain', v: 10, text: 'Found a tuna can! +10 snacks', icon: '🐟' });
const a3 = add(4, 2, { t: 'chance', text: 'Mystery box...', icon: '❓' });
const M1 = add(3, 2, { t: 'swap', text: 'Swap places with another Kedi!', icon: '🔀' });
const m1 = add(3, 3, { t: 'nap', text: 'So sleepy... skip 1 turn', icon: '💤' });
const m2 = add(2, 3, { t: 'gain', v: 8, text: "Grandma's snacks! +8", icon: '👵' });
const m3 = add(1, 3, { t: 'lose', v: 5, text: 'Vet visit... -5 snacks', icon: '💉' });
const m4 = add(0, 3, { t: 'swap', text: 'Swap places with another Kedi!', icon: '🔀' });
const m5 = add(0, 4, { t: 'move', v: 2, text: 'Zoomies! Run 2 more', icon: '💨' });
const m6 = add(1, 4, { t: 'gain', v: 6, text: 'Fresh shrimp! +6 snacks', icon: '🦐' });
const F2 = add(2, 4, { t: 'fork', text: 'Choose your way home!', icon: '🪧' });
const k1 = add(3, 4, { t: 'gain', v: 8, text: 'Fish market day! +8 snacks', icon: '🛒' });
const k2 = add(4, 4, { t: 'gain', v: 7, text: 'A kind fishmonger! +7 snacks', icon: '🫶' });
const k3 = add(4, 5, { t: 'lose', v: 4, text: 'Knocked over a vase! -4', icon: '🏺' });
const k4 = add(4, 6, { t: 'gain', v: 6, text: 'A bowl of milk! +6 snacks', icon: '🥛' });
const r1 = add(2, 5, { t: 'lose', v: 5, text: 'Rainy rooftop... -5 snacks', icon: '🌧️' });
const r2 = add(2, 6, { t: 'gain', v: 2, text: 'A rooftop breeze! +2 snacks', icon: '🍃' });
const M2 = add(3, 6, { t: 'gain', v: 5, text: 'Fresh mackerel! +5 snacks', icon: '🐟' });
const e1 = add(3, 7, { t: 'gain', v: 4, text: 'Belly rubs! +4 snacks', icon: '🐾' });
const e2 = add(2, 7, { t: 'move', v: -2, text: 'A loud noise! Go back 2', icon: '😾' });
const e3 = add(1, 7, { t: 'gain', v: 5, text: 'Treat time! +5 snacks', icon: '🍪' });
const e4 = add(0, 7, { t: 'chance', text: 'Mystery box...', icon: '❓' });
const HOME = add(0, 8, { t: 'home', label: 'Home', icon: '🏠' });

link(START, n1); link(n1, n2); link(n2, F1);
link(F1, g1); link(F1, a1);
N[F1].choices = [
  { to: g1, label: '🌼 Garden way', hint: 'Calm and snacky, a bit longer' },
  { to: a1, label: '🐶 Back alley', hint: 'Risky shortcut — dog or tuna!' }
];
link(g1, g2); link(g2, g3); link(g3, g4); link(g4, g5); link(g5, M1);
link(a1, a2); link(a2, a3); link(a3, M1);
link(M1, m1); link(m1, m2); link(m2, m3); link(m3, m4); link(m4, m5); link(m5, m6); link(m6, F2);
link(F2, k1); link(F2, r1);
N[F2].choices = [
  { to: k1, label: '🛒 Market street', hint: 'Snack festival, the long way' },
  { to: r1, label: '🌧️ Rooftop shortcut', hint: 'Fast but a little wet' }
];
link(k1, k2); link(k2, k3); link(k3, k4); link(k4, M2);
link(r1, r2); link(r2, M2);
link(M2, e1); link(e1, e2); link(e2, e3); link(e3, e4); link(e4, HOME);

N.forEach(nd => { nd.back = null; });
N.forEach(nd => { nd.next.forEach(nx => { if (N[nx].back == null) N[nx].back = nd.id; }); });

const CHANCE = [
  { t: 'gain', v: 10, text: 'Jackpot! +10 snacks', icon: '🎁' },
  { t: 'gain', v: 5, text: 'A kind stranger! +5 snacks', icon: '🫶' },
  { t: 'lose', v: 5, text: 'Seagull attack! -5 snacks', icon: '🐦' },
  { t: 'move', v: 2, text: 'A friendly wind! Move 2 more', icon: '🍃' },
  { t: 'move', v: -2, text: 'Wrong way! Go back 2', icon: '🙀' },
  { t: 'nap', text: 'Sudden nap attack... skip 1 turn', icon: '💤' }
];

const MAPS = {
  park: { name: 'Sunny Park', icon: '🌳', tiles: {}, forks: {} },
  alley: { name: 'Night Alley', icon: '🌙', tiles: {
    1: { text: 'Chicken skewer! +5 snacks', icon: '🍗' },
    2: { text: 'Caught a mouse! +7 snacks', icon: '🐭' },
    4: { text: 'Leftover treats! +3 snacks', icon: '🥡' },
    5: { text: 'A friendly stray! +4 snacks', icon: '🐾' },
    6: { text: 'A milk crate! +3 snacks', icon: '🥛' },
    7: { text: 'A moth friend! +2 snacks', icon: '🦋' },
    8: { text: 'A warm barrel! +3 snacks', icon: '🛢️' },
    9: { text: 'A tough cat took your snacks! -7', icon: '😼' },
    13: { text: 'A cozy box... skip 1 turn', icon: '📦' },
    14: { text: 'Noodle shop scraps! +8 snacks', icon: '🍜' },
    15: { text: 'Chased by the janitor! -5', icon: '🧹' },
    17: { text: 'Zoomies down the alley! Run 2 more', icon: '💨' },
    20: { text: 'Night market! +8 snacks', icon: '🏮' },
    21: { text: 'A kind cook! +7 snacks', icon: '🫶' },
    22: { text: 'Knocked over a trash can! -4', icon: '🚮' },
    28: { text: 'A siren! Go back 2', icon: '🚨' }
  }, forks: {
    3: [{ label: '🏮 Lantern lane', hint: 'Warm lights, steady snacks' }, { label: '🕳️ Dark shortcut', hint: 'Risky — tough cat or tuna!' }],
    19: [{ label: '🏮 Night market', hint: 'Snack festival, the long way' }, { label: '🌧️ Rooftop shortcut', hint: 'Fast but a little wet' }]
  } },
  playground: { name: 'Playground', icon: '🛝', tiles: {
    1: { text: 'A pretzel bite! +5 snacks', icon: '🥨' },
    2: { text: 'Caught a cricket! +7 snacks', icon: '🦗' },
    4: { text: 'Juice drops! +3 snacks', icon: '🧃' },
    6: { text: 'Dropped ice cream! +3 snacks', icon: '🍦' },
    8: { text: 'A sunny bench! +3 snacks', icon: '☀️' },
    9: { text: 'A puppy chased you! -7', icon: '🐕' },
    10: { text: 'Picnic chicken! +10 snacks', icon: '🍗' },
    13: { text: 'Nap under the slide... skip 1 turn', icon: '💤' },
    14: { text: 'A picnic basket! +8 snacks', icon: '🧺' },
    15: { text: 'Sprinkler splash! -5 snacks', icon: '💦' },
    17: { text: 'Skateboard zoom! Run 2 more', icon: '🛹' },
    20: { text: 'A food truck! +8 snacks', icon: '🚚' },
    22: { text: 'Hit by a ball! -4', icon: '⚽' },
    24: { text: 'Sprinkler zone! -5 snacks', icon: '💦' },
    26: { text: 'A snack stand! +5 snacks', icon: '🍡' },
    28: { text: 'A balloon popped! Go back 2', icon: '🎈' }
  }, forks: {
    3: [{ label: '🏖️ Sandbox path', hint: 'Soft and snacky, a bit longer' }, { label: '🛝 Slide shortcut', hint: 'Risky — puppy or picnic!' }],
    19: [{ label: '🚚 Food-truck row', hint: 'Snack festival, the long way' }, { label: '💦 Sprinkler shortcut', hint: 'Fast but wet' }]
  } }
};

function themedBoard(key) {
  const m = MAPS[key] || MAPS.park;
  return N.map(nd => {
    const base = {
      id: nd.id, x: nd.x, y: nd.y, t: nd.t, v: nd.v, text: nd.text,
      icon: nd.icon, label: nd.label, next: nd.next, back: nd.back, choices: nd.choices
    };
    if (m.tiles[nd.id]) Object.assign(base, m.tiles[nd.id]);
    if (nd.choices && m.forks[nd.id]) {
      base.choices = nd.choices.map((c, i) => ({
        to: c.to, label: m.forks[nd.id][i].label, hint: m.forks[nd.id][i].hint
      }));
    }
    return base;
  });
}

const ROOM_CODES = (process.env.ROOM_CODES || '0101,0514,3003,7300,5511').split(',').map(s => s.trim()).filter(Boolean);
const rooms = {};
function makeRoom(code) {
  return {
    code,
    game: freshGame(),
    B: themedBoard('park'),
    paw: freshPaw(),
    run: freshRun(),
    log: []
  };
}
ROOM_CODES.forEach(c => { rooms[c] = makeRoom(c); });

// CUR is the active room context. Handlers and timers set it before touching state.
let CUR = rooms[ROOM_CODES[0]];
let game = CUR.game, B = CUR.B, paw = CUR.paw, run = CUR.run;
function setRoom(r) {
  CUR = r;
  game = r.game; B = r.B; paw = r.paw; run = r.run;
}
// Re-point module aliases to CUR after any reassignment of game/paw/run inside logic.
function sync() { CUR.game = game; CUR.B = B; CUR.paw = paw; CUR.run = run; }
// bind: wrap a timer callback so it restores its room context and re-syncs after.
function bind(r, fn) {
  return function () {
    setRoom(r);
    fn();
    sync();
  };
}
function socketsInRoom(code) {
  const out = [];
  for (const [, s] of io.sockets.sockets) {
    if (s.data.room === code) out.push(s);
  }
  return out;
}

function freshGame() {
  return { phase: 'lobby', players: [], turn: 0, finishCount: 0, busy: false, timer: null, await: null, map: 'park' };
}
function rid() { return crypto.randomBytes(8).toString('hex'); }
function clearTimer() { if (game.timer) { clearTimeout(game.timer); game.timer = null; } }
function cur() { return game.players[game.turn]; }
function kediByPid(pid) { return game.players.find(p => p.id === pid); }

function pub() {
  return {
    phase: game.phase,
    map: game.map,
    turn: game.turn,
    players: game.players.map(p => ({
      name: p.name, cat: p.cat, isBot: p.isBot, connected: p.connected,
      pos: p.pos, snacks: p.snacks, skip: p.skip,
      finished: p.finished, finishOrder: p.finishOrder
    })),
    ranking: game.phase === 'over' ? rankingIdx() : null
  };
}
function rankingIdx() {
  return game.players.map((p, i) => i).sort((a, b) =>
    game.players[b].snacks - game.players[a].snacks ||
    game.players[a].finishOrder - game.players[b].finishOrder);
}
function youOfKedi(socket) { return game.players.findIndex(p => p.id === socket.data.pid); }
function emitAll(type, payload) {
  for (const s of socketsInRoom(CUR.code)) {
    s.emit(type, Object.assign({}, payload, { state: pub(), you: youOfKedi(s) }));
  }
}
function broadcastState() { emitAll('state', {}); }

function fwd(id, steps) {
  let c = id;
  for (let i = 0; i < steps; i++) {
    if (!N[c].next.length) break;
    c = N[c].next[0];
  }
  return c;
}
function bwd(id, steps) {
  let c = id;
  for (let i = 0; i < steps; i++) {
    if (N[c].back == null) break;
    c = N[c].back;
  }
  return c;
}

function applyEffect(pIdx, eff, events, paths, depth) {
  const p = game.players[pIdx];
  if (eff.t === 'gain') {
    p.snacks += eff.v;
    events.push({ icon: eff.icon, text: eff.text, delta: eff.v, pIdx });
  } else if (eff.t === 'lose') {
    p.snacks = Math.max(0, p.snacks - eff.v);
    events.push({ icon: eff.icon, text: eff.text, delta: -eff.v, pIdx });
  } else if (eff.t === 'nap') {
    p.skip = 1;
    events.push({ icon: eff.icon || '💤', text: eff.text, pIdx });
  } else if (eff.t === 'swap') {
    const others = game.players.map((q, i) => i)
      .filter(i => i !== pIdx && !game.players[i].finished && game.players[i].pos !== p.pos);
    if (!others.length) {
      events.push({ icon: '🔀', text: 'No one to swap with...', pIdx });
    } else {
      const qi = others[Math.floor(Math.random() * others.length)];
      const q = game.players[qi];
      const a = p.pos, b = q.pos;
      p.pos = b; q.pos = a;
      events.push({ icon: '🔀', text: 'Swapped places with ' + q.name + '!', pIdx, swap: [pIdx, qi], aPos: b, bPos: a });
    }
  } else if (eff.t === 'move') {
    const np = eff.v > 0 ? fwd(p.pos, eff.v) : bwd(p.pos, -eff.v);
    events.push({ icon: eff.icon, text: eff.text, pIdx });
    if (np !== p.pos && depth < 4) {
      const seg = [];
      let c = p.pos;
      while (c !== np) {
        c = eff.v > 0 ? N[c].next[0] : N[c].back;
        seg.push(c);
      }
      paths.push({ pIdx, path: seg });
      p.pos = np;
      landOn(pIdx, events, paths, depth + 1);
    }
  } else if (eff.t === 'chance') {
    const c = CHANCE[Math.floor(Math.random() * CHANCE.length)];
    events.push({ icon: '❓', text: 'Mystery box...', pIdx });
    applyEffect(pIdx, c, events, paths, depth);
  }
}

function landOn(pIdx, events, paths, depth) {
  if (depth > 4) return;
  const p = game.players[pIdx];
  const tile = B[p.pos];
  if (tile.t === 'home') {
    if (!p.finished) {
      p.finished = true;
      game.finishCount += 1;
      p.finishOrder = game.finishCount;
      const b = FINISH_BONUS[p.finishOrder - 1] || 0;
      p.snacks += b;
      events.push({ icon: '🏠', text: 'Home sweet home! Finished #' + p.finishOrder + ' (+' + b + ' bonus)', delta: b, pIdx });
    }
    return;
  }
  if (tile.t === 'start' || tile.t === 'fork') return;
  applyEffect(pIdx, tile, events, paths, depth);
}

function walk(pIdx, steps) {
  const p = game.players[pIdx];
  const path = [];
  let remaining = steps;
  while (remaining > 0) {
    const node = B[p.pos];
    if (!node.next.length) break;
    if (node.next.length > 1) {
      return { path, remaining, fork: node.id };
    }
    p.pos = node.next[0];
    path.push(p.pos);
    remaining--;
    if (N[p.pos].t === 'home') break;
  }
  return { path, remaining: 0, fork: null };
}

function segMs(pathLen, evCount, withDice) {
  return ((withDice ? 1000 : 300) + pathLen * 260 + evCount * 2850 + 500) * SPEED;
}

function finishSegment(pIdx, dice, cont, walked) {
  const p = game.players[pIdx];
  const events = [], paths = [];
  if (walked.path.length) paths.unshift({ pIdx, path: walked.path });
  landOn(pIdx, events, paths, 0);
  if (events.length) glog('🎲 Kedi Life · ' + p.name + (dice ? ' rolled ' + dice : '') + ' → ' + events.map(e => e.text).join(' / '));
  else glog('🎲 Kedi Life · ' + p.name + (dice ? ' rolled ' + dice : '') + ' → moved along');
  if (game.players.every(q => q.finished)) game.phase = 'over';
  const tiles = paths.reduce((s, sg) => s + sg.path.length, 0);
  const swaps = events.filter(e => e.swap).length;
  const animMs = segMs(tiles, events.length, !cont) + swaps * 500 * SPEED;
  emitAll('turn', { playerIdx: pIdx, dice, cont, steps: paths, events, skipped: false });
  if (game.phase === 'over') {
    const rk = rankingIdx().map((pi, r) => (r + 1) + '위 ' + game.players[pi].name + ' 🍪' + game.players[pi].snacks).join(' · ');
    glog('🏆 Kedi Life 게임 종료! ' + rk);
    clearTimer();
    game.timer = setTimeout(bind(CUR, () => { game.busy = false; broadcastState(); }), animMs);
  } else {
    endTurn(animMs);
  }
}

function forkSegment(pIdx, dice, cont, walked) {
  const node = B[walked.fork];
  const animMs = segMs(walked.path.length, 0, !cont);
  game.await = { pIdx, remaining: walked.remaining, forkId: node.id, options: node.choices.map(c => c.to) };
  emitAll('turn', {
    playerIdx: pIdx, dice, cont, steps: walked.path.length ? [{ pIdx, path: walked.path }] : [],
    events: [], skipped: false,
    choice: { pIdx, text: node.text, options: node.choices }
  });
  const p = game.players[pIdx];
  clearTimer();
  const waitMs = (p.isBot || !p.connected) ? animMs + 1600 * SPEED : animMs + 25000 * SPEED;
  game.timer = setTimeout(bind(CUR, () => {
    if (game.await && game.await.pIdx === pIdx) {
      const opts = game.await.options;
      resumeWalk(pIdx, opts[Math.floor(Math.random() * opts.length)]);
    }
  }), waitMs);
}

function resumeWalk(pIdx, to) {
  if (!game.await || game.await.pIdx !== pIdx) return;
  const aw = game.await;
  game.await = null;
  clearTimer();
  const p = game.players[pIdx];
  const chosen = B[aw.forkId].choices.find(c => c.to === to);
  if (chosen) glog('🪧 Kedi Life · ' + p.name + ' chose ' + chosen.label);
  p.pos = to;
  const walked = walk(pIdx, aw.remaining - 1);
  walked.path.unshift(to);
  if (walked.fork != null) forkSegment(pIdx, null, true, walked);
  else finishSegment(pIdx, null, true, walked);
}

function playRoll(p) {
  if (game.phase !== 'playing' || game.busy) return;
  const pIdx = game.players.indexOf(p);
  if (pIdx !== game.turn || p.finished) return;
  clearTimer();
  game.busy = true;
  const dice = 1 + Math.floor(Math.random() * 6);
  const walked = walk(pIdx, dice);
  if (walked.fork != null) forkSegment(pIdx, dice, false, walked);
  else finishSegment(pIdx, dice, false, walked);
}

function endTurn(animMs) {
  clearTimer();
  game.timer = setTimeout(bind(CUR, () => {
    game.busy = false;
    if (game.phase !== 'playing') { broadcastState(); return; }
    advance();
    beginTurn();
  }), animMs);
}

function advance() {
  for (let i = 1; i <= game.players.length; i++) {
    const j = (game.turn + i) % game.players.length;
    if (!game.players[j].finished) { game.turn = j; return; }
  }
}

function beginTurn() {
  const p = cur();
  if (!p) return;
  if (p.skip > 0) {
    p.skip -= 1;
    game.busy = true;
    glog('💤 Kedi Life · ' + p.name + ' is napping (turn skipped)');
    emitAll('turn', {
      playerIdx: game.turn, dice: null, steps: [], skipped: true,
      events: [{ icon: '💤', text: p.name + ' is napping... turn skipped', pIdx: game.turn }]
    });
    endTurn(2400 * SPEED);
    return;
  }
  broadcastState();
  clearTimer();
  if (p.isBot || !p.connected) {
    game.timer = setTimeout(bind(CUR, () => playRoll(p)), 1600 * SPEED);
  } else {
    game.timer = setTimeout(bind(CUR, () => {
      if (game.phase === 'playing' && cur() === p && !game.busy) playRoll(p);
    }), 45000 * SPEED);
  }
}

function addBot() {
  const catFree = CAT_KEYS.find(c => !game.players.some(p => p.cat === c));
  const used = game.players.map(p => p.name);
  const name = BOT_NAMES.find(n => !used.includes(n)) || 'Bot';
  game.players.push({
    id: rid(), name, cat: catFree, isBot: true, connected: true,
    pos: START, snacks: 0, skip: 0, finished: false, finishOrder: 0
  });
}

function freshPaw() {
  return { phase: 'lobby', players: [], round: 0, pointer: 0, scores: [0, 0], picks: [null, null], timer: null, resolving: false };
}
function pawClearTimer() { if (paw.timer) { clearTimeout(paw.timer); paw.timer = null; } }
function pawByPid(pid) { return paw.players.find(p => p.id === pid); }
function youOfPaw(socket) { return paw.players.findIndex(p => p.id === socket.data.pid); }
function ppPub() {
  return {
    phase: paw.phase,
    round: paw.round,
    pointer: paw.pointer,
    scores: paw.scores.slice(),
    winner: paw.phase === 'over' ? (paw.scores[0] >= PAW_WIN ? 0 : 1) : null,
    players: paw.players.map(p => ({ name: p.name, cat: p.cat, isBot: p.isBot, connected: p.connected }))
  };
}
function emitAllPP(type, payload) {
  for (const s of socketsInRoom(CUR.code)) {
    s.emit(type, Object.assign({}, payload, { state: ppPub(), you: youOfPaw(s) }));
  }
}
function ppBroadcast() { emitAllPP('pp_state', {}); }

function addPawBot() {
  const catFree = CAT_KEYS.find(c => !paw.players.some(p => p.cat === c));
  const used = paw.players.map(p => p.name);
  const name = BOT_NAMES.find(n => !used.includes(n)) || 'Bot';
  paw.players.push({ id: rid(), name, cat: catFree, isBot: true, connected: true });
}

function pawStartRound() {
  if (paw.phase !== 'playing') return;
  paw.round += 1;
  paw.picks = [null, null];
  paw.resolving = false;
  emitAllPP('pp_round', { round: paw.round, pointer: paw.pointer });
  pawClearTimer();
  const roundMs = 5800 * (SPEED === 1 ? 1 : 0.15);
  paw.players.forEach((p, i) => {
    if (p.isBot) {
      setTimeout(bind(CUR, () => {
        if (paw.phase === 'playing' && paw.picks[i] == null && !paw.resolving) {
          paw.picks[i] = Math.floor(Math.random() * 3);
          pawMaybeResolve();
        }
      }), roundMs * 0.65 + Math.random() * roundMs * 0.2);
    }
  });
  paw.timer = setTimeout(bind(CUR, () => {
    for (let i = 0; i < 2; i++) if (paw.picks[i] == null) paw.picks[i] = Math.floor(Math.random() * 3);
    pawResolve();
  }), roundMs);
}

function pawMaybeResolve() {
  if (paw.picks[0] != null && paw.picks[1] != null && !paw.resolving) {
    pawClearTimer();
    paw.timer = setTimeout(bind(CUR, pawResolve), 400);
  }
}

function pawResolve() {
  if (paw.phase !== 'playing' || paw.resolving) return;
  paw.resolving = true;
  pawClearTimer();
  const ptr = paw.pointer, dodger = 1 - ptr;
  const match = paw.picks[ptr] === paw.picks[dodger];
  if (match) paw.scores[ptr] += 1;
  const over = paw.scores[ptr] >= PAW_WIN;
  const D = ['Left', 'Center', 'Right'];
  glog('🐾 Paw R' + paw.round + ' · ' + paw.players[ptr].name + '(paw) ' + D[paw.picks[ptr]] +
    ' vs ' + paw.players[dodger].name + '(dodge) ' + D[paw.picks[dodger]] +
    (match ? ' → HIT! ' : ' → miss ') + paw.scores[0] + ':' + paw.scores[1]);
  if (over) paw.phase = 'over';
  emitAllPP('pp_result', { picks: paw.picks.slice(), match, pointer: ptr, over });
  if (over) {
    glog('🏆 Paw Paw Paw 종료! ' + paw.players[paw.scores[0] >= PAW_WIN ? 0 : 1].name + ' 승리 (' + paw.scores[0] + ':' + paw.scores[1] + ')');
    return;
  }
  paw.pointer = dodger;
  paw.timer = setTimeout(bind(CUR, pawStartRound), 2800 * (SPEED === 1 ? 1 : 0.15));
}

const RUN_LEN = 100;
function freshRun() {
  return { phase: 'lobby', players: [], timer: null, rainUntil: 0, nextRain: 0, finishCount: 0, startAt: 0, fxSeq: 0, fx: [] };
}
function runByPid(pid) { return run.players.find(p => p.id === pid); }
function youOfRun(s) { return run.players.findIndex(p => p.id === s.data.pid); }
function addRunFx(type, a, b) {
  run.fxSeq += 1;
  run.fx.push({ seq: run.fxSeq, type, a, b });
  if (run.fx.length > 8) run.fx.shift();
}
function runRanking() {
  return run.players.map((p, i) => i).sort((x, y) =>
    (run.players[x].finishOrder || 99) - (run.players[y].finishOrder || 99) ||
    run.players[y].pos - run.players[x].pos);
}
const RUN_CD = { cheer: 5000, snack: 8000, water: 9000 };
function runPub() {
  const now = Date.now();
  return {
    phase: run.phase,
    rain: now < run.rainUntil,
    fx: run.fx,
    players: run.players.map(p => ({
      name: p.name, cat: p.cat, isBot: p.isBot, connected: p.connected,
      pos: Math.round(p.pos * 10) / 10, finished: p.finished, finishOrder: p.finishOrder,
      slowed: now < p.slowUntil, boosted: now < p.boostUntil,
      cds: {
        cheer: Math.max(0, RUN_CD.cheer - (now - (p.cdCheer || 0))),
        snack: Math.max(0, RUN_CD.snack - (now - (p.cdSnack || 0))),
        water: Math.max(0, RUN_CD.water - (now - (p.cdWater || 0)))
      }
    })),
    ranking: run.phase === 'over' ? runRanking() : null
  };
}
function emitAllRun(type, payload) {
  for (const s of socketsInRoom(CUR.code)) {
    s.emit(type, Object.assign({}, payload, { state: runPub(), you: youOfRun(s) }));
  }
}
function runBroadcast() { emitAllRun('run_state', {}); }
function addRunBot() {
  const catFree = CAT_KEYS.find(c => !run.players.some(p => p.cat === c));
  const used = run.players.map(p => p.name);
  const name = BOT_NAMES.find(n => !used.includes(n)) || 'Bot';
  run.players.push({ id: rid(), name, cat: catFree, isBot: true, connected: true, pos: 0, energy: 0, slowUntil: 0, boostUntil: 0, finished: false, finishOrder: 0, cdCheer: 0, cdSnack: 0, cdWater: 0 });
}
function runUseItem(i, kind) {
  const p = run.players[i];
  const now = Date.now();
  if (kind === 'cheer') {
    if (now - (p.cdCheer || 0) < RUN_CD.cheer) return;
    p.cdCheer = now;
    p.boostUntil = now + 1800;
    addRunFx('cheer', i);
  } else if (kind === 'snack') {
    if (now - (p.cdSnack || 0) < RUN_CD.snack) return;
    p.cdSnack = now;
    run.players.forEach((q, j) => { if (j !== i && !q.finished) q.slowUntil = now + 1700; });
    addRunFx('snack', i);
    glog('🍪 Kedi Running · ' + p.name + ' tempted everyone with snacks!');
  } else if (kind === 'water') {
    if (now - (p.cdWater || 0) < RUN_CD.water) return;
    p.cdWater = now;
    run.players.forEach((q, j) => {
      if (j === i || q.finished) return;
      if (Math.random() < 0.5) { q.pos = Math.max(0, q.pos - 6); addRunFx('slipb', j); }
      else { q.pos = Math.min(RUN_LEN - 1, q.pos + 5); addRunFx('slipf', j); }
    });
    glog('💧 Kedi Running · ' + p.name + ' splashed water!');
  }
}
function runTick() {
  if (run.phase !== 'playing') return;
  const now = Date.now();
  if (run.nextRain && now >= run.nextRain) {
    run.rainUntil = now + 2800;
    run.nextRain = now + 12000 + Math.random() * 10000;
    addRunFx('rain');
    glog('🌧️ Kedi Running · 비가 온다! 전원 대피');
  }
  const raining = now < run.rainUntil;
  run.players.forEach((p, i) => {
    if (p.finished) return;
    if (p.isBot && !raining) {
      if (Math.random() < 0.6) p.energy = Math.min(6, (p.energy || 0) + 0.9);
      if (Math.random() < 0.004) runUseItem(i, ['cheer', 'snack', 'water'][Math.floor(Math.random() * 3)]);
    }
    if (!raining) {
      let mv = 0.12 + (p.energy || 0) * 0.14;
      if (now < p.boostUntil) mv *= 1.6;
      if (now < p.slowUntil) mv *= 0.45;
      p.pos += mv;
      p.energy = (p.energy || 0) * 0.86;
      if (p.pos >= RUN_LEN) {
        p.pos = RUN_LEN;
        p.finished = true;
        run.finishCount += 1;
        p.finishOrder = run.finishCount;
        addRunFx('finish', i);
        glog('🏁 Kedi Running · ' + p.name + ' finished #' + p.finishOrder);
      }
    }
  });
  if (run.players.every(p => p.finished) || now - run.startAt > 150000) {
    run.phase = 'over';
    if (run.timer) { clearInterval(run.timer); run.timer = null; }
    glog('🏆 Kedi Running 종료! ' + runRanking().map((pi, r) => (r + 1) + '위 ' + run.players[pi].name).join(' · '));
  }
  runBroadcast();
}

// Guard: run a room handler only if the socket has entered a valid room.
function inRoom(socket, fn) {
  return function (d) {
    const r = rooms[socket.data.room];
    if (!r) return;
    setRoom(r);
    fn(d);
    sync();
  };
}
function roomOnline(code) { return socketsInRoom(code).length; }
function broadcastRoomOnline(code) {
  for (const s of socketsInRoom(code)) s.emit('online', { n: roomOnline(code) });
}

io.on('connection', (socket) => {
  socket.on('enter', (d) => {
    const code = String((d && d.room) || '').trim();
    if (!rooms[code]) return socket.emit('badroom');
    socket.data.room = code;
    setRoom(rooms[code]);
    socket.emit('entered', { room: code });
    socket.emit('board', themedBoard(game.map));
    const pid = d && d.pid;
    const kp = kediByPid(pid);
    if (kp && !kp.isBot) { socket.data.pid = pid; kp.connected = true; }
    const pp = pawByPid(pid);
    if (pp && !pp.isBot) { socket.data.pid = pid; pp.connected = true; }
    const rp = runByPid(pid);
    if (rp && !rp.isBot) { socket.data.pid = pid; rp.connected = true; }
    socket.emit('state', { state: pub(), you: youOfKedi(socket) });
    socket.emit('pp_state', { state: ppPub(), you: youOfPaw(socket) });
    socket.emit('run_state', { state: runPub(), you: youOfRun(socket) });
    broadcastRoomOnline(code);
    sync();
  });

  socket.on('admin', (d) => {
    const KEY = process.env.ADMIN_KEY;
    if (!KEY || String((d && d.key) || '') !== KEY) return socket.emit('admin_denied');
    const overview = ROOM_CODES.map(code => {
      const r = rooms[code];
      const humans = [];
      for (const s of socketsInRoom(code)) {
        const nm = (r.game.players.find(p => p.id === s.data.pid) ||
                    r.paw.players.find(p => p.id === s.data.pid) ||
                    r.run.players.find(p => p.id === s.data.pid));
        humans.push(nm ? nm.name + ' (' + nm.cat + ')' : 'browsing');
      }
      let active = 'idle';
      if (r.game.phase !== 'lobby') active = 'Kedi Life';
      else if (r.paw.phase !== 'lobby') active = 'Paw Paw Paw';
      else if (r.run.phase !== 'lobby') active = 'Kedi Running';
      return {
        code, online: socketsInRoom(code).length, active,
        people: humans,
        kedi: r.game.players.length, paw: r.paw.players.length, run: r.run.players.length,
        log: r.log.slice(-40).reverse().map(e => ({
          time: new Date(e.t).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }),
          s: e.s
        }))
      };
    });
    socket.emit('admin_ok', { rooms: overview });
  });

  socket.on('hello', inRoom(socket, (d) => {
    socket.emit('state', { state: pub(), you: youOfKedi(socket) });
    socket.emit('pp_state', { state: ppPub(), you: youOfPaw(socket) });
    socket.emit('run_state', { state: runPub(), you: youOfRun(socket) });
    broadcastRoomOnline(socket.data.room);
  }));

  socket.on('join', inRoom(socket, (d) => {
    if (game.phase !== 'lobby') return socket.emit('errmsg', 'A game is running — you can watch, then join next round!');
    if (game.players.length >= 4) return socket.emit('errmsg', 'The lobby is full (4 Kedi max).');
    if (socket.data.pid && pawByPid(socket.data.pid)) return socket.emit('errmsg', 'Finish your Paw game first! 🐾');
    if (socket.data.pid && runByPid(socket.data.pid)) return socket.emit('errmsg', 'Finish your race first! 🏃');
    const cat = d && d.cat;
    if (!CAT_KEYS.includes(cat)) return socket.emit('errmsg', 'Pick a Kedi first!');
    if (game.players.some(p => p.cat === cat)) return socket.emit('errmsg', 'That Kedi is taken in this game — pick another one!');
    const name = String((d && d.name) || '').trim().slice(0, 12) || 'Kedi';
    const p = {
      id: rid(), name, cat, isBot: false, connected: true,
      pos: START, snacks: 0, skip: 0, finished: false, finishOrder: 0
    };
    game.players.push(p);
    socket.data.pid = p.id;
    socket.emit('joined', { pid: p.id });
    glog('👋 ' + name + ' (' + cat + ') joined Kedi Life');
    broadcastState();
  }));

  socket.on('leave', inRoom(socket, () => {
    const p = kediByPid(socket.data.pid);
    if (!p) return;
    socket.data.pid = null;
    if (game.phase === 'lobby') {
      game.players = game.players.filter(q => q !== p);
      glog('👋 ' + p.name + ' left the Kedi Life lobby');
    } else {
      p.isBot = true;
      glog('🚪 ' + p.name + ' left Kedi Life — a bot takes over');
      if (game.players.every(q => q.isBot)) {
        clearTimer();
        game = freshGame(); sync();
        glog('🧹 Kedi Life 초기화 (모두 나감)');
      } else if (game.phase === 'playing') {
        const pIdx = game.players.indexOf(p);
        if (game.await && game.await.pIdx === pIdx) {
          clearTimer();
          game.timer = setTimeout(bind(CUR, () => {
            if (game.await && game.await.pIdx === pIdx) {
              const o = game.await.options;
              resumeWalk(pIdx, o[Math.floor(Math.random() * o.length)]);
            }
          }), 1500 * SPEED);
        } else if (cur() === p && !game.busy) {
          clearTimer();
          game.timer = setTimeout(bind(CUR, () => playRoll(p)), 1400 * SPEED);
        }
      }
    }
    broadcastState();
  }));

  socket.on('setmap', inRoom(socket, (d) => {
    if (game.phase !== 'lobby') return;
    if (!kediByPid(socket.data.pid)) return;
    const key = d && d.map;
    if (!MAPS[key] || game.map === key) return;
    game.map = key;
    B = themedBoard(key); sync();
    glog('🗺️ Kedi Life 맵 변경 → ' + MAPS[key].name);
    io.emit('board', B);
    broadcastState();
  }));

  socket.on('start', inRoom(socket, () => {
    if (game.phase !== 'lobby' || game.players.length < 1) return;
    const p = kediByPid(socket.data.pid);
    if (!p) return;
    if (game.players.length === 1) addBot();
    game.phase = 'playing';
    game.turn = 0;
    game.finishCount = 0;
    game.busy = false;
    glog('🚩 Kedi Life 시작! ' + game.players.map(q => q.name + (q.isBot ? '(bot)' : '')).join(' vs '));
    broadcastState();
    beginTurn();
  }));

  socket.on('roll', inRoom(socket, () => {
    const p = kediByPid(socket.data.pid);
    if (p) playRoll(p);
  }));

  socket.on('choice', inRoom(socket, (d) => {
    const p = kediByPid(socket.data.pid);
    if (!p || !game.await) return;
    const pIdx = game.players.indexOf(p);
    if (pIdx !== game.await.pIdx) return;
    const to = d && d.to;
    if (!game.await.options.includes(to)) return;
    resumeWalk(pIdx, to);
  }));

  socket.on('again', inRoom(socket, () => {
    if (game.phase !== 'over') return;
    clearTimer();
    const humans = game.players.filter(p => !p.isBot && p.connected);
    const keepMap = game.map;
    game = freshGame(); game.map = keepMap; sync();
    for (const p of humans) {
      p.pos = START; p.snacks = 0; p.skip = 0; p.finished = false; p.finishOrder = 0;
      game.players.push(p);
    }
    glog('🔄 Kedi Life 다시 하기');
    broadcastState();
  }));

  socket.on('pp_join', inRoom(socket, (d) => {
    if (paw.phase !== 'lobby') return socket.emit('errmsg', 'A Paw game is running — watch this one!');
    if (paw.players.length >= 2) return socket.emit('errmsg', 'Paw Paw Paw is 1 vs 1 — seats are full!');
    if (socket.data.pid && kediByPid(socket.data.pid)) return socket.emit('errmsg', 'Finish your Kedi Life game first! 🎲');
    if (socket.data.pid && runByPid(socket.data.pid)) return socket.emit('errmsg', 'Finish your race first! 🏃');
    const cat = d && d.cat;
    if (!CAT_KEYS.includes(cat)) return socket.emit('errmsg', 'Pick a Kedi first!');
    if (paw.players.some(p => p.cat === cat)) return socket.emit('errmsg', 'That Kedi is taken in this game — pick another one!');
    const name = String((d && d.name) || '').trim().slice(0, 12) || 'Kedi';
    const p = { id: rid(), name, cat, isBot: false, connected: true };
    paw.players.push(p);
    socket.data.pid = p.id;
    socket.emit('joined', { pid: p.id });
    glog('👋 ' + name + ' (' + cat + ') joined Paw Paw Paw');
    ppBroadcast();
  }));

  socket.on('pp_leave', inRoom(socket, () => {
    const p = pawByPid(socket.data.pid);
    if (!p) return;
    socket.data.pid = null;
    if (paw.phase === 'lobby') {
      paw.players = paw.players.filter(q => q !== p);
      glog('👋 ' + p.name + ' left the Paw lobby');
    } else {
      p.isBot = true;
      glog('🚪 ' + p.name + ' left Paw Paw Paw — a bot takes over');
      if (paw.players.every(q => q.isBot)) {
        pawClearTimer();
        paw = freshPaw(); sync();
        glog('🧹 Paw Paw Paw 초기화 (모두 나감)');
      } else if (paw.phase === 'playing' && !paw.resolving) {
        const i = paw.players.indexOf(p);
        if (i >= 0 && paw.picks[i] == null) {
          paw.picks[i] = Math.floor(Math.random() * 3);
          pawMaybeResolve();
        }
      }
    }
    ppBroadcast();
  }));

  socket.on('pp_start', inRoom(socket, () => {
    if (paw.phase !== 'lobby' || paw.players.length < 1) return;
    if (!pawByPid(socket.data.pid)) return;
    if (paw.players.length === 1) addPawBot();
    paw.phase = 'playing';
    paw.round = 0;
    paw.scores = [0, 0];
    paw.pointer = Math.floor(Math.random() * 2);
    glog('🚩 Paw Paw Paw 시작! ' + paw.players.map(q => q.name + (q.isBot ? '(bot)' : '')).join(' vs '));
    ppBroadcast();
    paw.timer = setTimeout(bind(CUR, pawStartRound), 1500 * (SPEED === 1 ? 1 : 0.2));
  }));

  socket.on('pp_pick', inRoom(socket, (d) => {
    if (paw.phase !== 'playing' || paw.resolving) return;
    const i = paw.players.findIndex(p => p.id === socket.data.pid);
    if (i < 0 || paw.picks[i] != null) return;
    const dir = d && d.dir;
    if (![0, 1, 2].includes(dir)) return;
    paw.picks[i] = dir;
    pawMaybeResolve();
  }));

  socket.on('pp_again', inRoom(socket, () => {
    if (paw.phase !== 'over') return;
    pawClearTimer();
    const humans = paw.players.filter(p => !p.isBot && p.connected);
    paw = freshPaw(); paw.players = humans; sync();
    glog('🔄 Paw Paw Paw 다시 하기');
    ppBroadcast();
  }));

  socket.on('run_join', inRoom(socket, (d) => {
    if (run.phase !== 'lobby') return socket.emit('errmsg', 'A race is running — watch this one!');
    if (run.players.length >= 4) return socket.emit('errmsg', 'The race is full (4 Kedi max).');
    if (socket.data.pid && kediByPid(socket.data.pid)) return socket.emit('errmsg', 'Finish your Kedi Life game first! 🎲');
    if (socket.data.pid && pawByPid(socket.data.pid)) return socket.emit('errmsg', 'Finish your Paw game first! 🐾');
    const cat = d && d.cat;
    if (!CAT_KEYS.includes(cat)) return socket.emit('errmsg', 'Pick a Kedi first!');
    if (run.players.some(p => p.cat === cat)) return socket.emit('errmsg', 'That Kedi is taken in this game — pick another one!');
    const name = String((d && d.name) || '').trim().slice(0, 12) || 'Kedi';
    const p = { id: rid(), name, cat, isBot: false, connected: true, pos: 0, energy: 0, slowUntil: 0, boostUntil: 0, finished: false, finishOrder: 0, cdCheer: 0, cdSnack: 0, cdWater: 0 };
    run.players.push(p);
    socket.data.pid = p.id;
    socket.emit('joined', { pid: p.id });
    glog('👋 ' + name + ' (' + cat + ') joined Kedi Running');
    runBroadcast();
  }));

  socket.on('run_leave', inRoom(socket, () => {
    const p = runByPid(socket.data.pid);
    if (!p) return;
    socket.data.pid = null;
    if (run.phase === 'lobby') {
      run.players = run.players.filter(q => q !== p);
      glog('👋 ' + p.name + ' left the race lobby');
    } else {
      p.isBot = true;
      glog('🚪 ' + p.name + ' left the race — a bot takes over');
      if (run.players.every(q => q.isBot)) {
        if (run.timer) { clearInterval(run.timer); run.timer = null; }
        run = freshRun(); sync();
        glog('🧹 Kedi Running 초기화 (모두 나감)');
      }
    }
    runBroadcast();
  }));

  socket.on('run_start', inRoom(socket, () => {
    if (run.phase !== 'lobby' || run.players.length < 1) return;
    if (!runByPid(socket.data.pid)) return;
    if (run.players.length === 1) addRunBot();
    run.phase = 'playing';
    run.startAt = Date.now();
    run.finishCount = 0;
    run.nextRain = Date.now() + 7000 + Math.random() * 8000;
    run.players.forEach(p => { p.pos = 0; p.energy = 0; p.finished = false; p.finishOrder = 0; p.slowUntil = 0; p.boostUntil = 0; });
    glog('🚩 Kedi Running 시작! ' + run.players.map(q => q.name + (q.isBot ? '(bot)' : '')).join(' vs '));
    runBroadcast();
    run.timer = setInterval(bind(CUR, runTick), 120);
  }));

  socket.on('run_tap', inRoom(socket, () => {
    if (run.phase !== 'playing') return;
    const p = runByPid(socket.data.pid);
    if (!p || p.finished) return;
    if (Date.now() < run.rainUntil) return;
    p.energy = Math.min(6, (p.energy || 0) + 0.9);
  }));

  socket.on('run_item', inRoom(socket, (d) => {
    if (run.phase !== 'playing') return;
    const p = runByPid(socket.data.pid);
    if (!p || p.finished) return;
    const kind = d && d.kind;
    if (!['cheer', 'snack', 'water'].includes(kind)) return;
    runUseItem(run.players.indexOf(p), kind);
  }));

  socket.on('run_again', inRoom(socket, () => {
    if (run.phase !== 'over') return;
    if (run.timer) { clearInterval(run.timer); run.timer = null; }
    const humans = run.players.filter(p => !p.isBot && p.connected);
    run = freshRun(); sync();
    for (const p of humans) {
      p.pos = 0; p.energy = 0; p.finished = false; p.finishOrder = 0; p.slowUntil = 0; p.boostUntil = 0;
      run.players.push(p);
    }
    glog('🔄 Kedi Running 다시 하기');
    runBroadcast();
  }));

  socket.on('disconnect', () => {
    const code = socket.data.room;
    const r = rooms[code];
    if (!r) return;
    setRoom(r);
    const pid = socket.data.pid;
    const p = kediByPid(pid);
    if (p) {
      p.connected = false;
      if (game.phase === 'lobby') {
        game.players = game.players.filter(q => q !== p);
      } else if (game.players.every(q => q.isBot || !q.connected)) {
        clearTimer();
        game = freshGame(); sync();
        glog('🧹 Kedi Life 초기화 (모두 나감)');
      }
      broadcastState();
    }
    const pp = pawByPid(pid);
    if (pp) {
      pp.connected = false;
      if (paw.phase === 'lobby') {
        paw.players = paw.players.filter(q => q !== pp);
      } else if (paw.players.every(q => q.isBot || !q.connected)) {
        pawClearTimer();
        paw = freshPaw(); sync();
        glog('🧹 Paw Paw Paw 초기화 (모두 나감)');
      }
      ppBroadcast();
    }
    const rp = runByPid(pid);
    if (rp) {
      rp.connected = false;
      if (run.phase === 'lobby') {
        run.players = run.players.filter(q => q !== rp);
      } else if (run.players.every(q => q.isBot || !q.connected)) {
        if (run.timer) { clearInterval(run.timer); run.timer = null; }
        run = freshRun(); sync();
        glog('🧹 Kedi Running 초기화 (모두 나감)');
      }
      runBroadcast();
    }
    broadcastRoomOnline(code);
    sync();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Kedi Life is running on port ' + PORT));
