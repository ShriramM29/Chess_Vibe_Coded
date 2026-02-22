/**
 * WebChess Pro — Storage Manager (storage.js)
 * Handles persistence via localStorage.
 * Stores: stats, preferences, game history.
 */

'use strict';

class StorageManager {
  static KEYS = {
    STATS:   'webchess_stats',
    PREFS:   'webchess_prefs',
    HISTORY: 'webchess_history',
    CURRENT: 'webchess_current'
  };

  /* ---- Statistics ---- */
  static getStats() {
    try {
      return JSON.parse(localStorage.getItem(StorageManager.KEYS.STATS)) || {
        gamesPlayed: 0,
        wins:   { w: 0, b: 0, total: 0 },
        losses: { w: 0, b: 0, total: 0 },
        draws:  0,
        byMode: { pvp: 0, ai: 0, puzzle: 0 },
        puzzlesSolved: 0,
        puzzleStreak: 0,
        bestStreak: 0
      };
    } catch { return StorageManager._defaultStats(); }
  }

  static _defaultStats() {
    return {
      gamesPlayed: 0,
      wins:   { w: 0, b: 0, total: 0 },
      losses: { w: 0, b: 0, total: 0 },
      draws:  0,
      byMode: { pvp: 0, ai: 0, puzzle: 0 },
      puzzlesSolved: 0,
      puzzleStreak: 0,
      bestStreak: 0
    };
  }

  static saveStats(stats) {
    try { localStorage.setItem(StorageManager.KEYS.STATS, JSON.stringify(stats)); } catch {}
  }

  static recordGame({ result, winner, mode, playerColor }) {
    const stats = StorageManager.getStats();
    stats.gamesPlayed++;
    stats.byMode[mode] = (stats.byMode[mode] || 0) + 1;

    if (result === 'win') {
      stats.wins.total++;
      stats.wins[winner] = (stats.wins[winner] || 0) + 1;
    } else if (result === 'loss') {
      stats.losses.total++;
      stats.losses[winner === 'w' ? 'b' : 'w'] = (stats.losses[winner === 'w' ? 'b' : 'w'] || 0) + 1;
    } else {
      stats.draws++;
    }

    StorageManager.saveStats(stats);
    return stats;
  }

  static clearStats() {
    localStorage.removeItem(StorageManager.KEYS.STATS);
    localStorage.removeItem(StorageManager.KEYS.HISTORY);
  }

  /* ---- Preferences ---- */
  static getPrefs() {
    try {
      const saved = JSON.parse(localStorage.getItem(StorageManager.KEYS.PREFS));
      if (!saved) return StorageManager._defaultPrefs();
      // Validate that saved themes are still available (removed old themes → fall back to defaults)
      const validAppThemes   = ['theme-dark', 'theme-monochrome', 'theme-liquid-glass'];
      const validBoardThemes = ['board-theme-classic', 'board-theme-monochrome', 'board-theme-liquid-glass'];
      const defaults = StorageManager._defaultPrefs();
      if (!validAppThemes.includes(saved.appTheme))   saved.appTheme   = defaults.appTheme;
      if (!validBoardThemes.includes(saved.boardTheme)) saved.boardTheme = defaults.boardTheme;
      return saved;
    } catch { return StorageManager._defaultPrefs(); }
  }

  static _defaultPrefs() {
    return {
      appTheme:    'theme-monochrome',
      boardTheme:  'board-theme-monochrome',
      pieceTheme:  'piece-theme-monochrome',
      showCoords:  true,
      highlightMoves: true,
      highlightLast:  true,
      animate:     true,
      sound:       true,
      aiDepth:     3
    };
  }

  static savePrefs(prefs) {
    try { localStorage.setItem(StorageManager.KEYS.PREFS, JSON.stringify(prefs)); } catch {}
  }

  /* ---- Game History ---- */
  static getHistory() {
    try {
      return JSON.parse(localStorage.getItem(StorageManager.KEYS.HISTORY)) || [];
    } catch { return []; }
  }

  static addToHistory(entry) {
    try {
      const hist = StorageManager.getHistory();
      hist.unshift({ ...entry, date: new Date().toISOString() });
      // Keep last 50 games
      if (hist.length > 50) hist.splice(50);
      localStorage.setItem(StorageManager.KEYS.HISTORY, JSON.stringify(hist));
    } catch {}
  }

  /* ---- Current Game (auto-save) ---- */
  static saveCurrentGame(pgn, fen) {
    try { localStorage.setItem(StorageManager.KEYS.CURRENT, JSON.stringify({ pgn, fen, ts: Date.now() })); } catch {}
  }

  static loadCurrentGame() {
    try { return JSON.parse(localStorage.getItem(StorageManager.KEYS.CURRENT)); } catch { return null; }
  }

  static clearCurrentGame() {
    try { localStorage.removeItem(StorageManager.KEYS.CURRENT); } catch {}
  }
}

window.StorageManager = StorageManager;
