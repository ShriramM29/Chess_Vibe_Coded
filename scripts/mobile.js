/**
 * WebChess Pro — Mobile UI Enhancements (mobile.js)
 * Handles: mobile nav overlay, mobile player strip sync, mobile quick controls,
 * touch drag-and-drop improvements, and safe area handling.
 */

'use strict';

/* =================================================================
   MOBILE NAV OVERLAY
   ================================================================= */
(function initMobileNav() {
  const overlay  = document.getElementById('mobile-nav-overlay');
  const menuBtn  = document.getElementById('btn-mobile-menu');
  const closeBtn = document.getElementById('btn-mobile-nav-close');

  if (!overlay || !menuBtn) return;

  function openMenu() {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  menuBtn.addEventListener('click', openMenu);
  closeBtn?.addEventListener('click', closeMenu);

  // Close when tapping backdrop
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeMenu();
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeMenu();
  });

  // Wire mobile nav mode buttons to main nav buttons (delegate to desktop buttons)
  overlay.querySelectorAll('.mob-nav-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      const desktopIdMap = {
        pvp:      'btn-mode-pvp',
        pvai:     'btn-mode-pvai',
        puzzle:   'btn-mode-puzzle',
        analysis: 'btn-mode-analysis'
      };
      const desktopBtn = document.getElementById(desktopIdMap[mode]);
      if (desktopBtn) desktopBtn.click();

      // Update active state in mobile nav
      overlay.querySelectorAll('.mob-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      closeMenu();
    });
  });

  // Wire action buttons
  document.getElementById('mob-btn-new-game')?.addEventListener('click', () => {
    document.getElementById('btn-new-game')?.click();
    closeMenu();
  });
  document.getElementById('mob-btn-stats')?.addEventListener('click', () => {
    document.getElementById('btn-stats')?.click();
    closeMenu();
  });
  document.getElementById('mob-btn-settings')?.addEventListener('click', () => {
    document.getElementById('btn-settings')?.click();
    closeMenu();
  });

  // Keep mobile nav active state in sync with desktop nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Map desktop button IDs to mode
      const idToMode = {
        'btn-mode-pvp':      'pvp',
        'btn-mode-pvai':     'pvai',
        'btn-mode-puzzle':   'puzzle',
        'btn-mode-analysis': 'analysis'
      };
      const mode = idToMode[btn.id];
      if (!mode) return;
      overlay.querySelectorAll('.mob-nav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === mode);
      });
    });
  });
})();

/* =================================================================
   MOBILE QUICK CONTROLS
   Wire mobile quick-control buttons to the existing desktop buttons
   ================================================================= */
(function initMobileQuickControls() {
  const map = {
    'mob-btn-new-game-quick': 'btn-new-game',
    'mob-btn-undo':           'btn-undo',
    'mob-btn-flip':           'btn-flip-board',
    'mob-btn-hint-quick':     'btn-hint',
    'mob-btn-resign':         'btn-resign'
  };
  Object.entries(map).forEach(([mobId, desktopId]) => {
    document.getElementById(mobId)?.addEventListener('click', () => {
      document.getElementById(desktopId)?.click();
    });
  });
})();

/* =================================================================
   MOBILE PLAYER STRIP SYNC
   Keep mobile player strips updated in sync with the desktop player cards
   ================================================================= */
