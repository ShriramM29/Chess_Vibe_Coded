/**
 * WebChess Pro — UI Manager (ui.js)
 * Handles all DOM updates: timers, move list, status bar,
 * captured pieces, modals, toasts, stats panel.
 */

'use strict';

class UIManager {
  constructor() {
    this._promo        = null;   // pending promotion resolver
    this._toastTimeout = {};
  }

  /* =====================================================
     STATUS BAR
     ===================================================== */
  setStatus(text, type = '') {
    const el = document.getElementById('status-text');
    if (el) el.textContent = text;
  }

  setEval(score, engine) {
    const label = document.getElementById('eval-label');
    const bar   = document.getElementById('eval-bar');
    if (!label || !bar) return;
    label.textContent = AnalysisManager.formatEval(score);
    const pct = AnalysisManager.evalToPercent(score);
    bar.style.width = pct + '%';
  }

  /* =====================================================
     TIMERS
     ===================================================== */
  updateTimers(times, enabled) {
    const wEl = document.getElementById('timer-white-display');
    const bEl = document.getElementById('timer-black-display');
    const wWrap = document.getElementById('timer-white');
    const bWrap = document.getElementById('timer-black');

    if (!enabled) {
      if (wEl) wEl.textContent = '∞';
      if (bEl) bEl.textContent = '∞';
      return;
    }
    if (wEl) wEl.textContent = ChessTimer.formatPrecise(times.w);
    if (bEl) bEl.textContent = ChessTimer.formatPrecise(times.b);

    // Low time warning
    if (wWrap) wWrap.classList.toggle('low-time', times.w < 30);
    if (bWrap) bWrap.classList.toggle('low-time', times.b < 30);
  }

  setActivePlayer(color) {
    const wCard = document.getElementById('player-white-card');
    const bCard = document.getElementById('player-black-card');
    if (wCard) wCard.classList.toggle('active-turn', color === 'w');
    if (bCard) bCard.classList.toggle('active-turn', color === 'b');
  }

  setPlayerNames(whiteName, blackName) {
    const wEl = document.getElementById('player-white-name');
    const bEl = document.getElementById('player-black-name');
    if (wEl) wEl.textContent = whiteName || 'White';
    if (bEl) bEl.textContent = blackName || 'Black';
  }

  /* =====================================================
     MOVE LIST
     ===================================================== */
  updateMoveList(moves, onMoveClick, activeMoveIdx = -1) {
    const list = document.getElementById('move-list');
    if (!list) return;
    list.innerHTML = '';

    for (let i = 0; i < moves.length; i += 2) {
      const row = document.createElement('div');
      row.className = 'move-row';

      const numEl = document.createElement('span');
      numEl.className  = 'move-num';
      numEl.textContent = Math.floor(i / 2) + 1 + '.';
      row.appendChild(numEl);

      for (let j = 0; j < 2 && i + j < moves.length; j++) {
        const idx = i + j;
        const span = document.createElement('span');
        span.className  = 'move-san' + (idx === activeMoveIdx ? ' active-move' : '');
        span.textContent = moves[idx].san;
        span.dataset.idx = idx;
        span.addEventListener('click', () => { if (onMoveClick) onMoveClick(idx); });
        row.appendChild(span);
      }
      list.appendChild(row);
    }

    // Scroll to bottom / active move
    const active = list.querySelector('.active-move');
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    else list.scrollTop = list.scrollHeight;
  }

