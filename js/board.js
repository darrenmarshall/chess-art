import { CONFIGS, RED } from './data.js';

export function sq(n, M, CELL, flipped) {
  const file = n.charCodeAt(0) - 97, rank = parseInt(n[1]) - 1;
  const df = flipped ? 7-file : file, dr = flipped ? rank : 7-rank;
  return { x: M + df*CELL + CELL/2, y: M + dr*CELL + CELL/2 };
}

export function drawBoard(ctx, S, cfg) {
  const M = Math.round(S*0.06), CELL = (S - M*2) / 8;
  ctx.clearRect(0,0,S,S); ctx.fillStyle = cfg.bg; ctx.fillRect(0,0,S,S);
  for (let i = 0; i <= 8; i++) {
    const x = M+i*CELL, y = M+i*CELL;
    ctx.strokeStyle = (i===0||i===8) ? cfg.gridBold : cfg.gridLight;
    ctx.lineWidth = (i===0||i===8) ? 0.7 : 0.3;
    ctx.beginPath(); ctx.moveTo(x,M); ctx.lineTo(x,M+8*CELL); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(M,y); ctx.lineTo(M+8*CELL,y); ctx.stroke();
  }
  return { M, CELL };
}

export function drawLines(ctx, S, M, CELL, moves, cfg, flipped, showW, showB) {
  const wm = moves.filter(m=>m[2]===true), bm = moves.filter(m=>m[2]===false);
  [[wm,cfg.lineW,showW],[bm,cfg.lineB,showB]].forEach(([ms,color,show]) => {
    if (!show) return;
    ms.forEach(([from,to,,],i) => {
      if (!to) return;
      const a = sq(from,M,CELL,flipped), b = sq(to,M,CELL,flipped);
      const op = 0.16 + (i/ms.length)*0.65;
      ctx.save(); ctx.globalAlpha=op; ctx.strokeStyle=color; ctx.lineWidth=S/620; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.globalAlpha=op*0.5; ctx.fillStyle=color;
      ctx.beginPath(); ctx.arc(b.x,b.y,S/380,0,Math.PI*2); ctx.fill(); ctx.restore();
    });
  });
}

export function drawCaptures(ctx, S, M, CELL, moves, flipped, showW, showB) {
  // X only on destination of shown capture moves — guaranteed to coincide with a line endpoint
  const seen = new Set();
  moves.forEach(([from,to,isW,isCapture]) => {
    if (!isCapture || !to) return;
    if (isW && !showW) return;
    if (!isW && !showB) return;
    if (seen.has(to)) return;
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

export function renderPanel(canvas, cfgType, moves, flipped, showW, showB) {
  const S = canvas.width, cfg = CONFIGS[cfgType], ctx = canvas.getContext('2d');
  const { M, CELL } = drawBoard(ctx, S, cfg);
  drawLines(ctx, S, M, CELL, moves, cfg, flipped, showW, showB);
  drawCaptures(ctx, S, M, CELL, moves, flipped, showW, showB);
}