const MobilePlayerSync = {
  _observer: null,

  init() {
    // Initial sync
    this.sync();

    // Watch for changes using MutationObserver on the desktop elements
    this._observer = new MutationObserver(() => this.sync());

    const targets = [
      'player-white-name', 'player-black-name',
      'timer-white-display', 'timer-black-display',
      'captured-black-pieces', 'captured-white-pieces',
      'material-white', 'material-black',
      'timer-white', 'timer-black',
      'player-white-card', 'player-black-card'
    ];

    targets.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        this._observer.observe(el, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ['class']
        });
      }
    });
  },

  sync() {
    // Sync player names
    const whiteName = document.getElementById('player-white-name')?.textContent || 'White';
    const blackName = document.getElementById('player-black-name')?.textContent || 'Black';
    const mobWhName = document.getElementById('mob-player-white-name');
    const mobBlName = document.getElementById('mob-player-black-name');
    if (mobWhName) mobWhName.textContent = whiteName;
    if (mobBlName) mobBlName.textContent = blackName;

    // Sync timers
    const whiteTime = document.getElementById('timer-white-display')?.textContent || '∞';
    const blackTime = document.getElementById('timer-black-display')?.textContent || '∞';
    const mobWhTimer = document.getElementById('mob-timer-white-display');
    const mobBlTimer = document.getElementById('mob-timer-black-display');
    if (mobWhTimer) mobWhTimer.textContent = whiteTime;
    if (mobBlTimer) mobBlTimer.textContent = blackTime;

    // Sync low-time warning on timer
    const wTimerWrap = document.getElementById('timer-white');
    const bTimerWrap = document.getElementById('timer-black');
    const mobWTimerWrap = document.getElementById('mob-timer-white');
    const mobBTimerWrap = document.getElementById('mob-timer-black');
    if (mobWTimerWrap && wTimerWrap) {
      mobWTimerWrap.classList.toggle('low-time', wTimerWrap.classList.contains('low-time'));
    }
    if (mobBTimerWrap && bTimerWrap) {
      mobBTimerWrap.classList.toggle('low-time', bTimerWrap.classList.contains('low-time'));
    }

    // Sync captured pieces (show emoji count summary)
    const capturedByWhite = document.getElementById('captured-black-pieces')?.innerHTML || '';
    const capturedByBlack = document.getElementById('captured-white-pieces')?.innerHTML || '';
    const materialWhite = document.getElementById('material-white')?.textContent || '';
    const materialBlack = document.getElementById('material-black')?.textContent || '';

    const mobCapWhite = document.getElementById('mob-captured-white');
    const mobCapBlack = document.getElementById('mob-captured-black');
    if (mobCapWhite) {
      mobCapWhite.innerHTML = capturedByWhite;
      if (materialWhite) mobCapWhite.innerHTML += ` <strong>${materialWhite}</strong>`;
    }
    if (mobCapBlack) {
      mobCapBlack.innerHTML = capturedByBlack;
      if (materialBlack) mobCapBlack.innerHTML += ` <strong>${materialBlack}</strong>`;
    }

    // Sync active turn highlight on mobile strips
    const whiteCard = document.getElementById('player-white-card');
    const blackCard = document.getElementById('player-black-card');
    const mobWhStrip = document.getElementById('mobile-white-strip');
    const mobBlStrip = document.getElementById('mobile-black-strip');

    if (mobWhStrip && whiteCard) {
      mobWhStrip.classList.toggle('active-turn', whiteCard.classList.contains('active-turn'));
    }
    if (mobBlStrip && blackCard) {
      mobBlStrip.classList.toggle('active-turn', blackCard.classList.contains('active-turn'));
    }
  }
};

/* =================================================================
   TOUCH IMPROVEMENTS
   Prevent double-tap zoom on game controls & board
   ================================================================= */
(function initTouchImprovements() {
  // Prevent double-tap zoom on interactive elements
  const selectors = [
    '.sq', '.piece', '.ctrl-btn', '.mob-ctrl-btn',
    '.nav-btn', '.tab-btn', '.replay-btn', '.icon-btn',
    '.promo-btn', '.time-preset-btn', '.modal-btn'
  ];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.style.touchAction = 'manipulation';
    });
  });

  // Prevent page scroll when interacting with the board
  const board = document.getElementById('chessboard');
  if (board) {
    board.addEventListener('touchstart', e => {
      e.preventDefault();
    }, { passive: false });
    board.addEventListener('touchmove', e => {
      e.preventDefault();
    }, { passive: false });
  }

  // Add touch-action manipulation to the chessboard wrapper
  const wrapper = document.getElementById('board-wrapper');
  if (wrapper) {
    wrapper.style.touchAction = 'none';
  }
})();

/* =================================================================
   SAFE AREA / VIEWPORT FIXES
   Handle iOS safe areas and dynamic viewport height
   ================================================================= */
(function initViewportFix() {
  // Set --dvh custom property for true mobile viewport height
  function setDVH() {
    const dvh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--dvh', `${dvh}px`);
  }
  setDVH();
  window.addEventListener('resize', setDVH, { passive: true });
  window.addEventListener('orientationchange', () => {
    setTimeout(setDVH, 150); // delay for orientation to settle
  });
})();

/* =================================================================
   INITIALIZE
   Wait for DOMContentLoaded (or run immediately if already ready)
   ================================================================= */
function initMobileEnhancements() {
  MobilePlayerSync.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileEnhancements);
} else {
  initMobileEnhancements();
}
