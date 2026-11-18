const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const menu = document.getElementById("menu");
const gameOver = document.getElementById("gameOver");
const hud = document.getElementById("hud");
const pauseButton = document.getElementById("pauseButton");

let W = 960, H = 600, dpr = 1;
let running = false, paused = false, last = 0, time = 0;
let lane = 1, targetLane = 1;
let playerY = 0, jumpV = 0, sliding = 0;
let score = 0, coinCount = 0, best = Number(localStorage.getItem("sshhuiii-best") || 0);
let speed = 420, spawnTimer = 0, coinTimer = 0;
let objects = [], particles = [], shake = 0;

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const coinsEl = document.getElementById("coins");

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = canvas.clientWidth;
  H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();
bestEl.textContent = pad(best);

function pad(n) { return String(Math.floor(n)).padStart(5, "0"); }

function project(laneIndex, z) {
  const horizonY = H * 0.29;
  const depth = Math.max(0, Math.min(1, 1 - z / 1000));
  const roadTop = W * 0.11;
  const roadBottom = W * 0.46;
  const roadWidth = roadTop + (roadBottom - roadTop) * depth;
  const y = horizonY + (H - horizonY + 30) * depth;
  const x = W * 0.5 + (laneIndex - 1) * roadWidth * 0.29;
  return { x, y, scale: 0.16 + depth * 1.05, depth };
}

function startGame() {
  running = true;
  paused = false;
  lane = targetLane = 1;
  playerY = jumpV = sliding = shake = 0;
  score = coinCount = 0;
  speed = 420;
  spawnTimer = 0.55;
  coinTimer = 0.3;
  objects = [];
  particles = [];
  menu.classList.remove("visible");
  gameOver.classList.remove("visible");
  hud.classList.add("visible");
  pauseButton.classList.add("visible");
  updateHud();
  last = performance.now();
}

function endGame() {
  running = false;
  shake = 18;
  best = Math.max(best, Math.floor(score));
  localStorage.setItem("sshhuiii-best", best);
  bestEl.textContent = pad(best);
  document.getElementById("finalScore").textContent = pad(score);
  document.getElementById("finalCoins").textContent = coinCount;
  setTimeout(() => {
    gameOver.classList.add("visible");
    pauseButton.classList.remove("visible");
  }, 450);
}

function updateHud() {
  scoreEl.textContent = pad(score);
  coinsEl.textContent = coinCount;
}

function move(direction) {
  if (!running || paused) return;
  targetLane = Math.max(0, Math.min(2, targetLane + direction));
}

function jump() {
  if (!running || paused || playerY > 1) return;
  jumpV = 720;
}

function slide() {
  if (!running || paused) return;
  sliding = 0.65;
}

window.addEventListener("keydown", event => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) event.preventEventDefault?.();
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") move(-1);
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") move(1);
  if (event.key === "ArrowUp" || event.key.toLowerCase() === "w" || event.key === " ") jump();
  if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") slide();
  if (event.key.toLowerCase() === "p" && running) togglePause();
});

let touchStart = null;
canvas.addEventListener("touchstart", event => {
  const t = event.changedTouches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });
canvas.addEventListener("touchend", event => {
  if (!touchStart) return;
  const t = event.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) { touchStart = null; return; }
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
  else dy < 0 ? jump() : slide();
  touchStart = null;
}, { passive: true });

function togglePause() {
  paused = !paused;
  if (!paused) last = performance.now();
  pauseButton.textContent = paused ? "▶" : "Ⅱ";
}
pauseButton.addEventListener("click", togglePause);
document.getElementById("playButton").addEventListener("click", startGame);
document.getElementById("restartButton").addEventListener("click", startGame);

function spawnObstacle() {
  const laneIndex = Math.floor(Math.random() * 3);
  const r = Math.random();
  const type = r < .38 ? "wall" : r < .72 ? "log" : "branch";
  objects.push({ lane: laneIndex, z: 1050, type, hit: false, spin: Math.random() * 6 });
}

function spawnCoins() {
  const startLane = Math.floor(Math.random() * 3);
  for (let i = 0; i < 5; i++) {
    objects.push({ lane: startLane, z: 1050 + i * 115, type: "coin", hit: false, spin: i * .7 });
  }
}

