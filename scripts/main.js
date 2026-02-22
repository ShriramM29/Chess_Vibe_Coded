/**
 * WebChess Pro — Main Application (main.js)
 * Orchestrates all modules: engine, AI, board, timers, UI, storage,
 * puzzles, analysis, PGN/FEN I/O.
 */

'use strict';

/* =================================================================
   SOUND ENGINE (Web Audio API — generates sounds procedurally)
   ================================================================= */
class SoundEngine {
  constructor() {
    this._ctx = null;
    this.enabled = true;
  }

  _getCtx() {
    if (!this._ctx) {
      try { this._ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    }
    return this._ctx;
  }

  _play(fn) {
    if (!this.enabled) return;
    try {
      const ctx = this._getCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      fn(ctx);
    } catch {}
  }

  _beep(freq, dur, type = 'sine', gain = 0.4) {
    this._play(ctx => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + dur);
    });
  }

  move()       { this._beep(440, 0.08, 'square', 0.15); }
  capture()    { this._beep(280, 0.12, 'sawtooth', 0.2); }
  check()      { this._beep(880, 0.15, 'sine', 0.3); setTimeout(() => this._beep(1100, 0.15, 'sine', 0.25), 120); }
  castling()   { this._beep(523, 0.1, 'sine', 0.2); setTimeout(() => this._beep(659, 0.15, 'sine', 0.15), 80); }
  gameOver()   { [0,80,160].forEach((d,i) => setTimeout(() => this._beep(523 - i*60, 0.25, 'triangle', 0.3), d)); }
  error()      { this._beep(200, 0.1, 'sawtooth', 0.15); }
  correct()    { this._beep(660, 0.12, 'sine', 0.25); setTimeout(() => this._beep(880, 0.18, 'sine', 0.2), 100); }
  wrong()      { this._beep(220, 0.18, 'sawtooth', 0.2); }
  notify()     { this._beep(740, 0.08, 'sine', 0.2); }
}

/* =================================================================
   APP STATE
   ================================================================= */
const App = {
  engine:   new ChessEngine(),
  ai:       new ChessAI(),
  board:    null,
  timer:    null,
  ui:       new UIManager(),
  sound:    new SoundEngine(),
  puzzle:   new PuzzleManager(),
  analysis: null,

  mode:     'pvp',      // 'pvp' | 'pvai' | 'puzzle' | 'analysis'
  aiColor:  'b',        // which color the AI plays
  pendingPromotion: null,
  aiThinking: false,
  prefs: StorageManager.getPrefs(),

  // Game config
  gameConfig: {
    mode:    'pvp',
    aiDepth: 3,
    playerColor: 'w',
    timeSeconds: 600,
    increment: 0,
    whiteName: 'White',
    blackName: 'Black'
  }
};

/* =================================================================
   INIT
   ================================================================= */
document.addEventListener('DOMContentLoaded', () => {
  // Build board
  App.board = new BoardRenderer('chessboard', {
    showCoords:     App.prefs.showCoords !== false,
    highlightMoves: App.prefs.highlightMoves !== false,
    highlightLast:  App.prefs.highlightLast !== false,
    animate:        App.prefs.animate !== false
  });

  // Build timer
  App.timer = new ChessTimer(
    times => App.ui.updateTimers(times, App.timer.enabled),
    flagColor => App._onTimerFlag(flagColor)
  );

  // Apply prefs
  App.ui.applyPrefs(App.prefs, App.board);

  // Bind callbacks
  App.board.onSquareClick = sq => App._onSquareClick(sq);
  App.board.onDrop        = (from, to) => App._onDrop(from, to);

  // Bind all buttons
  _bindUI();

  // Start a default game
  App._startNewGame({ mode: 'pvp', timeSeconds: 600, increment: 0 });

  // Load saved prefs into settings modal
  _loadPrefsIntoModal();
});

/* =================================================================
   BIND UI ELEMENTS
   ================================================================= */
