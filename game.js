import * as THREE from "three";

// ---------- Card art ----------
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
// ponytail: rounded Fredoka on the cards, pixel font stays in the HTML labels — pixel glyphs go ambiguous under the pixel pass
const CARD_FONT = '"Fredoka", "Arial Black", sans-serif';
document.fonts.load(`700 60px ${CARD_FONT}`);

const SUIT_COLORS = { "♥": "#ff4c40", "♦": "#ff8f2b", "♠": "#2b3560", "♣": "#1d5c8e" };
const CARD_INK = "#1a1626";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function newCardCanvas() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 716;
  c.getContext("2d").scale(2, 2); // draw in 256x358 coords at 2x resolution
  return c;
}

const faceTextureCache = new Map();
function faceTexture(card) {
  const key = card.rank + card.suit;
  if (faceTextureCache.has(key)) return faceTextureCache.get(key);
  const color = SUIT_COLORS[card.symbol] || CARD_INK;
  const canvas = newCardCanvas();
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f8f2e4";
  roundRect(ctx, 6, 6, 244, 346, 20);
  ctx.fill();
  ctx.strokeStyle = CARD_INK;
  ctx.lineWidth = 10;
  roundRect(ctx, 6, 6, 244, 346, 20);
  ctx.stroke();
  ctx.strokeStyle = "rgba(26,22,38,0.12)";
  ctx.lineWidth = 3;
  roundRect(ctx, 22, 22, 212, 314, 12);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.font = `700 64px ${CARD_FONT}`;
  ctx.fillText(card.rank, 24, 16);
  ctx.font = `52px sans-serif`;
  ctx.fillText(card.symbol, 26, 82);

  ctx.save();
  ctx.translate(232, 342);
  ctx.rotate(Math.PI);
  ctx.font = `700 64px ${CARD_FONT}`;
  ctx.fillText(card.rank, 0, 0);
  ctx.font = `52px sans-serif`;
  ctx.fillText(card.symbol, 2, 66);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "150px sans-serif";
  ctx.fillText(card.symbol, 128, 196);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  faceTextureCache.set(key, tex);
  return tex;
}