function update(dt) {
  time += dt;
  if (shake > 0) shake *= .88;
  lane += (targetLane - lane) * Math.min(1, dt * 12);
  if (sliding > 0) sliding -= dt;
  if (jumpV !== 0 || playerY > 0) {
    playerY += jumpV * dt;
    jumpV -= 1650 * dt;
    if (playerY <= 0) { playerY = 0; jumpV = 0; }
  }

  score += dt * (speed * .018);
  speed = Math.min(760, speed + dt * 5);
  spawnTimer -= dt;
  coinTimer -= dt;
  if (spawnTimer <= 0) { spawnObstacle(); spawnTimer = Math.max(.58, 1.12 - speed / 900) + Math.random() * .45; }
  if (coinTimer <= 0) { spawnCoins(); coinTimer = 2.2 + Math.random() * 2; }

  for (const obj of objects) {
    obj.z -= speed * dt;
    obj.spin += dt * 5;
    if (obj.hit) continue;
    if (obj.z < 80 && obj.z > -10 && Math.abs(obj.lane - lane) < .36) {
      if (obj.type === "coin") {
        obj.hit = true;
        coinCount++;
        for (let i = 0; i < 8; i++) particles.push({ x: obj.lane, z: obj.z, life: 1, vx: (Math.random()-.5)*180, vy: -Math.random()*180 });
      } else if (obj.type === "wall" || (obj.type === "log" && playerY < 58) || (obj.type === "branch" && sliding <= 0)) {
        obj.hit = true;
        endGame();
      }
    }
  }
  objects = objects.filter(obj => obj.z > -80 && !obj.hit);
  particles.forEach(p => { p.life -= dt * 1.8; p.z += 70 * dt; p.vy += 420 * dt; });
  particles = particles.filter(p => p.life > 0);
  updateHud();
}

function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#8ab09a");
  g.addColorStop(.42, "#3e6657");
  g.addColorStop(1, "#18382d");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(232,218,158,.12)";
  ctx.beginPath(); ctx.arc(W*.68, H*.18, H*.09, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = "#203f32";
  for (let i = -1; i < 14; i++) {
    const x = i * W/11 + ((time*18)% (W/11));
    ctx.fillRect(x, 0, 18, H*.31);
    ctx.beginPath(); ctx.moveTo(x-30,H*.04); ctx.lineTo(x+9,H*.29); ctx.lineTo(x+48,H*.04); ctx.fill();
  }
}

function drawRoad() {
  const horizon = H * .29;
  ctx.beginPath();
  ctx.moveTo(W*.5-W*.11, horizon);
  ctx.lineTo(W*.5+W*.11, horizon);
  ctx.lineTo(W*.5+W*.46, H);
  ctx.lineTo(W*.5-W*.46, H);
  ctx.closePath();
  const g = ctx.createLinearGradient(0,horizon,0,H);
  g.addColorStop(0,"#7a704e"); g.addColorStop(1,"#aa9861");
  ctx.fillStyle=g; ctx.fill();

  ctx.strokeStyle="rgba(238,214,151,.32)";
  ctx.lineWidth=2;
  for (let i=0;i<3;i++) {
    const x = W*.5 + (i-1.5)*W*.1;
    ctx.beginPath(); ctx.moveTo(W*.5+(i-1.5)*W*.035,horizon); ctx.lineTo(x,H); ctx.stroke();
  }

  ctx.strokeStyle="rgba(60,54,38,.22)";
  ctx.lineWidth=3;
  for (let z=-(time*speed*.1)%180; z<1080; z+=180) {
    const p=project(1,z);
    ctx.beginPath(); ctx.moveTo(W*.5-W*.11*p.depth,horizon+(p.y-horizon)*.03); ctx.lineTo(p.x,H); ctx.stroke();
  }
}

function drawTemple() {
  const horizonY=H*.29;
  ctx.fillStyle="#1b3029";
  ctx.fillRect(W*.5-W*.08,horizonY-W*.055,W*.16,W*.055);
  ctx.fillStyle="#9e9270";
  ctx.fillRect(W*.5-W*.055,horizonY-W*.11,W*.11,W*.058);
  ctx.fillStyle="#172922";
  ctx.fillRect(W*.5-W*.018,horizonY-W*.035,W*.036,W*.035);

  for(let side of [-1,1]) {
    ctx.fillStyle="#26392f";
    for(let i=0;i<8;i++) {
      const z=i*145-(time*speed*.35)%145;
      if(z<80||z>950)continue;
      const p=project(side>0?2.7:-.7,z);
      const s=p.scale*80;
      ctx.fillRect(p.x-s*.12,p.y-s*.9,s*.24,s*.9);
      ctx.beginPath(); ctx.moveTo(p.x-s*.42,p.y-s*.72); ctx.lineTo(p.x,p.y-s*1.25); ctx.lineTo(p.x+s*.42,p.y-s*.72); ctx.fill();
    }
  }
}