function _bindUI() {
  // Nav mode buttons
  document.getElementById('btn-mode-pvp')?.addEventListener('click',      () => _openNewGameModal('pvp'));
  document.getElementById('btn-mode-pvai')?.addEventListener('click',     () => _openNewGameModal('pvai'));
  document.getElementById('btn-mode-puzzle')?.addEventListener('click',   () => App._enterPuzzleMode());
  document.getElementById('btn-mode-analysis')?.addEventListener('click', () => App._enterAnalysisMode());

  // Game controls
  document.getElementById('btn-new-game')?.addEventListener('click',   () => App.ui.openModal('modal-new-game'));
  document.getElementById('btn-resign')?.addEventListener('click',     () => App._resign());
  document.getElementById('btn-draw')?.addEventListener('click',       () => App._offerDraw());
  document.getElementById('btn-undo')?.addEventListener('click',       () => App._undo());
  document.getElementById('btn-flip-board')?.addEventListener('click', () => App._flipBoard());
  document.getElementById('btn-hint')?.addEventListener('click',       () => App._showHint());

  // Header buttons
  document.getElementById('btn-stats')?.addEventListener('click', () => { App.ui.renderStats(); App.ui.openModal('modal-stats'); });
  document.getElementById('btn-settings')?.addEventListener('click', () => App.ui.openModal('modal-settings'));
  document.getElementById('btn-sound')?.addEventListener('click', () => {
    App.prefs.sound = !App.prefs.sound;
    App.sound.enabled = App.prefs.sound;
    StorageManager.savePrefs(App.prefs);
    const btn = document.getElementById('btn-sound');
    if (btn) { btn.textContent = App.prefs.sound ? '🔊' : '🔇'; btn.classList.toggle('active', App.prefs.sound); }
    document.getElementById('opt-sound').checked = App.prefs.sound;
  });

  // New game modal
  document.getElementById('btn-start-game')?.addEventListener('click', () => {
    const mode = document.querySelector('input[name="game-mode"]:checked')?.value || 'pvp';
    const aiDepth = parseInt(document.getElementById('ai-difficulty')?.value || '3');
    const pColor = document.querySelector('input[name="player-color"]:checked')?.value || 'white';
    const timeMin = parseFloat(document.getElementById('custom-time-min')?.value || '10');
    const timeInc = parseInt(document.getElementById('custom-time-inc')?.value || '0');
    const wName = document.getElementById('player-white-name-input')?.value || 'White';
    const bName = document.getElementById('player-black-name-input')?.value || 'Black';
    App.ui.closeModal('modal-new-game');
    App._startNewGame({
      mode,
      aiDepth,
      playerColor: pColor === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : pColor[0],
      timeSeconds: Math.round(timeMin * 60),
      increment:   timeInc,
      whiteName:   mode === 'pvai' ? (pColor[0] === 'w' ? 'You' : 'AI') : wName,
      blackName:   mode === 'pvai' ? (pColor[0] === 'b' ? 'You' : 'AI') : bName
    });
  });

  // AI options toggle
  document.querySelectorAll('input[name="game-mode"]').forEach(r =>
    r.addEventListener('change', () => {
      const isAI = document.querySelector('input[name="game-mode"]:checked')?.value === 'pvai';
      const aiOpts = document.getElementById('ai-options');
      if (aiOpts) aiOpts.style.display = isAI ? 'block' : 'none';
    })
  );

  // Time preset buttons
  document.querySelectorAll('.time-preset-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const t = parseInt(btn.dataset.time);
      const inc = parseInt(btn.dataset.inc || '0');
      const minEl = document.getElementById('custom-time-min');
      const incEl = document.getElementById('custom-time-inc');
      if (minEl) minEl.value = t > 0 ? (t / 60).toFixed(1) : '0';
      if (incEl) incEl.value = inc;
    })
  );

  // Promotion
  document.querySelectorAll('.promo-btn').forEach(btn =>
    btn.addEventListener('click', () => App.ui.resolvePromotion(btn.dataset.piece))
  );

  // Game over
  document.getElementById('btn-review-game')?.addEventListener('click', () => {
    App.ui.closeModal('modal-game-over');
    App._enterAnalysisMode();
  });
  document.getElementById('btn-new-game-after')?.addEventListener('click', () => {
    App.ui.closeModal('modal-game-over');
    App.ui.openModal('modal-new-game');
  });

  // Modal close buttons
  document.querySelectorAll('[data-modal]').forEach(btn =>
    btn.addEventListener('click', () => App.ui.closeModal(btn.dataset.modal))
  );

  // PGN
  document.getElementById('btn-pgn-export')?.addEventListener('click', () => {
    const pgn = PGNManager.export(App.engine, { white: App.gameConfig.whiteName, black: App.gameConfig.blackName });
    const ta = document.getElementById('pgn-textarea');
    if (ta) ta.value = pgn;
    App.ui.toast('PGN exported!', 'success');
  });
  document.getElementById('btn-pgn-import')?.addEventListener('click', () => {
    const ta = document.getElementById('pgn-textarea');
    if (!ta?.value.trim()) { App.ui.toast('Paste PGN first', 'warning'); return; }
    try {
      App.timer.stop();
      const result = PGNManager.import(App.engine, ta.value);
      App.mode = 'analysis';
      App._renderAfterMove(null);
      App.ui.toast(`Imported ${result.applied.length} moves`, 'success');
      App._enterAnalysisMode();
    } catch (e) {
      App.ui.toast('Invalid PGN: ' + e.message, 'error');
      App.sound.error();
    }
  });

  // FEN
  document.getElementById('btn-fen-export')?.addEventListener('click', () => {
    const fen = FENManager.export(App.engine);
    const inp = document.getElementById('fen-input');
    if (inp) inp.value = fen;
    navigator.clipboard?.writeText(fen).catch(() => {});
    App.ui.toast('FEN copied!', 'success');
  });
  document.getElementById('btn-fen-import')?.addEventListener('click', () => {
    const inp = document.getElementById('fen-input');
    if (!inp?.value.trim()) { App.ui.toast('Paste FEN first', 'warning'); return; }
    try {
      App.timer.stop();
      FENManager.import(App.engine, inp.value);
      App.mode = 'pvp';
      App._renderAfterMove(null);
      App.ui.setStatus('Position loaded. White to move.', '');
      App.ui.toast('FEN loaded!', 'success');
    } catch (e) {
      App.ui.toast('Invalid FEN: ' + e.message, 'error');
      App.sound.error();
    }
  });
  document.querySelectorAll('.preset-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      const fen = btn.dataset.fen;
      const inp = document.getElementById('fen-input');
      if (inp) inp.value = fen;
      try {
        App.timer.stop();
        FENManager.import(App.engine, fen);
        App.mode = 'pvp';
        App._renderAfterMove(null);
        App.ui.toast('Position loaded!', 'success');
      } catch (e) {
        App.ui.toast('Error: ' + e.message, 'error');
      }
    })
  );

  // Replay controls
  document.getElementById('btn-goto-start')?.addEventListener('click',  () => App._analysisNav('start'));
  document.getElementById('btn-prev-move')?.addEventListener('click',   () => App._analysisNav('prev'));
  document.getElementById('btn-next-move')?.addEventListener('click',   () => App._analysisNav('next'));
  document.getElementById('btn-goto-end')?.addEventListener('click',    () => App._analysisNav('end'));
  document.getElementById('btn-autoplay')?.addEventListener('click',    () => App._toggleAutoplay());

  // Puzzle buttons
  document.getElementById('btn-next-puzzle')?.addEventListener('click',    () => App._loadNextPuzzle());
  document.getElementById('btn-puzzle-hint')?.addEventListener('click',    () => App._puzzleHint());
  document.getElementById('btn-puzzle-solution')?.addEventListener('click',() => App._showPuzzleSolution());

  // Settings
  document.querySelectorAll('[data-app-theme]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-app-theme]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      App.prefs.appTheme = btn.dataset.appTheme;
      App.ui.applyPrefs(App.prefs, App.board);
    })
  );
  document.querySelectorAll('[data-board-theme]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-board-theme]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      App.prefs.boardTheme = btn.dataset.boardTheme;
      App.ui.applyPrefs(App.prefs, App.board);
    })
  );
  document.querySelectorAll('[data-piece-theme]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-piece-theme]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      App.prefs.pieceTheme = btn.dataset.pieceTheme;
      App.ui.applyPrefs(App.prefs, App.board);
    })
  );

  const optMap = {
    'opt-coordinates':   'showCoords',
    'opt-highlight-moves': 'highlightMoves',
    'opt-highlight-last':  'highlightLast',
    'opt-animate':       'animate',
    'opt-sound':         'sound'
  };
  Object.entries(optMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      App.prefs[key] = el.checked;
      if (key === 'sound') App.sound.enabled = el.checked;
      App.ui.applyPrefs(App.prefs, App.board);
      StorageManager.savePrefs(App.prefs);
      const soundBtn = document.getElementById('btn-sound');
      if (key === 'sound' && soundBtn) {
        soundBtn.textContent = el.checked ? '🔊' : '🔇';
        soundBtn.classList.toggle('active', el.checked);
      }
    });
  });

  // Save prefs modal close
  document.querySelector('[data-modal="modal-settings"]')?.addEventListener('click', () => {
    StorageManager.savePrefs(App.prefs);
    App.ui.toast('Settings saved!', 'success');
  });

  // Stats clear
  document.getElementById('btn-clear-stats')?.addEventListener('click', () => {
    StorageManager.clearStats();
    App.ui.toast('Statistics cleared', 'info');
    App.ui.renderStats();
  });

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected','true');
      document.getElementById('tab-' + tab)?.classList.add('active');
    })
  );

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft')  App._analysisNav('prev');
    if (e.key === 'ArrowRight') App._analysisNav('next');
    if (e.key === 'Home')       App._analysisNav('start');
    if (e.key === 'End')        App._analysisNav('end');
    if (e.key === 'f' || e.key === 'F') App._flipBoard();
    if (e.key === 'u' || e.key === 'U') App._undo();
    if (e.key === 'n' || e.key === 'N') App.ui.openModal('modal-new-game');
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
  });

  // Click outside modal to close
  document.querySelectorAll('.modal-overlay').forEach(overlay =>
    overlay.addEventListener('click', e => {
      if (e.target === overlay && overlay.id !== 'modal-promotion') {
        overlay.style.display = 'none';
      }
    })
  );
}

