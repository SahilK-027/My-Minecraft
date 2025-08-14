import EventEmitter from './EventEmitter.class';

export default class Time extends EventEmitter {
  constructor(autoStart = false) {
    super();

    this.start = performance.now();
    this.current = this.start;
    this.elapsedTime = 0;
    this.delta = 0;

    this.isPaused = true;
    this.rafId = null;

    this.animate = this.animate.bind(this);

    if (autoStart) {
      this.startLoop();
    }
  }

  startLoop() {
    if (!this.isPaused) return;
    this.isPaused = false;

    this.current = performance.now();
    this.rafId = window.requestAnimationFrame(this.animate);
  }

  stopLoop() {
    if (this.rafId != null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isPaused = true;
    this.delta = 0;
  }

  animate(timestamp) {
    if (this.isPaused) return;

    const currentTime =
      typeof timestamp === 'number' ? timestamp : performance.now();

    this.delta = (currentTime - this.current) / 1000;
    this.delta = Math.min(this.delta, 0.1);

    this.current = currentTime;
    this.elapsedTime = (this.current - this.start) / 1000;

    try {
      this.trigger('animate');
    } catch (err) {
      console.warn('Error in animate handler:', err);
    }

    if (!this.isPaused) {
      this.rafId = window.requestAnimationFrame(this.animate);
    }
  }
}
