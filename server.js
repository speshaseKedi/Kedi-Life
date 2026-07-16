const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/healthz', (req, res) => res.send('ok'));

const SPEED = process.env.FAST ? 0.04 : 1;
const HOME = 23;
const FINISH_BONUS = [15, 10, 5, 0];
const CAT_KEYS = ['tuxedo', 'orange', 'white', 'calico'];
const BOT_NAMES = ['Mochi', 'Coco', 'Nabi', 'Tora'];

const BOARD = [
  { t: 'start', label: 'Start', icon: '🏁' },
  { t: 'gain', v: 5, text: 'Treat time! +5 snacks', icon: '🍪' },
  { t: 'gain', v: 7, text: 'Caught a mouse! +7 snacks', icon: '🐭' },
  { t: 'lose', v: 3, text: 'Hairball... -3 snacks', icon: '😿' },
  { t: 'move', v: 3, text: 'Zoomies! Run 3 more', icon: '💨' },
  { t: 'gain', v: 8, text: "Grandma's snacks! +8", icon: '👵' },
  { t: 'nap', text: 'So sleepy... skip 1 turn', icon: '💤' },
  { t: 'lose', v: 5, text: 'Vet visit... -5 snacks', icon: '💉' },
  { t: 'gain', v: 10, text: 'Found a tuna can! +10 snacks', icon: '🐟' },
  { t: 'move', v: -2, text: 'A loud noise! Go back 2', icon: '😾' },
  { t: 'swap', text: 'Swap places with another Kedi!', icon: '🔀' },
  { t: 'gain', v: 5, text: 'Belly rubs! +5 snacks', icon: '🐾' },
  { t: 'chance', text: 'Mystery box...', icon: '❓' },
  { t: 'lose', v: 7, text: 'A dog took your snacks! -7', icon: '🐶' },
  { t: 'gain', v: 7, text: 'Fresh shrimp! +7 snacks', icon: '🦐' },
  { t: 'nap', text: 'A warm sunny spot... skip 1 turn', icon: '☀️' },
  { t: 'gain', v: 10, text: 'Fish market day! +10 snacks', icon: '🛒' },
  { t: 'lose', v: 4, text: 'Knocked over a vase! -4', icon: '🏺' },
  { t: 'chance', text: 'Mystery box...', icon: '❓' },
  { t: 'move', v: 2, text: 'A butterfly! Chase it 2 more', icon: '🦋' },
  { t: 'gain', v: 8, text: 'A bowl of milk! +8 snacks', icon: '🥛' },
  { t: 'swap', text: 'Swap places with another Kedi!', icon: '🔀' },
  { t: 'lose', v: 5, text: 'Rainy day... -5 snacks', icon: '🌧️' },
  { t: 'home', label: 'Home', icon: '🏠' }
];

const CHANCE = [
  { t: 'gain', v: 12, text: 'Jackpot! +12 snacks', icon: '🎁' },
  { t: 'gain', v: 5, text: 'A kind stranger! +5 snacks', icon: '🫶' },
  { t: 'lose', v: 6, text: 'Seagull attack! -6 snacks', icon: '🐦' },
  { t: 'move', v: 3, text: 'A friendly wind! Move 3 more', icon: '🍃' },
  { t: 'move', v: -3, text: 'Wrong way! Go back 3', icon: '🙀' },
  { t: 'nap', text: 'Sudden nap attack... skip 1 turn', icon: '💤' }
];

let game = freshGame();

function freshGame() {
  return { phase: 'lobby', players: [], turn: 0, finishCount: 0, busy: false, timer: null };
}
function rid() { return crypto.randomBytes(8).toString('hex'); }
function clearTimer() { if (game.timer) { clearTimeout(game.timer); game.timer = null; } }
function cur() { return game.players[game.turn]; }
function byPid(socket) { return game.players.find(p => p.id === socket.data.pid); }
function youOf(socket) { return game.players.findIndex(p => p.id === socket.data.pid); }

