import { games, isDark } from './data.js';
import { getPulse } from './board.js';

// ── Exhibition shell ──────────────────────────────────

const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const topbar = document.getElementById('topbar');

// Left rail: the work numbers 01–11, echoing the index table's numbering so
// stepping from the index into a game feels seamless. Only shown on the works.
const worksRail = document.getElementById('works-rail');
const railLinks = [];
if (worksRail) {
  games.forEach(g => {
    const a = document.createElement('a');
    a.className = 'wr-num';
    a.href = '#work-' + g.index;
    a.textContent = g.index;
    a.title = g.title;
    a.setAttribute('aria-label', 'Work ' + g.index + ' — ' + g.title);
    worksRail.appendChild(a);
    railLinks.push(a);
  });
}
// ── Horizontal slideshow deck ─────────────────────────
const deck = document.getElementById('deck');
const deckControls = document.getElementById('deck-controls');
const prevBtn = document.getElementById('deck-prev');
const nextBtn = document.getElementById('deck-next');
const progressEl = document.getElementById('deck-progress');
const pad2 = n => String(n).padStart(2, '0');
const panels = () => Array.from(document.querySelectorAll('.slide'));
let deckIndex = 0;

function updateDeckUI() {
  const total = panels().length;
  deckIndex = Math.max(0, Math.min(total - 1, Math.round(deck.scrollLeft / window.innerWidth)));
  if (progressEl) progressEl.textContent = pad2(deckIndex + 1) + ' / ' + pad2(total);
  if (prevBtn) prevBtn.disabled = deckIndex <= 0;
  if (nextBtn) nextBtn.disabled = deckIndex >= total - 1;
  if (deckControls) deckControls.classList.add('on');
  topbar.classList.toggle('on', deckIndex > 0);
  updateRail();
}

// Show the left rail only within the works, and mark the current game
function updateRail() {
  if (!worksRail) return;
  const active = onWorks();
  worksRail.classList.toggle('on', active);
  if (active && railLinks.length) {
    const ci = sectionIndex();
    railLinks.forEach((a, i) => a.classList.toggle('active', i === ci));
  }
}

function goToDeck(i) {
  const p = panels();
  i = Math.max(0, Math.min(p.length - 1, i));
  p[i].scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', inline: 'start', block: 'nearest' });
}

