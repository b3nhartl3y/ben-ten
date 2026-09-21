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

  ctx.fillStyle = "#3b6fd6";
  roundRect(ctx, 6, 6, 244, 346, 20);
  ctx.fill();
  ctx.save();
  roundRect(ctx, 6, 6, 244, 346, 20);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 6;
  for (let x = -358; x < 256 + 358; x += 34) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 358, 358); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, 358); ctx.lineTo(x + 358, 0); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = CARD_INK;
  ctx.lineWidth = 10;
  roundRect(ctx, 6, 6, 244, 346, 20);
  ctx.stroke();
  ctx.strokeStyle = "#f8f2e4";
  ctx.lineWidth = 5;
  roundRect(ctx, 24, 24, 208, 310, 12);
  ctx.stroke();

  ctx.fillStyle = "#ffcd3c";
  ctx.strokeStyle = CARD_INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(128, 179, 82, 50, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = CARD_INK;
  ctx.font = `700 40px ${CARD_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BEN 10", 128, 181);

  backTexture = new THREE.CanvasTexture(canvas);
  backTexture.colorSpace = THREE.SRGBColorSpace;
  return backTexture;
}

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

// Balatro-style paint swirl. Ported from the well-known Shadertoy recreation.
const bgMat = new THREE.ShaderMaterial({
  depthWrite: false,
  uniforms: {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uImg: { value: new THREE.TextureLoader().load("bg.jpg", (t) => { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; }) },
    uImgAspect: { value: 284 / 286 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    precision highp float;
    varying vec2 vUv;
    uniform float uTime; uniform vec2 uRes; uniform sampler2D uImg; uniform float uImgAspect;
    const vec4 C1 = vec4(0.871, 0.267, 0.231, 1.0);
    const vec4 C2 = vec4(0.0, 0.42, 0.706, 1.0);
    const vec4 C3 = vec4(0.086, 0.137, 0.145, 1.0);
    const float CONTRAST = 3.5, LIGHTING = 0.4, SPIN_AMOUNT = 0.25, PIXEL_FILTER = 700.0, SPIN_EASE = 1.0;
    void main(){
      vec2 screen = vUv * uRes;
      float pixel_size = length(uRes) / PIXEL_FILTER;
      vec2 uv = (floor(screen / pixel_size) * pixel_size - 0.5 * uRes) / length(uRes);
      float uv_len = length(uv);
      float speed = -2.0 * SPIN_EASE * 0.2 + 302.2;
      float ang = atan(uv.y, uv.x) + speed - SPIN_EASE * 20.0 * (SPIN_AMOUNT * uv_len + (1.0 - SPIN_AMOUNT));
      vec2 mid = (uRes / length(uRes)) / 2.0;
      uv = vec2(uv_len * cos(ang) + mid.x, uv_len * sin(ang) + mid.y) - mid;
      uv *= 30.0;
      speed = uTime * 7.0;
      vec2 uv2 = vec2(uv.x + uv.y);
      for (int i = 0; i < 5; i++) {
        uv2 += sin(max(uv.x, uv.y)) + uv;
        uv += 0.5 * vec2(cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121), sin(uv2.x - 0.113 * speed));
        uv -= cos(uv.x + uv.y) - sin(uv.x * 0.711 - uv.y);
      }
      float cm = 0.25 * CONTRAST + 0.5 * SPIN_AMOUNT + 1.2;
      float paint = min(2.0, max(0.0, length(uv) * 0.035 * cm));
      float c1p = max(0.0, 1.0 - cm * abs(1.0 - paint));
      float c2p = max(0.0, 1.0 - cm * abs(paint));
      float c3p = 1.0 - min(1.0, c1p + c2p);
      float light = (LIGHTING - 0.2) * max(c1p * 5.0 - 4.0, 0.0) + LIGHTING * max(c2p * 5.0 - 4.0, 0.0);
      vec4 ink = (0.3 / CONTRAST) * C1 + (1.0 - 0.3 / CONTRAST) * (C1 * c1p + C2 * c2p + vec4(c3p * C3.rgb, c3p)) + light;

      // Photo, object-fit: cover, then liquefied by the swirl field and slowly drifting
      float screenAspect = uRes.x / uRes.y;
      vec2 iuv = vUv - 0.5;
      if (screenAspect > uImgAspect) iuv.y *= uImgAspect / screenAspect; else iuv.x *= screenAspect / uImgAspect;
      vec2 warp = vec2(c1p - c2p, c3p - 0.5) * 0.03 + 0.012 * vec2(sin(uTime * 0.3 + iuv.y * 5.0), cos(uTime * 0.25 + iuv.x * 5.0));
      vec3 photo = texture2D(uImg, iuv + 0.5 + warp).rgb;

      // paint tints and shades the photo so it still reads as the Balatro swirl
      vec3 rgb = photo * (0.45 + 0.7 * ink.rgb);
      rgb = mix(rgb, ink.rgb, 0.3) * 0.62;
      gl_FragColor = vec4(rgb, 1.0);
    }`,
});
const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
bg.position.z = -5;
scene.add(bg);

