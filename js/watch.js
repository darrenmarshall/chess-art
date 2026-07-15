import { CONFIGS, RED } from './data.js';
import { sq, drawBoard, renderPanel } from './board.js';

// ── Watch mode engine ─────────────────────────────────

// Global overlay state
let overlayActive = false;
let overlayRAF = null;
let overlayState = null;

function createWatchState(game, panelDef) {
  return {
    game, panelDef,
    moveIndex: 0,       // how many moves drawn so far
    playing: false,
    speed: 800,         // ms per move
    lastTime: 0,
    loop: null,
  };
}

function movesForPanel(game, movesFilter) {
  // Return the ordered moves relevant to this panel
  if (movesFilter === 'white') return game.moves.filter(m => m[2] === true);
  if (movesFilter === 'black') return game.moves.filter(m => m[2] === false);
  return game.moves; // full game
}

function drawAtStep(canvas, cfgType, game, movesFilter, flipped, step) {
  // Draw the board with exactly `step` moves shown
  const allMoves = movesForPanel(game, movesFilter);
  const visibleMoves = allMoves.slice(0, step);
  const showW = movesFilter !== 'black';
  const showB = movesFilter !== 'white';
  renderPanel(canvas, cfgType, visibleMoves.map(m => {
    // Ensure isWhite flag is correct for full-game panels
    return m;
  }), flipped,
    movesFilter === 'full' ? true : showW,
    movesFilter === 'full' ? true : showB
  );
  // For captures: only mark ones up to this step
  const captureMoves = visibleMoves.filter(m => m[3]);
  const S = canvas.width;
  const M = Math.round(S * 0.06), CELL = (S - M * 2) / 8;
  const ctx = canvas.getContext('2d');
  const seen = new Set();
  captureMoves.forEach(([from, to, isW, isCapture]) => {
    if (!to || seen.has(to)) return;
    seen.add(to);
    const p = sq(to, M, CELL, flipped);
    const size = CELL * 0.11;
    ctx.save();
    ctx.strokeStyle = RED;
    ctx.lineWidth = Math.max(0.8, S/360);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x-size,p.y-size); ctx.lineTo(p.x+size,p.y+size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x+size,p.y-size); ctx.lineTo(p.x-size,p.y+size); ctx.stroke();
    ctx.restore();
  });
}

