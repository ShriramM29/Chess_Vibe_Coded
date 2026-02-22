/**
 * WebChess Pro — AI Engine (ai.js)
 * Minimax with alpha-beta pruning and iterative deepening.
 * Difficulty levels 1–5 map to search depths.
 */

'use strict';

class ChessAI {
  constructor() {
    this.depth   = 3;     // default search depth
    this.nodes   = 0;
    this.running = false;
  }

  setDifficulty(level) {
    // Level 1–5 → depth 1–5
    this.depth = Math.max(1, Math.min(5, parseInt(level)));
  }

  /**
   * Get the best move for the given engine state.
   * Returns a move object or null.
   */
  getBestMove(engine) {
    if (engine.gameOver) return null;
    this.nodes = 0;
    this.running = true;

    const color = engine.turn;
    const isMaximizing = color === 'w';
    const maxDepth = this.depth;

    let bestMove = null;
    let bestScore = isMaximizing ? -Infinity : Infinity;

    // Get all legal moves
    const moves = engine.getAllLegalMoves();
    if (moves.length === 0) return null;

    // Shallow shuffle for variety at equal scores
    this._shuffleArray(moves);

    // Order moves: captures first
    moves.sort((a, b) => {
      const ac = engine.board[a.to] ? 1 : 0;
      const bc = engine.board[b.to] ? 1 : 0;
      return bc - ac;
    });

    for (const move of moves) {
      if (!this.running) break;

      // Save state
      const savedState = this._saveState(engine);

      // Apply move directly (fast path, bypass legality check)
      engine.applyMoveFull(move);

      const score = this._minimax(engine, maxDepth - 1, -Infinity, Infinity, !isMaximizing);

      // Restore state
      this._restoreState(engine, savedState);

      if (isMaximizing ? score > bestScore : score < bestScore) {
        bestScore = score;
        bestMove  = move;
      }
    }

    return bestMove;
  }

  _minimax(engine, depth, alpha, beta, isMaximizing) {
    this.nodes++;

    // Terminal node
    if (depth === 0) return engine.evaluate();

    // Check game over on this position
    if (engine.gameOver) return engine.evaluate();

    const moves = engine.getAllLegalMoves();
    if (moves.length === 0) {
      // Checkmate or stalemate
      if (engine.isInCheck(engine.board, engine.turn)) {
        return isMaximizing ? -99999 - depth : 99999 + depth;
      }
      return 0; // stalemate
    }

    // Move ordering: captures and promotions first
    moves.sort((a, b) => {
      const aScore = this._moveOrderScore(engine, a);
      const bScore = this._moveOrderScore(engine, b);
      return bScore - aScore;
    });

    if (isMaximizing) {
      let best = -Infinity;
      for (const move of moves) {
        const saved = this._saveState(engine);
        engine.applyMoveFull(move);
        const score = this._minimax(engine, depth - 1, alpha, beta, false);
        this._restoreState(engine, saved);
        best  = Math.max(best, score);
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break; // Alpha-beta cutoff
      }
      return best;
    } else {
      let best = Infinity;
      for (const move of moves) {
        const saved = this._saveState(engine);
        engine.applyMoveFull(move);
        const score = this._minimax(engine, depth - 1, alpha, beta, true);
        this._restoreState(engine, saved);
        best = Math.min(best, score);
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  _moveOrderScore(engine, move) {
    let score = 0;
    const captured = engine.board[move.to];
    if (captured) {
      const capVal = PIECE_VALUES[captured[1]] || 0;
      const attVal = PIECE_VALUES[engine.board[move.from][1]] || 0;
      score += 10 * capVal - attVal; // MVV-LVA
    }
    if (move.promoteTo) score += PIECE_VALUES[move.promoteTo[1]] || 0;
    if (move.type === 'enPassant') score += 100;
    return score;
  }

  _saveState(engine) {
    return {
      board: engine.board.slice(),
      turn: engine.turn,
      castlingRights: { ...engine.castlingRights },
      enPassantTarget: engine.enPassantTarget,
      halfMoveClock: engine.halfMoveClock,
      fullMoveNumber: engine.fullMoveNumber,
      gameOver: engine.gameOver,
      gameResult: engine.gameResult
    };
  }

  _restoreState(engine, state) {
    engine.board           = state.board;
    engine.turn            = state.turn;
    engine.castlingRights  = state.castlingRights;
    engine.enPassantTarget = state.enPassantTarget;
    engine.halfMoveClock   = state.halfMoveClock;
    engine.fullMoveNumber  = state.fullMoveNumber;
    engine.gameOver        = state.gameOver;
    engine.gameResult      = state.gameResult;
  }

  _shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  stop() { this.running = false; }

  /**
   * Get best move asynchronously with a timeout fallback,
   * so the UI doesn't freeze on deep searches.
   */
  async getBestMoveAsync(engine, onDone) {
    // Run in the next animation frame to avoid blocking UI
    const self = this;
    return new Promise(resolve => {
      setTimeout(() => {
        const move = self.getBestMove(engine);
        if (onDone) onDone(move);
        resolve(move);
      }, 0);
    });
  }

  /**
   * Simple best-move hint for human player (shallower search)
   */
  getHint(engine) {
    const savedDepth = this.depth;
    this.depth = Math.min(3, this.depth);
    const move = this.getBestMove(engine);
    this.depth = savedDepth;
    return move;
  }
}

window.ChessAI = ChessAI;
