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
    this.sprintPressed = false;

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);

    this._listenersAttached = false;

    this.resume();
  }

  onKeyDown(event) {
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
      case 'ShiftLeft':
      case 'ShiftRight':
        this.sprintPressed = true;
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
      case 'ShiftLeft':
      case 'ShiftRight':
        this.sprintPressed = false;
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

  pause() {
    if (!this._listenersAttached) return;
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    this._listenersAttached = false;
  }

  resume() {
    if (this._listenersAttached) return;
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    this._listenersAttached = true;
  }

  dispose() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);

    this.controls = null;
    this.resetCallback = null;
  }
}