let backTexture = null;
function getBackTexture() {
  if (backTexture) return backTexture;
  const canvas = newCardCanvas();
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#d9b273";
  roundRect(ctx, 6, 6, 244, 346, 20);
  ctx.fill();
  ctx.save();
  roundRect(ctx, 6, 6, 244, 346, 20);
  ctx.clip();
  ctx.strokeStyle = "rgba(120,80,30,0.16)";
  ctx.lineWidth = 3;
  for (let x = -358; x < 256 + 358; x += 14) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 358, 358); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, 358); ctx.lineTo(x + 358, 0); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "#f3e6c8";
  ctx.lineWidth = 8;
  roundRect(ctx, 6, 6, 244, 346, 20);
  ctx.stroke();
  ctx.strokeStyle = "rgba(90,60,20,0.35)";
  ctx.lineWidth = 3;
  roundRect(ctx, 22, 22, 212, 314, 12);
  ctx.stroke();

  // portrait medallion: gold ring, filled once the photo has loaded
  const CX = 128, CY = 160, R = 72;
  ctx.fillStyle = "#2c2a22";
  ctx.beginPath();
  ctx.arc(CX, CY, R + 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2c2a22";
  roundRect(ctx, 58, 262, 140, 44, 12);
  ctx.fill();
  ctx.fillStyle = "#d9b273";
  ctx.font = `700 30px ${CARD_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BEN 10", CX, 285);

  backTexture = new THREE.CanvasTexture(canvas);
  backTexture.colorSpace = THREE.SRGBColorSpace;

  pixelFace.then((face) => {
    ctx.drawImage(face, CX - R, CY - R, R * 2, R * 2);
    backTexture.needsUpdate = true;
  });
  return backTexture;
}

// Pixelated portrait in a circle with an ink ring, shared by card backs and confetti.
const pixelFace = new Promise((resolve) => {
  const img = new Image();
  img.onload = () => {
    const N = 24, SIZE = 192, R = SIZE / 2;
    const small = document.createElement("canvas");
    small.width = N; small.height = N;
    const side = Math.min(img.width, img.height);
    small.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, N, N);
    const out = document.createElement("canvas");
    out.width = SIZE; out.height = SIZE;
    const o = out.getContext("2d");
    o.beginPath(); o.arc(R, R, R - 3, 0, Math.PI * 2); o.clip();
    o.imageSmoothingEnabled = false;
    o.drawImage(small, 0, 0, SIZE, SIZE);
    o.strokeStyle = CARD_INK; o.lineWidth = 7;
    o.beginPath(); o.arc(R, R, R - 3, 0, Math.PI * 2); o.stroke();
    resolve(out);
  };
  img.src = "bg.jpg";
});

const CARD_W = 1.5, CARD_H = 2.1;
const cardGeo = new THREE.PlaneGeometry(CARD_W, CARD_H);
const shadowGeo = new THREE.PlaneGeometry(CARD_W * 1.02, CARD_H * 1.02);
let shadowTexture = null;
function getShadowTexture() {
  if (shadowTexture) return shadowTexture;
  const canvas = newCardCanvas();
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  roundRect(ctx, 6, 6, 244, 346, 20);
  ctx.fill();
  shadowTexture = new THREE.CanvasTexture(canvas);
  return shadowTexture;
}
const shadowMat = new THREE.MeshBasicMaterial({ map: getShadowTexture(), transparent: true, opacity: 0.35, depthWrite: false });

function makeCardGroup(card) {
  const group = new THREE.Group();
  // transparent so the canvas alpha outside the rounded rect shows the background through
  const mat = new THREE.MeshBasicMaterial({ map: card ? faceTexture(card) : getBackTexture(), transparent: true, alphaTest: 0.5 });
  const face = new THREE.Mesh(cardGeo, mat);
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.set(0.09, -0.11, -0.02);
  group.add(shadow, face);
  group.userData.card = card;
  return group;
}

// ---------- Scene ----------
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
camera.position.set(0, 0, 20);
camera.lookAt(0, 0, 0);

// Background + oval felt table, painted into one canvas and redrawn on resize.
const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ depthWrite: false }));
bg.position.z = -5;
scene.add(bg);

function paintTable(pxW, pxH) {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const tableCanvas = document.createElement("canvas"); // fresh each time: a GPU texture can't change size once uploaded
  tableCanvas.width = Math.round(pxW * dpr); tableCanvas.height = Math.round(pxH * dpr);
  const ctx = tableCanvas.getContext("2d");
  ctx.setTransform(dpr * pxW / (halfW * 2), 0, 0, dpr * pxH / (halfH * 2), dpr * pxW / 2, dpr * pxH / 2); // world units, y down
  const W = halfW * 2, H = halfH * 2;
  const vig = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(W, H) * 0.7);
  vig.addColorStop(0, "#161b17"); vig.addColorStop(1, "#070908");
  ctx.fillStyle = vig; ctx.fillRect(-halfW, -halfH, W, H);

  const t = tableGeom(), cy = -t.cy; // canvas y runs down
  const oval = (rx, ry) => { ctx.beginPath(); ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2); };
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
  oval(t.rx + 0.32, t.ry + 0.32); ctx.fillStyle = "#3a2216"; ctx.fill(); ctx.restore();
  const rim = ctx.createLinearGradient(0, cy - t.ry, 0, cy + t.ry);
  rim.addColorStop(0, "#4a2b1b"); rim.addColorStop(1, "#2a170e");
  oval(t.rx + 0.32, t.ry + 0.32); ctx.fillStyle = rim; ctx.fill();
  const felt = ctx.createRadialGradient(0, cy - t.ry * 0.25, 0, 0, cy, Math.max(t.rx, t.ry));
  felt.addColorStop(0, "#557a4a"); felt.addColorStop(0.7, "#3b5a35"); felt.addColorStop(1, "#2a4226");
  oval(t.rx, t.ry); ctx.fillStyle = felt; ctx.fill();
  oval(t.rx - 0.25, t.ry - 0.25); ctx.strokeStyle = "rgba(216,178,90,0.35)"; ctx.lineWidth = 0.035; ctx.stroke();
  const tex = new THREE.CanvasTexture(tableCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  bg.material.map?.dispose();
  bg.material.map = tex;
  bg.material.needsUpdate = true;
}


// View: the stage (page minus top bar and sidebar), always at least 12 units wide and 10 tall.
const stage = document.getElementById("stage");
let halfW = 6, halfH = 5, portrait = false;
function resize() {
  const w = stage.clientWidth || 1, h = stage.clientHeight || 1, aspect = w / h;
  portrait = aspect < 0.85;
  if (portrait) { halfW = 3.8; halfH = halfW / aspect; }
  else { halfH = Math.max(5, 6 / aspect); halfW = halfH * aspect; }
  camera.left = -halfW; camera.right = halfW; camera.top = halfH; camera.bottom = -halfH;
  camera.updateProjectionMatrix();
  bg.scale.set(halfW, halfH, 1); // plane is 2x2, so this fills the view
  renderer.setSize(w, h, false);
  paintTable(w, h);
  if (latest && latest.phase !== "lobby") renderTable(latest.currentPlayerId === myId);
}
new ResizeObserver(resize).observe(stage);

// ---------- Animated card registry ----------
// key -> { group, target:{x,y,z,rot,scale}, phase, dying }
const cards = new Map();
const cardLayer = new THREE.Group();
scene.add(cardLayer);
const clock = new THREE.Clock();
let hoveredKey = null;
let preselect = null; // card id queued for discard before our turn
const pointerWorld = new THREE.Vector2();

function spawnCard(key, card, from) {
  const group = makeCardGroup(card);
  group.position.set(from.x, from.y, 2);
  group.scale.setScalar(0.9);
  const entry = { key, group, target: { x: from.x, y: from.y, z: 0, rot: 0, scale: 1 }, phase: Math.random() * Math.PI * 2, dying: false, wobble: false, tag: {} };
  group.userData.entry = entry;
  cardLayer.add(group);
  cards.set(key, entry);
  return entry;
}

// The oval: your hand sits inside its bottom edge, clear of the dock; the top edge leaves room for name chips.
function handY() {
  const unitsPerPx = (2 * halfH) / (stage.clientHeight || 1);
  return -halfH + Math.max(portrait ? 0 : 3.1, 150 * unitsPerPx + CARD_H / 2);
}
function tableGeom() {
  const bottom = handY() - CARD_H / 2 - 0.4, top = halfH - (portrait ? 1.2 : 1.0);
  return { cy: (top + bottom) / 2, rx: halfW - (portrait ? 0.35 : 0.9), ry: (top - bottom) / 2 };
}
function centreY() { const t = tableGeom(); return t.cy + (portrait ? -0.12 : 0.08) * t.ry; }
function deckPos() { return { x: -1.1, y: centreY() }; }
function discardPos() { return { x: 1.1, y: centreY() }; }

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  for (const [key, e] of cards) {
    const g = e.group, tg = e.target;
    const hovered = key === hoveredKey && !e.dying;
    const queued = preselect !== null && e.tag.cardId === preselect;
    const ty = tg.y + (hovered ? 0.35 : queued ? 0.5 : 0) + (e.wobble ? Math.sin(t * 1.6 + e.phase) * 0.04 : 0);
    const ts = e.dying ? 0 : tg.scale * (hovered ? 1.1 : 1);
    const tz = hovered ? 3 : tg.z;
    const k = 0.16;
    g.position.x += (tg.x - g.position.x) * k;
    g.position.y += (ty - g.position.y) * k;
    g.position.z += (tz - g.position.z) * k;
    g.scale.x += (ts - g.scale.x) * k;
    g.scale.y += (ts - g.scale.y) * k;
    const idleRot = e.wobble ? Math.sin(t * 1.1 + e.phase) * 0.025 : 0;
    g.rotation.z += (tg.rot + idleRot - g.rotation.z) * k;
    let tiltX = 0, tiltY = 0;
    if (hovered) {
      tiltY = THREE.MathUtils.clamp((pointerWorld.x - g.position.x) / CARD_W, -1, 1) * 0.35;
      tiltX = -THREE.MathUtils.clamp((pointerWorld.y - g.position.y) / CARD_H, -1, 1) * 0.35;
    }
    g.rotation.x += (tiltX - g.rotation.x) * k;
    g.rotation.y += (tiltY - g.rotation.y) * k;
    if (e.dying && g.scale.x < 0.04) {
      cardLayer.remove(g);
      g.children[1].material.dispose();
      cards.delete(key);
    }
  }
  renderer.render(scene, camera);
  syncLabels();
}

// ---------- HTML labels pinned to world positions ----------
const labelLayer = document.getElementById("labels");
const labels = new Map(); // key -> { el, x, y }
// Name chip: initial avatar, name, and a small mono line underneath.
function fillChip(el, name, sub) {
  if (el.dataset.name === name && el.dataset.sub === sub) return;
  el.dataset.name = name; el.dataset.sub = sub;
  el.innerHTML = '<span class="avatar"></span><span class="chip-text"><span class="chip-name"></span><span class="chip-sub"></span></span>';
  el.querySelector(".avatar").textContent = (name.trim()[0] || "?").toUpperCase();
  el.querySelector(".chip-name").textContent = name;
  el.querySelector(".chip-sub").textContent = sub;
}
function label(key, name, sub, x, y, className = "", onClick = null) {
  let l = labels.get(key);
  if (!l) {
    const el = document.createElement("div");
    el.className = "world-label";
    labelLayer.appendChild(el);
    l = { el, x, y };
    labels.set(key, l);
  }
  l.x = x; l.y = y; l.alive = true;
  fillChip(l.el, name, sub);
  l.el.className = "world-label " + className;
  l.el.onclick = onClick;
  l.el.style.pointerEvents = onClick ? "auto" : "none";
  return l;
}
const projV = new THREE.Vector3();
function syncLabels() {
  const w = stage.clientWidth, h = stage.clientHeight;
  for (const l of labels.values()) {
    projV.set(l.x, l.y, 0).project(camera);
    const sx = (projV.x + 1) / 2 * w, sy = (1 - projV.y) / 2 * h;
    l.el.style.transform = `translate(-50%, -50%) translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
  }
}
function beginLabels() { for (const l of labels.values()) l.alive = false; }
function endLabels() {
  for (const [k, l] of labels) if (!l.alive) { l.el.remove(); labels.delete(k); }
}

