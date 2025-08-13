import * as THREE from 'three';
import Game from '../Game.class';
import DebugGUI from '../Utils/DebugGUI';
import KeyboardControls from '../Input/Keyboard.class';

export default class Player {
  maxSpeed = 6.0;
  radius = 0.5;
  height = 1.75;
  jumpSpeed = 8.5;
  onGround = false;

  // sprint system
  sprintMaxDuration = 5.0; // seconds of continuous sprint allowed (stamina capacity)
  sprintCooldownDuration = 10.0; // seconds of slowdown after max sprint used
  cooldownSlowMultiplier = 0.5; // speed multiplier during cooldown (slowed)
  sprintSpeedMultiplier = 1.2; // sprint speed multiplier while sprinting
  sprintRecoverRate = 1.0; // how many seconds of used sprint recover per real second when not holding shift
  #sprintTimer = 0; // counts used sprint time (0..sprintMaxDuration). Higher means less available.
  #cooldownTimer = 0; // counts cooldown time
  #isInCooldown = false;

  velocity = new THREE.Vector3();
  #worldVelocity = new THREE.Vector3();

  constructor(FPPCamera, controls) {
    this.FPPCamera = FPPCamera;
    this.controls = controls;

    this.game = Game.getInstance();
    this.scene = this.game.scene;
    this.resources = this.game.resources;
    this.debug = DebugGUI.getInstance();
    this.isDebugMode = this.game.isDebugMode;

    this.isPaused = false;

    this.keyboard = new KeyboardControls({
      controls: this.controls,
      resetCallback: () => {
        this.playerPosition.set(25, 25, 25);
        this.velocity.set(0, 0, 0);
        this.#sprintTimer = 0;
        this.#cooldownTimer = 0;
        this.#isInCooldown = false;
      },
    });

    this.playerPosition.set(25, 25, 25);
    this.scene.add(this.FPPCamera);

    if (this.isDebugMode) {
      this.boundsHelper = new THREE.Mesh(
        new THREE.CapsuleGeometry(this.radius, this.height, 16, 16, 16),
        new THREE.MeshToonMaterial({ color: 'red', wireframe: true })
      );
      this.scene.add(this.boundsHelper);

      this.initGUI();
    }
  }

