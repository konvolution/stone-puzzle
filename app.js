'use strict';

// ── Constants ──────────────────────────────────────────────────────────────
const STONE_COUNT = 5;
const TOTAL       = STONE_COUNT * 2 + 1;
const EMPTY       = 'empty';
const GREEN       = 'green';
const YELLOW      = 'yellow';

// ── State ──────────────────────────────────────────────────────────────────
let board   = [];
let history = [];
let moves   = 0;

// ── DOM refs ───────────────────────────────────────────────────────────────
const boardEl      = document.getElementById('board');
const messageEl    = document.getElementById('message');
const moveCountEl  = document.getElementById('move-count');
const btnUndo      = document.getElementById('btn-undo');
const btnReset     = document.getElementById('btn-reset');
const modalOverlay = document.getElementById('modal-overlay');
const btnConfirm   = document.getElementById('btn-confirm-reset');
const btnCancel    = document.getElementById('btn-cancel-reset');
const canvas       = document.getElementById('particles');
const ctx2d        = canvas.getContext('2d');

// ── Audio ──────────────────────────────────────────────────────────────────
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playSlide() {
  try {
    const ac  = getAudioCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ac.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
    osc.start(); osc.stop(ac.currentTime + 0.15);
  } catch (_) {}
}

function playLeap() {
  try {
    const ac  = getAudioCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, ac.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(220, ac.currentTime + 0.22);
    gain.gain.setValueAtTime(0.3, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25);
    osc.start(); osc.stop(ac.currentTime + 0.25);
  } catch (_) {}
}

function playWin() {
  try {
    const ac = getAudioCtx();
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'triangle';
      const t = ac.currentTime + i * 0.13;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t); osc.stop(t + 0.42);
    });
  } catch (_) {}
}

// ── Particles ──────────────────────────────────────────────────────────────
const COLORS = ['#2ecc40','#ffd700','#e67e22','#fff','#ff6b6b','#74b9ff'];
let particles = [];
let rafId = null;

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

function spawnParticles() {
  resizeCanvas();
  particles = [];
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;
  for (let i = 0; i < 120; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 8;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      r: 5 + Math.random() * 7,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.2,
      square: Math.random() > 0.5,
    });
  }
  if (rafId) cancelAnimationFrame(rafId);
  animateParticles();
}

function animateParticles() {
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  let alive = false;
  particles.forEach(p => {
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.25; // gravity
    p.vx *= 0.98;
    p.alpha -= 0.013;
    p.rot += p.rotV;
    if (p.alpha <= 0) return;
    alive = true;
    ctx2d.save();
    ctx2d.globalAlpha = Math.max(0, p.alpha);
    ctx2d.translate(p.x, p.y);
    ctx2d.rotate(p.rot);
    ctx2d.fillStyle = p.color;
    if (p.square) {
      ctx2d.fillRect(-p.r / 2, -p.r / 2, p.r, p.r);
    } else {
      ctx2d.beginPath();
      ctx2d.arc(0, 0, p.r / 2, 0, Math.PI * 2);
      ctx2d.fill();
    }
    ctx2d.restore();
  });
  if (alive) rafId = requestAnimationFrame(animateParticles);
  else ctx2d.clearRect(0, 0, canvas.width, canvas.height);
}

// ── Init ───────────────────────────────────────────────────────────────────
function makeInitialBoard() {
  const b = [];
  for (let i = 0; i < STONE_COUNT; i++) b.push(GREEN);
  b.push(EMPTY);
  for (let i = 0; i < STONE_COUNT; i++) b.push(YELLOW);
  return b;
}

function init() {
  board   = makeInitialBoard();
  history = [];
  moves   = 0;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  render();
}

// ── Win detection ──────────────────────────────────────────────────────────
function isWin() {
  for (let i = 0; i < STONE_COUNT; i++) {
    if (board[i] !== YELLOW) return false;
  }
  if (board[STONE_COUNT] !== EMPTY) return false;
  for (let i = STONE_COUNT + 1; i < TOTAL; i++) {
    if (board[i] !== GREEN) return false;
  }
  return true;
}

// ── Move logic ─────────────────────────────────────────────────────────────
function getTargets(idx) {
  const color = board[idx];
  if (color === EMPTY) return [];

  const dirs    = color === GREEN ? [1, 2] : [-1, -2];
  const targets = [];
  const step1   = idx + dirs[0];
  const step2   = idx + dirs[1];

  if (step1 >= 0 && step1 < TOTAL && board[step1] === EMPTY) {
    targets.push(step1);
  }

  const opposite = color === GREEN ? YELLOW : GREEN;
  if (
    step1 >= 0 && step1 < TOTAL && board[step1] === opposite &&
    step2 >= 0 && step2 < TOTAL && board[step2] === EMPTY
  ) {
    targets.push(step2);
  }

  return targets;
}

function getMovableIndices() {
  return board.reduce((acc, color, idx) => {
    if (color !== EMPTY && getTargets(idx).length > 0) acc.push(idx);
    return acc;
  }, []);
}

function applyMove(from, to) {
  history.push([...board]);
  board[to]   = board[from];
  board[from] = EMPTY;
  moves++;
}

// ── Interaction ────────────────────────────────────────────────────────────
function handleCellClick(idx) {
  if (isWin()) return;
  if (board[idx] === EMPTY) return;

  const targets = getTargets(idx);
  if (targets.length === 0) return;

  const isLeap = Math.abs(targets[0] - idx) === 2;
  applyMove(idx, targets[0]);

  if (isLeap) playLeap(); else playSlide();

  render(targets[0]); // pass destination for pop animation

  if (isWin()) {
    messageEl.textContent = '🎉 Puzzle solved!';
    messageEl.className   = 'win';
    playWin();
    spawnParticles();
  }
}

// ── Render ─────────────────────────────────────────────────────────────────
function render(animateIdx = -1) {
  boardEl.innerHTML = '';

  const movable = isWin() ? [] : getMovableIndices();

  board.forEach((color, idx) => {
    const cell = document.createElement('div');
    cell.className = 'cell';

    if (color !== EMPTY) {
      cell.classList.add(color);
      if (movable.includes(idx)) cell.classList.add('movable');
      if (idx === animateIdx)    cell.classList.add('pop');
    } else {
      cell.classList.add('empty');
    }

    cell.setAttribute('role', 'button');
    cell.setAttribute('aria-label', `Cell ${idx + 1}: ${color}`);
    cell.addEventListener('click', () => handleCellClick(idx));

    boardEl.appendChild(cell);
  });

  moveCountEl.textContent = moves;
  btnUndo.disabled        = history.length === 0;

  if (!isWin() && messageEl.classList.contains('win')) {
    messageEl.textContent = '';
    messageEl.className   = '';
  }
}

// ── Undo ───────────────────────────────────────────────────────────────────
btnUndo.addEventListener('click', () => {
  if (history.length === 0) return;
  board   = history.pop();
  moves   = Math.max(0, moves - 1);
  messageEl.textContent = '';
  messageEl.className   = '';
  render();
});

// ── Reset ──────────────────────────────────────────────────────────────────
btnReset.addEventListener('click', () => {
  modalOverlay.classList.remove('hidden');
  btnConfirm.focus();
});
btnConfirm.addEventListener('click', () => {
  modalOverlay.classList.add('hidden');
  messageEl.textContent = '';
  messageEl.className   = '';
  init();
});
btnCancel.addEventListener('click', () => modalOverlay.classList.add('hidden'));
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') modalOverlay.classList.add('hidden');
});

// ── Service Worker ─────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
init();
