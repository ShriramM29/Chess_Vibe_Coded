/**
 * WebChess Pro — Board Renderer (board.js)
 * Renders the 8x8 board, pieces, highlights.
 * Handles click-to-move and drag-and-drop interactions.
 */

'use strict';

class BoardRenderer {
  constructor(containerId, options = {}) {
    this.container    = document.getElementById(containerId);
    this.flipped      = false;
    this.selectedSq   = null;
    this.legalTargets = [];
    this.lastMove     = null;      // { from, to }
    this.checkSq      = null;      // square of king in check
    this.hintSqs      = null;      // { from, to }
    this.showCoords   = options.showCoords !== false;
    this.highlightMoves = options.highlightMoves !== false;
    this.highlightLast  = options.highlightLast  !== false;
    this.animate        = options.animate !== false;

    this.onSquareClick = null;     // callback(sq)
    this.onDrop        = null;     // callback(fromSq, toSq)

    this._dragFrom = null;
    this._dragEl   = null;

    this._buildBoard();
    this._buildCoords();
  }

  /* ---- Build DOM ---- */
  _buildBoard() {
    this.container.innerHTML = '';
    this.squares = [];
    for (let i = 0; i < 64; i++) {
      const sq = document.createElement('div');
      sq.id = 'sq-' + i;
      sq.className = 'sq ' + ((Math.floor(i / 8) + i) % 2 === 0 ? 'light' : 'dark');
      sq.dataset.sq = i;
      sq.setAttribute('role', 'gridcell');
      sq.addEventListener('click',     e => this._handleClick(parseInt(sq.dataset.sq)));
      sq.addEventListener('dragover',  e => { e.preventDefault(); sq.classList.add('dragging-over'); });
      sq.addEventListener('dragleave', e => sq.classList.remove('dragging-over'));
      sq.addEventListener('drop',      e => { e.preventDefault(); sq.classList.remove('dragging-over'); this._handleDrop(parseInt(sq.dataset.sq)); });
      this.container.appendChild(sq);
      this.squares.push(sq);
    }
  }

  _buildCoords() {
    const rankEl = document.getElementById('coords-rank');
    const fileEl = document.getElementById('coords-file');
    if (!rankEl || !fileEl) return;
    rankEl.innerHTML = '';
    fileEl.innerHTML = '';
    const ranks = this.flipped ? ['1','2','3','4','5','6','7','8'] : ['8','7','6','5','4','3','2','1'];
    const files = this.flipped ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h'];
    ranks.forEach(r => { const s = document.createElement('span'); s.className = 'coord-label'; s.textContent = r; rankEl.appendChild(s); });
    files.forEach(f => { const s = document.createElement('span'); s.className = 'coord-label'; s.textContent = f; fileEl.appendChild(s); });
  }

  /* ---- Render ---- */
  render(board, options = {}) {
    const { lastMove, checkSq, hintSqs } = options;
    this.lastMove = lastMove || null;
    this.checkSq  = checkSq  || null;
    this.hintSqs  = hintSqs  || null;

    for (let visual = 0; visual < 64; visual++) {
      const sq    = this.flipped ? 63 - visual : visual;
      const sqEl  = this.squares[visual];
      const piece = board[sq];

      // Reset classes
      sqEl.className = 'sq ' + ((Math.floor(visual / 8) + visual) % 2 === 0 ? 'light' : 'dark');

      // Highlights
      if (this.highlightLast && this.lastMove) {
        const vFrom = this.flipped ? 63 - this.lastMove.from : this.lastMove.from;
        const vTo   = this.flipped ? 63 - this.lastMove.to   : this.lastMove.to;
        if (visual === vFrom || visual === vTo) sqEl.classList.add('highlight-last');
      }

      if (this.selectedSq !== null) {
        const vSel = this.flipped ? 63 - this.selectedSq : this.selectedSq;
        if (visual === vSel) sqEl.classList.add('selected');
      }

      if (this.highlightMoves && this.legalTargets.length) {
        const vLegal = this.legalTargets.map(s => this.flipped ? 63 - s : s);
        if (vLegal.includes(visual)) {
          sqEl.classList.add(board[sq] ? 'highlight-capture' : 'highlight-legal');
        }
      }

      if (this.checkSq !== null) {
        const vCheck = this.flipped ? 63 - this.checkSq : this.checkSq;
        if (visual === vCheck) sqEl.classList.add('highlight-check');
      }

      if (this.hintSqs) {
        const vHFrom = this.flipped ? 63 - this.hintSqs.from : this.hintSqs.from;
        const vHTo   = this.flipped ? 63 - this.hintSqs.to   : this.hintSqs.to;
        if (visual === vHFrom || visual === vHTo) sqEl.classList.add('hint-sq');
      }

      // Render piece
      sqEl.innerHTML = '';
      if (piece) {
        const pieceEl = document.createElement('span');
        pieceEl.className   = 'piece';
        pieceEl.textContent = PIECE_UNICODE[piece] || '';
        pieceEl.dataset.piece = piece;
        pieceEl.dataset.color = piece[0];
        pieceEl.dataset.sq    = sq;
        pieceEl.draggable     = true;
        pieceEl.setAttribute('aria-label', this._pieceName(piece) + ' on ' + this._sqName(sq));

        pieceEl.addEventListener('dragstart', e => {
          this._dragFrom = sq;
          pieceEl.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', sq);
          // Select square on drag start
          if (this.onSquareClick) this.onSquareClick(sq);
        });
        pieceEl.addEventListener('dragend', () => {
          pieceEl.classList.remove('dragging');
          this._dragFrom = null;
        });

        sqEl.appendChild(pieceEl);
        if (this.animate) pieceEl.classList.add('piece-animated');
      }
    }
  }

  /* ---- Selection & Highlights ---- */
  setSelection(sq, legalTargets) {
    this.selectedSq   = sq;
    this.legalTargets = legalTargets || [];
  }

  clearSelection() {
    this.selectedSq   = null;
    this.legalTargets = [];
    this.hintSqs      = null;
  }

  /* ---- Click / Drop handlers ---- */
  _handleClick(visualSq) {
    const sq = this.flipped ? 63 - visualSq : visualSq;
    if (this.onSquareClick) this.onSquareClick(sq);
  }

  _handleDrop(visualSq) {
    const toSq   = this.flipped ? 63 - visualSq : visualSq;
    const fromSq = this._dragFrom;
    this._dragFrom = null;
    if (fromSq !== null && fromSq !== toSq && this.onDrop) {
      this.onDrop(fromSq, toSq);
    }
  }

  /* ---- Flip ---- */
  flip() {
    this.flipped = !this.flipped;
    this._buildCoords();
  }

  /* ---- Helpers ---- */
  _pieceName(piece) {
    const names = { K:'King', Q:'Queen', R:'Rook', B:'Bishop', N:'Knight', P:'Pawn' };
    const colors = { w:'White', b:'Black' };
    return (colors[piece[0]] || '') + ' ' + (names[piece[1]] || '');
  }

  _sqName(sq) {
    return 'abcdefgh'[sq % 8] + String(8 - Math.floor(sq / 8));
  }

  /** Update only coordinate visibility */
  setCoordinatesVisible(visible) {
    const r = document.getElementById('coords-rank');
    const f = document.getElementById('coords-file');
    if (r) r.style.display = visible ? 'flex' : 'none';
    if (f) f.style.display = visible ? 'flex' : 'none';
  }
}

window.BoardRenderer = BoardRenderer;
