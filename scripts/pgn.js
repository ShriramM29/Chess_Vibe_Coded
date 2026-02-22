/**
 * WebChess Pro — PGN Manager (pgn.js)
 * Full PGN import and export.
 */

'use strict';

class PGNManager {
  /**
   * Export game to PGN string.
   * @param {ChessEngine} engine
   * @param {object} meta  - { white, black, event, date, result }
   */
  static export(engine, meta = {}) {
    const tags = {
      Event:  meta.event  || 'WebChess Pro Game',
      Site:   meta.site   || 'WebChess Pro',
      Date:   meta.date   || new Date().toISOString().split('T')[0].replace(/-/g, '.'),
      Round:  meta.round  || '?',
      White:  meta.white  || 'White',
      Black:  meta.black  || 'Black',
      Result: meta.result || PGNManager._gameResult(engine)
    };

    let pgn = '';
    for (const [key, val] of Object.entries(tags)) {
      pgn += `[${key} "${val}"]\n`;
    }
    pgn += '\n';

    // Move text
    const moves = engine.moveHistory;
    let moveText = '';
    for (let i = 0; i < moves.length; i++) {
      if (i % 2 === 0) moveText += `${Math.floor(i / 2) + 1}. `;
      moveText += moves[i].san + ' ';
    }
    moveText += tags.Result;

    // Word-wrap at ~80 chars
    pgn += PGNManager._wrapText(moveText, 80);
    return pgn;
  }

  static _gameResult(engine) {
    if (!engine.gameResult) return '*';
    if (!engine.gameResult.winner) return '1/2-1/2';
    return engine.gameResult.winner === 'w' ? '1-0' : '0-1';
  }

  static _wrapText(text, width) {
    const words = text.split(' ');
    let line = '', out = '';
    for (const w of words) {
      if ((line + w).length > width) { out += line.trimEnd() + '\n'; line = ''; }
      line += w + ' ';
    }
    if (line.trim()) out += line.trimEnd();
    return out;
  }

  /**
   * Import PGN and replay moves on engine.
   * Returns array of move records applied.
   */
  static import(engine, pgn) {
    if (!pgn || typeof pgn !== 'string') throw new Error('PGN must be a non-empty string');
    pgn = pgn.trim();

    // Parse tags
    const tagRe = /\[(\w+)\s+"([^"]*?)"\]/g;
    const tags = {};
    let match;
    while ((match = tagRe.exec(pgn)) !== null) {
      tags[match[1]] = match[2];
    }

    // Get move text (remove tags and comments)
    let moveText = pgn.replace(/\[[^\]]*\]/g, '');
    moveText = moveText.replace(/\{[^}]*\}/g, '');
    moveText = moveText.replace(/;[^\n]*/g, '');
    moveText = moveText.replace(/\d+\./g, '');
    moveText = moveText.replace(/[*]|1-0|0-1|1\/2-1\/2/g, '');
    moveText = moveText.replace(/\$\d+/g, ''); // NAG annotations
    moveText = moveText.trim();

    const tokens = moveText.split(/\s+/).filter(t => t.length > 0);

    // Reset engine
    if (tags.FEN) {
      engine.loadFEN(tags.FEN);
    } else {
      engine.reset();
    }

    const applied = [];
    for (const token of tokens) {
      if (!token || token === '...' || /^[0-9]/.test(token.replace('...', ''))) continue;
      const move = PGNManager._parseSAN(engine, token);
      if (!move) throw new Error(`Cannot parse move: "${token}"`);
      const result = engine.makeMove(move);
      if (!result) throw new Error(`Illegal move: "${token}"`);
      applied.push(result);
    }

    return { applied, tags };
  }

  /**
   * Parse a SAN token and find the matching legal move in engine.
   */
  static _parseSAN(engine, san) {
    // Strip check/mate symbols
    san = san.replace(/[+#!?]/g, '');

    // Castling
    if (san === 'O-O-O' || san === '0-0-0') return PGNManager._findCastleMove(engine, 'castleQueen');
    if (san === 'O-O'   || san === '0-0')   return PGNManager._findCastleMove(engine, 'castleKing');

    const legalMoves = engine.getAllLegalMoves();
    const color = engine.turn;

    // Promotion: e8=Q
    let promoteTo = null;
    const promoMatch = san.match(/=([QRBN])$/);
    if (promoMatch) {
      promoteTo = color + promoMatch[1];
      san = san.slice(0, -2);
    }

    // Pawn move: e4, exd5
    const pawnSimple = san.match(/^([a-h])([1-8])$/);
    const pawnCapture = san.match(/^([a-h])x([a-h][1-8])$/);
    const piecePat = san.match(/^([NBRQK])([a-h])?([1-8])?(x)?([a-h][1-8])$/);

    if (pawnSimple) {
      const toSq = engine.algToSq(san);
      return legalMoves.find(m => {
        if (engine.board[m.from]?.[1] !== 'P') return false;
        if (m.to !== toSq) return false;
        if (promoteTo && m.promoteTo !== promoteTo) return false;
        if (!promoteTo && m.promoteTo) return false;
        return true;
      }) || null;
    }

    if (pawnCapture) {
      const fromFile = pawnCapture[1];
      const toSq = engine.algToSq(pawnCapture[2]);
      return legalMoves.find(m => {
        if (engine.board[m.from]?.[1] !== 'P') return false;
        if (m.to !== toSq) return false;
        if ('abcdefgh'[ChessEngine.col(m.from)] !== fromFile) return false;
        if (promoteTo && m.promoteTo !== promoteTo) return false;
        if (!promoteTo && m.promoteTo) return false;
        return true;
      }) || null;
    }

    if (piecePat) {
      const pieceType = piecePat[1];
      const disambigFile = piecePat[2];
      const disambigRank = piecePat[3];
      const toSq = engine.algToSq(piecePat[5]);

      return legalMoves.find(m => {
        const p = engine.board[m.from];
        if (!p || p[1] !== pieceType || p[0] !== color) return false;
        if (m.to !== toSq) return false;
        if (disambigFile && 'abcdefgh'[ChessEngine.col(m.from)] !== disambigFile) return false;
        if (disambigRank && String(8 - ChessEngine.row(m.from)) !== disambigRank) return false;
        return true;
      }) || null;
    }

    return null;
  }

  static _findCastleMove(engine, castleType) {
    const moves = engine.getAllLegalMoves();
    return moves.find(m => m.type === castleType) || null;
  }
}

window.PGNManager = PGNManager;