/* =================================================================
   LOAD PREFS INTO SETTINGS MODAL
   ================================================================= */
function _loadPrefsIntoModal() {
  const p = App.prefs;
  const setActive = (sel, val) => {
    document.querySelectorAll(sel).forEach(el => {
      const k = el.dataset.appTheme || el.dataset.boardTheme || el.dataset.pieceTheme;
      el.classList.toggle('active', k === val);
    });
  };
  setActive('[data-app-theme]',   p.appTheme);
  setActive('[data-board-theme]', p.boardTheme);
  setActive('[data-piece-theme]', p.pieceTheme);

  const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = (val !== false); };
  setCheck('opt-coordinates',    p.showCoords);
  setCheck('opt-highlight-moves',p.highlightMoves);
  setCheck('opt-highlight-last', p.highlightLast);
  setCheck('opt-animate',        p.animate);
  setCheck('opt-sound',          p.sound);
  App.sound.enabled = p.sound !== false;
  const soundBtn = document.getElementById('btn-sound');
  if (soundBtn) {
    soundBtn.textContent = App.sound.enabled ? '🔊' : '🔇';
    soundBtn.classList.toggle('active', App.sound.enabled);
  }
}

/* =================================================================
   GAME MANAGEMENT
   ================================================================= */
function _openNewGameModal(mode) {
  // Pre-select radio
  const r = document.getElementById(mode === 'pvai' ? 'mode-pvai-radio' : 'mode-pvp-radio');
  if (r) { r.checked = true; r.dispatchEvent(new Event('change')); }
  App.ui.openModal('modal-new-game');
}