// ---------- WebSocket client ----------
const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
const ws = new WebSocket(`${wsProtocol}//${location.host}/ws`);

let myId = null;
let latest = null;
let prev = null;
let myName = "";

const $ = (id) => document.getElementById(id);

// Remember the seat so a dropped connection (phone sleep, refresh) can rejoin by itself
let autoJoining = false;
const saved = (() => { try { return JSON.parse(localStorage.getItem("seat")); } catch { return null; } })();
ws.addEventListener("open", () => {
  $("setup-error").textContent = "";
  if (saved && !new URLSearchParams(location.search).get("code")) {
    myName = saved.name;
    autoJoining = true;
    send({ type: "join", code: saved.code, name: saved.name });
  }
});
ws.addEventListener("close", () => {
  $("setup-error").textContent = "Disconnected, reconnecting...";
  if (myId) setTimeout(() => location.reload(), 2000);
});

ws.addEventListener("message", (evt) => {
  const msg = JSON.parse(evt.data);
  if (msg.type === "created" || msg.type === "joined") {
    myId = msg.playerId;
    try { localStorage.setItem("seat", JSON.stringify({ code: msg.code, name: myName })); } catch {}
    showWaitingRoom(msg.code);
    return;
  }
  if (msg.type === "error") {
    if (!myId) try { localStorage.removeItem("seat"); } catch {} // stale seat: room gone or already full
    if (autoJoining && !myId) { autoJoining = false; return; } // silent: the player didn't ask to join
    $("setup-error").textContent = msg.message;
    return;
  }
  if (msg.type === "state") {
    prev = latest;
    latest = msg;
    turnDeadline = msg.turnMsLeft == null ? null : performance.now() + msg.turnMsLeft;
    render();
  }
});