function pub() {
  return {
    phase: game.phase,
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
function emitAll(type, payload) {
  for (const [, s] of io.sockets.sockets) {
    s.emit(type, Object.assign({}, payload, { state: pub(), you: youOf(s) }));
  }
}
function broadcastState() { emitAll('state', {}); }

function applyEffect(pIdx, eff, events, steps, depth) {
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
    const np = Math.max(0, Math.min(HOME, p.pos + eff.v));
    events.push({ icon: eff.icon, text: eff.text, pIdx });
    if (np !== p.pos && depth < 4) {
      steps.push({ pIdx, from: p.pos, to: np });
      p.pos = np;
      landOn(pIdx, events, steps, depth + 1);
    }
  } else if (eff.t === 'chance') {
    const c = CHANCE[Math.floor(Math.random() * CHANCE.length)];
    events.push({ icon: '❓', text: 'Mystery box...', pIdx });
    applyEffect(pIdx, c, events, steps, depth);
  }
}

function landOn(pIdx, events, steps, depth) {
  if (depth > 4) return;
  const p = game.players[pIdx];
  const tile = BOARD[p.pos];
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
  if (tile.t === 'start') return;
  applyEffect(pIdx, tile, events, steps, depth);
}

function playRoll(p) {
  if (game.phase !== 'playing' || game.busy) return;
  const pIdx = game.players.indexOf(p);
  if (pIdx !== game.turn || p.finished) return;
  clearTimer();
  game.busy = true;
  const dice = 1 + Math.floor(Math.random() * 6);
  const events = [], steps = [];
  const from = p.pos;
  const to = Math.min(HOME, p.pos + dice);
  steps.push({ pIdx, from, to });
  p.pos = to;
  landOn(pIdx, events, steps, 0);
  if (game.players.every(q => q.finished)) game.phase = 'over';
  const tiles = steps.reduce((s, st) => s + Math.abs(st.to - st.from), 0);
  const swaps = events.filter(e => e.swap).length;
  const animMs = (1000 + tiles * 260 + events.length * 1750 + swaps * 500 + 500) * SPEED;
  emitAll('turn', { playerIdx: pIdx, dice, steps, events, skipped: false });
  if (game.phase === 'over') {
    clearTimer();
    game.timer = setTimeout(() => { game.busy = false; broadcastState(); }, animMs);
  } else {
    endTurn(animMs);
  }
}

function endTurn(animMs) {
  clearTimer();
  game.timer = setTimeout(() => {
    game.busy = false;
    if (game.phase !== 'playing') { broadcastState(); return; }
    advance();
    beginTurn();
  }, animMs);
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
    game.timer = setTimeout(() => playRoll(p), 1600 * SPEED);
  } else {
    game.timer = setTimeout(() => {
      if (game.phase === 'playing' && cur() === p && !game.busy) playRoll(p);
    }, 45000 * SPEED);
  }
}

function addBot() {
  const catFree = CAT_KEYS.find(c => !game.players.some(p => p.cat === c));
  const used = game.players.map(p => p.name);
  const name = BOT_NAMES.find(n => !used.includes(n)) || 'Bot';
  game.players.push({
    id: rid(), name, cat: catFree, isBot: true, connected: true,
    pos: 0, snacks: 0, skip: 0, finished: false, finishOrder: 0
  });
}

io.on('connection', (socket) => {
  socket.emit('board', BOARD);

  socket.on('hello', (d) => {
    const pid = d && d.pid;
    const p = game.players.find(q => q.id === pid);
    if (p && !p.isBot) {
      socket.data.pid = pid;
      p.connected = true;
    }
    socket.emit('state', Object.assign({}, { state: pub(), you: youOf(socket) }));
  });

  socket.on('join', (d) => {
    if (game.phase !== 'lobby') return socket.emit('errmsg', 'A game is running — you can watch, then join next round!');
    if (game.players.length >= 4) return socket.emit('errmsg', 'The lobby is full (4 Kedi max).');
    const cat = d && d.cat;
    if (!CAT_KEYS.includes(cat)) return socket.emit('errmsg', 'Pick a Kedi first!');
    if (game.players.some(p => p.cat === cat)) return socket.emit('errmsg', 'That Kedi is already taken!');
    const name = String((d && d.name) || '').trim().slice(0, 12) || 'Kedi';
    const p = {
      id: rid(), name, cat, isBot: false, connected: true,
      pos: 0, snacks: 0, skip: 0, finished: false, finishOrder: 0
    };
    game.players.push(p);
    socket.data.pid = p.id;
    socket.emit('joined', { pid: p.id });
    broadcastState();
  });

  socket.on('start', () => {
    if (game.phase !== 'lobby' || game.players.length < 1) return;
    const p = byPid(socket);
    if (!p) return;
    if (game.players.length === 1) addBot();
    game.phase = 'playing';
    game.turn = 0;
    game.finishCount = 0;
    game.busy = false;
    broadcastState();
    beginTurn();
  });

  socket.on('roll', () => {
    const p = byPid(socket);
    if (p) playRoll(p);
  });

  socket.on('again', () => {
    if (game.phase !== 'over') return;
    clearTimer();
    const humans = game.players.filter(p => !p.isBot && p.connected);
    game = freshGame();
    for (const p of humans) {
      p.pos = 0; p.snacks = 0; p.skip = 0; p.finished = false; p.finishOrder = 0;
      game.players.push(p);
    }
    broadcastState();
  });

  socket.on('disconnect', () => {
    const p = byPid(socket);
    if (!p) return;
    p.connected = false;
    if (game.phase === 'lobby') {
      game.players = game.players.filter(q => q !== p);
    } else if (game.players.every(q => q.isBot || !q.connected)) {
      clearTimer();
      game = freshGame();
    }
    broadcastState();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Kedi Life is running on port ' + PORT));
