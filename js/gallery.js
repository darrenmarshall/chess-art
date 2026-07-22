import { games, bios } from './data.js';
import { workPath } from './routes.js';
import { renderPanel, registerPulse } from './board.js';
import { openOverlay } from './watch.js';
import { POEM_HTML } from './poem.js';

const gallery = document.getElementById('gallery');
const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollOpts = { behavior: reducedMotion ? 'auto' : 'smooth' };

function panelCaption(game, movesFilter) {
  if (movesFilter === 'full') {
    const mateIn = Math.ceil(game.moves.length / 2);
    return `Mate in ${mateIn} move${mateIn === 1 ? '' : 's'}`;
  }
  const side = movesFilter === 'white';
  const moves = game.moves.filter(m => m[2] === side);
  const captures = moves.filter(m => m[3]).length;
  return `${moves.length} move${moves.length === 1 ? '' : 's'}, ${captures} capture${captures === 1 ? '' : 's'}`;
}

games.forEach(game => {
  const winW = game.winner === 'white';
  const panelDefs = [
    { cfgType:'white', label:game.white, role:'White', flipped:false, showW:true,  showB:false, movesFilter:'white' },
    { cfgType:'black', label:game.black, role:'Black', flipped:true,  showW:false, showB:true,  movesFilter:'black' },
    { cfgType:winW?'white':'black', label:winW?game.white:game.black, role:'Winner ★', flipped:!winW, showW:true, showB:true, movesFilter:'full' },
  ].map(p => ({ ...p, caption: panelCaption(game, p.movesFilter) }));

  const bio = bios[game.index];
  const playerFor = p =>
    !bio || !bio.players ? null :
    p.movesFilter === 'white' ? bio.players[0] :
    p.movesFilter === 'black' ? bio.players[1] :
    (winW ? bio.players[0] : bio.players[1]);

  // Each work is a full-viewport section in the vertical stack
  const section = document.createElement('section');
  section.className = 'game-section reveal';
  section.id = 'work-' + game.index;
  section.dataset.slug = game.slug;

  // ── Pinned header: work counter, title, players · date — stays put ──
  const head = document.createElement('div'); head.className = 'game-head'; head.dataset.reveal = '';
  const eraMatch = game.note.match(/Era:\s*([^.]+)\./);
  head.innerHTML =
    `<div class="game-head-main">` +
      `<div class="game-index">Work ${game.index} / 11</div>` +
      `<div class="game-title">${game.title}</div>` +
      `<div class="game-sub">${game.sub}</div>` +
    `</div>` +
    (eraMatch ? `<div class="game-era">Era — ${eraMatch[1]}</div>` : '');
  section.appendChild(head);

  // ── Horizontal pager: board pane, then the detail pane sliding in from the right ──
  const pager = document.createElement('div'); pager.className = 'game-pager';

  // Board pane — the triptych
  const paneBoard = document.createElement('div'); paneBoard.className = 'game-pane pane-board';
  const stage = document.createElement('div'); stage.className = 'board-stage';
  const panelGrid = document.createElement('div'); panelGrid.className = 'panels';
  const canvasDefs = [];

  panelDefs.forEach(p => {
    const wrap = document.createElement('div'); wrap.className = 'panel-wrap'; wrap.dataset.reveal = 'scale';
    const lr = document.createElement('div'); lr.className = 'panel-label-row';
    const nm = document.createElement('div'); nm.className = 'panel-name'; nm.textContent = p.label;
    const rl = document.createElement('div'); rl.className = 'panel-role'; rl.textContent = p.role;
    lr.appendChild(nm); lr.appendChild(rl);

    const frame = document.createElement('div'); frame.className = 'board-frame';
    const cv = document.createElement('canvas'); cv.className = 'board'; cv.width = 900; cv.height = 900;
    frame.appendChild(cv);

    // Hover reveal: the player's bio + a play button
    const hover = document.createElement('div'); hover.className = 'panel-hover';
    const player = playerFor(p);
    if (player) {
      const bn = document.createElement('div'); bn.className = 'panel-bio-name'; bn.textContent = player.name;
      const bt = document.createElement('div'); bt.className = 'panel-bio-text'; bt.textContent = player.text;
      hover.appendChild(bn); hover.appendChild(bt);
    }
    const playBtn = document.createElement('button');
    playBtn.className = 'play-btn';
    playBtn.innerHTML = '<span class="tri">&#9654;</span> Play';
    playBtn.setAttribute('aria-label', 'Play ' + game.title + ' — ' + p.role);
    playBtn.onclick = () => openOverlay(game, p);
    hover.appendChild(playBtn);
    frame.appendChild(hover);

    const cap = document.createElement('div'); cap.className = 'panel-caption'; cap.textContent = p.caption;
    wrap.appendChild(lr); wrap.appendChild(frame); wrap.appendChild(cap);
    panelGrid.appendChild(wrap);
    canvasDefs.push({ canvas:cv, cfgType:p.cfgType, flipped:p.flipped, baseShowW:p.showW, baseShowB:p.showB, panelDef:p });
  });
  stage.appendChild(panelGrid);
  paneBoard.appendChild(stage);

  // Board footer: toggles + the "details" affordance
  const state = { w:true, b:true };
  const foot = document.createElement('div'); foot.className = 'board-foot'; foot.dataset.reveal = '';
  const trow = document.createElement('div'); trow.className = 'toggle-row';
  const tlbl = document.createElement('span'); tlbl.className = 'toggle-label'; tlbl.textContent = 'Show:';
  const wBtn = document.createElement('button'); wBtn.className = 'tog'; wBtn.textContent = game.white;
  const bBtn = document.createElement('button'); bBtn.className = 'tog'; bBtn.textContent = game.black;

  function redrawAll() {
    canvasDefs.forEach(({ canvas, cfgType, flipped, baseShowW, baseShowB }) => {
      renderPanel(canvas, cfgType, game.moves, flipped, baseShowW && state.w, baseShowB && state.b);
    });
  }
  wBtn.onclick = () => { state.w = !state.w; wBtn.classList.toggle('off', !state.w); redrawAll(); };
  bBtn.onclick = () => { state.b = !state.b; bBtn.classList.toggle('off', !state.b); redrawAll(); };
  trow.appendChild(tlbl); trow.appendChild(wBtn); trow.appendChild(bBtn);

  const detailBtn = document.createElement('button'); detailBtn.className = 'detail-open-btn';
  detailBtn.innerHTML = 'See the details <span class="arr">&rarr;</span>';
  detailBtn.setAttribute('aria-label', 'Show details for ' + game.title);
  detailBtn.onclick = () => pager.scrollTo({ left: pager.clientWidth, ...scrollOpts });
  foot.appendChild(trow); foot.appendChild(detailBtn);
  paneBoard.appendChild(foot);

  // Detail pane — large overview on the left, detail cards on the right
  const paneDetail = document.createElement('div'); paneDetail.className = 'game-pane pane-detail';

  const backBtn = document.createElement('button'); backBtn.className = 'detail-back-btn';
  backBtn.innerHTML = '<span class="arr">&larr;</span> Back to the boards';
  backBtn.onclick = () => pager.scrollTo({ left: 0, ...scrollOpts });
  paneDetail.appendChild(backBtn);

  const dInner = document.createElement('div'); dInner.className = 'detail-inner';

  const overview = document.createElement('div'); overview.className = 'detail-overview'; overview.style.setProperty('--d', '0s');
  overview.innerHTML =
    `<div class="detail-kicker">Work ${game.index} — the work itself</div>` +
    `<p class="detail-desc">${game.desc}</p>` +
    (bio && bio.why ? `<p class="detail-why">${bio.why}</p>` : '');

  const hasPoem = game.index === '01';

  const cards = document.createElement('div'); cards.className = 'detail-cards';
  cards.innerHTML =
    `<div class="detail-card" style="--d:.06s">` +
      `<div class="detail-card-title">Material Specification</div>` +
      `<div class="mat-grid">` +
        `<div><div class="mat-label">Surface</div><div class="mat-value">${game.mat.surface}</div></div>` +
        `<div><div class="mat-label">Finish</div><div class="mat-value">${game.mat.finish}</div></div>` +
        `<div><div class="mat-label">Line</div><div class="mat-value">${game.mat.line}</div></div>` +
        `<div><div class="mat-label">Nodes</div><div class="mat-value">${game.mat.nodes}</div></div>` +
      `</div>` +
      `<div class="mat-note">${game.note}</div>` +
    `</div>` +
    `<div class="detail-card notation-card${hasPoem ? ' has-poem' : ''}" style="--d:.12s">` +
      `<div class="detail-card-head">` +
        `<div class="detail-card-title">Game Notation</div>` +
        (hasPoem ? `<button type="button" class="poem-toggle" aria-expanded="false">Read the poem <span class="pt-arr" aria-hidden="true">&darr;</span></button>` : '') +
      `</div>` +
      `<div class="pgn-text">${game.pgn}</div>` +
      (hasPoem ? `<div class="poem-panel" hidden>${POEM_HTML}</div>` : '') +
    `</div>` +
    (bio ?
      `<div class="detail-card" style="--d:.18s">` +
        `<div class="detail-card-title">Historical Setting</div>` +
        `<div class="bio-context-text">${bio.context}</div>` +
        `<div class="bio-pivot">${bio.pivot}</div>` +
      `</div>` : '');

  dInner.appendChild(overview); dInner.appendChild(cards);
  paneDetail.appendChild(dInner);

  // Poem toggle — expands the notation card into a scrollable reading panel
  if (hasPoem) {
    const card = cards.querySelector('.notation-card');
    const btn = card.querySelector('.poem-toggle');
    const panel = card.querySelector('.poem-panel');
    btn.addEventListener('click', () => {
      const open = card.classList.toggle('poem-open');
      btn.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
      btn.innerHTML = open
        ? 'Hide the poem <span class="pt-arr" aria-hidden="true">&uarr;</span>'
        : 'Read the poem <span class="pt-arr" aria-hidden="true">&darr;</span>';
      if (open) panel.scrollTop = 0;
    });
  }

  pager.appendChild(paneBoard); pager.appendChild(paneDetail);
  section.appendChild(pager);
  gallery.appendChild(section);

  // Initial draw
  canvasDefs.forEach(({ canvas, cfgType, flipped, baseShowW, baseShowB }) => {
    renderPanel(canvas, cfgType, game.moves, flipped, baseShowW, baseShowB);
  });

  // Keep the lines gently breathing while a board is on screen
  canvasDefs.forEach(({ canvas, cfgType, flipped, baseShowW, baseShowB }) => {
    registerPulse(canvas, () => {
      renderPanel(canvas, cfgType, game.moves, flipped, baseShowW && state.w, baseShowB && state.b);
    });
  });
});

// ── Index of works (below the statement) ─────────────
const indexList = document.getElementById('index-list');
if (indexList) {
  games.forEach(g => {
    const eraM = g.note.match(/Era:\s*([^.]+)\./);
    const era = eraM ? eraM[1].trim() : '';
    const yearM = g.sub.match(/(\d{4})(?!.*\d{4})/);
    const year = yearM ? yearM[1] : '';
    const a = document.createElement('a');
    a.className = 'index-row';
    a.dataset.reveal = '';
    a.href = workPath(g.slug);
    a.innerHTML = `<div class="index-num">${g.index}</div>` +
      `<div class="index-main"><div class="index-title">${g.title}</div>` +
      `<div class="index-players">${g.white} vs. ${g.black}</div></div>` +
      `<div class="index-era">${era}</div>` +
      `<div class="index-year">${year}</div>`;
    indexList.appendChild(a);
  });
}