function send(payload) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

// ---------- Setup screen ----------
$("create-btn").addEventListener("click", () => {
  myName = $("name-input").value.trim() || "Host";
  send({ type: "create", name: myName });
});
$("join-btn").addEventListener("click", () => {
  myName = $("name-input").value.trim() || "Player";
  const code = $("code-input").value.trim().toUpperCase();
  if (code.length !== 4) { $("setup-error").textContent = "Enter the 4-letter game code."; return; }
  send({ type: "join", code, name: myName });
});

function showWaitingRoom(code) {
  $("setup-screen").classList.add("hidden");
  $("waiting-screen").classList.remove("hidden");
  $("room-code-display").textContent = code;
  $("topbar-code").textContent = code;
  document.body.classList.add("in-room");
}

function inviteLink(code) {
  const url = new URL(location.href);
  url.search = "";
  url.searchParams.set("code", code);
  return url.toString();
}

function flashCopied(btn, label) {
  const prev = btn.textContent;
  btn.textContent = label || "Copied!";
  btn.disabled = true;
  setTimeout(() => { btn.textContent = prev; btn.disabled = false; }, 1200);
}

$("room-code-display").addEventListener("click", async () => {
  const btn = $("room-code-display");
  try { await navigator.clipboard.writeText(btn.textContent); flashCopied(btn, "Copied!"); } catch {}
});
function copyInvite() {
  const code = $("room-code-display").textContent;
  return navigator.clipboard.writeText(`Join my Ben 10 game! Room code: ${code}\n${inviteLink(code)}`);
}
$("copy-link-btn").addEventListener("click", async () => {
  try { await copyInvite(); flashCopied($("copy-link-btn"), "Link copied!"); } catch {}
});
$("topbar-copy").addEventListener("click", async () => {
  try {
    await copyInvite();
    $("topbar-copied").classList.remove("hidden");
    setTimeout(() => $("topbar-copied").classList.add("hidden"), 1400);
  } catch {}
});

// Auto-fill join code from a shared invite link (?code=XXXX)
const inviteCode = new URLSearchParams(location.search).get("code");
if (inviteCode) $("code-input").value = inviteCode.toUpperCase();

// Log entries are strings (game events) or {chat, from, text}. Re-render when the tail changes.
let renderedLogKey = "";
function renderLog() {
  const key = latest.log.length + ":" + JSON.stringify(latest.log[latest.log.length - 1] || "");
  if (key === renderedLogKey) return;
  const prevLen = renderedLogKey ? parseInt(renderedLogKey, 10) : latest.log.length;
  renderedLogKey = key;
  // Game events: just the last few, newest brightest. Chat gets the rest of the sidebar.
  const events = $("events");
  events.innerHTML = "";
  for (const m of latest.log.filter((m) => typeof m === "string").slice(-3)) {
    const d = document.createElement("div");
    d.textContent = m;
    events.appendChild(d);
  }
  const el = $("log");
  el.innerHTML = "";
  for (const m of latest.log.filter((m) => m && m.chat)) {
    const d = document.createElement("div");
    d.className = "chat-line" + (m.from === myName ? " me" : "");
    const b = document.createElement("b");
    b.textContent = m.from === myName ? "You" : m.from;
    d.append(b, m.text);
    el.appendChild(d);
  }
  el.scrollTop = el.scrollHeight;
  const newChats = latest.log.slice(prevLen).filter((m) => m && m.chat && m.from !== myName).length;
  if (newChats && chatCollapsed()) {
    unread += newChats;
    const badge = $("chat-unread");
    badge.textContent = unread;
    badge.classList.remove("hidden");
  }
}

let chosenHandSize = 4;
$("difficulty-choice").addEventListener("click", (e) => {
  const btn = e.target.closest(".choice-btn");
  if (!btn) return;
  document.querySelectorAll("#difficulty-choice .choice-btn").forEach((b) => b.classList.remove("selected"));
  btn.classList.add("selected");
  chosenHandSize = parseInt(btn.dataset.handSize, 10);
});
$("add-bot-btn").addEventListener("click", () => send({ type: "addBot" }));
$("start-btn").addEventListener("click", () => send({ type: "start", handSize: chosenHandSize }));
$("restart-btn").addEventListener("click", () => location.reload());

