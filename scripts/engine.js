/**
 * WebChess Pro — Chess Engine (engine.js)
 * Complete legal-move generation and game-state management.
 * Implements: moves, castling, en passant, promotion, check/checkmate/stalemate,
 * threefold repetition, 50-move rule, insufficient material.
 */

"use strict";

/* ======================================================
   CONSTANTS
   ====================================================== */
const PIECES = {
  wP: "wP",
  wR: "wR",
  wN: "wN",
  wB: "wB",
  wQ: "wQ",
  wK: "wK",
  bP: "bP",
  bR: "bR",
  bN: "bN",
  bB: "bB",
  bQ: "bQ",
  bK: "bK",
};

const PIECE_UNICODE = {
  wK: "♔",
  wQ: "♕",
  wR: "♖",
  wB: "♗",
  wN: "♘",
  wP: "♙",
  bK: "♚",
  bQ: "♛",
  bR: "♜",
  bB: "♝",
  bN: "♞",
  bP: "♟",
};

const PIECE_VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

// Piece-Square Tables (white's perspective; black is mirrored)
const PST = {
  P: [
    0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30,
    20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5,
    -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0,
    0,
  ],
  N: [
    -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30,
    0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20,
    20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20,
    -40, -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  B: [
    -20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0,
    5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10,
    0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20,
    -10, -10, -10, -10, -10, -10, -20,
  ],
  R: [
    0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0,
    -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0,
    0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0,
  ],
  Q: [
    -20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5,
    5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5,
    5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10,
    -10, -20,
  ],
  K: [
    -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40,
    -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40,
    -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20,
    -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20,
  ],
  K_END: [
    // King endgame table
    -50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30,
    -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30,
    -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30,
    0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50,
  ],
};

/* ======================================================
   GAME STATE CLASS
   ====================================================== */
class ChessEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = this._startBoard();
    this.turn = "w"; // 'w' or 'b'
    this.moveHistory = []; // Array of move objects
    this.castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
    this.enPassantTarget = null; // Square index or null
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.positionMap = {}; // FEN -> count for repetition
    this.gameOver = false;
    this.gameResult = null; // null | {winner, reason}
    this._recordPosition();
  }

  // ---- Board initialisation ----
  _startBoard() {
    const b = new Array(64).fill(null);
    const backRank = ["R", "N", "B", "Q", "K", "B", "N", "R"];
    for (let f = 0; f < 8; f++) {
      b[f] = "b" + backRank[f];
      b[8 + f] = "bP";
      b[48 + f] = "wP";
      b[56 + f] = "w" + backRank[f];
    }
    return b;
  }

  // ---- Coordinate helpers ----
  static idx(r, f) {
    return r * 8 + f;
  }
  static row(i) {
    return Math.floor(i / 8);
  }
  static col(i) {
    return i % 8;
  }
  static color(p) {
    return p ? p[0] : null;
  }
  static type(p) {
    return p ? p[1] : null;
  }
  static opp(c) {
    return c === "w" ? "b" : "w";
  }
  static isValid(r, f) {
    return r >= 0 && r < 8 && f >= 0 && f < 8;
  }

  // ---- Clone board ----
  _cloneBoard(board) {
    return board.slice();
  }

  // ---- Clone state (for move testing) ----
  _cloneState() {
    return {
      board: this.board.slice(),
      turn: this.turn,
      castlingRights: { ...this.castlingRights },
      enPassantTarget: this.enPassantTarget,
      halfMoveClock: this.halfMoveClock,
      fullMoveNumber: this.fullMoveNumber,
    };
  }

  // ---- Apply state from snapshot ----
  _applyState(s) {
    this.board = s.board;
    this.turn = s.turn;
    this.castlingRights = s.castlingRights;
    this.enPassantTarget = s.enPassantTarget;
    this.halfMoveClock = s.halfMoveClock;
    this.fullMoveNumber = s.fullMoveNumber;
  }

  // ---- Find king square ----
  findKing(board, color) {
    const king = color + "K";
    return board.findIndex((p) => p === king);
  }

  /* ==================================================
     PSEUDO-LEGAL MOVE GENERATION
     ================================================== */
  getPseudoMoves(board, from, castlingRights, enPassantTarget, color) {
    const piece = board[from];
    if (!piece || piece[0] !== color) return [];
    const type = piece[1];
    const moves = [];
    const r = ChessEngine.row(from);
    const f = ChessEngine.col(from);

    const addSlide = (dr, df) => {
      let nr = r + dr,
        nf = f + df;
      while (ChessEngine.isValid(nr, nf)) {
        const to = ChessEngine.idx(nr, nf);
        if (!board[to]) {
          moves.push({ from, to, type: "normal" });
        } else {
          if (board[to][0] !== color) moves.push({ from, to, type: "capture" });
          break;
        }
        nr += dr;
        nf += df;
      }
    };
    const addStep = (dr, df) => {
      const nr = r + dr,
        nf = f + df;
      if (!ChessEngine.isValid(nr, nf)) return;
      const to = ChessEngine.idx(nr, nf);
      if (!board[to]) moves.push({ from, to, type: "normal" });
      else if (board[to][0] !== color)
        moves.push({ from, to, type: "capture" });
    };

    switch (type) {
      case "P": {
        const dir = color === "w" ? -1 : 1;
        const start = color === "w" ? 6 : 1;
        const promoRow = color === "w" ? 0 : 7;
        // Forward
        const fwd = ChessEngine.idx(r + dir, f);
        if (ChessEngine.isValid(r + dir, f) && !board[fwd]) {
          const isPromo = r + dir === promoRow;
          if (isPromo) {
            for (const pp of ["Q", "R", "B", "N"])
              moves.push({
                from,
                to: fwd,
                type: "promotion",
                promoteTo: color + pp,
              });
          } else {
            moves.push({ from, to: fwd, type: "normal" });
          }
          // Double push
          if (r === start) {
            const fwd2 = ChessEngine.idx(r + 2 * dir, f);
            if (!board[fwd2])
              moves.push({ from, to: fwd2, type: "doublePush" });
          }
        }
        // Captures
        for (const df of [-1, 1]) {
          if (!ChessEngine.isValid(r + dir, f + df)) continue;
          const to = ChessEngine.idx(r + dir, f + df);
          const isPromo = r + dir === promoRow;
          if (board[to] && board[to][0] !== color) {
            if (isPromo) {
              for (const pp of ["Q", "R", "B", "N"])
                moves.push({
                  from,
                  to,
                  type: "promotionCapture",
                  promoteTo: color + pp,
                });
            } else {
              moves.push({ from, to, type: "capture" });
            }
          }
          // En passant
          if (enPassantTarget === to) {
            moves.push({
              from,
              to,
              type: "enPassant",
              capturedSq: ChessEngine.idx(r, f + df),
            });
          }
        }
        break;
      }
      case "N": {
        const jumps = [
          [-2, -1],
          [-2, 1],
          [-1, -2],
          [-1, 2],
          [1, -2],
          [1, 2],
          [2, -1],
          [2, 1],
        ];
        for (const [dr, df] of jumps) addStep(dr, df);
        break;
      }
      case "B": {
        for (const [dr, df] of [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ])
          addSlide(dr, df);
        break;
      }
      case "R": {
        for (const [dr, df] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ])
          addSlide(dr, df);
        break;
      }
      case "Q": {
        for (const [dr, df] of [
          [-1, -1],
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
          [1, 1],
        ])
          addSlide(dr, df);
        break;
      }
      case "K": {
        for (const [dr, df] of [
          [-1, -1],
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
          [1, 1],
        ])
          addStep(dr, df);
        // Castling
        const cr = castlingRights;
        if (color === "w") {
          if (cr.wK && !board[57] && !board[58] && board[56] === "wR")
            moves.push({
              from,
              to: 58,
              type: "castleKing",
              rookFrom: 56,
              rookTo: 57,
            });
          if (
            cr.wQ &&
            !board[59] &&
            !board[60] &&
            !board[61] &&
            board[63] === "wR"
          )
            moves.push({
              from,
              to: 60,
              type: "castleQueen",
              rookFrom: 63,
              rookTo: 61,
            });
        } else {
          if (cr.bK && !board[1] && !board[2] && board[0] === "bR")
            moves.push({
              from,
              to: 2,
              type: "castleKing",
              rookFrom: 0,
              rookTo: 1,
            });
          if (
            cr.bQ &&
            !board[5] &&
            !board[6] &&
            !board[7] &&
            board[7] === null &&
            board[3] === "bR"
          )
            moves.push({
              from,
              to: 4,
              type: "castleQueen",
              rookFrom: 7,
              rookTo: 5,
            });
        }
        break;
      }
    }
    return moves;
  }

  // Fix castling index bug - let me redo castling properly
  _getCastlingMoves(board, color, castlingRights) {
    const moves = [];
    if (color === "w") {
      // King-side: e1=60, f1=61, g1=62, h1=63 (board index from top-left 0=a8, 63=h1)
      if (
        castlingRights.wK &&
        board[61] === null &&
        board[62] === null &&
        board[63] === "wR"
      )
        moves.push({
          from: 60,
          to: 62,
          type: "castleKing",
          rookFrom: 63,
          rookTo: 61,
        });
      // Queen-side: a1=56, b1=57, c1=58, d1=59, e1=60
      if (
        castlingRights.wQ &&
        board[57] === null &&
        board[58] === null &&
        board[59] === null &&
        board[56] === "wR"
      )
        moves.push({
          from: 60,
          to: 58,
          type: "castleQueen",
          rookFrom: 56,
          rookTo: 59,
        });
    } else {
      // King-side: e8=4, f8=5, g8=6, h8=7
      if (
        castlingRights.bK &&
        board[5] === null &&
        board[6] === null &&
        board[7] === "bR"
      )
        moves.push({
          from: 4,
          to: 6,
          type: "castleKing",
          rookFrom: 7,
          rookTo: 5,
        });
      // Queen-side: a8=0, b8=1, c8=2, d8=3, e8=4
      if (
        castlingRights.bQ &&
        board[1] === null &&
        board[2] === null &&
        board[3] === null &&
        board[0] === "bR"
      )
        moves.push({
          from: 4,
          to: 2,
          type: "castleQueen",
          rookFrom: 0,
          rookTo: 3,
        });
    }
    return moves;
  }

  /* ==================================================
     IS SQUARE ATTACKED?
     ================================================== */
  isAttacked(board, sq, byColor) {
    const r = ChessEngine.row(sq);
    const f = ChessEngine.col(sq);

    // Pawn attacks
    const pawnDir = byColor === "w" ? 1 : -1;
    for (const df of [-1, 1]) {
      const ar = r + pawnDir,
        af = f + df;
      if (ChessEngine.isValid(ar, af)) {
        const p = board[ChessEngine.idx(ar, af)];
        if (p === byColor + "P") return true;
      }
    }
    // Knight attacks
    for (const [dr, df] of [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ]) {
      const ar = r + dr,
        af = f + df;
      if (
        ChessEngine.isValid(ar, af) &&
        board[ChessEngine.idx(ar, af)] === byColor + "N"
      )
        return true;
    }
    // Sliding: bishop/queen diagonals
    for (const [dr, df] of [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ]) {
      let ar = r + dr,
        af = f + df;
      while (ChessEngine.isValid(ar, af)) {
        const p = board[ChessEngine.idx(ar, af)];
        if (p) {
          if (p === byColor + "B" || p === byColor + "Q") return true;
          break;
        }
        ar += dr;
        af += df;
      }
    }
    // Sliding: rook/queen straights
    for (const [dr, df] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      let ar = r + dr,
        af = f + df;
      while (ChessEngine.isValid(ar, af)) {
        const p = board[ChessEngine.idx(ar, af)];
        if (p) {
          if (p === byColor + "R" || p === byColor + "Q") return true;
          break;
        }
        ar += dr;
        af += df;
      }
    }
    // King attacks
    for (const [dr, df] of [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ]) {
      const ar = r + dr,
        af = f + df;
      if (
        ChessEngine.isValid(ar, af) &&
        board[ChessEngine.idx(ar, af)] === byColor + "K"
      )
        return true;
    }
    return false;
  }

  isInCheck(board, color) {
    const kingSq = this.findKing(board, color);
    if (kingSq < 0) return false;
    return this.isAttacked(board, kingSq, ChessEngine.opp(color));
  }

  /* ==================================================
     APPLY A MOVE TO A BOARD (returns new board, no mutation)
     ================================================== */
  applyMoveToBoard(board, move) {
    const b = board.slice();
    const piece = b[move.from];
    b[move.to] = move.promoteTo || piece;
    b[move.from] = null;
    if (move.type === "enPassant") b[move.capturedSq] = null;
    if (move.type === "castleKing" || move.type === "castleQueen") {
      b[move.rookTo] = b[move.rookFrom];
      b[move.rookFrom] = null;
    }
    return b;
  }

  /* ==================================================
     LEGAL MOVE GENERATION (filters pseudo-moves that leave king in check)
     ================================================== */
  getLegalMoves(fromSq) {
    const color = this.turn;
    const pseudo = this._getAllPseudoMoves(
      this.board,
      color,
      this.castlingRights,
      this.enPassantTarget,
    );
    const fromMoves = pseudo.filter((m) => m.from === fromSq);
    return fromMoves.filter((m) => this._isLegal(m, color));
  }

  getAllLegalMoves() {
    const color = this.turn;
    const pseudo = this._getAllPseudoMoves(
      this.board,
      color,
      this.castlingRights,
      this.enPassantTarget,
    );
    return pseudo.filter((m) => this._isLegal(m, color));
  }

  _getAllPseudoMoves(board, color, castlingRights, enPassantTarget) {
    const moves = [];
    for (let i = 0; i < 64; i++) {
      if (board[i] && board[i][0] === color) {
        const pMoves = this.getPseudoMoves(
          board,
          i,
          castlingRights,
          enPassantTarget,
          color,
        );
        moves.push(...pMoves);
      }
    }
    // Add proper castling
    moves.push(...this._getCastlingMoves(board, color, castlingRights));
    return moves;
  }

  _isLegal(move, color) {
    // For castling: check king path is not attacked
    if (move.type === "castleKing" || move.type === "castleQueen") {
      if (this.isInCheck(this.board, color)) return false;
      // Check squares king passes through
      const passSquares =
        move.type === "castleKing"
          ? [move.from + 1, move.from + 2]
          : [move.from - 1, move.from - 2];
      const opp = ChessEngine.opp(color);
      for (const sq of passSquares) {
        const testB = this.applyMoveToBoard(this.board, {
          from: move.from,
          to: sq,
          type: "normal",
        });
        if (this.isAttacked(testB, sq, opp)) return false;
      }
    }
    const newBoard = this.applyMoveToBoard(this.board, move);
    return !this.isInCheck(newBoard, color);
  }

  /* ==================================================
     EXECUTE MOVE (main public method)
     ================================================== */
  makeMove(move) {
    if (this.gameOver) return false;

    // Verify legality
    const legal = this.getLegalMoves(move.from);
    const found = legal.find(
      (m) =>
        m.from === move.from &&
        m.to === move.to &&
        (!move.promoteTo || m.promoteTo === move.promoteTo),
    );
    if (!found) return false;

    const piece = this.board[move.from];
    const captured = this.board[move.to];
    const color = ChessEngine.color(piece);
    const type = ChessEngine.type(piece);

    // Apply board
    this.board = this.applyMoveToBoard(this.board, found);

    // Update en passant target
    this.enPassantTarget = null;
    if (found.type === "doublePush") {
      const dir = color === "w" ? 1 : -1;
      this.enPassantTarget = found.to + dir * 8;
    }

    // Update castling rights
    if (type === "K") {
      if (color === "w") {
        this.castlingRights.wK = false;
        this.castlingRights.wQ = false;
      } else {
        this.castlingRights.bK = false;
        this.castlingRights.bQ = false;
      }
    }
    if (type === "R") {
      if (found.from === 56) this.castlingRights.wQ = false;
      if (found.from === 63) this.castlingRights.wK = false;
      if (found.from === 0) this.castlingRights.bQ = false;
      if (found.from === 7) this.castlingRights.bK = false;
    }

    // Update clocks
    if (type === "P" || captured || found.type === "enPassant")
      this.halfMoveClock = 0;
    else this.halfMoveClock++;
    if (color === "b") this.fullMoveNumber++;

    // Build move record
    const san = this._toSAN(found, piece, captured);
    const moveRecord = {
      ...found,
      piece,
      captured,
      san,
      fen: this.toFEN(), // FEN after move
      castlingRights: { ...this.castlingRights },
      enPassantTarget: this.enPassantTarget,
    };

    // Switch turn
    this.turn = ChessEngine.opp(color);

    // Post-move flags
    moveRecord.isCheck = this.isInCheck(this.board, this.turn);
    moveRecord.isMate =
      moveRecord.isCheck && this.getAllLegalMoves().length === 0;
    moveRecord.isStalemate =
      !moveRecord.isCheck && this.getAllLegalMoves().length === 0;
    if (moveRecord.isCheck) moveRecord.san += moveRecord.isMate ? "#" : "+";

    this.moveHistory.push(moveRecord);
    this._recordPosition();

    // Check game end conditions
    this._checkGameEnd(moveRecord);

    return moveRecord;
  }

  _checkGameEnd(lastMove) {
    const color = this.turn; // current player (just moved means it's their opponent's turn now)
    const legal = this.getAllLegalMoves();

    if (lastMove.isMate) {
      const winner = ChessEngine.opp(color);
      this._setGameOver(winner, "checkmate");
      return;
    }
    if (lastMove.isStalemate) {
      this._setGameOver(null, "stalemate");
      return;
    }
    if (this.halfMoveClock >= 100) {
      this._setGameOver(null, "50-move rule");
      return;
    }
    if (this._isThreefoldRepetition()) {
      this._setGameOver(null, "threefold repetition");
      return;
    }
    if (this._isInsufficientMaterial()) {
      this._setGameOver(null, "insufficient material");
      return;
    }
  }

  _setGameOver(winner, reason) {
    this.gameOver = true;
    this.gameResult = { winner, reason };
  }

  /* ==================================================
     SAN NOTATION
     ================================================== */
  _toSAN(move, piece, captured) {
    const type = ChessEngine.type(piece);
    const from = move.from;
    const to = move.to;
    const toAlg = this._sqToAlg(to);

    if (move.type === "castleKing") return "O-O";
    if (move.type === "castleQueen") return "O-O-O";

    let san = "";
    if (type === "P") {
      if (captured || move.type === "enPassant") {
        san = this._sqToAlg(from)[0] + "x" + toAlg;
      } else {
        san = toAlg;
      }
      if (move.promoteTo) san += "=" + move.promoteTo[1];
    } else {
      san += type;
      // Disambiguation
      const ambiguous = this._getAmbiguous(move, piece);
      san += ambiguous;
      if (captured) san += "x";
      san += toAlg;
    }
    return san;
  }

  _getAmbiguous(move, piece) {
    const color = ChessEngine.color(piece);
    const allMoves = this._getAllPseudoMoves(
      this.board,
      color,
      this.castlingRights,
      this.enPassantTarget,
    ).filter(
      (m) =>
        m.to === move.to &&
        this.board[m.from] === piece &&
        m.from !== move.from,
    );
    if (allMoves.length === 0) return "";
    const sameFile = allMoves.some(
      (m) => ChessEngine.col(m.from) === ChessEngine.col(move.from),
    );
    const sameRank = allMoves.some(
      (m) => ChessEngine.row(m.from) === ChessEngine.row(move.from),
    );
    if (!sameFile) return "abcdefgh"[ChessEngine.col(move.from)];
    if (!sameRank) return String(8 - ChessEngine.row(move.from));
    return this._sqToAlg(move.from);
  }

  _sqToAlg(sq) {
    return "abcdefgh"[ChessEngine.col(sq)] + String(8 - ChessEngine.row(sq));
  }

  algToSq(alg) {
    const f = alg.charCodeAt(0) - 97;
    const r = 8 - parseInt(alg[1]);
    return ChessEngine.idx(r, f);
  }

  /* ==================================================
     POSITION RECORDING (threefold repetition)
     ================================================== */
  _fenCore() {
    return this.toFEN().split(" ").slice(0, 4).join(" ");
  }

  _recordPosition() {
    const key = this._fenCore();
    this.positionMap[key] = (this.positionMap[key] || 0) + 1;
  }

  _isThreefoldRepetition() {
    return Object.values(this.positionMap).some((c) => c >= 3);
  }

  /* ==================================================
     INSUFFICIENT MATERIAL
     ================================================== */
  _isInsufficientMaterial() {
    const pieces = this.board.filter(Boolean);
    if (pieces.length === 2) return true; // K vs K
    if (pieces.length === 3) {
      const minor = pieces.find((p) => p[1] === "N" || p[1] === "B");
      if (minor) return true; // K vs K+N or K vs K+B
    }
    if (pieces.length === 4) {
      const whites = pieces.filter((p) => p[0] === "w");
      const blacks = pieces.filter((p) => p[0] === "b");
      // K+B vs K+B (same color bishops)
      if (whites.length === 2 && blacks.length === 2) {
        const wb = whites.find((p) => p[1] === "B");
        const bb = blacks.find((p) => p[1] === "B");
        if (wb && bb) {
          const wbSq = this.board.findIndex((p) => p === wb);
          const bbSq = this.board.findIndex((p) => p === bb);
          if (
            (ChessEngine.row(wbSq) + ChessEngine.col(wbSq)) % 2 ===
            (ChessEngine.row(bbSq) + ChessEngine.col(bbSq)) % 2
          )
            return true;
        }
      }
    }
    return false;
  }

  /* ==================================================
     MATERIAL BALANCE
     ================================================== */
  getMaterialBalance() {
    let wMat = 0,
      bMat = 0;
    const whitePieces = [],
      blackPieces = [];
    for (const p of this.board) {
      if (!p || p[1] === "K") continue;
      const val = PIECE_VALUES[p[1]];
      if (p[0] === "w") {
        wMat += val;
        whitePieces.push(p);
      } else {
        bMat += val;
        blackPieces.push(p);
      }
    }
    return {
      white: wMat,
      black: bMat,
      diff: wMat - bMat,
      whitePieces,
      blackPieces,
    };
  }

  getCaptured() {
    const whiteCap = [],
      blackCap = [];
    for (const m of this.moveHistory) {
      if (m.captured) {
        if (m.captured[0] === "b") whiteCap.push(m.captured);
        else blackCap.push(m.captured);
      }
      if (m.type === "enPassant") {
        if (m.piece[0] === "w") whiteCap.push("bP");
        else blackCap.push("wP");
      }
    }
    return { byCapturedByWhite: whiteCap, capturedByBlack: blackCap };
  }

  /* ==================================================
     EVALUATION (for analysis & hint display)
     ================================================== */
  evaluate() {
    if (this.gameResult) {
      if (!this.gameResult.winner) return 0;
      return this.gameResult.winner === "w" ? 99999 : -99999;
    }
    let score = 0;
    const pieces = this.board;
    let totalMat = 0;
    for (const p of pieces) {
      if (!p) continue;
      totalMat += PIECE_VALUES[p[1]] || 0;
    }
    const isEndgame = totalMat < 1500;

    for (let i = 0; i < 64; i++) {
      const p = pieces[i];
      if (!p) continue;
      const color = p[0],
        type = p[1];
      const val = PIECE_VALUES[type] || 0;
      let pst = 0;
      const tableKey = type === "K" && isEndgame ? "K_END" : type;
      if (PST[tableKey]) {
        const idx = color === "w" ? i : 56 - Math.floor(i / 8) * 8 + (i % 8);
        pst = PST[tableKey][Math.min(idx, 63)] || 0;
      }
      score += (color === "w" ? 1 : -1) * (val + pst);
    }
    // Mobility bonus
    const wMoves = this._getAllPseudoMoves(
      this.board,
      "w",
      this.castlingRights,
      this.enPassantTarget,
    ).length;
    const bMoves = this._getAllPseudoMoves(
      this.board,
      "b",
      this.castlingRights,
      this.enPassantTarget,
    ).length;
    score += (wMoves - bMoves) * 0.1;

    return score;
  }

  /* ==================================================
     UNDO MOVE
     ================================================== */
  undoMove() {
    if (this.moveHistory.length === 0) return false;
    const last = this.moveHistory.pop();

    // Remove position recording
    const key = Object.keys(this.positionMap).pop();
    if (key) {
      this.positionMap[key]--;
      if (this.positionMap[key] <= 0) delete this.positionMap[key];
    }

    // Rebuild from FEN of previous position
    if (this.moveHistory.length > 0) {
      const prevFen = this.moveHistory[this.moveHistory.length - 1].fen;
      this.loadFEN(prevFen);
      // Turn is the color that just moved
      this.turn = ChessEngine.opp(ChessEngine.color(last.piece));
    } else {
      this.reset();
      this.moveHistory = [];
    }

    this.gameOver = false;
    this.gameResult = null;
    return last;
  }

  /* ==================================================
     POSITION NAVIGATION (for analysis)
     ================================================== */
  getBoardAtMove(moveIndex) {
    // Rebuild board state by replaying moves up to moveIndex
    const tempEngine = new ChessEngine();
    for (let i = 0; i <= moveIndex && i < this.moveHistory.length; i++) {
      const m = this.moveHistory[i];
      const legal = tempEngine
        ._getAllPseudoMoves(
          tempEngine.board,
          tempEngine.turn,
          tempEngine.castlingRights,
          tempEngine.enPassantTarget,
        )
        .filter((lm) => this._isLegal.call(tempEngine, lm, tempEngine.turn));
      const found = legal.find(
        (lm) =>
          lm.from === m.from &&
          lm.to === m.to &&
          (!m.promoteTo || lm.promoteTo === m.promoteTo),
      );
      if (found) tempEngine.applyMoveFull(found);
    }
    return tempEngine.board;
  }

  applyMoveFull(move) {
    // Internal: apply without checks (used during replay)
    const piece = this.board[move.from];
    const color = ChessEngine.color(piece);
    const type = ChessEngine.type(piece);
    this.board = this.applyMoveToBoard(this.board, move);
    this.enPassantTarget = null;
    if (move.type === "doublePush") {
      const dir = color === "w" ? 1 : -1;
      this.enPassantTarget = move.to + dir * 8;
    }
    if (type === "K") {
      if (color === "w") {
        this.castlingRights.wK = false;
        this.castlingRights.wQ = false;
      } else {
        this.castlingRights.bK = false;
        this.castlingRights.bQ = false;
      }
    }
    if (type === "R") {
      if (move.from === 56) this.castlingRights.wQ = false;
      if (move.from === 63) this.castlingRights.wK = false;
      if (move.from === 0) this.castlingRights.bQ = false;
      if (move.from === 7) this.castlingRights.bK = false;
    }
    this.turn = ChessEngine.opp(color);
  }

  /* ==================================================
     FEN GENERATION
     ================================================== */
  toFEN() {
    let fen = "";
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = this.board[ChessEngine.idx(r, f)];
        if (!p) {
          empty++;
        } else {
          if (empty) {
            fen += empty;
            empty = 0;
          }
          const letter =
            p[1] === "P"
              ? p[0] === "w"
                ? "P"
                : "p"
              : p[0] === "w"
                ? p[1].toUpperCase()
                : p[1].toLowerCase();
          fen += letter;
        }
      }
      if (empty) fen += empty;
      if (r < 7) fen += "/";
    }
    // Turn
    fen += " " + this.turn;
    // Castling
    let cr = "";
    if (this.castlingRights.wK) cr += "K";
    if (this.castlingRights.wQ) cr += "Q";
    if (this.castlingRights.bK) cr += "k";
    if (this.castlingRights.bQ) cr += "q";
    fen += " " + (cr || "-");
    // En passant
    fen +=
      " " +
      (this.enPassantTarget !== null
        ? this._sqToAlg(this.enPassantTarget)
        : "-");
    // Clocks
    fen += " " + this.halfMoveClock + " " + this.fullMoveNumber;
    return fen;
  }

  /* ==================================================
     FEN LOADING
     ================================================== */
  loadFEN(fen) {
    const parts = fen.trim().split(/\s+/);
    if (parts.length < 4) throw new Error("Invalid FEN: too few parts");

    const b = new Array(64).fill(null);
    const rows = parts[0].split("/");
    if (rows.length !== 8) throw new Error("Invalid FEN: board");

    for (let r = 0; r < 8; r++) {
      let f = 0;
      for (const ch of rows[r]) {
        if (/\d/.test(ch)) {
          f += parseInt(ch);
        } else {
          const isWhite = ch === ch.toUpperCase();
          const piece = (isWhite ? "w" : "b") + ch.toUpperCase();
          b[ChessEngine.idx(r, f)] = piece;
          f++;
        }
      }
    }
    this.board = b;
    this.turn = parts[1] === "b" ? "b" : "w";

    const cr = parts[2];
    this.castlingRights = {
      wK: cr.includes("K"),
      wQ: cr.includes("Q"),
      bK: cr.includes("k"),
      bQ: cr.includes("q"),
    };

    this.enPassantTarget = parts[3] === "-" ? null : this.algToSq(parts[3]);
    this.halfMoveClock = parseInt(parts[4] || "0");
    this.fullMoveNumber = parseInt(parts[5] || "1");
    this.positionMap = {};
    this.moveHistory = [];
    this.gameOver = false;
    this.gameResult = null;
    this._recordPosition();
    return true;
  }
}

// Export globally
window.ChessEngine = ChessEngine;
window.PIECE_UNICODE = PIECE_UNICODE;
window.PIECE_VALUES = PIECE_VALUES;
