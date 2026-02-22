/**
 * WebChess Pro — Puzzle Module (puzzle.js)
 * Built-in puzzle database and puzzle state management.
 */

'use strict';

/** Built-in puzzle database (FEN + solution line) */
const PUZZLE_DB = [
  {
    id: 'p001', rating: 800, fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    solution: ['d8h4'], description: "White to move — find Scholar's Mate!", turn: 'b',
    theme: 'mate-in-1'
  },
  {
    id: 'p002', rating: 900, fen: '1k6/pp4pp/8/8/8/8/5R2/6K1 w - - 0 1',
    solution: ['f2f8'], description: 'White to move — Rook delivers checkmate!', turn: 'w',
    theme: 'mate-in-1'
  },
  {
    id: 'p003', rating: 1000, fen: 'r2qkb1r/ppp2ppp/2n1bn2/3pp3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 2 6',
    solution: ['c4f7'], description: 'White to move — Greek Gift sacrifice!', turn: 'w',
    theme: 'sacrifice'
  },
  {
    id: 'p004', rating: 1100, fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    solution: ['a1a8'], description: 'White to move — Rook to 8th rank!', turn: 'w',
    theme: 'back-rank'
  },
  {
    id: 'p005', rating: 1200, fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    solution: ['h5f7'], description: "White to move — Scholar's Mate!", turn: 'w',
    theme: 'mate-in-1'
  },
  {
    id: 'p006', rating: 1300, fen: '2r2rk1/pp3ppp/2n5/2bNp1B1/2B1P3/8/PP3PPP/R2K3R w - - 0 1',
    solution: ['d5f6'], description: 'White to move — Knight fork!', turn: 'w',
    theme: 'fork'
  },
  {
    id: 'p007', rating: 1400, fen: 'r3kb1r/ppp2ppp/2n5/3qp3/3P4/5N2/PPP2PPP/R1BQKB1R w KQkq - 0 8',
    solution: ['f3e5'], description: 'White to move — Win the queen!', turn: 'w',
    theme: 'fork'
  },
  {
    id: 'p008', rating: 1500, fen: '4r1k1/pp3ppp/2p5/8/3P4/P1P5/1P4PP/4R1K1 w - - 0 1',
    solution: ['e1e8'], description: 'White to move — Back rank checkmate!', turn: 'w',
    theme: 'back-rank'
  },
  {
    id: 'p009', rating: 1600, fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 b - - 0 1',
    solution: ['c6d4', 'f3d4', 'c5d4'], description: 'Black to move — Win material!', turn: 'b',
    theme: 'combination'
  },
  {
    id: 'p010', rating: 1700, fen: '3r2k1/pp1b1ppp/2p5/3qp3/8/P1N1P3/1PP2PPP/R2QK2R w KQ - 0 1',
    solution: ['c3d5'], description: 'White to move — Knight captures queen!', turn: 'w',
    theme: 'fork'
  },
  {
    id: 'p011', rating: 1800, fen: 'r1b1k1nr/pppp1ppp/2n5/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R b KQkq - 0 1',
    solution: ['c5f2'], description: 'Black to move — Fried Liver style!', turn: 'b',
    theme: 'sacrifice'
  },
  {
    id: 'p012', rating: 900, fen: 'k7/7R/K7/8/8/8/8/8 w - - 0 1',
    solution: ['h7h8'], description: 'White to move — Force checkmate!', turn: 'w',
    theme: 'mate-in-1'
  },
  {
    id: 'p013', rating: 1100, fen: '5rk1/5ppp/8/8/8/8/5PPP/5RK1 w - - 0 1',
    solution: ['f1f8'], description: 'White to move — Exchange and simplify!', turn: 'w',
    theme: 'simplification'
  },
  {
    id: 'p014', rating: 1350, fen: 'r3r1k1/ppp2ppp/8/3Q4/3p4/P5P1/1PP2P1P/R3R1K1 w - - 0 1',
    solution: ['d5d7'], description: 'White to move — Queen infiltrates!', turn: 'w',
    theme: 'infiltration'
  },
  {
    id: 'p015', rating: 1500, fen: '2kr3r/ppp3pp/8/8/8/8/PPP3PP/2KR3R w - - 0 1',
    solution: ['d1d8'], description: 'White to move — Open file domination!', turn: 'w',
    theme: 'open-file'
  }
];

class PuzzleManager {
  constructor() {
    this.puzzles       = [...PUZZLE_DB];
    this.currentPuzzle = null;
    this.solutionStep  = 0;
    this.solved        = false;
    this.failed        = false;

    const stats = StorageManager.getStats();
    this.streak = stats.puzzleStreak || 0;
    this.totalSolved = stats.puzzlesSolved || 0;
    this._usedIds = new Set();
  }

  /** Pick next unseen puzzle (random within rating range) */
  nextPuzzle() {
    let available = this.puzzles.filter(p => !this._usedIds.has(p.id));
    if (available.length === 0) {
      this._usedIds.clear();
      available = [...this.puzzles];
    }
    const idx = Math.floor(Math.random() * available.length);
    this.currentPuzzle = available[idx];
    this._usedIds.add(this.currentPuzzle.id);
    this.solutionStep = 0;
    this.solved = false;
    this.failed = false;
    return this.currentPuzzle;
  }

  /** Attempt a move in the current puzzle */
  attemptMove(moveFrom, moveTo, engine) {
    if (!this.currentPuzzle || this.solved) return { status: 'no-puzzle' };

    const solution = this.currentPuzzle.solution;
    const expectedSAN = solution[this.solutionStep];

    // Convert expected (algebraic from-to) to squares
    const expFrom = engine.algToSq(expectedSAN.slice(0, 2));
    const expTo   = engine.algToSq(expectedSAN.slice(2, 4));

    if (moveFrom === expFrom && moveTo === expTo) {
      this.solutionStep++;
      if (this.solutionStep >= solution.length) {
        // Puzzle solved!
        this.solved = true;
        this.streak++;
        this.totalSolved++;
        this._savePuzzleStats();
        return { status: 'solved' };
      }
      return { status: 'correct', nextExpected: solution[this.solutionStep] };
    } else {
      // Wrong move
      this.failed = true;
      this.streak = 0;
      this._savePuzzleStats();
      return { status: 'wrong' };
    }
  }

  /** Get the current expected move as algebraic */
  getHint() {
    if (!this.currentPuzzle) return null;
    const sol = this.currentPuzzle.solution[this.solutionStep];
    return { from: sol.slice(0, 2), to: sol.slice(2, 4) };
  }

  /** Return full solution for showing */
  getSolution() {
    if (!this.currentPuzzle) return [];
    return this.currentPuzzle.solution;
  }

  _savePuzzleStats() {
    const stats = StorageManager.getStats();
    stats.puzzlesSolved = this.totalSolved;
    stats.puzzleStreak  = this.streak;
    stats.bestStreak = Math.max(stats.bestStreak || 0, this.streak);
    StorageManager.saveStats(stats);
  }
}

window.PuzzleManager = PuzzleManager;
window.PUZZLE_DB     = PUZZLE_DB;
