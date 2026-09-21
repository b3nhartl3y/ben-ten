const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png" };

// ---------- Static file server (serves the three.js client) ----------
const server = http.createServer((req, res) => {
  let file = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const filePath = path.join(PUBLIC_DIR, file);
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end(); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, path: "/ws" });

// ---------- Card engine ----------
const SUITS = [
  { key: "H", symbol: "♥", color: "#c0392b" },
  { key: "D", symbol: "♦", color: "#c0392b" },
  { key: "C", symbol: "♣", color: "#1a1a1a" },
  { key: "S", symbol: "♠", color: "#1a1a1a" },
];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const BOT_NAMES = ["Brian", "Jamie", "Alice", "Casey"];

function rankValue(rank) {
  if (rank === "A") return 1;
  if (rank === "J" || rank === "Q" || rank === "K") return 10;
  return parseInt(rank, 10);
}
function buildDeck() {
  const deck = [];
  let id = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: id++, rank, suit: suit.key, symbol: suit.symbol, color: suit.color, value: rankValue(rank) });
    }
  }
  return deck;
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function handTotal(hand) {
  return hand.reduce((s, c) => s + c.value, 0);
}

// ---------- Room state ----------
const rooms = new Map();

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  let code;
  do {
    code = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function newRoom(hostId) {
  return {
    code: makeRoomCode(),
    hostId,
    players: [], // {id, name, hand, isBot, connected, ws}
    drawPile: [],
    discardPile: [],
    handSize: 4,
    phase: "lobby",
    currentPlayer: 0,
    log: [],
    winnerId: null,
  };
}

function log(room, msg) {
  room.log.push(msg);
  if (room.log.length > 60) room.log.shift();
}

function refillDrawPile(room) {
  if (room.discardPile.length <= 1) return;
  const top = room.discardPile.pop();
  room.drawPile = shuffle(room.discardPile);
  room.discardPile = [top];
  log(room, "Draw pile reshuffled from discard.");
}

function broadcast(room) {
  for (const p of room.players) {
    if (!p.ws || p.ws.readyState !== p.ws.OPEN) continue;
    const payload = {
      type: "state",
      code: room.code,
      hostId: room.hostId,
      phase: room.phase,
      handSize: room.handSize,
      currentPlayerId: room.players[room.currentPlayer] ? room.players[room.currentPlayer].id : null,
      you: { id: p.id, hand: p.hand },
      players: room.players.map((x) => ({
        id: x.id, name: x.name, isBot: x.isBot, count: x.hand.length, connected: x.connected,
      })),
      discardTop: room.discardPile.length ? room.discardPile[room.discardPile.length - 1] : null,
      drawCount: room.drawPile.length,
      log: room.log.slice(-40),
      winnerId: room.winnerId,
      winnerHand: room.phase === "over" ? (room.players.find((x) => x.id === room.winnerId) || {}).hand || null : null,
    };
    p.ws.send(JSON.stringify(payload));
  }
}

function sendError(ws, message) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: "error", message }));
}

// ---------- Turn flow ----------
function beginTurn(room, index) {
  room.currentPlayer = index;
  const p = room.players[index];

  while (p.hand.length < room.handSize && room.drawPile.length) p.hand.push(room.drawPile.pop());
  if (room.drawPile.length === 0) refillDrawPile(room);

  room.phase = "discard";
  broadcast(room);

  if (p.isBot) setTimeout(() => runBotTurn(room, index), 900);
}

function finishTurnAndAdvance(room, index) {
  const p = room.players[index];
  if (handTotal(p.hand) === 10) {
    room.phase = "over";
    room.winnerId = p.id;
    log(room, `${p.name} shouted BEN TEN! (total = ${handTotal(p.hand)})`);
    broadcast(room);
    return;
  }
  // Lock the turn while the advance is pending, otherwise a second tap in that window draws again.
  room.phase = "resolving";
  broadcast(room);
  const next = (index + 1) % room.players.length;
  setTimeout(() => beginTurn(room, next), 500);
}

function chooseBotDiscard(hand) {
  let best = 0, bestScore = Infinity;
  for (let i = 0; i < hand.length; i++) {
    const remaining = handTotal(hand) - hand[i].value;
    const score = remaining > 10 ? remaining - 10 + 50 : 10 - remaining;
    if (score < bestScore) { bestScore = score; best = i; }
  }
  return best;
}

