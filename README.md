# WebChess Pro

**A fully functional, production-ready chess web application built with HTML, CSS, and JavaScript.**

![WebChess Pro](https://img.shields.io/badge/WebChess-Pro-blueviolet?style=for-the-badge)
![No Dependencies](https://img.shields.io/badge/Dependencies-None-green?style=for-the-badge)
![Browser](https://img.shields.io/badge/Runs%20In-Browser-orange?style=for-the-badge)

---

## 📁 Project Structure

```
Chess/
├── index.html                  — Main HTML entry point
├── styles/
│   ├── style.css               — Core styles, layout, UI components
│   └── themes.css              — Board & piece theme definitions
├── scripts/
│   ├── engine.js               — Complete chess rules engine
│   ├── ai.js                   — Minimax AI with alpha-beta pruning
│   ├── timer.js                — Countdown timer engine
│   ├── pgn.js                  — PGN import/export
│   ├── fen.js                  — FEN import/export/validation
│   ├── storage.js              — localStorage persistence
│   ├── puzzle.js               — Puzzle mode & database
│   ├── analysis.js             — Analysis & replay manager
│   ├── board.js                — Board renderer + drag-and-drop
│   ├── ui.js                   — UI manager (modals, toasts, panels)
│   └── main.js                 — Application orchestrator
├── assets/
│   ├── pieces/                 — (optional custom piece images)
│   └── sounds/                 — (optional custom sound files)
├── PRODUCT_SPEC.md
├── SYSTEM_DESIGN.md
└── IMPLEMENTATION_GUIDE.md
```

---

## 🚀 Running the Application

### Option 1 — Open Directly (Simplest)

Just open `index.html` in any modern browser:

```
Double-click  →  index.html
```

Or drag the file into Chrome/Edge/Firefox/Safari.

### Option 2 — Local Development Server (Recommended)

Using Python (built-in):

```bash
# Python 3
cd d:\Projects\Chess
python -m http.server 8080
# Open: http://localhost:8080
```

Using Node.js:

```bash
cd d:\Projects\Chess
npx -y serve .
# Open the URL shown in terminal
```

Using VS Code:

- Install the **Live Server** extension
- Right-click `index.html` → **Open with Live Server**

---

## ✨ Features Implemented

| Feature                                   | Status |
| ----------------------------------------- | ------ |
| Complete chess rules (all pieces)         | ✅     |
| Castling (king-side & queen-side)         | ✅     |
| En passant                                | ✅     |
| Pawn promotion with UI selector           | ✅     |
| Check/checkmate detection                 | ✅     |
| Stalemate detection                       | ✅     |
| Threefold repetition draw                 | ✅     |
| 50-move rule draw                         | ✅     |
| Insufficient material draw                | ✅     |
| Player vs Player (local)                  | ✅     |
| Player vs AI (5 difficulty levels)        | ✅     |
| Minimax with alpha-beta pruning           | ✅     |
| Piece-square table evaluation             | ✅     |
| Time controls (Bullet/Blitz/Rapid/Custom) | ✅     |
| Increment per move                        | ✅     |
| Time flag detection                       | ✅     |
| PGN export                                | ✅     |
| PGN import                                | ✅     |
| FEN export                                | ✅     |
| FEN import with validation                | ✅     |
| FEN preset positions                      | ✅     |
| Legal move highlighting                   | ✅     |
| Last move highlighting                    | ✅     |
| Check square highlighting                 | ✅     |
| Captured pieces display                   | ✅     |
| Material advantage indicator              | ✅     |
| Board flip                                | ✅     |
| Undo move                                 | ✅     |
| Resign                                    | ✅     |
| Draw claim                                | ✅     |
| Move hint                                 | ✅     |
| Click-to-move                             | ✅     |
| Drag-and-drop                             | ✅     |
| Puzzle mode (15 built-in puzzles)         | ✅     |
| Puzzle hint + solution reveal             | ✅     |
| Puzzle streak tracking                    | ✅     |
| Analysis mode                             | ✅     |
| Game replay / move navigation             | ✅     |
| Autoplay replay                           | ✅     |
| Evaluation bar                            | ✅     |
| 6 board themes                            | ✅     |
| 3 piece themes                            | ✅     |
| Dark / Light / Midnight app themes        | ✅     |
| Procedural sound effects (Web Audio API)  | ✅     |
| Statistics tracking                       | ✅     |
| Game history                              | ✅     |
| localStorage persistence                  | ✅     |
| Keyboard shortcuts                        | ✅     |
| Responsive design (mobile + desktop)      | ✅     |
| No backend required                       | ✅     |

---

## ⌨️ Keyboard Shortcuts

| Key            | Action                          |
| -------------- | ------------------------------- |
| `←` / `→`      | Previous / Next move (analysis) |
| `Home` / `End` | First / Last move (analysis)    |
| `F`            | Flip board                      |
| `U`            | Undo last move                  |
| `N`            | New game dialog                 |
| `Escape`       | Close any modal                 |

---

## 🎮 Game Modes

### Player vs Player

Two players on the same device. Full chess rules enforced.

### Player vs AI

Choose difficulty 1–5 (depth 1–5 minimax search).
AI uses piece-square tables, material evaluation, and alpha-beta pruning.

### Puzzle Mode

15 built-in tactical puzzles ranging from rating 800 to 1800.
Themes: mate-in-1, forks, sacrifices, back-rank mates, and more.

### Analysis Mode

Import any PGN or FEN and step through positions with evaluation bar.
Supports autoplay and jump-to-any-move navigation.

---

## 🌐 Deployment

### GitHub Pages

1. Push the project to a GitHub repository
2. Go to **Settings → Pages**
3. Set source to the `main` branch (root `/`)
4. Access at: `https://yourusername.github.io/Chess/`

### Netlify

```bash
# Drag-and-drop the Chess/ folder to netlify.com/drop
# OR use CLI:
npm install -g netlify-cli
netlify deploy --dir=. --prod
```

### Vercel

```bash
npm install -g vercel
cd d:\Projects\Chess
vercel --prod
```

### Any Static Host

Upload all files maintaining the directory structure. No server-side code required.

---

## 🛠️ Browser Compatibility

| Browser | Version | Status             |
| ------- | ------- | ------------------ |
| Chrome  | 90+     | ✅ Fully supported |
| Edge    | 90+     | ✅ Fully supported |
| Firefox | 88+     | ✅ Fully supported |
| Safari  | 14+     | ✅ Fully supported |

---

## 🏗️ Architecture

```
User Action
    ↓
BoardRenderer (click/drag event)
    ↓
main.js (App orchestrator)
    ↓
ChessEngine (validate + execute move)
    ↓
UIManager (update DOM)
    ↓
ChessTimer (tick / switch player)
    ↓
ChessAI (minimax, async) ← triggers on AI turn
    ↓
StorageManager (persist stats/prefs)
```

---

## 📝 Notes

- **Sound**: Uses Web Audio API procedurally (no audio files needed). First interaction unlocks audio context.
- **AI Performance**: Depth 3–4 is recommended for a good play experience. Depth 5 may take 1–3 seconds on complex positions.
- **Puzzles**: Can be extended by adding entries to `PUZZLE_DB` in `puzzle.js`.
- **Offline**: Works completely offline after first load (no CDN dependencies except Google Fonts).
"# Chess_Vibe_Coded" 
"# Chess_Vibe_Coded" 