  get worldVelocity() {
    this.#worldVelocity.copy(this.velocity);
    this.#worldVelocity.applyEuler(
      new THREE.Euler(0, this.FPPCamera.rotation.y, 0)
    );
    return this.#worldVelocity;
  }

  applyWorldDeltaVelocity(dv) {
    dv.applyEuler(new THREE.Euler(0, -this.FPPCamera.rotation.y, 0));
    this.velocity.add(dv);
  }

  applyInputs(delta) {
    if (this.isPaused) return;

    if (this.controls.isLocked) {
      this._createSprintUI();

      this.keyboard.update(delta);

      const sprintHeld = !!this.keyboard.sprintPressed;

      if (this.#isInCooldown) {
        this.#cooldownTimer += delta;
        if (this.#cooldownTimer >= this.sprintCooldownDuration) {
          this.#isInCooldown = false;
          this.#cooldownTimer = 0;
          this.#sprintTimer = 0;
        }
      } else {
        if (sprintHeld) {
          this.#sprintTimer += delta;
          if (this.#sprintTimer >= this.sprintMaxDuration) {
            this.#sprintTimer = this.sprintMaxDuration;
            this.#isInCooldown = true;
            this.#cooldownTimer = 0;
          }
        } else {
          this.#sprintTimer -= this.sprintRecoverRate * delta;
          if (this.#sprintTimer < 0) this.#sprintTimer = 0;
        }
      }

      // determine speed multiplier:
      // - if in cooldown: slowed regardless of Shift
      // - if not in cooldown and shift held and there is available stamina: sprint multiplier
      // - otherwise normal speed
      let speedMultiplier = 1;
      const staminaAvailable =
        this.#sprintTimer < this.sprintMaxDuration - 1e-6;
      if (this.#isInCooldown) {
        speedMultiplier = this.cooldownSlowMultiplier;
      } else if (sprintHeld && staminaAvailable) {
        speedMultiplier = this.sprintSpeedMultiplier;
      }

      const currentMaxSpeed = this.maxSpeed * speedMultiplier;

      // local (camera-relative) inputs
      // right
      this.velocity.x = this.keyboard.input.x * currentMaxSpeed;
      // forward
      this.velocity.z = this.keyboard.input.z * currentMaxSpeed;

      if (this.onGround && this.keyboard.consumeJump()) {
        this.velocity.y = this.jumpSpeed;
        this.onGround = false;
      }

      this.playerPosition.y += this.velocity.y * delta;

      this.controls.moveRight(this.velocity.x * delta);
      this.controls.moveForward(this.velocity.z * delta);
    }

    // update HUD / sprint UI
    const coordsEl = document.getElementById('coordinates');
    if (coordsEl) {
      coordsEl.innerHTML = this.playerPositionToString();
      if (this.isDebugMode) {
        const sprintState = this.#isInCooldown
          ? `COOLDOWN (${this.#cooldownTimer.toFixed(2)} / ${
              this.sprintCooldownDuration
            }s)`
          : this.keyboard.sprintPressed
          ? `SPRINT (${this.#sprintTimer.toFixed(2)} / ${
              this.sprintMaxDuration
            }s)`
          : 'NORMAL';
        coordsEl.innerHTML += `<br/>Sprint: ${sprintState}`;
      }
    }

    this._updateSprintUI();
  }

  updateBoundsHelper() {
    if (this.isDebugMode) {
      this.boundsHelper.position.copy(this.playerPosition);
      this.boundsHelper.position.y -= this.height / 2;
    }
  }

  get playerPosition() {
    return this.FPPCamera.position;
  }

  playerPositionToString() {
    let pos = '';
    pos += `x: ${this.playerPosition.x.toFixed(2)} `;
    pos += `y: ${this.playerPosition.y.toFixed(2)} `;
    pos += `z: ${this.playerPosition.z.toFixed(2)} `;

    return pos;
  }

  pause() {
    if (this.isPaused) return;
    this.isPaused = true;

    if (this.keyboard && typeof this.keyboard.pause === 'function') {
      try {
        this.keyboard.pause();
        if (this.isDebugMode) console.log('Player input paused');
      } catch (e) {
        console.warn(e);
      }
    }

    this.velocity.set(0, 0, 0);
  }

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;

    if (this.keyboard && typeof this.keyboard.resume === 'function') {
      try {
        this.keyboard.resume();
        if (this.isDebugMode) console.log('Player input resumed');
      } catch (e) {
        console.warn(e);
      }
    }

    if (this.keyboard) {
      this.keyboard.jumpPressed = false;
      this.keyboard.sprintPressed = false;
    }
  }

  // ---------- Minimal Sprint UI (DOM) ----------
  _createSprintUI() {
    if (document.getElementById('sprint-ui')) return;

    const container = document.createElement('div');
    container.id = 'sprint-ui';
    container.style.position = 'fixed';
    container.style.left = '50%';
    container.style.top = '30%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.width = '220px';
    container.style.padding = '8px';
    container.style.background = 'rgba(0,0,0,0.45)';
    container.style.color = '#fff';
    container.style.fontFamily = 'sans-serif';
    container.style.fontSize = '12px';
    container.style.borderRadius = '6px';
    container.style.zIndex = 9999;
    container.style.userSelect = 'none';

    // label
    const label = document.createElement('div');
    label.style.marginBottom = '6px';
    label.textContent = 'Sprint';
    container.appendChild(label);

    // stamina bar background
    const staminaBg = document.createElement('div');
    staminaBg.style.width = '100%';
    staminaBg.style.height = '10px';
    staminaBg.style.background = 'rgba(255,255,255,0.12)';
    staminaBg.style.borderRadius = '4px';
    staminaBg.style.overflow = 'hidden';
    staminaBg.style.marginBottom = '6px';

    const staminaFill = document.createElement('div');
    staminaFill.id = 'sprint-stamina-fill';
    staminaFill.style.height = '100%';
    staminaFill.style.width = '100%'; // full initially
    staminaFill.style.background = 'linear-gradient(90deg, #8BC34A, #08f364e6)';
    staminaFill.style.transformOrigin = 'left';
    staminaFill.style.transition = 'width 0.08s linear';

    staminaBg.appendChild(staminaFill);
    container.appendChild(staminaBg);

    // cooldown bar background
    const cooldownBg = document.createElement('div');
    cooldownBg.style.width = '100%';
    cooldownBg.style.height = '8px';
    cooldownBg.style.background = 'rgba(255,255,255,0.08)';
    cooldownBg.style.borderRadius = '4px';
    cooldownBg.style.overflow = 'hidden';
    cooldownBg.style.marginBottom = '6px';

    const cooldownFill = document.createElement('div');
    cooldownFill.id = 'sprint-cooldown-fill';
    cooldownFill.style.height = '100%';
    cooldownFill.style.width = '0%'; // empty initially
    cooldownFill.style.background =
      'linear-gradient(90deg, rgba(255,130,130,0.95), rgba(255,80,80,0.95))';
    cooldownFill.style.transformOrigin = 'left';
    cooldownFill.style.transition = 'width 0.08s linear';

    cooldownBg.appendChild(cooldownFill);
    container.appendChild(cooldownBg);

    // text line for times
    const info = document.createElement('div');
    info.id = 'sprint-info-text';
    info.style.fontSize = '11px';
    info.style.opacity = '0.95';
    info.textContent = 'Ready';
    container.appendChild(info);

    document.body.appendChild(container);
  }

  _updateSprintUI() {
    const staminaFill = document.getElementById('sprint-stamina-fill');
    const cooldownFill = document.getElementById('sprint-cooldown-fill');
    const info = document.getElementById('sprint-info-text');

    if (!staminaFill || !cooldownFill || !info) return;

    const staminaRemaining = Math.max(
      0,
      this.sprintMaxDuration - this.#sprintTimer
    );
    const staminaPct = (staminaRemaining / this.sprintMaxDuration) * 100;
    staminaFill.style.width = `${staminaPct}%`;

    if (this.#isInCooldown) {
      const cooldownLeft = Math.max(
        0,
        this.sprintCooldownDuration - this.#cooldownTimer
      );
      const cooldownPct = Math.min(
        100,
        (this.#cooldownTimer / this.sprintCooldownDuration) * 100
      );
      cooldownFill.style.width = `${cooldownPct}%`;
      info.textContent = `Cooldown: ${cooldownLeft.toFixed(2)}s`;
    } else {
      cooldownFill.style.width = '0%';
      info.textContent = `Stamina: ${staminaRemaining.toFixed(2)}s`;
    }
  }

  destroy() {
    if (this.keyboard) {
      try {
        this.keyboard.pause();
      } catch (e) {}
      this.keyboard.dispose();
    }
  }

  initGUI() {
    this.debug.add(
      this,
      'maxSpeed',
      { min: 0, max: 50, step: 0.1, label: 'Max Speed' },
      'Player'
    );
  }
}
