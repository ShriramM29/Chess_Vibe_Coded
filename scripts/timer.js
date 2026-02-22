/**
 * WebChess Pro — Timer Engine (timer.js)
 * Manages per-player countdown timers with increment support.
 */

'use strict';

class ChessTimer {
  constructor(onTick, onFlag) {
    this.times    = { w: 0, b: 0 };   // seconds remaining
    this.inc      = { w: 0, b: 0 };   // increment per move (seconds)
    this.active   = null;              // 'w' | 'b' | null
    this._timer   = null;
    this._lastTick= null;
    this.onTick   = onTick   || (() => {});
    this.onFlag   = onFlag   || (() => {});
    this.enabled  = false;
  }

  /** Configure timer with minutes and increment seconds */
  setup(totalSeconds, incrementSeconds = 0) {
    if (totalSeconds <= 0) {
      this.enabled = false;
      return;
    }
    this.enabled = true;
    this.times = { w: totalSeconds, b: totalSeconds };
    this.inc   = { w: incrementSeconds, b: incrementSeconds };
    this.active = null;
    this._clearInterval();
  }

  /** Apply increment after a move */
  addIncrement(color) {
    if (!this.enabled) return;
    this.times[color] += this.inc[color];
  }

  /** Start timer for given color */
  start(color) {
    if (!this.enabled) return;
    this._clearInterval();
    this.active   = color;
    this._lastTick = performance.now();
    this._timer   = setInterval(() => this._tick(), 100);
  }

  /** Pause the active timer */
  pause() {
    this._clearInterval();
    this.active = null;
  }

  /** Switch active timer to opposite color (called after a move) */
  switch(colorJustMoved) {
    if (!this.enabled) return;
    this.addIncrement(colorJustMoved);
    const next = colorJustMoved === 'w' ? 'b' : 'w';
    this.start(next);
  }

  /** Stop timer completely */
  stop() {
    this._clearInterval();
    this.active = null;
  }

  _tick() {
    if (!this.active) return;
    const now  = performance.now();
    const dt   = (now - this._lastTick) / 1000;
    this._lastTick = now;
    this.times[this.active] -= dt;

    if (this.times[this.active] <= 0) {
      this.times[this.active] = 0;
      this._clearInterval();
      this.onFlag(this.active);
    }
    this.onTick(this.times);
  }

  _clearInterval() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  /** Format seconds → mm:ss */
  static format(seconds) {
    if (seconds <= 0) return '0:00';
    const s = Math.ceil(seconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  /** Format seconds → mm:ss.t (tenths for < 20 seconds) */
  static formatPrecise(seconds) {
    if (seconds <= 0) return '0:00.0';
    if (seconds < 20) {
      const t = Math.floor(seconds * 10);
      const s = Math.floor(t / 10);
      const tenth = t % 10;
      return `0:${s.toString().padStart(2,'0')}.${tenth}`;
    }
    return ChessTimer.format(seconds);
  }

  getTime(color) { return this.times[color]; }
}

window.ChessTimer = ChessTimer;
