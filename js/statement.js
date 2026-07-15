import { games } from './data.js';
import { drawStepOnCanvas } from './watch.js';

// Auto-playing board on the exhibition statement: the Shirov (Black) score
// from the Polgár game, drawn move by move on an endless loop — no controls.
// Restarts from move 0 each time the statement slide enters the viewport.

const canvas = document.getElementById('statement-board');
let cleanup = null;

function createStatementLoop(cv) {
  const game = games.find(g => g.index === '11') || games[games.length - 1];
  const cfgType = 'black', movesFilter = 'black', flipped = true;
  const total = game.moves.filter(m => m[2] === false).length;
  const draw = step => drawStepOnCanvas(cv, cfgType, game, movesFilter, flipped, step);

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || total === 0) {
    draw(total);
    return () => {};
  }

  const STEP_MS = 620;   // tempo per move
  const HOLD_MS = 2600;  // pause on the finished board before looping
  let step = 0;
  let timer = null;
  let holdTimer = null;

  function clearTimers() {
    if (timer) { clearInterval(timer); timer = null; }
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
  }

  function tick() {
    step++;
    draw(step);
    if (step >= total) {
      clearInterval(timer);
      timer = null;
      holdTimer = setTimeout(() => {
        holdTimer = null;
        step = 0;
        draw(0);
        timer = setInterval(tick, STEP_MS);
      }, HOLD_MS);
    }
  }

  function start() {
    clearTimers();
    step = 0;
    draw(0);
    timer = setInterval(tick, STEP_MS);
  }

  start();
  return clearTimers;
}

/** Restart the statement board from move 0. */
export function resetStatementLoop() {
  if (!canvas) return;
  if (cleanup) cleanup();
  cleanup = createStatementLoop(canvas);
}

/** Stop the loop when the statement leaves the viewport. */
export function stopStatementLoop() {
  if (cleanup) { cleanup(); cleanup = null; }
}