App._startNewGame = function(config) {
  config = config || {};
  App.gameConfig = { ...App.gameConfig, ...config };
  const gc = App.gameConfig;

  // Stop any running AI/timer
  App.ai.stop();
  App.timer.stop();
  App.aiThinking = false;
  App.analysis?.deactivate();

  // Reset engine
  App.engine.reset();

  // Set AI
  App.mode     = gc.mode;
  App.aiColor  = gc.playerColor === 'w' ? 'b' : 'w';
  App.ai.setDifficulty(gc.aiDepth || 3);

  // Set player names
  App.ui.setPlayerNames(gc.whiteName || 'White', gc.blackName || 'Black');
  document.getElementById('player-white-elo').textContent = gc.mode === 'pvai' ? '1500' : '';
  document.getElementById('player-black-elo').textContent = gc.mode === 'pvai' ? 'AI ('+ (gc.aiDepth || 3) + ')' : '';

  // Setup timer
  App.timer.setup(gc.timeSeconds || 0, gc.increment || 0);
  App.ui.updateTimers({ w: gc.timeSeconds, b: gc.timeSeconds }, App.timer.enabled);

  // Flip board if playing as black
  if (gc.mode === 'pvai' && gc.playerColor === 'b' && !App.board.flipped) {
    App.board.flip();
  } else if (App.board.flipped && gc.mode !== 'pvai') {
    App.board.flip(); // Reset flip for PvP
  }

  // Mode UI
  App.ui.setActiveMode(gc.mode);
  App.ui.showReplayControls(false);

  // Clear move list
  App.ui.updateMoveList([], null);

  // Render
  App._renderBoard(App.engine.board);
  App._updateStatus();
  App.ui.updateCaptured([], [], 0);
  App.ui.setCheckClass(false);

  // Start timer for white
  if (App.timer.enabled) {
    App.timer.start('w');
  }

  // If AI plays white, trigger AI immediately
  if (gc.mode === 'pvai' && App.aiColor === 'w') {
    setTimeout(() => App._triggerAI(), 300);
  }
};

/* =================================================================
   SQUARE CLICK HANDLER
   ================================================================= */
App._onSquareClick = function(sq) {
  if (App.aiThinking) return;

  // Analysis mode: just navigate
  if (App.mode === 'analysis') return;

  // Puzzle mode
  if (App.mode === 'puzzle') {
    App._handlePuzzleClick(sq);
    return;
  }

  // Block if game over
  if (App.engine.gameOver) return;

  // Block if it's AI's turn in pvai
  if (App.mode === 'pvai' && App.engine.turn === App.aiColor) return;

  const piece = App.engine.board[sq];

  if (App.board.selectedSq === null) {
    // Select piece
    if (piece && piece[0] === App.engine.turn) {
      const legal = App.engine.getLegalMoves(sq);
      App.board.setSelection(sq, legal.map(m => m.to));
      App._renderBoard(App.engine.board);
    }
  } else {
    // Move attempt
    const from = App.board.selectedSq;
    if (sq === from) {
      // Deselect
      App.board.clearSelection();
      App._renderBoard(App.engine.board);
      return;
    }
    if (piece && piece[0] === App.engine.turn) {
      // Switch selection to new piece
      App.board.setSelection(sq, App.engine.getLegalMoves(sq).map(m => m.to));
      App._renderBoard(App.engine.board);
      return;
    }
    App._attemptMove(from, sq);
  }
};