// ---------- Render ----------
let renderedPlayerCount = -1;

function renderSidePlayers() {
  const box = $("side-players");
  box.innerHTML = "";
  for (const p of latest.players) {
    const row = document.createElement("div");
    const current = p.id === latest.currentPlayerId && latest.phase !== "lobby" && latest.phase !== "over";
    row.className = "side-row" + (p.id === myId ? " me" : "") + (current ? " current" : "");
    const caret = document.createElement("span");
    caret.className = "caret";
    caret.textContent = current ? "\u25B6" : "";
    const name = document.createElement("span");
    name.textContent = p.name;
    row.append(caret, name);
    const tag = p.id === myId ? "you" : p.isBot ? "bot" : !p.connected ? "away" : "";
    if (tag) {
      const t = document.createElement("span");
      t.className = "tag" + (tag === "away" ? " away" : "");
      t.textContent = tag;
      row.append(t);
    }
    if (latest.phase !== "lobby") {
      const c = document.createElement("span");
      c.className = "count";
      c.textContent = p.count;
      row.append(c);
    }
    box.appendChild(row);
  }
}

function render() {
  if (!latest) return;
  renderSidePlayers();
  if (latest.phase === "lobby") { renderLobby(); renderLog(); return; }

  $("waiting-screen").classList.add("hidden");
  $("hud").classList.remove("hidden");

  renderLog();

  const isMyTurn = latest.currentPlayerId === myId;
  const current = latest.players.find((p) => p.id === latest.currentPlayerId);
  const ti = $("turn-indicator");
  ti.textContent = latest.phase === "over" ? "Game over" : isMyTurn ? "Your turn" : `${current ? current.name : "Someone"} is up...`;
  ti.classList.toggle("mine", isMyTurn && latest.phase !== "over");
  tickTimer();

  const wasMyTurn = prev && prev.currentPlayerId === myId && prev.phase !== "lobby";
  if (isMyTurn && latest.phase === "discard" && !wasMyTurn) shoutYourTurn();

  renderAnnounce();
  renderTable(isMyTurn);
  renderActionPanel(isMyTurn);

  // Pre-selected discard: fire it the moment our discard step opens.
  if (isMyTurn && latest.phase === "discard" && preselect !== null) {
    const still = latest.you.hand.find((c) => c.id === preselect);
    preselect = null;
    if (still) send({ type: "discard", cardId: still.id });
  }

  if (latest.phase === "over" && $("win-screen").classList.contains("hidden")) {
    const winner = latest.players.find((p) => p.id === latest.winnerId);
    $("win-title").textContent = "Ben Ten!";
    $("win-subtitle").textContent = winner
      ? (winner.id === myId ? "You win! Your hand totals exactly 10." : `${winner.name} wins with exactly 10.`)
      : "";
    $("hud").classList.add("hidden");
    $("win-screen").classList.remove("hidden");
    startConfetti();
  }
}

// ---------- Turn timer + YOUR TURN shout ----------
let turnDeadline = null;
const TURN_MS = 20000; // matches the server
function tickTimer() {
  const el = $("turn-timer");
  const secs = turnDeadline == null || !latest || latest.phase === "over" ? null : Math.ceil((turnDeadline - performance.now()) / 1000);
  el.classList.toggle("hidden", secs == null);
  if (secs == null) return;
  el.textContent = `${Math.max(0, secs)}s`;
  el.classList.toggle("low", secs <= 5);
  const pct = Math.max(0, Math.min(1, (turnDeadline - performance.now()) / TURN_MS));
  for (const a of document.querySelectorAll(".active")) a.style.setProperty("--pct", pct.toFixed(3));
}
setInterval(tickTimer, 250);

let audio = null;
// Browsers only allow sound after a tap, so unlock on the first one.
addEventListener("pointerdown", () => {
  try { audio = audio || new AudioContext(); audio.resume(); } catch {}
}, { once: true });
// Sound toggle in the top bar; remembered per browser.
let muted = false;
try { muted = localStorage.getItem("muted") === "1"; } catch {}
const SOUND_ON = '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>';
const SOUND_OFF = '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>';
function paintSoundBtn() {
  $("sound-btn").innerHTML = muted ? SOUND_OFF : SOUND_ON;
  $("sound-btn").setAttribute("aria-label", muted ? "Sound off" : "Sound on");
}
$("sound-btn").addEventListener("click", () => {
  muted = !muted;
  try { localStorage.setItem("muted", muted ? "1" : "0"); } catch {}
  paintSoundBtn();
});
paintSoundBtn();

function beep() {
  if (!audio || muted) return;
  const t = audio.currentTime;
  [523, 659, 784, 1047].forEach((f, i) => { // quick rising arpeggio
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = "square";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.12, t + i * 0.09);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.18);
    o.connect(g).connect(audio.destination);
    o.start(t + i * 0.09);
    o.stop(t + i * 0.09 + 0.2);
  });
}
let shoutTimer = null;
function shoutYourTurn() {
  const el = $("your-turn");
  el.classList.remove("hidden");
  el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; // restart
  clearTimeout(shoutTimer);
  shoutTimer = setTimeout(() => el.classList.add("hidden"), 1400);
  beep();
  navigator.vibrate?.(200);
}