// ponytail: bots always skip the ask step and pick a blind action; keeps AI simple
function runBotTurn(room, index) {
  const p = room.players[index];
  if (room.phase !== "discard" || room.currentPlayer !== index) return;

  const discardIdx = chooseBotDiscard(p.hand);
  const [discarded] = p.hand.splice(discardIdx, 1);
  room.discardPile.push(discarded);
  log(room, `${p.name} discarded a card.`);
  room.phase = "extra";
  broadcast(room);

  const others = room.players.filter((x, i) => i !== index && x.hand.length > 0);
  let preferred = null; // opponent the bot learned something useful about

  // Optional extra move: ask someone for a rank the bot needs, or ask them to count.
  setTimeout(() => {
    if (others.length && Math.random() < 0.65) {
      const target = others[Math.floor(Math.random() * others.length)];
      if (Math.random() < 0.6) {
        // rank that would make 10 if it replaced one of our cards
        const total = handTotal(p.hand);
        const swap = p.hand[Math.floor(Math.random() * p.hand.length)];
        const need = Math.min(10, Math.max(1, 10 - (total - swap.value)));
        const rank = need === 1 ? "A" : String(need);
        const has = target.hand.some((c) => c.rank === rank);
        log(room, `${p.name} asked ${target.name}: "Do you have a ${rank}?" — ${has ? "Yes" : "No"}.`);
        if (has) preferred = target;
      } else {
        const total = handTotal(target.hand);
        log(room, `${p.name} asked ${target.name} to count — total is ${total}.`);
        if (total <= 14) preferred = target; // low hand = small cards worth stealing
      }
    }
    room.phase = "draw";
    broadcast(room);
  }, 900);

  setTimeout(() => {
    const takeFromOpponent = preferred ? Math.random() < 0.8 : Math.random() < 0.3;
    if (takeFromOpponent && others.length) {
      const target = preferred || others[Math.floor(Math.random() * others.length)];
      const idx = Math.floor(Math.random() * target.hand.length);
      const [card] = target.hand.splice(idx, 1);
      p.hand.push(card);
      log(room, `${p.name} took a card from ${target.name}.`);
    } else {
      if (room.drawPile.length === 0) refillDrawPile(room);
      if (room.drawPile.length) p.hand.push(room.drawPile.pop());
    }
    broadcast(room);
    finishTurnAndAdvance(room, index);
  }, 1900);
}

// ---------- WebSocket protocol ----------
wss.on("connection", (ws) => {
  ws.playerId = crypto.randomUUID();

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    handleMessage(ws, msg);
  });

  ws.on("close", () => {
    const room = rooms.get(ws.roomCode);
    if (!room) return;
    const p = room.players.find((x) => x.id === ws.playerId);
    if (!p) return;
    p.connected = false;
    p.ws = null;
    log(room, `${p.name} disconnected.`);
    // ponytail: if it was their turn, auto-play a minimal move so the room doesn't stall
    if (room.phase !== "lobby" && room.phase !== "over" && room.players[room.currentPlayer]?.id === p.id) {
      runBotTurn(room, room.currentPlayer);
    } else {
      broadcast(room);
    }
  });
});

