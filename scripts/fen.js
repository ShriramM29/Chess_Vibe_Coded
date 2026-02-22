/**
 * WebChess Pro — FEN Manager (fen.js)
 * Parsing and generation of FEN strings.
 * Delegates to ChessEngine.toFEN() and ChessEngine.loadFEN().
 */

'use strict';

class FENManager {
  /**
   * Export current game state to FEN string.
   * @param {ChessEngine} engine
   * @returns {string}
   */
  static export(engine) {
    return engine.toFEN();
  }

  /**
   * Import FEN into engine. Throws on invalid FEN.
   * @param {ChessEngine} engine
   * @param {string} fen
   */
  static import(engine, fen) {
    if (!fen || typeof fen !== 'string') throw new Error('FEN must be a non-empty string');
    const trimmed = fen.trim();
    FENManager.validate(trimmed); // will throw if invalid
    engine.loadFEN(trimmed);
    return true;
  }

  /**
   * Validate FEN string. Returns true or throws.
   * @param {string} fen
   */
  static validate(fen) {
    const parts = fen.trim().split(/\s+/);
    if (parts.length < 4) throw new Error('FEN must have at least 4 fields');

    // Board
    const rows = parts[0].split('/');
    if (rows.length !== 8) throw new Error('FEN board must have 8 ranks');
    for (const row of rows) {
      let count = 0;
      for (const ch of row) {
        if (/[1-8]/.test(ch)) count += parseInt(ch);
        else if (/[pnbrqkPNBRQK]/.test(ch)) count++;
        else throw new Error(`Invalid FEN character: ${ch}`);
      }
      if (count !== 8) throw new Error(`FEN rank has ${count} squares, expected 8`);
    }

    // Turn
    if (parts[1] !== 'w' && parts[1] !== 'b') throw new Error('FEN turn must be "w" or "b"');

    // Castling
    if (!/^[KQkq\-]{1,4}$/.test(parts[2])) throw new Error('Invalid FEN castling field');

    // En passant
    if (parts[3] !== '-' && !/^[a-h][36]$/.test(parts[3]))
      throw new Error('Invalid FEN en passant field');

    return true;
  }

  /**
   * List of well-known FEN positions
   */
  static presets() {
    return [
      { name: 'Start', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
      { name: 'Italian Game', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4' },
      { name: 'Sicilian Defense', fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2' },
      { name: 'Scholar\'s Mate Setup', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4' },
      { name: 'Ruy Lopez', fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3' },
      { name: 'Endgame K+P vs K', fen: '8/8/8/4k3/8/8/4P3/4K3 w - - 0 1' }
    ];
  }
}

window.FENManager = FENManager;