/* =================================================================
   DROP HANDLER
   ================================================================= */
App._onDrop = function(from, to) {
  if (App.aiThinking || App.engine.gameOver) return;
  if (App.mode === 'analysis') return;
  if (App.mode === 'pvai' && App.engine.turn === App.aiColor) return;
  if (App.mode === 'puzzle') { App._handlePuzzleMove(from, to); return; }
  App.board.setSelection(from, []);
  App._attemptMove(from, to);
};

/* =================================================================
   MOVE EXECUTION
   ================================================================= */
App._attemptMove = async function(from, to) {
  const piece   = App.engine.board[from];
  if (!piece) { App.board.clearSelection(); App._renderBoard(App.engine.board); return; }

  const color   = piece[0];
  const type    = piece[1];

  // Check for promotion
  let promoteTo = null;
  const legal   = App.engine.getLegalMoves(from).filter(m => m.to === to);
  if (legal.length === 0) {
    App.board.clearSelection();
    App._renderBoard(App.engine.board);
    App.sound.error();
    return;
  }

  const isPromo = legal.some(m => m.promoteTo);
  if (isPromo) {
    const choice = await App.ui.showPromotion(color);
    promoteTo = color + choice.toUpperCase();
  }

  App.board.clearSelection();

  const moveResult = App.engine.makeMove({ from, to, promoteTo });
  if (!moveResult) {
    App.sound.error();
    App._renderBoard(App.engine.board);
    return;
  }

  // Play sound
  if (moveResult.type === 'castleKing' || moveResult.type === 'castleQueen') App.sound.castling();
  else if (moveResult.captured || moveResult.type === 'enPassant') App.sound.capture();
  else App.sound.move();
  if (moveResult.isCheck) App.sound.check();

  // Timer
  if (App.timer.enabled) App.timer.switch(color);

  App._renderAfterMove(moveResult, color);

  // AI response
  if (!App.engine.gameOver && App.mode === 'pvai' && App.engine.turn === App.aiColor) {
    setTimeout(() => App._triggerAI(), 100);
  }
};

/* =================================================================
   RENDER AFTER MOVE
   ================================================================= */
App._renderAfterMove = function(moveResult, movedColor) {
  const engine = App.engine;

  // Update captured
  const cap = engine.getCaptured();
  const mat  = engine.getMaterialBalance();
  App.ui.updateCaptured(cap.byCapturedByWhite, cap.capturedByBlack, mat.diff);

  // Move list
  App.ui.updateMoveList(engine.moveHistory, idx => {
    if (App.mode !== 'analysis') return;
    App.analysis.viewedMove = idx;
    const b = App.analysis.getBoardAtCurrentMove(engine);
    App._renderBoard(b);
    App.ui.highlightMoveInList(idx);
    const evalScore = App.analysis.getEvaluation(engine);
    App.ui.setEval(evalScore, engine);
  }, engine.moveHistory.length - 1);

  // Check indicator
  const inCheck = engine.isInCheck(engine.board, engine.turn);
  App.ui.setCheckClass(inCheck);

  // Last move highlights
  const lm = moveResult || null;
  const checkKingSq = inCheck ? engine.findKing(engine.board, engine.turn) : null;
  App.board.lastMove = lm ? { from: lm.from, to: lm.to } : null;
  App.board.checkSq  = checkKingSq;

  App._renderBoard(engine.board);
  App._updateStatus();
  App.ui.setActivePlayer(engine.turn);

  // Eval bar
  const evalScore = engine.evaluate();
  App.ui.setEval(evalScore, engine);

  // Auto-save
  try {
    const pgn = PGNManager.export(engine);
    StorageManager.saveCurrentGame(pgn, engine.toFEN());
  } catch {}

  // Game over
  if (engine.gameOver) {
    App.timer.stop();
    App.sound.gameOver();
    App._handleGameOver();
  }
};

App._renderBoard = function(board) {
  App.board.render(board, {
    lastMove: App.board.lastMove,
    checkSq:  App.board.checkSq,
    hintSqs:  App.board.hintSqs
  });
};

