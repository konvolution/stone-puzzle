'use strict';

// ── Constants ──────────────────────────────────────────────────────────────
const STONE_COUNT = 5; // stones per colour
const TOTAL       = STONE_COUNT * 2 + 1;
const EMPTY       = 'empty';
const GREEN       = 'green';
const YELLOW      = 'yellow';

// ── State ──────────────────────────────────────────────────────────────────
let board    = [];   // current positions
let history  = [];   // stack of previous board snapshots
let moves    = 0;
let selected = null; // index of currently selected stone

// ── DOM refs ───────────────────────────────────────────────────────────────
const boardEl       = document.getElementById('board');
const messageEl     = document.getElementById('message');
const moveCountEl   = document.getElementById('move-count');
const btnUndo       = document.getElementById('btn-undo');
const btnReset      = document.getElementById('btn-reset');
const modalOverlay  = document.getElementById('modal-overlay');
const btnConfirm    = document.getElementById('btn-confirm-reset');
const btnCancel     = document.getElementById('btn-cancel-reset');

// ── Init ───────────────────────────────────────────────────────────────────
function makeInitialBoard() {
  const b = [];
  for (let i = 0; i < STONE_COUNT; i++) b.push(GREEN);
  b.push(EMPTY);
  for (let i = 0; i < STONE_COUNT; i++) b.push(YELLOW);
  return b;
}

function init() {
  board    = makeInitialBoard();
  history  = [];
  moves    = 0;
  selected = null;
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
/**
 * Return all valid target indices for a stone at `idx`.
 * Green moves right (+1, +2), Yellow moves left (-1, -2).
 */
function getTargets(idx) {
  const color = board[idx];
  if (color === EMPTY) return [];

  const dirs    = color === GREEN ? [1, 2] : [-1, -2];
  const targets = [];

  const step1 = idx + dirs[0];
  const step2 = idx + dirs[1];

  // Slide: adjacent cell must be empty
  if (step1 >= 0 && step1 < TOTAL && board[step1] === EMPTY) {
    targets.push(step1);
  }

  // Leap: adjacent cell is the OPPOSITE color, and landing is empty
  const opposite = color === GREEN ? YELLOW : GREEN;
  if (
    step1 >= 0 && step1 < TOTAL && board[step1] === opposite &&
    step2 >= 0 && step2 < TOTAL && board[step2] === EMPTY
  ) {
    targets.push(step2);
  }

  return targets;
}

/** All stones that have at least one valid move */
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

  const movable = getMovableIndices();

  if (selected === null) {
    // Select a movable stone
    if (board[idx] !== EMPTY && movable.includes(idx)) {
      selected = idx;
      render();
    }
    return;
  }

  // A stone is already selected
  if (idx === selected) {
    // Deselect
    selected = null;
    render();
    return;
  }

  const targets = getTargets(selected);

  if (targets.includes(idx)) {
    // Valid move
    applyMove(selected, idx);
    selected = null;
    render();

    if (isWin()) {
      messageEl.textContent = '🎉 Puzzle solved!';
      messageEl.className   = 'win';
    }
    return;
  }

  // Clicked a different movable stone — switch selection
  if (board[idx] !== EMPTY && movable.includes(idx)) {
    selected = idx;
    render();
    return;
  }

  // Invalid click — deselect
  selected = null;
  render();
}

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
  boardEl.innerHTML = '';

  const movable = isWin() ? [] : getMovableIndices();
  const targets  = selected !== null ? getTargets(selected) : [];

  board.forEach((color, idx) => {
    const cell = document.createElement('div');
    cell.className = 'cell';

    if (color !== EMPTY) {
      cell.classList.add(color);
      if (idx === selected)           cell.classList.add('selected');
      else if (movable.includes(idx)) cell.classList.add('movable');
    } else {
      cell.classList.add('empty');
      if (targets.includes(idx))      cell.classList.add('target');
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
  board    = history.pop();
  moves    = Math.max(0, moves - 1);
  selected = null;
  messageEl.textContent = '';
  messageEl.className   = '';
  render();
});

// ── Reset (with confirmation) ───────────────────────────────────────────────
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
btnCancel.addEventListener('click', () => {
  modalOverlay.classList.add('hidden');
});
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') modalOverlay.classList.add('hidden');
});

// ── Service Worker registration ────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ── Start ──────────────────────────────────────────────────────────────────
init();