// Simpler: just re-render using the existing renderPanel but with sliced moves
export function drawStepOnCanvas(canvas, cfgType, game, movesFilter, flipped, step) {
  const allMoves = movesForPanel(game, movesFilter);
  const S = canvas.width, cfg = CONFIGS[cfgType], ctx = canvas.getContext('2d');
  const { M, CELL } = drawBoard(ctx, S, cfg);
  const sliced = allMoves.slice(0, step);

  const wm = movesFilter === 'full' ? sliced.filter(m=>m[2]) : (movesFilter === 'white' ? sliced : []);
  const bm = movesFilter === 'full' ? sliced.filter(m=>!m[2]) : (movesFilter === 'black' ? sliced : []);

  [[wm, cfg.lineW],[bm, cfg.lineB]].forEach(([ms, color]) => {
    if (!ms.length) return;
    ms.forEach(([from, to], i) => {
      if (!to) return;
      const a = sq(from, M, CELL, flipped), b = sq(to, M, CELL, flipped);
      const isLast = i === ms.length - 1;
      // All past moves: solid and fully visible. Most recent: bolder.
      const op  = isLast ? 0.90 : 0.72;
      const lw  = isLast ? S / 320 : S / 580;
      ctx.save();
      ctx.globalAlpha = op;
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.restore();
      // Destination dot
      const dotR = isLast ? S / 220 : S / 380;
      ctx.save();
      ctx.globalAlpha = op * 0.55;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(b.x, b.y, dotR, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  });

  // Capture X's — only on moves drawn so far
  const seen = new Set();
  sliced.filter(m => m[3]).forEach(([from, to]) => {
    if (!to || seen.has(to)) return;
    seen.add(to);
    const p = sq(to, M, CELL, flipped);
    const size = CELL * 0.11;
    ctx.save(); ctx.strokeStyle = RED; ctx.lineWidth = Math.max(0.8, S/360); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x-size,p.y-size); ctx.lineTo(p.x+size,p.y+size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x+size,p.y-size); ctx.lineTo(p.x-size,p.y+size); ctx.stroke();
    ctx.restore();
  });
}

// Highlight the most recently drawn move
function highlightLastMove(canvas, cfgType, game, movesFilter, flipped, step) {
  const allMoves = movesForPanel(game, movesFilter);
  if (step < 1 || step > allMoves.length) return;
  const move = allMoves[step - 1];
  if (!move || !move[1]) return;
  const S = canvas.width;
  const M = Math.round(S * 0.06), CELL = (S - M * 2) / 8;
  const ctx = canvas.getContext('2d');
  const from = sq(move[0], M, CELL, flipped);
  const to = sq(move[1], M, CELL, flipped);
  // Pulse circle on destination
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = RED;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(to.x, to.y, CELL * 0.28, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// ── Overlay ────────────────────────────────────────────

export function openOverlay(game, panelDef) {
  if (overlayActive) closeOverlay();
  overlayActive = true;
  document.body.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.className = 'watch-overlay';
  overlay.id = 'watch-overlay';

  const inner = document.createElement('div');
  inner.className = 'watch-overlay-inner';

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'watch-close';
  closeBtn.textContent = 'Close';
  closeBtn.onclick = closeOverlay;
  overlay.appendChild(closeBtn);

  // Title
  const titleWrap = document.createElement('div');
  titleWrap.style.textAlign = 'center';
  const titleEl = document.createElement('div');
  titleEl.className = 'watch-overlay-title';
  titleEl.textContent = game.title;
  const subEl = document.createElement('div');
  subEl.className = 'watch-overlay-sub';
  subEl.textContent = game.sub + ' · ' + panelDef.label;
  titleWrap.appendChild(titleEl);
  titleWrap.appendChild(subEl);
  inner.appendChild(titleWrap);

  // Canvas
  const cv = document.createElement('canvas');
  cv.width = 1100; cv.height = 1100;
  inner.appendChild(cv);

  // Move info
  const moveInfo = document.createElement('div');
  moveInfo.className = 'watch-move-info';
  inner.appendChild(moveInfo);

  // Scrubber
  const scrubWrap = document.createElement('div');
  scrubWrap.className = 'watch-overlay-scrubber';
  const scrubFill = document.createElement('div');
  scrubFill.className = 'watch-overlay-scrubber-fill';
  scrubFill.style.width = '0%';
  scrubWrap.appendChild(scrubFill);
  inner.appendChild(scrubWrap);

  // Controls
  const controls = document.createElement('div');
  controls.className = 'watch-overlay-controls';

  const allMoves = movesForPanel(game, panelDef.movesFilter);
  const total = allMoves.length;

  const ws = { step: 0, playing: false, speed: 700, timer: null };

  function updateDisplay() {
    drawStepOnCanvas(cv, panelDef.cfgType, game, panelDef.movesFilter, panelDef.flipped, ws.step);
    // highlighting handled inside drawStepOnCanvas
    scrubFill.style.width = total > 0 ? (ws.step / total * 100) + '%' : '0%';
    const m = ws.step > 0 ? allMoves[ws.step - 1] : null;
    if (m) {
      const moveNum = Math.ceil(ws.step / (panelDef.movesFilter === 'full' ? 1 : 1));
      const playerName = panelDef.movesFilter === 'full'
        ? (m[2] ? game.white : game.black)
        : panelDef.label;
      moveInfo.textContent = `Move ${ws.step} of ${total} · ${playerName} · ${m[0]}→${m[1]}${m[3]?' ×':''}`;
    } else {
      moveInfo.textContent = `${total} moves · press play`;
    }
    playBtn.textContent = ws.playing ? '⏸' : '▶';
  }

  function stopTimer() {
    if (ws.timer) { clearInterval(ws.timer); ws.timer = null; }
  }

  function startTimer() {
    stopTimer();
    ws.timer = setInterval(() => {
      if (ws.step < total) {
        ws.step++;
        updateDisplay();
      } else {
        ws.playing = false;
        stopTimer();
        updateDisplay();
      }
    }, ws.speed);
  }

  // Buttons
  const restartBtn = document.createElement('button');
  restartBtn.className = 'watch-btn icon'; restartBtn.textContent = '⏮';
  restartBtn.onclick = () => { stopTimer(); ws.playing = false; ws.step = 0; updateDisplay(); };

  const prevBtn = document.createElement('button');
  prevBtn.className = 'watch-btn icon'; prevBtn.textContent = '←';
  prevBtn.onclick = () => { stopTimer(); ws.playing = false; if (ws.step > 0) ws.step--; updateDisplay(); };

  const playBtn = document.createElement('button');
  playBtn.className = 'watch-btn icon active'; playBtn.textContent = '▶';
  playBtn.onclick = () => {
    ws.playing = !ws.playing;
    if (ws.playing) {
      if (ws.step >= total) ws.step = 0;
      startTimer();
    } else {
      stopTimer();
    }
    updateDisplay();
  };

  const nextBtn = document.createElement('button');
  nextBtn.className = 'watch-btn icon'; nextBtn.textContent = '→';
  nextBtn.onclick = () => { stopTimer(); ws.playing = false; if (ws.step < total) ws.step++; updateDisplay(); };

  const endBtn = document.createElement('button');
  endBtn.className = 'watch-btn icon'; endBtn.textContent = '⏭';
  endBtn.onclick = () => { stopTimer(); ws.playing = false; ws.step = total; updateDisplay(); };

  // Speed controls
  const speeds = [{ label: 'slow', ms: 1400 }, { label: '1×', ms: 700 }, { label: 'fast', ms: 280 }];
  const speedWrap = document.createElement('div');
  speedWrap.className = 'watch-speed';
  speedWrap.appendChild(Object.assign(document.createElement('span'), { textContent: 'speed:' }));
  speeds.forEach(s => {
    const sb = document.createElement('button');
    sb.className = 'speed-btn' + (s.ms === ws.speed ? ' active' : '');
    sb.textContent = s.label;
    sb.onclick = () => {
      ws.speed = s.ms;
      speedWrap.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      sb.classList.add('active');
      if (ws.playing) { stopTimer(); startTimer(); }
    };
    speedWrap.appendChild(sb);
  });

  [restartBtn, prevBtn, playBtn, nextBtn, endBtn].forEach(b => controls.appendChild(b));
  controls.appendChild(speedWrap);
  inner.appendChild(controls);
  overlay.appendChild(inner);

  // Scrubber click
  scrubWrap.addEventListener('click', e => {
    const rect = scrubWrap.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    stopTimer(); ws.playing = false;
    ws.step = Math.round(pct * total);
    updateDisplay();
  });

  document.body.appendChild(overlay);
  overlayState = { ws, stopTimer };

  // Keyboard
  function onKey(e) {
    if (e.key === 'Escape') closeOverlay();
    if (e.key === 'ArrowRight') { stopTimer(); ws.playing=false; if(ws.step<total) ws.step++; updateDisplay(); }
    if (e.key === 'ArrowLeft') { stopTimer(); ws.playing=false; if(ws.step>0) ws.step--; updateDisplay(); }
    if (e.key === ' ') { e.preventDefault(); playBtn.click(); }
  }
  document.addEventListener('keydown', onKey);
  overlay._onKey = onKey;

  updateDisplay();
  // Auto-play
  ws.playing = true; startTimer();
}

function closeOverlay() {
  const overlay = document.getElementById('watch-overlay');
  if (overlay) {
    if (overlay._onKey) document.removeEventListener('keydown', overlay._onKey);
    overlay.remove();
  }
  if (overlayState) { overlayState.stopTimer(); overlayState = null; }
  overlayActive = false;
  document.body.style.overflow = '';
}