// ── The works: a vertical stack of games, each paging right for details ──
const worksSlide = document.getElementById('gallery');
const sectionsOf = () => worksSlide ? Array.from(worksSlide.querySelectorAll('.game-section')) : [];
// Which deck slide sits in the viewport right now (geometry, not the async index)
const deckIndexNow = () => (deck ? Math.round(deck.scrollLeft / window.innerWidth) : 0);
const onWorks = () => {
  if (!worksSlide) return false;
  const r = worksSlide.getBoundingClientRect();
  const c = window.innerWidth / 2;
  return r.left <= c && r.right > c;
};
const sectionIndex = () => {
  const s = sectionsOf();
  if (!s.length || !worksSlide) return 0;
  return Math.max(0, Math.min(s.length - 1, Math.round(worksSlide.scrollTop / worksSlide.clientHeight)));
};
function goToSection(i) {
  const s = sectionsOf();
  if (!s.length || !worksSlide) return;
  i = Math.max(0, Math.min(s.length - 1, i));
  worksSlide.scrollTo({ top: i * worksSlide.clientHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
}
const pagerOf = sec => sec && sec.querySelector('.game-pager');
const detailIsOpen = pager => !!pager && pager.scrollLeft > pager.clientWidth * 0.5;
function openDetail(sec) { const p = pagerOf(sec); if (p) p.scrollTo({ left: p.clientWidth, behavior: reducedMotion ? 'auto' : 'smooth' }); }
function closeDetail(sec) { const p = pagerOf(sec); if (p) p.scrollTo({ left: 0, behavior: reducedMotion ? 'auto' : 'smooth' }); }

// Flag each pager when its detail pane is showing, so the cards can ease in
sectionsOf().forEach(sec => {
  const p = pagerOf(sec);
  if (!p) return;
  let tick = false;
  p.addEventListener('scroll', () => {
    if (tick) return; tick = true;
    requestAnimationFrame(() => { p.classList.toggle('at-detail', p.scrollLeft > p.clientWidth * 0.12); tick = false; });
  }, { passive: true });
});

// Reserve a left gutter on the works panes so the rail never sits on the boards,
// and keep the rail's active number in step with vertical scrolling between games
if (worksSlide && worksRail) {
  worksSlide.classList.add('rail-space');
  let wtick = false;
  worksSlide.addEventListener('scroll', () => {
    if (wtick) return; wtick = true;
    requestAnimationFrame(() => { updateRail(); wtick = false; });
  }, { passive: true });
}

if (deck) {
  let dtick = false;
  deck.addEventListener('scroll', () => {
    if (dtick) return; dtick = true;
    requestAnimationFrame(() => { updateDeckUI(); dtick = false; });
  }, { passive: true });

  if (prevBtn) prevBtn.onclick = () => goToDeck(deckIndexNow() - 1);
  if (nextBtn) nextBtn.onclick = () => goToDeck(deckIndexNow() + 1);

  const playAlong = document.getElementById('play-along');
  if (playAlong) playAlong.onclick = () => goToDeck(deckIndexNow() + 1);

  document.addEventListener('keydown', e => {
    if (document.getElementById('watch-overlay')) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    // Within the works: up/down move between games, right/left open/close details
    if (onWorks()) {
      const sec = sectionsOf()[sectionIndex()];
      const open = detailIsOpen(pagerOf(sec));
      const di = deckIndexNow();
      if (e.key === 'ArrowRight') { e.preventDefault(); if (!open) openDetail(sec); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); if (open) closeDetail(sec); else goToDeck(di - 1); return; }
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        const ci = sectionIndex();
        if (ci < sectionsOf().length - 1) goToSection(ci + 1); else goToDeck(di + 1);
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        const ci = sectionIndex();
        if (ci > 0) goToSection(ci - 1); else goToDeck(di - 1);
        return;
      }
      if (e.key === 'Home') { e.preventDefault(); goToDeck(0); return; }
      if (e.key === 'End') { e.preventDefault(); goToDeck(panels().length - 1); return; }
      return;
    }

    const di = deckIndexNow();
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goToDeck(di + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goToDeck(di - 1); }
    else if (e.key === 'Home') { e.preventDefault(); goToDeck(0); }
    else if (e.key === 'End') { e.preventDefault(); goToDeck(panels().length - 1); }
  });

  // Vertical wheel advances slides, unless the current slide has room to scroll vertically
  let wheelLock = false;
  deck.addEventListener('wheel', e => {
    if (document.getElementById('watch-overlay')) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const slide = panels()[deckIndexNow()];
    if (slide && slide.scrollHeight > slide.clientHeight + 2) {
      const atTop = slide.scrollTop <= 0;
      const atBottom = slide.scrollTop + slide.clientHeight >= slide.scrollHeight - 2;
      if (!((e.deltaY > 0 && atBottom) || (e.deltaY < 0 && atTop))) return;
    }
    if (Math.abs(e.deltaY) < 6) return;
    e.preventDefault();
    if (wheelLock) return;
    wheelLock = true;
    goToDeck(deckIndexNow() + (e.deltaY > 0 ? 1 : -1));
    setTimeout(() => { wheelLock = false; }, 620);
  }, { passive: false });

  updateDeckUI();
}

// In-page anchors move the deck horizontally
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    const target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', inline: 'start', block: 'start' });
  });
});

// Reveal on scroll — each .reveal root staggers its [data-reveal] items in
const revealRoots = document.querySelectorAll('.reveal');
const STAGGER = 0.085;      // seconds between items
const MAX_DELAY = 0.9;      // cap so long lists never drag
const WORD_STAGGER = 0.045; // seconds between words in a word-reveal headline

// Wrap each word of an element in a span so it can fade in on its own,
// preserving inline markup (e.g. <em>) and attaching trailing punctuation.
function splitIntoWords(el) {
  const frag = document.createDocumentFragment();
  const words = [];
  const isPunct = s => /^[.,;:!?'")\]}]+$/.test(s);
  Array.from(el.childNodes).forEach(node => {
    if (node.nodeType === 3) {
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        if (isPunct(part) && words.length) { words[words.length - 1].appendChild(document.createTextNode(part)); return; }
        const s = document.createElement('span'); s.className = 'rv-word'; s.textContent = part;
        frag.appendChild(s); words.push(s);
      });
    } else if (node.nodeType === 1) {
      const s = document.createElement('span'); s.className = 'rv-word';
      s.appendChild(node.cloneNode(true));
      frag.appendChild(s); words.push(s);
    }
  });
  el.innerHTML = '';
  el.appendChild(frag);
  return words;
}

