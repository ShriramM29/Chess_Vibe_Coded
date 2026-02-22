/**
 * WebChess Pro — Analysis Module (analysis.js)
 * Move replay, position navigation, and evaluation display.
 */

'use strict';

class AnalysisManager {
  constructor(engine, ai) {
    this.engine      = engine;
    this.ai          = ai;
    this.viewedMove  = -1;   // index in moveHistory being viewed (-1 = start)
    this.isActive    = false;
    this.autoplayId  = null;
  }

  activate() { this.isActive = true; this.viewedMove = this.engine.moveHistory.length - 1; }
  deactivate() { this.isActive = false; this.stopAutoplay(); }

  /** Navigate to a specific move index (-1 = start) */
  goToMove(index, engine) {
    const total = engine.moveHistory.length;
    this.viewedMove = Math.max(-1, Math.min(index, total - 1));
    return this.viewedMove;
  }

  goToStart(engine) { return this.goToMove(-1, engine); }
  goToEnd(engine)   { return this.goToMove(engine.moveHistory.length - 1, engine); }
  prevMove(engine)  { return this.goToMove(this.viewedMove - 1, engine); }
  nextMove(engine)  { return this.goToMove(this.viewedMove + 1, engine); }

  /** Get board state for current analysis position */
  getBoardAtCurrentMove(engine) {
    if (this.viewedMove < 0) return engine._startBoard();
    // Replay from start
    const tempEngine = new ChessEngine();
    for (let i = 0; i <= this.viewedMove; i++) {
      const m = engine.moveHistory[i];
      // Try to apply
      const legal = tempEngine._getAllPseudoMoves(
        tempEngine.board, tempEngine.turn,
        tempEngine.castlingRights, tempEngine.enPassantTarget
      );
      const found = legal.find(lm =>
        lm.from === m.from && lm.to === m.to &&
        (!m.promoteTo || lm.promoteTo === m.promoteTo)
      );
      if (found) tempEngine.applyMoveFull(found);
    }
    this._tempEngine = tempEngine;
    return tempEngine.board;
  }

  /** Get evaluation at current position */
  getEvaluation(engine) {
    const tempEngine = this._tempEngine;
    if (!tempEngine) return engine.evaluate();
    return tempEngine.evaluate();
  }

  /** Format engine score for display */
  static formatEval(score) {
    if (Math.abs(score) > 9000) {
      const mateIn = Math.ceil((99999 - Math.abs(score)) / 2);
      return (score > 0 ? '+M' : '-M') + mateIn;
    }
    const pawns = score / 100;
    return (pawns >= 0 ? '+' : '') + pawns.toFixed(1);
  }

  /** Eval bar percentage (0–100, 50 = equal) */
  static evalToPercent(score) {
    const clamped = Math.max(-1000, Math.min(1000, score));
    return 50 + (clamped / 1000) * 50;
  }

  /** Start autoplay */
  startAutoplay(engine, intervalMs, onStep, onEnd) {
    this.stopAutoplay();
    this.autoplayId = setInterval(() => {
      if (this.viewedMove >= engine.moveHistory.length - 1) {
        this.stopAutoplay();
        if (onEnd) onEnd();
        return;
      }
      this.nextMove(engine);
      if (onStep) onStep(this.viewedMove);
    }, intervalMs || 1000);
  }

  stopAutoplay() {
    if (this.autoplayId) { clearInterval(this.autoplayId); this.autoplayId = null; }
  }
}

window.AnalysisManager = AnalysisManager;