// ponytail: no pixel post-pass — the swirl shader pixelates itself, cards stay crisp

// View: always at least 12 units wide and 10 tall; layout is derived from the half-extents.
let halfW = 6, halfH = 5, portrait = false;
function resize() {
  const w = window.innerWidth, h = window.innerHeight, aspect = w / h;
  portrait = aspect < 0.85;
  if (portrait) { halfW = 3.8; halfH = halfW / aspect; }
  else { halfH = Math.max(5, 6 / aspect); halfW = halfH * aspect; }
  camera.left = -halfW; camera.right = halfW; camera.top = halfH; camera.bottom = -halfH;
  camera.updateProjectionMatrix();
  bg.scale.set(halfW * 2, halfH * 2, 1);
  bgMat.uniforms.uRes.value.set(w, h);
  renderer.setSize(w, h);
  if (latest && latest.phase !== "lobby") renderTable(latest.currentPlayerId === myId);
}
window.addEventListener("resize", resize);

// ---------- Animated card registry ----------
// key -> { group, target:{x,y,z,rot,scale}, phase, dying }
const cards = new Map();
const cardLayer = new THREE.Group();
scene.add(cardLayer);
const clock = new THREE.Clock();
let hoveredKey = null;
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

function deckPos() { return { x: -1.25, y: portrait ? 1.2 : 0.35 }; }
function discardPos() { return { x: 1.25, y: portrait ? 1.2 : 0.35 }; }

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  bgMat.uniforms.uTime.value = t;

  for (const [key, e] of cards) {
    const g = e.group, tg = e.target;
    const hovered = key === hoveredKey && !e.dying;
    const ty = tg.y + (hovered ? 0.35 : 0) + (e.wobble ? Math.sin(t * 1.6 + e.phase) * 0.04 : 0);
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
function label(key, text, x, y, className = "", onClick = null) {
  let l = labels.get(key);
  if (!l) {
    const el = document.createElement("div");
    el.className = "world-label";
    labelLayer.appendChild(el);
    l = { el, x, y };
    labels.set(key, l);
  }
  l.x = x; l.y = y; l.alive = true;
  if (l.el.textContent !== text) l.el.textContent = text;
  l.el.className = "world-label " + className;
  l.el.onclick = onClick;
  l.el.style.pointerEvents = onClick ? "auto" : "none";
  return l;
}
const projV = new THREE.Vector3();
function syncLabels() {
  const w = window.innerWidth, h = window.innerHeight;
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

ws.addEventListener("open", () => { $("setup-error").textContent = ""; });
ws.addEventListener("close", () => { $("setup-error").textContent = "Disconnected from server. Refresh to try again."; });

ws.addEventListener("message", (evt) => {
  const msg = JSON.parse(evt.data);
  if (msg.type === "created" || msg.type === "joined") {
    myId = msg.playerId;
    showWaitingRoom(msg.code);
    return;
  }
  if (msg.type === "error") { $("setup-error").textContent = msg.message; return; }
  if (msg.type === "state") {
    prev = latest;
    latest = msg;
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
let renderedLogCount = 0;
let renderedPlayerCount = -1;

function render() {
  if (!latest) return;
  if (latest.phase === "lobby") { renderLobby(); return; }

  $("waiting-screen").classList.add("hidden");
  $("hud").classList.remove("hidden");

  if (latest.log.length !== renderedLogCount) {
    const el = $("log");
    el.innerHTML = "";
    latest.log.forEach((m) => { const d = document.createElement("div"); d.textContent = m; el.appendChild(d); });
    el.scrollTop = el.scrollHeight;
    renderedLogCount = latest.log.length;
  }

  const isMyTurn = latest.currentPlayerId === myId;
  const current = latest.players.find((p) => p.id === latest.currentPlayerId);
  const ti = $("turn-indicator");
  ti.textContent = latest.phase === "over" ? "Game over" : isMyTurn ? "Your turn" : `${current ? current.name : "…"}'s turn`;
  ti.classList.toggle("mine", isMyTurn && latest.phase !== "over");

  renderTable(isMyTurn);
  renderActionPanel(isMyTurn);

  if (latest.phase === "over") {
    const winner = latest.players.find((p) => p.id === latest.winnerId);
    $("win-title").textContent = "BEN TEN!";
    $("win-subtitle").textContent = winner
      ? (winner.id === myId ? "You win — your hand totals exactly 10." : `${winner.name} wins — their hand totals exactly 10.`)
      : "";
    $("win-screen").classList.remove("hidden");
  }
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

function renderTable(isMyTurn) {
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
  const handY = -halfH + (portrait ? 5.1 : 2.95);
  const spacing = Math.min(1.65, (halfW * 2 - 1.2 - CARD_W) / Math.max(hand.length - 1, 1));
  const startX = -((hand.length - 1) * spacing) / 2;
  hand.forEach((card, i) => {
    const key = `card:${card.id}`;
    let e = cards.get(key) || spawnCard(key, card, spawnFrom);
    e.dying = false; e.wobble = true;
    e.tag = { myCard: true, cardId: card.id };
    e.target = { x: startX + i * spacing, y: handY, z: 0.1 + i * 0.01, rot: (i - (hand.length - 1) / 2) * -0.03, scale: 1 };
    seen.add(key);
  });
  const total = hand.reduce((s, c) => s + cardValue(c), 0);
  const handRight = startX + (hand.length - 1) * spacing + CARD_W / 2;
  if (portrait) label("me", `${myName || "You"} · ${total}`, 0, handY + CARD_H / 2 + 0.6, total === 10 ? "gold" : "");
  else label("me", `${myName || "You"} · ${total}`, Math.min(handRight + 1.1, halfW - 1.3), handY, total === 10 ? "gold" : "");

  // --- opponents ---
  opps.forEach((p, idx) => {
    const pos = oppPos(idx, opps.length);
    const n = p.count, s = portrait ? 0.5 : 0.62, sp = portrait ? 0.2 : 0.28;
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
    label(`opp:${p.id}`, p.name + (p.connected ? "" : " (away)") + ` · ${n}`, pos.x, pos.y + CARD_H * s / 2 + 0.5,
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
    e.target = { x: d.x + i * 0.02, y: d.y + i * 0.03, z: i * 0.01, rot: 0, scale: 0.85 };
    seen.add(key);
  }
  const deckClickable = isMyTurn && latest.phase === "draw";
  label("deck", `Draw · ${latest.drawCount}`, d.x, d.y - CARD_H * 0.85 / 2 - 0.45, deckClickable ? "clickable green" : "", deckClickable ? () => send({ type: "drawPile" }) : null);

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
    e.target = { x: dp.x + c.dx, y: dp.y + c.dy, z: 0.5 + i * 0.01, rot: c.rot, scale: 0.85 };
    seen.add(key);
  });
  label("discard", "Discard", dp.x, dp.y - CARD_H * 0.85 / 2 - 0.45, "");

  for (const [key, e] of cards) if (!seen.has(key)) { e.dying = true; e.tag = {}; }
  endLabels();
}

function oppPos(idx, n) {
  const y = halfH - (portrait ? 3.1 : 2.3);
  const span = Math.min(halfW * 2 - (portrait ? 2.2 : 3.2), 3.2 * (n - 1));
  const x = n === 1 ? 0 : -span / 2 + (span / (n - 1)) * idx;
  return { x, y };
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
  if (latest.phase === "discard") {
    setActionPanel([]);
    showHint("Tap one of your cards to discard it.");
  } else if (latest.phase === "extra") {
    showExtraDefault();
  } else if (latest.phase === "draw") {
    showHint("Tap a player to take a random card from them, or tap the draw pile.");
    setActionPanel([{ label: "Draw from pile", color: "green", onClick: () => send({ type: "drawPile" }) }]);
  }
}
function showExtraDefault() {
  showHint("Tap a player to ask them something, or skip.");
  setActionPanel([{ label: "Skip", color: "gold", onClick: () => send({ type: "skipAsk" }) }]);
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
  ndc.x = (clientX / window.innerWidth) * 2 - 1;
  ndc.y = -(clientY / window.innerHeight) * 2 + 1;
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
  if (e.tag.deck && latest.phase === "draw") return true;
  return false;
}

canvas.addEventListener("pointermove", (ev) => {
  const e = entryAt(ev.clientX, ev.clientY);
  hoveredKey = hoverable(e) ? e.key : null;
  canvas.style.cursor = hoveredKey && (latest.currentPlayerId === myId) ? "pointer" : "default";
});
canvas.addEventListener("pointerleave", () => { hoveredKey = null; });

canvas.addEventListener("click", (ev) => {
  if (!latest || latest.currentPlayerId !== myId) return;
  const e = entryAt(ev.clientX, ev.clientY);
  if (!e) return;
  if (latest.phase === "discard" && e.tag.myCard) send({ type: "discard", cardId: e.tag.cardId });
  else if (e.tag.opponentId) onOpponentClick(e.tag.opponentId);
  else if (e.tag.deck && latest.phase === "draw") send({ type: "drawPile" });
});

resize();
animate();
