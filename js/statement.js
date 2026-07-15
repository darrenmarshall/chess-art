import { games } from './data.js';
import { drawStepOnCanvas } from './watch.js';

// Auto-playing board on the exhibition statement: the Shirov (Black) score
// from the Polgár game, drawn move by move on an endless loop — no controls.
const canvas = document.getElementById('statement-board');
if (canvas) {
  const game = games.find(g => g.index === '11') || games[games.length - 1];
  const cfgType = 'black', movesFilter = 'black', flipped = true;
  const total = game.moves.filter(m => m[2] === false).length;

  const draw = step => drawStepOnCanvas(canvas, cfgType, game, movesFilter, flipped, step);

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion || total === 0) {
    draw(total);
  } else {
    const STEP_MS = 620;   // tempo per move
    const HOLD_MS = 2600;  // pause on the finished board before looping
    let step = 0;
    let timer = null;

    function tick() {
      step++;
      draw(step);
      if (step >= total) {
        clearInterval(timer);
        setTimeout(() => {
          step = 0;
          draw(0);
          timer = setInterval(tick, STEP_MS);
        }, HOLD_MS);
      }
    }

    draw(0);
    timer = setInterval(tick, STEP_MS);
  }
}
