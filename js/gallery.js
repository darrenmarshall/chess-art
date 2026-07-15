import { games, bios } from './data.js';
import { renderPanel } from './board.js';
import { openOverlay } from './watch.js';

const gallery = document.getElementById('gallery');

games.forEach(game => {
  const winW = game.winner === 'white';
  const panelDefs = [
    { cfgType:'white', label:game.white, role:'White', flipped:false, showW:true,  showB:false, movesFilter:'white', caption:'White ground · white moves · from White' },
    { cfgType:'black', label:game.black, role:'Black', flipped:true,  showW:false, showB:true,  movesFilter:'black', caption:'Black ground · black moves · from Black' },
    { cfgType:winW?'white':'black', label:winW?game.white:game.black, role:'Winner ★', flipped:!winW, showW:true, showB:true, movesFilter:'full', caption:`${winW?'White':'Black'} ground · full game · from ${winW?game.white:game.black}` },
  ];

  const bio = bios[game.index];
  const playerFor = p =>
    !bio || !bio.players ? null :
    p.movesFilter === 'white' ? bio.players[0] :
    p.movesFilter === 'black' ? bio.players[1] :
    (winW ? bio.players[0] : bio.players[1]);

  const card = document.createElement('div'); card.className='game-card slide';
  card.id = 'work-' + game.index;

  // Full-viewport plate for the triptych, wall text below
  const plate = document.createElement('div'); plate.className='plate reveal';
  const wall = document.createElement('div'); wall.className='wall reveal';

  // Header
  const hdr = document.createElement('div'); hdr.className='card-header'; hdr.dataset.reveal = '';
  const eraMatch = game.note.match(/Era:\s*([^.]+)\./);
  hdr.innerHTML=`<div><div class="game-index">Work ${game.index} / 10</div><div class="game-title">${game.title}</div><div class="game-sub">${game.sub}</div></div>${eraMatch ? `<div class="game-era">Era — ${eraMatch[1]}</div>` : ''}`;
  plate.appendChild(hdr);

  // Three panels
  const panelGrid = document.createElement('div'); panelGrid.className='panels';
  const canvasDefs = [];

  panelDefs.forEach(p => {
    const wrap = document.createElement('div'); wrap.className='panel-wrap'; wrap.dataset.reveal = 'scale';
    const lr = document.createElement('div'); lr.className='panel-label-row';
    const nm = document.createElement('div'); nm.className='panel-name'; nm.textContent=p.label;
    const rl = document.createElement('div'); rl.className='panel-role'; rl.textContent=p.role;
    lr.appendChild(nm); lr.appendChild(rl);

    const frame = document.createElement('div'); frame.className='board-frame';
    const cv = document.createElement('canvas'); cv.className='board'; cv.width=900; cv.height=900;
    frame.appendChild(cv);

    // Hover reveal: the player's bio + a play button
    const hover = document.createElement('div'); hover.className='panel-hover';
    const player = playerFor(p);
    if (player) {
      const bn = document.createElement('div'); bn.className='panel-bio-name'; bn.textContent=player.name;
      const bt = document.createElement('div'); bt.className='panel-bio-text'; bt.textContent=player.text;
      hover.appendChild(bn); hover.appendChild(bt);
    }
    const playBtn = document.createElement('button');
    playBtn.className='play-btn';
    playBtn.innerHTML = '<span class="tri">&#9654;</span> Play';
    playBtn.setAttribute('aria-label', 'Play ' + game.title + ' — ' + p.role);
    playBtn.onclick = () => openOverlay(game, p);
    hover.appendChild(playBtn);
    frame.appendChild(hover);

    const cap = document.createElement('div'); cap.className='panel-caption'; cap.textContent=p.caption;
    wrap.appendChild(lr); wrap.appendChild(frame); wrap.appendChild(cap);
    panelGrid.appendChild(wrap);
    canvasDefs.push({ canvas:cv, cfgType:p.cfgType, flipped:p.flipped, baseShowW:p.showW, baseShowB:p.showB, panelDef:p });
  });
  plate.appendChild(panelGrid);

  // Toggles — affect X and line visibility on all panels
  const state = { w:true, b:true };
  const trow = document.createElement('div'); trow.className='toggle-row'; trow.dataset.reveal = '';
  const tlbl = document.createElement('span'); tlbl.className='toggle-label'; tlbl.textContent='Show:';
  const wBtn = document.createElement('button'); wBtn.className='tog'; wBtn.textContent=game.white;
  const bBtn = document.createElement('button'); bBtn.className='tog'; bBtn.textContent=game.black;

  function redrawAll() {
    canvasDefs.forEach(({ canvas, cfgType, flipped, baseShowW, baseShowB }) => {
      const showW = baseShowW && state.w;
      const showB = baseShowB && state.b;
      renderPanel(canvas, cfgType, game.moves, flipped, showW, showB);
    });
  }
  wBtn.onclick = () => { state.w=!state.w; wBtn.classList.toggle('off',!state.w); redrawAll(); };
  bBtn.onclick = () => { state.b=!state.b; bBtn.classList.toggle('off',!state.b); redrawAll(); };

  trow.appendChild(tlbl); trow.appendChild(wBtn); trow.appendChild(bBtn);
  plate.appendChild(trow);
  card.appendChild(plate);

  // Description + material specs
  const body = document.createElement('div'); body.className='card-body';
  const descDiv = document.createElement('div'); descDiv.className='game-desc'; descDiv.textContent=game.desc; descDiv.dataset.reveal = '';
  const matDiv = document.createElement('div'); matDiv.dataset.reveal = '';
  matDiv.innerHTML=`<div class="mat-block-title">Material Specification</div>
    <div class="mat-grid">
      <div><div class="mat-label">Surface</div><div class="mat-value">${game.mat.surface}</div></div>
      <div><div class="mat-label">Finish</div><div class="mat-value">${game.mat.finish}</div></div>
      <div><div class="mat-label">Line</div><div class="mat-value">${game.mat.line}</div></div>
      <div><div class="mat-label">Nodes</div><div class="mat-value">${game.mat.nodes}</div></div>
    </div>
    <div class="mat-note">${game.note}</div>`;
  body.appendChild(descDiv); body.appendChild(matDiv);
  wall.appendChild(body);

  // PGN
  const pgn = document.createElement('div'); pgn.className='pgn-block'; pgn.dataset.reveal = '';
  pgn.innerHTML=`<div class="pgn-title">Game Notation</div><div class="pgn-text">${game.pgn}</div>`;
  wall.appendChild(pgn);

  // Historical context (player bios now surface on panel hover)
  if (bio) {
    const bioBlock = document.createElement('div'); bioBlock.className='bio-block';

    // Context column
    const contextCol = document.createElement('div'); contextCol.dataset.reveal = '';
    const contextTitle = document.createElement('div'); contextTitle.className='bio-section-title'; contextTitle.textContent='Historical Setting';
    const contextText = document.createElement('div'); contextText.className='bio-context-text'; contextText.textContent=bio.context;
    const pivotText = document.createElement('div'); pivotText.className='bio-pivot'; pivotText.textContent=bio.pivot;
    contextCol.appendChild(contextTitle);
    contextCol.appendChild(contextText);
    contextCol.appendChild(pivotText);

    bioBlock.appendChild(contextCol);
    wall.appendChild(bioBlock);

    // Why this game matters — full width below
    if (bio.why) {
      const whyTitle = document.createElement('div'); whyTitle.className='bio-why-title'; whyTitle.textContent='Why This Game'; whyTitle.dataset.reveal = '';
      const whyText = document.createElement('div'); whyText.className='bio-why'; whyText.textContent=bio.why; whyText.dataset.reveal = '';
      wall.appendChild(whyTitle);
      wall.appendChild(whyText);
    }
  }

  card.appendChild(wall);
  gallery.appendChild(card);

  // Initial draw
  canvasDefs.forEach(({ canvas, cfgType, flipped, baseShowW, baseShowB }) => {
    renderPanel(canvas, cfgType, game.moves, flipped, baseShowW, baseShowB);
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
    a.href = '#work-' + g.index;
    a.innerHTML = `<div class="index-num">${g.index}</div>` +
      `<div class="index-main"><div class="index-title">${g.title}</div>` +
      `<div class="index-players">${g.white} vs. ${g.black}</div></div>` +
      `<div class="index-era">${era}</div>` +
      `<div class="index-year">${year}</div>`;
    indexList.appendChild(a);
  });
}