App._updateStatus = function() {
  const engine = App.engine;
  if (engine.gameOver && engine.gameResult) {
    const r = engine.gameResult;
    if (!r.winner) App.ui.setStatus(`Draw by ${r.reason}`);
    else App.ui.setStatus(`${r.winner === 'w' ? 'White' : 'Black'} wins by ${r.reason}`);
    return;
  }
  const turn = engine.turn === 'w' ? 'White' : 'Black';
  const inCheck = engine.isInCheck(engine.board, engine.turn);
  let txt = `${turn}'s turn`;
  if (App.mode === 'pvai' && engine.turn === App.aiColor) txt += ' (AI thinking…)';
  if (inCheck) txt += ' — Check!';
  App.ui.setStatus(txt);
};

/* =================================================================
   GAME OVER HANDLING
   ================================================================= */
App._handleGameOver = function() {
  const result = App.engine.gameResult;
  if (!result) return;

  // Record to stats
  const gc = App.gameConfig;
  let myResult = 'draw';
  if (result.winner) {
    if (gc.mode === 'pvp') myResult = result.winner === 'w' ? 'win' : 'loss';
    else myResult = result.winner !== App.aiColor ? 'win' : 'loss';
  }

  StorageManager.recordGame({
    result: myResult,
    winner: result.winner,
    mode:   gc.mode === 'pvai' ? 'ai' : 'pvp',
    playerColor: gc.playerColor
  });

  StorageManager.addToHistory({
    white:  gc.whiteName,
    black:  gc.blackName,
    mode:   gc.mode,
    result: myResult,
    reason: result.reason
  });

  setTimeout(() => App.ui.showGameOver(result, App.engine), 500);
};

/* =================================================================
   AI ENGINE
   ================================================================= */
App._triggerAI = async function() {
  if (App.aiThinking || App.engine.gameOver) return;
  if (App.engine.turn !== App.aiColor) return;

  App.aiThinking = true;
  App._updateStatus();

  // Small delay so UI updates first
  await new Promise(r => setTimeout(r, 50));

  const move = await App.ai.getBestMoveAsync(App.engine, null);
  App.aiThinking = false;

  if (!move || App.engine.gameOver) { App._updateStatus(); return; }

  // Determine promotion (always queen for AI)
  if (App.engine.getLegalMoves(move.from).some(m => m.to === move.to && m.promoteTo)) {
    move.promoteTo = App.aiColor + 'Q';
  }

  const piece   = App.engine.board[move.from];
  const color   = piece ? piece[0] : App.aiColor;
  const result  = App.engine.makeMove(move);
  if (!result) return;

  // Sound
  if (result.type === 'castleKing' || result.type === 'castleQueen') App.sound.castling();
  else if (result.captured || result.type === 'enPassant') App.sound.capture();
  else App.sound.move();
  if (result.isCheck) App.sound.check();

  if (App.timer.enabled) App.timer.switch(color);
  App._renderAfterMove(result, color);
};

/* =================================================================
   TIMER FLAG
   ================================================================= */
App._onTimerFlag = function(flagColor) {
  if (App.engine.gameOver) return;
  App.engine.gameOver  = true;
  App.engine.gameResult = { winner: flagColor === 'w' ? 'b' : 'w', reason: 'timeout' };
  App.sound.gameOver();
  App.ui.toast(`${flagColor === 'w' ? 'White' : 'Black'} flagged!`, 'warning');
  App._handleGameOver();
};

/* =================================================================
   CONTROLS
   ================================================================= */
App._resign = function() {
  if (App.engine.gameOver) return;
  if (!confirm('Resign this game?')) return;
  const loser  = App.engine.turn;
  const winner = loser === 'w' ? 'b' : 'w';
  App.engine.gameOver  = true;
  App.engine.gameResult = { winner, reason: 'resignation' };
  App.timer.stop();
  App.sound.gameOver();
  App._handleGameOver();
};

App._offerDraw = function() {
  if (App.engine.gameOver) return;
  if (!confirm('Claim draw? (Use for 50-move rule or threefold repetition)')) return;
  App.engine.gameOver  = true;
  App.engine.gameResult = { winner: null, reason: 'agreement' };
  App.timer.stop();
  App._handleGameOver();
};

App._undo = function() {
  if (App.engine.gameOver) return;
  if (App.engine.moveHistory.length === 0) { App.ui.toast('No moves to undo', 'info'); return; }
  // In pvai mode, undo two moves (AI + player)
  App.engine.undoMove();
  if (App.mode === 'pvai' && App.engine.moveHistory.length > 0) App.engine.undoMove();
  App.board.clearSelection();
  App.board.lastMove = null;
  App.board.checkSq  = null;
  const cap = App.engine.getCaptured();
  const mat = App.engine.getMaterialBalance();
  App.ui.updateCaptured(cap.byCapturedByWhite, cap.capturedByBlack, mat.diff);
  App.ui.updateMoveList(App.engine.moveHistory, null);
  App.ui.setActivePlayer(App.engine.turn);
  App.ui.setCheckClass(false);
  App._renderBoard(App.engine.board);
  App._updateStatus();
  const evalScore = App.engine.evaluate();
  App.ui.setEval(evalScore, App.engine);
  App.ui.toast('Move undone', 'info');
};