function handleMessage(ws, msg) {
  if (msg.type === "create") {
    const room = newRoom(ws.playerId);
    const name = (msg.name || "Host").slice(0, 20);
    room.players.push({ id: ws.playerId, name, hand: [], isBot: false, connected: true, ws });
    rooms.set(room.code, room);
    ws.roomCode = room.code;
    ws.send(JSON.stringify({ type: "created", code: room.code, playerId: ws.playerId }));
    broadcast(room);
    return;
  }

  if (msg.type === "join") {
    const room = rooms.get((msg.code || "").toUpperCase());
    if (!room) return sendError(ws, "No game with that code.");
    if (room.phase !== "lobby") return sendError(ws, "That game has already started.");
    if (room.players.length >= 6) return sendError(ws, "That game is full.");
    const name = (msg.name || "Player").slice(0, 20);
    room.players.push({ id: ws.playerId, name, hand: [], isBot: false, connected: true, ws });
    ws.roomCode = room.code;
    ws.send(JSON.stringify({ type: "joined", code: room.code, playerId: ws.playerId }));
    log(room, `${name} joined.`);
    broadcast(room);
    return;
  }

  const room = rooms.get(ws.roomCode);
  if (!room) return sendError(ws, "You're not in a game.");
  const me = room.players.find((x) => x.id === ws.playerId);
  if (!me) return sendError(ws, "You're not in a game.");

  if (msg.type === "chat") {
    const text = String(msg.text || "").trim().slice(0, 200);
    if (!text) return;
    log(room, { chat: true, from: me.name, text }); // rides in the log feed alongside game events
    broadcast(room);
    return;
  }

  if (msg.type === "addBot") {
    if (ws.playerId !== room.hostId || room.phase !== "lobby") return;
    if (room.players.length >= 6) return sendError(ws, "That game is full.");
    const usedNames = new Set(room.players.map((p) => p.name));
    const botName = BOT_NAMES.find((n) => !usedNames.has(n)) || `Bot${room.players.length}`;
    room.players.push({ id: crypto.randomUUID(), name: botName, hand: [], isBot: true, connected: true, ws: null });
    log(room, `${botName} (bot) joined.`);
    broadcast(room);
    return;
  }

  if (msg.type === "start") {
    if (ws.playerId !== room.hostId || room.phase !== "lobby") return;
    if (room.players.length < 2) return sendError(ws, "Need at least 2 players (add a bot if playing solo).");
    room.handSize = msg.handSize === 5 ? 5 : 4;
    room.drawPile = shuffle(buildDeck());
    room.discardPile = [];
    for (const p of room.players) p.hand = room.drawPile.splice(0, room.handSize);
    room.discardPile.push(room.drawPile.pop());
    log(room, `Game started — hand size ${room.handSize}, ${room.players.length} players.`);
    beginTurn(room, 0);
    return;
  }

  const myIndex = room.players.findIndex((x) => x.id === ws.playerId);
  const isMyTurn = room.currentPlayer === myIndex && !me.isBot;

  if (msg.type === "discard" && room.phase === "discard" && isMyTurn) {
    const idx = me.hand.findIndex((c) => c.id === msg.cardId);
    if (idx === -1) return;
    const [card] = me.hand.splice(idx, 1);
    room.discardPile.push(card);
    log(room, `${me.name} discarded ${card.rank}${card.symbol}.`);
    room.phase = "extra";
    broadcast(room);
    return;
  }

  if (msg.type === "skipAsk" && room.phase === "extra" && isMyTurn) {
    room.phase = "draw";
    broadcast(room);
    return;
  }

  if (msg.type === "askCard" && room.phase === "extra" && isMyTurn) {
    const target = room.players.find((x) => x.id === msg.targetId);
    if (!target) return;
    const has = target.hand.some((c) => c.rank === msg.rank);
    log(room, `${me.name} asked ${target.name}: "Do you have a ${msg.rank}?" — ${has ? "Yes" : "No"}.`);
    room.phase = "draw";
    broadcast(room);
    return;
  }

  if (msg.type === "askCount" && room.phase === "extra" && isMyTurn) {
    const target = room.players.find((x) => x.id === msg.targetId);
    if (!target) return;
    log(room, `${me.name} asked ${target.name} to count — total is ${handTotal(target.hand)}.`);
    room.phase = "draw";
    broadcast(room);
    return;
  }

  if (msg.type === "drawPile" && room.phase === "draw" && isMyTurn) {
    if (room.drawPile.length === 0) refillDrawPile(room);
    if (room.drawPile.length === 0) return;
    me.hand.push(room.drawPile.pop());
    log(room, `${me.name} drew from the pile.`);
    broadcast(room);
    finishTurnAndAdvance(room, myIndex);
    return;
  }

  if (msg.type === "drawFromPlayer" && room.phase === "draw" && isMyTurn) {
    const target = room.players.find((x) => x.id === msg.targetId);
    if (!target || target.hand.length === 0) return;
    const idx = Math.floor(Math.random() * target.hand.length);
    const [card] = target.hand.splice(idx, 1);
    me.hand.push(card);
    log(room, `${me.name} took a card from ${target.name}.`);
    broadcast(room);
    finishTurnAndAdvance(room, myIndex);
    return;
  }
}

server.listen(PORT, () => console.log(`Ben Ten server listening on :${PORT}`));