// ---------- Announcement banner ----------
let shownAnnounce = 0, announceTimer = null;
function renderAnnounce() {
  const a = latest.announce;
  if (!a || a.id === shownAnnounce) return;
  shownAnnounce = a.id;
  const el = $("announce");
  el.textContent = a.text;
  el.classList.toggle("no", a.text.startsWith("NO"));
  el.classList.remove("hidden");
  el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; // restart slam
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => el.classList.add("hidden"), 4500);
}

// ---------- Confetti ----------
async function startConfetti() {
  const face = await pixelFace;
  const c = $("confetti");
  const ctx = c.getContext("2d");
  const colors = ["#d8b25a", "#d9705f", "#7fa9c9", "#8fbf86", "#ecebe4"];
  const bits = Array.from({ length: 200 }, (_, i) => ({
    face: i % 4 === 0, // every fourth piece is a falling pixel face
    x: Math.random() * stage.clientWidth, y: -40 - Math.random() * stage.clientHeight,
    vx: (Math.random() - 0.5) * 1.5, vy: 2 + Math.random() * 3,
    w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
    size: 34 + Math.random() * 30,
    rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.15,
    color: colors[(Math.random() * colors.length) | 0],
  }));
  let frames = 0;
  function tick() {
    c.width = stage.clientWidth; c.height = stage.clientHeight;
    for (const b of bits) {
      b.x += b.vx + Math.sin(frames / 20 + b.y / 50) * 0.6; b.y += b.vy; b.rot += b.vr;
      if (b.y > c.height + 40 && frames < 420) { b.y = -40; b.x = Math.random() * c.width; }
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
      if (b.face) ctx.drawImage(face, -b.size / 2, -b.size / 2, b.size, b.size);
      else { ctx.fillStyle = b.color; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); }
      ctx.restore();
    }
    if (++frames < 720) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, c.width, c.height);
  }
  tick();
}

function renderLobby() {
  $("waiting-screen").classList.remove("hidden");
  const isHost = latest.hostId === myId;
  $("host-controls").classList.toggle("hidden", !isHost);
  $("waiting-hint").classList.toggle("hidden", isHost);
  if (latest.players.length !== renderedPlayerCount) {
    const list = $("player-list");
    list.innerHTML = "";
    latest.players.forEach((p) => {
      const row = document.createElement("div");
      row.className = "player-row";
      row.innerHTML = `<span>${p.name}${p.id === latest.hostId ? " (host)" : ""}</span>` + (p.isBot ? '<span class="tag">bot</span>' : "");
      list.appendChild(row);
    });
    renderedPlayerCount = latest.players.length;
  }
}

const discardHistory = []; // client-side memory of recent discards so the pile looks like a pile
const cardValue = (c) => (c.rank === "A" ? 1 : ["J", "Q", "K"].includes(c.rank) ? 10 : parseInt(c.rank, 10));

// Game over: clear the table and lay the winner's hand out big in the middle
function renderWinTable() {
  const seen = new Set();
  beginLabels();
  const hand = latest.winnerHand || [];
  const scale = portrait ? Math.min(1.1, (halfW * 2 - 0.8) / (hand.length * CARD_W * 1.05)) : 1.15;
  const spacing = CARD_W * scale * 1.08;
  const startX = -((hand.length - 1) * spacing) / 2;
  hand.forEach((card, i) => {
    const key = `card:${card.id}`;
    const e = cards.get(key) || spawnCard(key, card, { x: 0, y: halfH + 3 });
    e.dying = false; e.wobble = true; e.tag = {};
    e.target = { x: startX + i * spacing, y: portrait ? 1.2 : 0.4, z: 1 + i * 0.01, rot: (i - (hand.length - 1) / 2) * -0.06, scale };
    seen.add(key);
  });
  for (const [key, e] of cards) if (!seen.has(key)) { e.dying = true; e.tag = {}; }
  endLabels();
}

