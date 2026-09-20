import * as THREE from "three";

// ---------- Card rendering helpers ----------
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const CARD_FONT = '"Fredoka", "Arial Black", sans-serif';
document.fonts.load(`700 60px ${CARD_FONT}`); // kick off webfont load before any card is drawn

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Balatro-ish flat colors: vivid red for hearts/diamonds, ink-navy for clubs/spades
const CARD_INK = "#15121f";
const CARD_RED = "#ff5d5d";

const faceTextureCache = new Map();
function faceTexture(card) {
  const key = card.rank + card.suit;
  if (faceTextureCache.has(key)) return faceTextureCache.get(key);
  const color = card.color === "#c0392b" ? CARD_RED : CARD_INK;
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 358;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f7f1e3";
  roundRect(ctx, 6, 6, 244, 346, 22);
  ctx.fill();
  ctx.strokeStyle = CARD_INK;
  ctx.lineWidth = 9;
  roundRect(ctx, 6, 6, 244, 346, 22);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = `700 46px ${CARD_FONT}`;
  ctx.textBaseline = "top";
  ctx.fillText(card.rank, 22, 18);
  ctx.font = `44px ${CARD_FONT}`;
  ctx.fillText(card.symbol, 22, 68);

  ctx.save();
  ctx.translate(234, 340);
  ctx.rotate(Math.PI);
  ctx.font = `700 46px ${CARD_FONT}`;
  ctx.textBaseline = "top";
  ctx.fillText(card.rank, 0, 0);
  ctx.font = `44px ${CARD_FONT}`;
  ctx.fillText(card.symbol, 0, 52);
  ctx.restore();

  ctx.fillStyle = color;
  ctx.font = "120px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(card.symbol, 128, 190);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  faceTextureCache.set(key, tex);
  return tex;
}

let backTexture = null;
function getBackTexture() {
  if (backTexture) return backTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 358;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#241f38";
  roundRect(ctx, 6, 6, 244, 346, 22);
  ctx.fill();
  ctx.strokeStyle = CARD_INK;
  ctx.lineWidth = 9;
  roundRect(ctx, 6, 6, 244, 346, 22);
  ctx.stroke();
  ctx.strokeStyle = "#ffcd3c";
  ctx.lineWidth = 5;
  roundRect(ctx, 20, 20, 216, 318, 16);
  ctx.stroke();

  // diamond lattice, Balatro-card-back style
  ctx.strokeStyle = "rgba(255, 205, 60, 0.35)";
  ctx.lineWidth = 2;
  for (let x = -358; x < 256 + 358; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 358, 358);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, 358);
    ctx.lineTo(x + 358, 0);
    ctx.stroke();
  }

  ctx.fillStyle = "#ffcd3c";
  ctx.beginPath();
  ctx.ellipse(128, 179, 78, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#241f38";
  ctx.font = `700 30px ${CARD_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BEN 10", 128, 181);

  backTexture = new THREE.CanvasTexture(canvas);
  backTexture.colorSpace = THREE.SRGBColorSpace;
  return backTexture;
}

const CARD_W = 1.0, CARD_H = 1.4;
function makeCardMesh(card, faceUp) {
  const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);
  const frontMat = new THREE.MeshBasicMaterial({ map: faceUp ? faceTexture(card) : getBackTexture(), side: THREE.FrontSide });
  const backMat = new THREE.MeshBasicMaterial({ map: getBackTexture(), side: THREE.BackSide });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, frontMat), new THREE.Mesh(geo, backMat));
  group.userData.card = card;
  return group;
}

function makeLabelSprite(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#211c33";
  roundRect(ctx, 2, 2, 252, 60, 16);
  ctx.fill();
  ctx.strokeStyle = "#ffcd3c";
  ctx.lineWidth = 4;
  roundRect(ctx, 2, 2, 252, 60, 16);
  ctx.stroke();
  ctx.fillStyle = "#fdf6e8";
  ctx.font = `700 28px ${CARD_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 33);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
  sprite.scale.set(1.4, 0.35, 1);
  return sprite;
}

// ---------- Scene setup ----------
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x15121f);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 7.2, 8.4);
camera.lookAt(0, 0, -0.3);

scene.add(new THREE.AmbientLight(0xffffff, 0.95));
const dirLight = new THREE.DirectionalLight(0xfff2d0, 0.55);
dirLight.position.set(3, 8, 5);
scene.add(dirLight);

function makeTableTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
  grad.addColorStop(0, "#2e2748");
  grad.addColorStop(1, "#1c1830");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const table = new THREE.Mesh(
  new THREE.CircleGeometry(6.2, 48),
  new THREE.MeshStandardMaterial({ map: makeTableTexture() })
);
table.rotation.x = -Math.PI / 2;
scene.add(table);