  highlightMoveInList(idx) {
    document.querySelectorAll('.move-san').forEach(el => {
      el.classList.toggle('active-move', parseInt(el.dataset.idx) === idx);
    });
    const active = document.querySelector('.move-san.active-move');
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* =====================================================
     CAPTURED PIECES
     ===================================================== */
  updateCaptured(capturedByWhite, capturedByBlack, diff) {
    const wEl = document.getElementById('captured-black-pieces');
    const bEl = document.getElementById('captured-white-pieces');
    const wMat = document.getElementById('material-white');
    const bMat = document.getElementById('material-black');

    if (wEl) wEl.innerHTML = capturedByWhite.map(p => `<span>${PIECE_UNICODE[p]}</span>`).join('');
    if (bEl) bEl.innerHTML = capturedByBlack.map(p => `<span>${PIECE_UNICODE[p]}</span>`).join('');

    const adv = Math.round(diff / 100);
    if (wMat) wMat.textContent = adv > 0 ? `+${adv}` : '';
    if (bMat) bMat.textContent = adv < 0 ? `+${Math.abs(adv)}` : '';
  }

  /* =====================================================
     MODALS
     ===================================================== */
  openModal(id) {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'flex'; }
  }

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; }
  }

  /**
   * Show pawn promotion dialog.
   * Returns a promise that resolves with the chosen piece code.
   */
  showPromotion(color) {
    return new Promise(resolve => {
      this._promo = resolve;
      const overlay = document.getElementById('modal-promotion');
      // Update unicode for correct color
      const symMap = {
        q: color === 'w' ? '♕' : '♛',
        r: color === 'w' ? '♖' : '♜',
        b: color === 'w' ? '♗' : '♝',
        n: color === 'w' ? '♘' : '♞'
      };
      overlay.querySelectorAll('.promo-btn').forEach(btn => {
        const p = btn.dataset.piece;
        btn.childNodes[0].textContent = symMap[p] || '';
      });
      this.openModal('modal-promotion');
    });
  }

  resolvePromotion(piece) {
    if (this._promo) { this._promo(piece); this._promo = null; }
    this.closeModal('modal-promotion');
  }

  showGameOver(result, engine) {
    const icon = document.getElementById('gameover-icon');
    const msg  = document.getElementById('gameover-message');
    const rsn  = document.getElementById('gameover-reason');
    const stats = document.getElementById('gameover-stats');
    if (!msg || !rsn) return;

    if (!result) { msg.textContent = 'Game in progress'; return; }

    const movesPlayed = engine.moveHistory.length;

    if (!result.winner) {
      if (icon) icon.textContent = '🤝';
      msg.textContent = 'Draw!';
    } else {
      const winColor = result.winner === 'w' ? 'White' : 'Black';
      if (icon) icon.textContent = result.winner === 'w' ? '♔' : '♚';
      msg.textContent = winColor + ' wins!';
    }
    rsn.textContent = 'by ' + (result.reason || 'checkmate');
    if (stats) stats.textContent = `Moves played: ${movesPlayed}`;
    this.openModal('modal-game-over');
  }

  /* =====================================================
     TOAST NOTIFICATIONS
     ===================================================== */
  toast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className   = `toast ${type}`;
    t.textContent = message;
    container.appendChild(t);
    setTimeout(() => {
      t.style.animation = 'toast-out 0.3s ease forwards';
      setTimeout(() => t.remove(), 300);
    }, duration);
  }

  /* =====================================================
     STATS PANEL
     ===================================================== */
  renderStats() {
    const stats = StorageManager.getStats();
    const grid  = document.getElementById('stats-grid');
    const hist  = document.getElementById('history-list');
    if (!grid) return;

    const winRate = stats.gamesPlayed
      ? Math.round((stats.wins.total / stats.gamesPlayed) * 100)
      : 0;

    grid.innerHTML = `
      <div class="stat-card"><div class="stat-value">${stats.gamesPlayed}</div><div class="stat-label">Games Played</div></div>
      <div class="stat-card wins"><div class="stat-value">${stats.wins.total}</div><div class="stat-label">Wins</div></div>
      <div class="stat-card losses"><div class="stat-value">${stats.losses.total}</div><div class="stat-label">Losses</div></div>
      <div class="stat-card draws"><div class="stat-value">${stats.draws}</div><div class="stat-label">Draws</div></div>
      <div class="stat-card"><div class="stat-value">${winRate}%</div><div class="stat-label">Win Rate</div></div>
      <div class="stat-card"><div class="stat-value">${stats.puzzlesSolved || 0}</div><div class="stat-label">Puzzles Solved</div></div>
      <div class="stat-card"><div class="stat-value">${stats.puzzleStreak || 0}</div><div class="stat-label">Current Streak</div></div>
      <div class="stat-card"><div class="stat-value">${stats.bestStreak || 0}</div><div class="stat-label">Best Streak</div></div>
      <div class="stat-card"><div class="stat-value">${stats.byMode?.ai || 0}</div><div class="stat-label">AI Games</div></div>
    `;

    if (hist) {
      const history = StorageManager.getHistory();
      if (history.length === 0) {
        hist.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;">No games recorded yet</div>';
      } else {
        hist.innerHTML = history.slice(0, 10).map(g => `
          <div class="history-item">
            <span>${g.white || 'White'} vs ${g.black || 'Black'}</span>
            <span>${g.mode || 'pvp'}</span>
            <span class="history-result ${g.result}">${g.result === 'draw' ? 'Draw' : g.result === 'win' ? '✓ Win' : '✗ Loss'}</span>
            <span style="color:var(--text-muted);font-size:0.75rem">${g.date ? g.date.split('T')[0] : ''}</span>
          </div>
        `).join('');
      }
    }
  }

  /* =====================================================
     PUZZLE PANEL
     ===================================================== */
  updatePuzzlePanel(puzzle, streak, totalSolved) {
    const desc    = document.getElementById('puzzle-description');
    const rating  = document.getElementById('puzzle-rating');
    const streakEl= document.getElementById('puzzle-streak');
    const solvedEl= document.getElementById('puzzle-solved');
    if (desc   && puzzle) desc.textContent   = puzzle.description;
    if (rating && puzzle) rating.textContent = 'Rating: ' + (puzzle.rating || '?');
    if (streakEl) streakEl.textContent = streak;
    if (solvedEl) solvedEl.textContent = totalSolved;
  }

  /* =====================================================
     REPLAY CONTROLS
     ===================================================== */
  showReplayControls(show) {
    const el = document.getElementById('replay-controls');
    if (el) el.style.display = show ? 'flex' : 'none';
  }

  /* =====================================================
     MODE BUTTONS
     ===================================================== */
  setActiveMode(mode) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const modeMap = { pvp: 'btn-mode-pvp', pvai: 'btn-mode-pvai', puzzle: 'btn-mode-puzzle', analysis: 'btn-mode-analysis' };
    const id = modeMap[mode];
    if (id) {
      const el = document.getElementById(id);
      if (el) el.classList.add('active');
    }
    // Body class
    const body = document.getElementById('app-body');
    if (body) {
      body.classList.remove('analysis-mode', 'puzzle-mode');
      if (mode === 'analysis') body.classList.add('analysis-mode');
      if (mode === 'puzzle')   body.classList.add('puzzle-mode');
    }
  }

  setCheckClass(on) {
    const body = document.getElementById('app-body');
    if (body) body.classList.toggle('in-check', on);
  }

  /* =====================================================
     SETTINGS APPLY
     ===================================================== */
  applyPrefs(prefs, board) {
    const body = document.getElementById('app-body');
    if (!body) return;

    // Remove old theme classes
    body.className = body.className
      .replace(/theme-\S+/g, '')
      .replace(/board-theme-\S+/g, '')
      .replace(/piece-theme-\S+/g, '')
      .trim();

    body.classList.add(prefs.appTheme   || 'theme-dark');
    body.classList.add(prefs.boardTheme || 'board-theme-classic');
    body.classList.add(prefs.pieceTheme || 'piece-theme-standard');

    if (board) {
      board.highlightMoves = prefs.highlightMoves !== false;
      board.highlightLast  = prefs.highlightLast  !== false;
      board.animate        = prefs.animate !== false;
      board.setCoordinatesVisible(prefs.showCoords !== false);
    }
  }
}

window.UIManager = UIManager;