function renderTable(isMyTurn) {
  if (latest.phase === "over") { renderWinTable(); return; }
  const seen = new Set();
  const players = latest.players;
  const startIdx = players.findIndex((p) => p.id === myId);
  const seated = players.slice(startIdx).concat(players.slice(0, startIdx));
  const opps = seated.slice(1);

  // Where a newly-appeared card should fly in from: an opponent whose hand shrank, else the deck.
  let spawnFrom = deckPos();
  if (prev) {
    const shrunk = opps.find((p) => { const q = prev.players.find((x) => x.id === p.id); return q && q.count > p.count; });
    if (shrunk) spawnFrom = oppPos(opps.indexOf(shrunk), opps.length);
  }

  beginLabels();

  // --- my hand ---
  const hand = latest.you.hand;
  const hy = handY();
  const spacing = Math.min(1.65, (halfW * 2 - 1.2 - CARD_W) / Math.max(hand.length - 1, 1));
  const startX = -((hand.length - 1) * spacing) / 2;
  hand.forEach((card, i) => {
    const key = `card:${card.id}`;
    let e = cards.get(key) || spawnCard(key, card, spawnFrom);
    e.dying = false; e.wobble = true;
    e.tag = { myCard: true, cardId: card.id };
    e.target = { x: startX + i * spacing, y: hy, z: 0.1 + i * 0.01, rot: (i - (hand.length - 1) / 2) * -0.03, scale: 1 };
    seen.add(key);
  });
  const total = hand.reduce((s, c) => s + cardValue(c), 0);
  const meChip = $("me-chip");
  fillChip(meChip, myName || "You", `total ${total}`);
  meChip.className = "chip" + (total === 10 ? " gold" : "") + (isMyTurn ? " active" : "");

  // --- opponents ---
  opps.forEach((p, idx) => {
    const pos = oppPos(idx, opps.length);
    const n = p.count, s = portrait ? 0.55 : 0.74, sp = portrait ? 0.22 : 0.34;
    const sx = -((n - 1) * sp) / 2;
    for (let i = 0; i < n; i++) {
      const key = `opp:${p.id}:${i}`;
      let e = cards.get(key) || spawnCard(key, null, deckPos());
      e.dying = false; e.wobble = false;
      e.tag = { opponentId: p.id };
      e.target = { x: pos.x + sx + i * sp, y: pos.y + Math.abs(i - (n - 1) / 2) * -0.03, z: 0.1 + i * 0.01, rot: (i - (n - 1) / 2) * -0.08, scale: s };
      seen.add(key);
    }
    const active = p.id === latest.currentPlayerId && latest.phase !== "over";
    const clickable = isMyTurn && (latest.phase === "extra" || latest.phase === "draw");
    label(`opp:${p.id}`, p.name, p.connected ? `${n} card${n === 1 ? "" : "s"}` : "away", pos.x, pos.y + CARD_H * s / 2 + 0.55,
      (active ? "active " : "") + (clickable ? "clickable" : ""),
      clickable ? () => onOpponentClick(p.id) : null);
  });

  // --- draw pile ---
  const d = deckPos();
  const stack = Math.min(latest.drawCount, 6);
  for (let i = 0; i < stack; i++) {
    const key = `deck:${i}`;
    let e = cards.get(key) || spawnCard(key, null, d);
    e.dying = false; e.wobble = false;
    e.tag = { deck: true };
    e.target = { x: d.x + i * 0.02, y: d.y + i * 0.03, z: i * 0.01, rot: 0, scale: 0.88 };
    seen.add(key);
  }

  // --- discard pile ---
  const top = latest.discardTop;
  if (top && (!discardHistory.length || discardHistory[discardHistory.length - 1].id !== top.id)) {
    discardHistory.push({ ...top, rot: (Math.random() - 0.5) * 0.3, dx: (Math.random() - 0.5) * 0.12, dy: (Math.random() - 0.5) * 0.12 });
    if (discardHistory.length > 4) discardHistory.shift();
  }
  const dp = discardPos();
  discardHistory.forEach((c, i) => {
    const key = `card:${c.id}`;
    let e = cards.get(key) || spawnCard(key, c, spawnFrom);
    e.dying = false; e.wobble = false;
    e.tag = { discard: true };
    e.target = { x: dp.x + c.dx, y: dp.y + c.dy, z: 0.5 + i * 0.01, rot: c.rot, scale: 0.88 };
    seen.add(key);
  });

  for (const [key, e] of cards) if (!seen.has(key)) { e.dying = true; e.tag = {}; }
  endLabels();
}

// Opponents sit round the top of the oval, left to right, just inside the rim.
function oppPos(idx, n) {
  const t = tableGeom();
  const [from, to] = n > 3 ? [172, 8] : [155, 25]; // big tables wrap down the sides
  const deg = n === 1 ? 90 : from - (idx * (from - to)) / (n - 1);
  const a = (deg * Math.PI) / 180;
  return { x: Math.cos(a) * t.rx * (portrait ? 0.78 : 0.72), y: t.cy + Math.sin(a) * t.ry * 0.68 };
}

// ---------- Actions ----------
function setActionPanel(buttons) {
  const panel = $("action-panel");
  panel.innerHTML = "";
  for (const b of buttons) {
    const el = document.createElement("button");
    el.className = "action-btn" + (b.color ? ` ${b.color}` : "");
    el.textContent = b.label;
    el.addEventListener("click", b.onClick);
    panel.appendChild(el);
  }
}
function showHint(text) { document.querySelector(".hint").textContent = text; }

