import * as THREE from 'three';
export default class KeyboardControls {
  /**
   * options:
   *  - controls: PointerLockControls (optional) — used to lock on first key press
   *  - resetCallback: function (optional) — called when 'KeyR' is pressed
   *  - damping: number (optional) — larger = snappier (time constant for exponential smoothing)
   *  - deadzone: number (optional) — values smaller than this get snapped to zero
   */
  constructor({
    controls = null,
    resetCallback = null,
    damping = 10,
    deadzone = 1e-3,
  } = {}) {
    this.controls = controls;
    this.resetCallback = resetCallback;

    // `input` is the smoothed value used by the rest of code.
    this.input = new THREE.Vector3(0, 0, 0);

    // `target` is set immediately on key down/up and the input eases toward it.
    this.target = new THREE.Vector3(0, 0, 0);

    // smoothing parameter (time constant). Use update(delta) to apply smoothing.
    this.damping = damping;
    this.deadzone = deadzone;

    this.jumpPressed = false;

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);

    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
  }

  onKeyDown(event) {
    if (this.controls && !this.controls.isLocked) {
      this.controls.lock();
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

  /**
   * Call each frame with the frame time in seconds.
   * Example: keyboardControls.update(deltaSeconds)
   */
  update(delta) {
    if (delta <= 0) return;

    // Exponential smoothing: alpha = 1 - exp(-damping * dt)
    const alpha = 1 - Math.exp(-this.damping * delta);

    // Smooth each axis (Vector3.lerp uses alpha in [0,1])
    this.input.lerp(this.target, alpha);

    // Snap nearly-zero values to zero to avoid tiny lingering values
    if (Math.abs(this.input.x) < this.deadzone) this.input.x = 0;
    if (Math.abs(this.input.y) < this.deadzone) this.input.y = 0;
    if (Math.abs(this.input.z) < this.deadzone) this.input.z = 0;
  }

  dispose() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    this.controls = null;
    this.resetCallback = null;
  }
}