App._flipBoard = function() {
  App.board.flip();
  App._renderBoard(
    App.mode === 'analysis' && App.analysis
      ? App.analysis.getBoardAtCurrentMove(App.engine)
      : App.engine.board
  );
};

App._showHint = function() {
  if (App.engine.gameOver || App.mode === 'analysis') return;
  const move = App.ai.getHint(App.engine);
  if (!move) { App.ui.toast('No hint available', 'info'); return; }
  App.board.hintSqs  = move;
  App._renderBoard(App.engine.board);
  App.sound.notify();
  App.ui.toast('Hint shown', 'info');
  setTimeout(() => { App.board.hintSqs = null; App._renderBoard(App.engine.board); }, 2500);
};

/* =================================================================
   ANALYSIS MODE
   ================================================================= */
App._enterAnalysisMode = function() {
  App.timer.pause();
  App.mode = 'analysis';
  App.ui.setActiveMode('analysis');
  App.ui.showReplayControls(true);
  if (!App.analysis) {
    App.analysis = new AnalysisManager(App.engine, App.ai);
  }
  App.analysis.activate();
  App.analysis.viewedMove = App.engine.moveHistory.length - 1;
  const b = App.analysis.getBoardAtCurrentMove(App.engine);
  App.board.clearSelection();
  App.board.lastMove = App.engine.moveHistory.length > 0
    ? { from: App.engine.moveHistory[App.engine.moveHistory.length - 1].from, to: App.engine.moveHistory[App.engine.moveHistory.length - 1].to }
    : null;
  App.board.checkSq = null;
  App._renderBoard(b);
  App.ui.updateMoveList(App.engine.moveHistory, idx => {
    App.analysis.viewedMove = idx;
    const board = App.analysis.getBoardAtCurrentMove(App.engine);
    App._renderBoard(board);
    App.ui.highlightMoveInList(idx);
    App.ui.setEval(App.analysis.getEvaluation(App.engine), App.engine);
  }, App.engine.moveHistory.length - 1);
  App.ui.toast('Analysis mode activated', 'info');
};

App._analysisNav = function(dir) {
  if (App.mode !== 'analysis' || !App.analysis) {
    // Allow arrow keys during game for analysis too
    return;
  }
  switch(dir) {
    case 'start': App.analysis.goToStart(App.engine); break;
    case 'prev':  App.analysis.prevMove(App.engine);  break;
    case 'next':  App.analysis.nextMove(App.engine);  break;
    case 'end':   App.analysis.goToEnd(App.engine);   break;
  }
  const idx = App.analysis.viewedMove;
  const b   = App.analysis.getBoardAtCurrentMove(App.engine);

  // Get last move for highlights
  if (idx >= 0 && App.engine.moveHistory[idx]) {
    const m = App.engine.moveHistory[idx];
    App.board.lastMove = { from: m.from, to: m.to };
  } else { App.board.lastMove = null; }
  App.board.checkSq = null;
  App._renderBoard(b);
  App.ui.highlightMoveInList(idx);
  App.ui.setEval(App.analysis.getEvaluation(App.engine), App.engine);
};

App._toggleAutoplay = function() {
  if (!App.analysis) return;
  if (App.analysis.autoplayId) {
    App.analysis.stopAutoplay();
    App.ui.toast('Autoplay stopped', 'info');
    return;
  }
  App.analysis.startAutoplay(
    App.engine, 1000,
    idx => {
      const b = App.analysis.getBoardAtCurrentMove(App.engine);
      App.board.lastMove = App.engine.moveHistory[idx] ? { from: App.engine.moveHistory[idx].from, to: App.engine.moveHistory[idx].to } : null;
      App._renderBoard(b);
      App.ui.highlightMoveInList(idx);
    },
    () => App.ui.toast('Autoplay finished', 'info')
  );
  App.ui.toast('Autoplay started', 'info');
};

/* =================================================================
   PUZZLE MODE
   ================================================================= */
App._enterPuzzleMode = function() {
  App.timer.stop();
  App.mode = 'puzzle';
  App.ui.setActiveMode('puzzle');
  App.ui.showReplayControls(false);
  App.ui.toast('Puzzle mode — solve the position!', 'info');
  // Switch to Puzzles tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const pTab = document.querySelector('[data-tab="puzzles"]');
  if (pTab) { pTab.classList.add('active'); pTab.setAttribute('aria-selected','true'); }
  document.getElementById('tab-puzzles')?.classList.add('active');
  App._loadNextPuzzle();
};