function renderActionPanel(isMyTurn) {
  if (latest.phase === "over" || !isMyTurn) { setActionPanel([]); showHint(""); return; }
  setActionPanel([]);
  if (latest.phase === "discard") showHint("Tap one of your cards to discard it.");
  else if (latest.phase === "extra") showExtraDefault();
  else if (latest.phase === "draw") showHint("Tap a player to take a random card, or tap the draw pile.");
}
// ponytail: no Skip button — the optional ask is skipped implicitly by taking or drawing
function showExtraDefault() {
  showHint("Tap a player to ask or take, or tap the draw pile.");
  setActionPanel([]);
}
function drawFromPile() {
  if (latest.phase === "extra") send({ type: "skipAsk" }); // synchronous on the server, so the draw lands in the same tick
  send({ type: "drawPile" });
}
function onOpponentClick(targetId) {
  if (!latest || latest.currentPlayerId !== myId) return;
  if (latest.phase === "extra") openPlayerMenu(targetId);
  else if (latest.phase === "draw") send({ type: "drawFromPlayer", targetId });
}
function openPlayerMenu(targetId) {
  const target = latest.players.find((p) => p.id === targetId);
  if (!target) return;
  showHint(`${target.name}: ask something, or skip the ask and take a random card.`);
  setActionPanel([
    { label: "Ask for a card", color: "blue", onClick: () => openRankPicker(targetId, target.name) },
    { label: "Ask their count", color: "red", onClick: () => send({ type: "askCount", targetId }) },
    // skipAsk moves the server to the draw phase synchronously, so the take lands in the same tick
    { label: "Take a random card", color: "green", onClick: () => { send({ type: "skipAsk" }); send({ type: "drawFromPlayer", targetId }); } },
    { label: "Cancel", onClick: showExtraDefault },
  ]);
}
function openRankPicker(targetId, targetName) {
  const panel = $("action-panel");
  panel.innerHTML = "";
  const rankSel = document.createElement("select");
  RANKS.forEach((r) => { const o = document.createElement("option"); o.value = r; o.textContent = r; rankSel.appendChild(o); });
  const askBtn = document.createElement("button");
  askBtn.className = "action-btn blue";
  askBtn.textContent = `Ask ${targetName}`;
  askBtn.addEventListener("click", () => send({ type: "askCard", targetId, rank: rankSel.value }));
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "action-btn";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", showExtraDefault);
  panel.append(rankSel, askBtn, cancelBtn);
  showHint("Pick a rank, then confirm.");
}

// ---------- Pointer: hover lift + click ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function entryAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  ndc.x = ((clientX - r.left) / r.width) * 2 - 1;
  ndc.y = -((clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  pointerWorld.set(ndc.x * halfW, ndc.y * halfH);
  const hits = raycaster.intersectObjects(cardLayer.children, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.entry) o = o.parent;
    if (o && !o.userData.entry.dying) return o.userData.entry;
  }
  return null;
}

function hoverable(e) {
  if (!e || !latest) return false;
  if (e.tag.myCard) return true;
  if (latest.currentPlayerId !== myId) return false;
  if (e.tag.opponentId && (latest.phase === "extra" || latest.phase === "draw")) return true;
  if (e.tag.deck && (latest.phase === "draw" || latest.phase === "extra")) return true;
  return false;
}

canvas.addEventListener("pointermove", (ev) => {
  const e = entryAt(ev.clientX, ev.clientY);
  hoveredKey = hoverable(e) ? e.key : null;
  canvas.style.cursor = hoveredKey && (latest.currentPlayerId === myId) ? "pointer" : "default";
});
canvas.addEventListener("pointerleave", () => { hoveredKey = null; });

canvas.addEventListener("click", (ev) => {
  if (!latest || latest.phase === "lobby" || latest.phase === "over") return;
  const e = entryAt(ev.clientX, ev.clientY);
  if (!e) return;
  const myTurn = latest.currentPlayerId === myId;
  // Not our discard step yet: tapping a hand card queues it (tap again to unqueue).
  if (e.tag.myCard && !(myTurn && latest.phase === "discard")) {
    preselect = preselect === e.tag.cardId ? null : e.tag.cardId;
    const card = latest.you.hand.find((c) => c.id === preselect);
    if (!myTurn) showHint(card ? `${card.rank}${card.symbol} will be discarded when your turn starts. Tap it again to cancel.` : "");
    return;
  }
  if (!myTurn) return;
  if (latest.phase === "discard" && e.tag.myCard) send({ type: "discard", cardId: e.tag.cardId });
  else if (e.tag.opponentId) onOpponentClick(e.tag.opponentId);
  else if (e.tag.deck && (latest.phase === "draw" || latest.phase === "extra")) drawFromPile();
});

// ---------- Chat ----------
let unread = 0;
// Sidebar is always visible on wide screens; on narrow ones it's a drawer.
function chatCollapsed() { return getComputedStyle($("sidebar-toggle")).display !== "none" && !document.body.classList.contains("side-open"); }
$("sidebar-toggle").addEventListener("click", () => {
  document.body.classList.toggle("side-open");
  if (!chatCollapsed()) { unread = 0; $("chat-unread").classList.add("hidden"); $("log").scrollTop = $("log").scrollHeight; }
});
stage.addEventListener("pointerdown", () => document.body.classList.remove("side-open"));
$("chat-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const input = $("chat-input");
  const text = input.value.trim();
  if (!text) return;
  send({ type: "chat", text });
  input.value = "";
});

resize();
animate();
window.__ben = { state: () => latest, send }; // debug hook for scripted testing
