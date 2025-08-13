import * as THREE from 'three';
export default class KeyboardControls {
  constructor({
    controls = null,
    resetCallback = null,
    damping = 10,
    deadzone = 1e-3,
  } = {}) {
    this.controls = controls;
    this.resetCallback = resetCallback;

    this.input = new THREE.Vector3(0, 0, 0);
    this.target = new THREE.Vector3(0, 0, 0);

    this.damping = damping;
    this.deadzone = deadzone;

    this.jumpPressed = false;

    // bind handlers so we can remove them on dispose
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this._onWindowBlur = this._onWindowBlur.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);

    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);

    // Reset inputs when page hidden or window blurred to avoid stuck state
    window.addEventListener('blur', this._onWindowBlur);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  onKeyDown(event) {
    // Only attempt pointer lock if the document/window is focused.
    // Some browsers block pointerLock requests when focus/visibility isn't right.
    if (this.controls && !this.controls.isLocked && document.hasFocus()) {
      try {
        this.controls.lock();
      } catch (e) {
        // ignore - request may be blocked by browser policy
      }
    }

    switch (event.code) {
      case 'KeyA':
        this.target.x = -1;
        break;
      case 'KeyD':
        this.target.x = 1;
        break;
      case 'KeyW':
        this.target.z = 1;
        break;
      case 'KeyS':
        this.target.z = -1;
        break;
      case 'KeyR':
        if (typeof this.resetCallback === 'function') {
          this.resetCallback();
        }
        break;
      case 'Space':
        this.jumpPressed = true;
        break;
      default:
        break;
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case 'KeyA':
      case 'KeyD':
        this.target.x = 0;
        break;
      case 'KeyW':
      case 'KeyS':
        this.target.z = 0;
        break;
      default:
        break;
    }
  }

  consumeJump() {
    const j = this.jumpPressed;
    this.jumpPressed = false;
    return j;
  }

  update(delta) {
    if (delta <= 0) return;

    const alpha = 1 - Math.exp(-this.damping * delta);
    this.input.lerp(this.target, alpha);

    if (Math.abs(this.input.x) < this.deadzone) this.input.x = 0;
    if (Math.abs(this.input.y) < this.deadzone) this.input.y = 0;
    if (Math.abs(this.input.z) < this.deadzone) this.input.z = 0;
  }

  /**
   * Reset input state (useful on blur/visibilitychange).
   */
  resetInput() {
    this.target.set(0, 0, 0);
    this.input.set(0, 0, 0);
    this.jumpPressed = false;
  }

  _onWindowBlur() {
    // clear input so a stuck keyup (that we missed) doesn't hang movement
    this.resetInput();
  }

  _onVisibilityChange() {
    if (document.hidden) {
      this.resetInput();
    }
  }

  dispose() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this._onWindowBlur);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    this.controls = null;
    this.resetCallback = null;
  }
}