App._loadNextPuzzle = function() {
  const puz = App.puzzle.nextPuzzle();
  App.engine.loadFEN(puz.fen);
  App.engine.gameOver  = false;
  App.engine.gameResult= null;
  App.board.clearSelection();
  App.board.lastMove = null;
  App.board.checkSq  = null;
  App.board.hintSqs  = null;
  App._renderBoard(App.engine.board);
  App.ui.updatePuzzlePanel(puz, App.puzzle.streak, App.puzzle.totalSolved);
  App.ui.setStatus(`${puz.turn === 'w' ? 'White' : 'Black'} to move — ${puz.theme || 'Find the best move!'}`);
  // Update PGN textarea with puzzle FEN
  const ta = document.getElementById('fen-input');
  if (ta) ta.value = puz.fen;
};

App._handlePuzzleClick = function(sq) {
  if (App.engine.gameOver || App.puzzle.solved) {
    App._loadNextPuzzle();
    return;
  }
  const piece = App.engine.board[sq];
  if (App.board.selectedSq === null) {
    if (piece && piece[0] === App.engine.turn) {
      App.board.setSelection(sq, App.engine.getLegalMoves(sq).map(m => m.to));
      App._renderBoard(App.engine.board);
    }
  } else {
    const from = App.board.selectedSq;
    if (sq === from) { App.board.clearSelection(); App._renderBoard(App.engine.board); return; }
    if (piece && piece[0] === App.engine.turn) {
      App.board.setSelection(sq, App.engine.getLegalMoves(sq).map(m => m.to));
      App._renderBoard(App.engine.board);
      return;
    }
    App._handlePuzzleMove(from, sq);
  }
};

App._handlePuzzleMove = function(from, to) {
  App.board.clearSelection();
  const result = App.puzzle.attemptMove(from, to, App.engine);

  if (result.status === 'solved') {
    // Make the move on the engine
    App.engine.makeMove({ from, to });
    App._renderBoard(App.engine.board);
    App.sound.correct();
    App.ui.toast('🎉 Puzzle solved! Streak: ' + App.puzzle.streak, 'success', 3000);
    App.ui.updatePuzzlePanel(App.puzzle.currentPuzzle, App.puzzle.streak, App.puzzle.totalSolved);
    App.ui.setStatus('Puzzle solved!');
    return;
  }
  if (result.status === 'correct') {
    App.engine.makeMove({ from, to });
    App._renderBoard(App.engine.board);
    App.sound.move();
    App.ui.toast('Correct! Continue…', 'success', 1500);
    // Apply opponent move automatically
    setTimeout(() => {
      const nextSol = result.nextExpected;
      if (nextSol && App.puzzle.currentPuzzle) {
        const solIdx = App.puzzle.solutionStep;
        // The next move might be opponent's response – apply automatically
        const oppSol = App.puzzle.currentPuzzle.solution[solIdx];
        if (oppSol && App.puzzle.solutionStep <= App.puzzle.currentPuzzle.solution.length - 1) {
          // Check if it's still the puzzle side's turn after this
          // If so, apply automatically if we're waiting for side to move
          if (App.engine.turn !== App.engine.moveHistory[App.engine.moveHistory.length-1]?.piece[0]) {
            // It's the opponent's turn – apply their response automatically
            const respFrom = App.engine.algToSq(oppSol.slice(0,2));
            const respTo   = App.engine.algToSq(oppSol.slice(2,4));
            const resp = App.puzzle.attemptMove(respFrom, respTo, App.engine);
            App.engine.makeMove({ from: respFrom, to: respTo });
            App._renderBoard(App.engine.board);
            App.sound.move();
          }
        }
      }
    }, 500);
    return;
  }
  if (result.status === 'wrong') {
    App._renderBoard(App.engine.board);
    App.sound.wrong();
    App.ui.toast('❌ Wrong move! Try again.', 'error', 2000);
    App.ui.updatePuzzlePanel(App.puzzle.currentPuzzle, App.puzzle.streak, App.puzzle.totalSolved);
    return;
  }
};

App._puzzleHint = function() {
  const hint = App.puzzle.getHint();
  if (!hint) return;
  const hintFrom = App.engine.algToSq(hint.from);
  const hintTo   = App.engine.algToSq(hint.to);
  App.board.hintSqs = { from: hintFrom, to: hintTo };
  App._renderBoard(App.engine.board);
  App.sound.notify();
  setTimeout(() => { App.board.hintSqs = null; App._renderBoard(App.engine.board); }, 2500);
};

App._showPuzzleSolution = function() {
  const sol = App.puzzle.getSolution();
  if (!sol.length) return;
  App.ui.toast('Solution: ' + sol.join(' → '), 'info', 5000);
  App.puzzle.streak = 0;
  StorageManager.getStats().puzzleStreak = 0;
};