const rim = new THREE.Mesh(new THREE.RingGeometry(6.2, 6.55, 48), new THREE.MeshStandardMaterial({ color: 0xffcd3c }));
rim.rotation.x = -Math.PI / 2;
rim.position.y = -0.01;
scene.add(rim);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

const handGroup = new THREE.Group();
scene.add(handGroup);
const pileGroup = new THREE.Group();
scene.add(pileGroup);

function clearGroup(group) {
  while (group.children.length) group.remove(group.children[0]);
}

function seatPositions(count) {
  const positions = [{ x: 0, z: 4.4, angle: 0 }];
  const others = count - 1;
  const spread = Math.PI * 0.7;
  for (let i = 0; i < others; i++) {
    const t = others === 1 ? 0 : i / (others - 1) - 0.5;
    const angle = t * spread;
    const radius = 4.2;
    positions.push({ x: Math.sin(angle) * radius, z: -Math.cos(angle) * radius, angle });
  }
  return positions;
}

// ---------- WebSocket client ----------
const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
const ws = new WebSocket(`${wsProtocol}//${location.host}/ws`);

let myId = null;
let latest = null; // last state message from server
let myName = "";

const $ = (id) => document.getElementById(id);

ws.addEventListener("open", () => {
  $("setup-error").textContent = "";
});
ws.addEventListener("close", () => {
  $("setup-error").textContent = "Disconnected from server. Refresh to try again.";
});