function revealItems(root) {
  const items = Array.from(root.querySelectorAll('[data-reveal]'));
  const list = items.length ? items : (root.hasAttribute('data-reveal') ? [root] : []);

  // Default: stagger each item by its index
  if (!list.some(el => el.dataset.reveal === 'words')) {
    list.forEach((el, i) => {
      el.style.setProperty('--rv-delay', Math.min(i * STAGGER, MAX_DELAY) + 's');
      el.classList.add('in');
    });
    return;
  }

  // Coordinated sequence: label, then the headline word by word, then paragraphs.
  // A "scale" item (the board) eases in up front, in parallel with the text.
  let t = 0;
  list.forEach(el => {
    const kind = el.dataset.reveal;
    if (kind === 'words') {
      const words = splitIntoWords(el);
      el.classList.add('in');
      const base = t;
      // Drive each word with the Web Animations API — CSS transitions are
      // unreliable on freshly-created nodes (the browser skips the start frame).
      words.forEach((w, wi) => {
        w.classList.add('in'); // resting state / fallback if WAAPI is unavailable
        if (typeof w.animate === 'function') {
          w.animate(
            [
              { opacity: 0, transform: 'translateY(0.44em)', filter: 'blur(4px)' },
              { opacity: 1, transform: 'none', filter: 'none' }
            ],
            { duration: 720, delay: Math.round((base + wi * WORD_STAGGER) * 1000),
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
          );
        }
      });
      t += Math.max(0, words.length - 1) * WORD_STAGGER + 0.45;
    } else if (kind === 'scale') {
      el.style.setProperty('--rv-delay', '0.1s');
      el.classList.add('in');
    } else {
      el.style.setProperty('--rv-delay', t.toFixed(3) + 's');
      el.classList.add('in');
      t += 0.16;
    }
  });
}

if (reducedMotion || !('IntersectionObserver' in window)) {
  revealRoots.forEach(root => root.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in')));
} else {
  const ro = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { revealItems(e.target); ro.unobserve(e.target); }
    });
  }, { threshold: 0.25 });
  revealRoots.forEach(el => ro.observe(el));
}

// Splash canvas: the eleven games draw themselves, one after another
(function () {
  const cv = document.getElementById('splash-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const splash = document.getElementById('top');
  const ink = isDark ? '236,233,226' : '25,24,19';
  let W = 0, H = 0, geo = null;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    W = splash.clientWidth; H = splash.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const size = Math.max(W, H) * 1.12;
    geo = { cell: size / 8, ox: (W - size) / 2, oy: (H - size) / 2 };
  }
  resize();
  window.addEventListener('resize', () => { resize(); paint(); });

  function pt(name) {
    const file = name.charCodeAt(0) - 97, rank = parseInt(name[1]) - 1;
    return { x: geo.ox + file * geo.cell + geo.cell / 2, y: geo.oy + (7 - rank) * geo.cell + geo.cell / 2 };
  }

  let gi = 0, step = 0;
  function paint() {
    ctx.clearRect(0, 0, W, H);
    const pulse = getPulse();
    const moves = games[gi].moves;
    const shown = moves.slice(0, step);
    shown.forEach(([from, to, isW, isCap], i) => {
      if (!to) return;
      const a = pt(from), b = pt(to);
      const age = i / Math.max(1, shown.length - 1);
      const alpha = (0.05 + age * 0.13) * pulse;
      ctx.strokeStyle = `rgba(${ink},${alpha})`;
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.fillStyle = `rgba(${ink},${alpha * 0.7})`;
      ctx.beginPath(); ctx.arc(b.x, b.y, 2.2, 0, Math.PI * 2); ctx.fill();
      if (isCap) {
        const s = geo.cell * 0.09;
        ctx.strokeStyle = 'rgba(192,57,43,' + (0.1 + age * 0.2) + ')';
        ctx.beginPath(); ctx.moveTo(b.x - s, b.y - s); ctx.lineTo(b.x + s, b.y + s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b.x + s, b.y - s); ctx.lineTo(b.x - s, b.y + s); ctx.stroke();
      }
    });
  }

  if (reducedMotion) {
    step = games[0].moves.length;
    paint();
    cv.classList.add('lit');
    return;
  }

  let splashVisible = true;
  new IntersectionObserver(es => { splashVisible = es[0].isIntersecting; }).observe(splash);

  let timer = null;
  function tick() {
    if (!splashVisible) return; // paused; resumes on next interval
    if (step < games[gi].moves.length) {
      step++;
      paint();
    } else {
      clearInterval(timer);
      setTimeout(() => {
        cv.classList.remove('lit');
        setTimeout(() => {
          gi = (gi + 1) % games.length;
          step = 0;
          paint();
          cv.classList.add('lit');
          timer = setInterval(tick, 260);
        }, 2500);
      }, 4200);
    }
  }
  setTimeout(() => {
    cv.classList.add('lit');
    timer = setInterval(tick, 260);
  }, 900);

  // Repaint on the shared pulse cadence too, so the lines keep breathing
  // even while a game lingers finished or between games.
  setInterval(() => { if (splashVisible) paint(); }, 80);
})();