function drawCoin(obj) {
  const p=project(obj.lane,obj.z);
  const r=18*p.scale;
  ctx.save(); ctx.translate(p.x,p.y-r*1.8); ctx.scale(.55+Math.abs(Math.cos(obj.spin))*.45,1);
  ctx.shadowColor="#ffd76a"; ctx.shadowBlur=15*p.scale;
  ctx.fillStyle="#ffd76a"; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle="#a96922"; ctx.lineWidth=3*p.scale; ctx.beginPath(); ctx.arc(0,0,r*.65,0,Math.PI*2); ctx.stroke();
  ctx.restore();
}

function drawObstacle(obj) {
  const p=project(obj.lane,obj.z);
  const s=86*p.scale;
  if(obj.type==="wall") {
    ctx.fillStyle="#716744";
    ctx.fillRect(p.x-s*.42,p.y-s*.72,s*.84,s*.72);
    ctx.strokeStyle="#4e4832";ctx.lineWidth=4*p.scale;
    ctx.beginPath();ctx.moveTo(p.x-s*.42,p.y-s*.36);ctx.lineTo(p.x+s*.42,p.y-s*.36);ctx.moveTo(p.x,p.y-s*.72);ctx.lineTo(p.x,p.y);ctx.stroke();
  } else if(obj.type==="log") {
    ctx.fillStyle="#4a3523";
    ctx.beginPath();ctx.ellipse(p.x,p.y-s*.18,s*.44,s*.18,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#2d241a";ctx.lineWidth=3*p.scale;ctx.beginPath();ctx.moveTo(p.x-s*.35,p.y-s*.18);ctx.lineTo(p.x+s*.35,p.y-s*.18);ctx.stroke();
  } else {
    ctx.strokeStyle="#4a3523";ctx.lineWidth=12*p.scale;
    ctx.beginPath();ctx.moveTo(p.x-s*.5,p.y-s*.46);ctx.lineTo(p.x+s*.5,p.y-s*.46);ctx.stroke();
  }
}

function drawPlayer() {
  const ground=H*.82;
  const p=project(lane,0);
  const x=p.x;
  const y=ground-playerY;
  const slide=sliding>0;
  ctx.save();
  ctx.translate(x,y);
  if(shake>0) ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
  ctx.scale(slide?1.2:1,slide?.48:1);

  ctx.fillStyle="rgba(0,0,0,.25)";
  ctx.beginPath();ctx.ellipse(0,8,42,10,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#d0a073";
  ctx.beginPath();ctx.arc(0,-76,20,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#24201b";
  ctx.beginPath();ctx.arc(0,-82,21,Math.PI,Math.PI*2);ctx.fill();
  ctx.fillStyle="#a94f38";
  ctx.beginPath();ctx.moveTo(-28,-58);ctx.lineTo(28,-58);ctx.lineTo(20,-12);ctx.lineTo(-20,-12);ctx.closePath();ctx.fill();
  ctx.fillStyle="#d5c39a";
  ctx.fillRect(-18,-52,36,8);
  ctx.fillStyle="#302924";
  ctx.fillRect(-20,-13,14,34);ctx.fillRect(6,-13,14,34);
  ctx.restore();
}

function draw() {
  ctx.save();
  if(shake>0) ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
  drawSky(); drawRoad(); drawTemple();
  const sorted=[...objects].sort((a,b)=>b.z-a.z);
  for(const obj of sorted) obj.type=== "coin" ? drawCoin(obj) : drawObstacle(obj);
  for(const p of particles){ const pp=project(p.x,p.z); ctx.globalAlpha=p.life; ctx.fillStyle="#ffd76a"; ctx.fillRect(pp.x+p.vx*.02,pp.y+p.vy*.02,4,4); }
  ctx.globalAlpha=1;
  drawPlayer();
  ctx.restore();
}

function loop(now) {
  const dt=Math.min(.032,(now-last)/1000||0);
  last=now;
  if(running&&!paused) update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