ws.addEventListener("message", (evt) => {
  const msg = JSON.parse(evt.data);
  if (msg.type === "created" || msg.type === "joined") {
    myId = msg.playerId;
    showWaitingRoom(msg.code);
    return;
  }
  if (msg.type === "error") {
    $("setup-error").textContent = msg.message;
    return;
  }
  if (msg.type === "state") {
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

// ---------- Rendering the live game state ----------
function log(msg) {
  const el = $("log");
  const line = document.createElement("div");
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

let renderedLogCount = 0;
let renderedPlayerCount = -1;

function render() {
  if (!latest) return;

  if (latest.phase === "lobby") {
    renderLobby();
    return;
  }

  if ($("waiting-screen").classList.contains("hidden") === false) {
    $("waiting-screen").classList.add("hidden");
  }
  $("hud").classList.remove("hidden");

  if (latest.log.length !== renderedLogCount) {
    $("log").innerHTML = "";
    latest.log.forEach(log);
    renderedLogCount = latest.log.length;
  }

  const isMyTurn = latest.currentPlayerId === myId;
  const currentPlayer = latest.players.find((p) => p.id === latest.currentPlayerId);
  $("turn-indicator").textContent = latest.phase === "over"
    ? "Game over"
    : isMyTurn ? "Your turn" : `${currentPlayer ? currentPlayer.name : "…"}'s turn`;

  renderTable();
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
      row.innerHTML = `<span>${p.name}${p.id === latest.hostId ? " (host)" : ""}</span>` +
        (p.isBot ? '<span class="tag">bot</span>' : "");
      list.appendChild(row);
    });
    renderedPlayerCount = latest.players.length;
  }
}

function renderTable() {
  clearGroup(handGroup);
  clearGroup(pileGroup);

  const players = latest.players;
  const startIdx = players.findIndex((p) => p.id === myId);
  const seated = players.slice(startIdx).concat(players.slice(0, startIdx));
  const seats = seatPositions(seated.length);

  seated.forEach((p, seatIdx) => {
    const seat = seats[seatIdx];
    if (seatIdx === 0) {
      const hand = latest.you.hand;
      const n = hand.length;
      const spacing = 1.05;
      const startX = -((n - 1) * spacing) / 2;
      hand.forEach((card, i) => {
        const mesh = makeCardMesh(card, true);
        mesh.position.set(startX + i * spacing, 0.9, seat.z - 1.4);
        mesh.rotation.x = -0.15;
        mesh.userData.myCard = true;
        handGroup.add(mesh);
      });
    } else {
      const n = p.count;
      const spacing = 0.32;
      const startX = -((n - 1) * spacing) / 2;
      for (let i = 0; i < n; i++) {
        const mesh = makeCardMesh(null, false);
        const localX = startX + i * spacing;
        mesh.position.set(seat.x + localX * Math.cos(seat.angle), 0.05 + i * 0.002, seat.z + localX * Math.sin(seat.angle));
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z = seat.angle;
        handGroup.add(mesh);
      }
      const label = makeLabelSprite(p.name + (p.connected ? "" : " (away)"));
      label.position.set(seat.x * 1.18, 0.6, seat.z * 1.18);
      handGroup.add(label);
    }
  });

  const drawStackHeight = Math.min(latest.drawCount, 20);
  for (let i = 0; i < drawStackHeight; i++) {
    const mesh = makeCardMesh(null, false);
    mesh.position.set(-1.3, 0.03 + i * 0.006, 0);
    mesh.rotation.x = -Math.PI / 2;
    pileGroup.add(mesh);
  }
  const drawLabel = makeLabelSprite(`Draw pile (${latest.drawCount})`);
  drawLabel.position.set(-1.3, 0.5, 0.9);
  pileGroup.add(drawLabel);

  if (latest.discardTop) {
    const mesh = makeCardMesh(latest.discardTop, true);
    mesh.position.set(1.3, 0.03, 0);
    mesh.rotation.x = -Math.PI / 2;
    pileGroup.add(mesh);
  }
  const discardLabel = makeLabelSprite("Discard");
  discardLabel.position.set(1.3, 0.5, 0.9);
  pileGroup.add(discardLabel);
}

function opponents() {
  return latest.players.filter((p) => p.id !== myId);
}

function setActionPanel(buttons) {
  const panel = $("action-panel");
  panel.innerHTML = "";
  for (const b of buttons) {
    const el = document.createElement("button");
    el.className = "action-btn" + (b.gold ? " gold" : "");
    el.textContent = b.label;
    el.addEventListener("click", b.onClick);
    panel.appendChild(el);
  }
}

function showHint(text) {
  let hint = document.querySelector(".hint");
  if (!hint) {
    hint = document.createElement("div");
    hint.className = "hint";
    $("hud").appendChild(hint);
  }
  hint.textContent = text;
}

function renderActionPanel(isMyTurn) {
  if (latest.phase === "over") { setActionPanel([]); showHint(""); return; }
  if (!isMyTurn) { setActionPanel([]); showHint(""); return; }

  if (latest.phase === "discard") {
    setActionPanel([]);
    showHint("Click one of your cards to discard it.");
  } else if (latest.phase === "extra") {
    showHint("Optional: ask a question before you draw.");
    setActionPanel([
      { label: "Ask for a card", onClick: openAskCardMenu },
      { label: "Ask for a count", onClick: openAskCountMenu },
      { label: "Skip", gold: true, onClick: () => send({ type: "skipAsk" }) },
    ]);
  } else if (latest.phase === "draw") {
    showHint("Click the draw pile, or take a card from an opponent below.");
    const buttons = opponents().map((o) => ({
      label: `Take from ${o.name} (${o.count})`,
      onClick: () => send({ type: "drawFromPlayer", targetId: o.id }),
    }));
    buttons.push({ label: "Draw from pile", gold: true, onClick: () => send({ type: "drawPile" }) });
    setActionPanel(buttons);
  }
}

function openAskCardMenu() {
  const panel = $("action-panel");
  panel.innerHTML = "";
  const oppSel = document.createElement("select");
  opponents().forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.id; opt.textContent = o.name;
    oppSel.appendChild(opt);
  });
  const rankSel = document.createElement("select");
  RANKS.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r; opt.textContent = r;
    rankSel.appendChild(opt);
  });
  const askBtn = document.createElement("button");
  askBtn.className = "action-btn gold";
  askBtn.textContent = "Ask";
  askBtn.addEventListener("click", () => send({ type: "askCard", targetId: oppSel.value, rank: rankSel.value }));
  panel.append(oppSel, rankSel, askBtn);
}

function openAskCountMenu() {
  const panel = $("action-panel");
  panel.innerHTML = "";
  const oppSel = document.createElement("select");
  opponents().forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.id; opt.textContent = o.name;
    oppSel.appendChild(opt);
  });
  const askBtn = document.createElement("button");
  askBtn.className = "action-btn gold";
  askBtn.textContent = "Ask count";
  askBtn.addEventListener("click", () => send({ type: "askCount", targetId: oppSel.value }));
  panel.append(oppSel, askBtn);
}

// ---------- Interaction: click own hand to discard ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

canvas.addEventListener("click", (e) => {
  if (!latest || latest.phase !== "discard" || latest.currentPlayerId !== myId) return;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const myMeshes = handGroup.children.filter((m) => m.userData.myCard);
  const hits = raycaster.intersectObjects(myMeshes, true);
  if (hits.length) {
    const group = findCardGroup(hits[0].object);
    if (group) send({ type: "discard", cardId: group.userData.card.id });
  }
});

function findCardGroup(obj) {
  let o = obj;
  while (o && !(o.userData && o.userData.card !== undefined) && o.parent) o = o.parent;
  return o && o.userData && o.userData.card !== undefined ? o : null;
}
