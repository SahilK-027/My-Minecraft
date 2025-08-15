import * as THREE from 'three';
import Game from '../Game.class';
import DebugGUI from '../Utils/DebugGUI';
import KeyboardControls from '../Input/Keyboard.class';

export default class Player {
  maxSpeed = 3.0;
  radius = 0.5;
  height = 1.75;
  jumpSpeed = 8.5;
  onGround = false;

  // sprint system
  sprintMaxDuration = 4.0;
  sprintCooldownDuration = 8.0;
  cooldownMultiplier = 0.5;
  sprintSpeedMultiplier = 2.0;
  sprintRecoverRate = 1.0;
  #sprintTimer = 0;
  #cooldownTimer = 0;
  #isInCooldown = false;
  #lastStaminaTimer = 0;
  #lastCooldownTimer = 0;
  #lastActivityTime = 0;
  #fadeTimeout = 1.0;
  #isWheelVisible = false;

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
        this.playerPosition.set(30, 50, 40);
        this.velocity.set(0, 0, 0);
        this.#sprintTimer = 0;
        this.#cooldownTimer = 0;
        this.#isInCooldown = false;
      },
    });

    this.playerPosition.set(30, 50, 40);
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
        speedMultiplier = this.cooldownMultiplier;
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
    if (document.getElementById('stamina-wheel')) return;

    const container = document.createElement('div');
    container.id = 'stamina-wheel';
    container.style.position = 'fixed';
    container.style.left = '50%';
    container.style.top = '35%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.width = '50px';
    container.style.height = '50px';
    container.style.zIndex = 0;
    container.style.userSelect = 'none';
    container.style.opacity = '0';
    container.style.transition = 'opacity 0.3s ease-out';

    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '50');
    svg.setAttribute('height', '50');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.style.filter = 'drop-shadow(rgba(0, 0, 0, 0.2) 0px 2px 1px)';

    // Define gradients
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    // Blue gradient for stamina
    const blueGradient = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'linearGradient'
    );
    blueGradient.setAttribute('id', 'staminaGradient');
    blueGradient.setAttribute('x1', '0%');
    blueGradient.setAttribute('y1', '0%');
    blueGradient.setAttribute('x2', '100%');
    blueGradient.setAttribute('y2', '0%');

    const blueStop = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'stop'
    );
    blueStop.setAttribute('offset', '100%');
    blueStop.setAttribute('stop-color', '#80ff9b');
    blueStop.setAttribute('stop-opacity', '1.0');

    blueGradient.appendChild(blueStop);

    // Red gradient for cooldown
    const redGradient = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'linearGradient'
    );
    redGradient.setAttribute('id', 'cooldownGradient');
    redGradient.setAttribute('x1', '0%');
    redGradient.setAttribute('y1', '0%');
    redGradient.setAttribute('x2', '100%');
    redGradient.setAttribute('y2', '0%');

    const redStop = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'stop'
    );
    redStop.setAttribute('offset', '100%');
    redStop.setAttribute('stop-color', '#ff2727');
    redStop.setAttribute('stop-opacity', '1.0');

    redGradient.appendChild(redStop);

    defs.appendChild(blueGradient);
    defs.appendChild(redGradient);
    svg.appendChild(defs);

    // Background circle for stamina wheel (inner)
    const bgCircle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    );
    bgCircle.setAttribute('cx', '60');
    bgCircle.setAttribute('cy', '60');
    bgCircle.setAttribute('r', '30');
    bgCircle.setAttribute('fill', 'none');
    bgCircle.setAttribute('stroke', '#40404040');
    bgCircle.setAttribute('stroke-width', '8');
    svg.appendChild(bgCircle);

    // Background circle for cooldown wheel (outer)
    const cooldownBgCircle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    );
    cooldownBgCircle.setAttribute('cx', '60');
    cooldownBgCircle.setAttribute('cy', '60');
    cooldownBgCircle.setAttribute('r', '42');
    cooldownBgCircle.setAttribute('fill', 'none');
    cooldownBgCircle.setAttribute('stroke', '#40404040');
    cooldownBgCircle.setAttribute('stroke-width', '6');
    svg.appendChild(cooldownBgCircle);

    // Stamina wheel (inner circle)
    const staminaWheel = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    );
    staminaWheel.id = 'stamina-wheel-fill';
    staminaWheel.setAttribute('cx', '60');
    staminaWheel.setAttribute('cy', '60');
    staminaWheel.setAttribute('r', '30');
    staminaWheel.setAttribute('fill', 'none');
    staminaWheel.setAttribute('stroke', 'url(#staminaGradient)');
    staminaWheel.setAttribute('stroke-width', '12');
    staminaWheel.setAttribute('stroke-linecap', 'round');
    staminaWheel.setAttribute('transform', 'rotate(-90 60 60)');
    staminaWheel.setAttribute('stroke-dasharray', '188.495559215');
    staminaWheel.setAttribute('stroke-dashoffset', '0');
    staminaWheel.style.transition = 'stroke-dashoffset 0.1s ease-out';
    svg.appendChild(staminaWheel);

    // Cooldown wheel (outer circle)
    const cooldownWheel = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    );
    cooldownWheel.id = 'cooldown-wheel-fill';
    cooldownWheel.setAttribute('cx', '60');
    cooldownWheel.setAttribute('cy', '60');
    cooldownWheel.setAttribute('r', '42');
    cooldownWheel.setAttribute('fill', 'none');
    cooldownWheel.setAttribute('stroke', 'url(#cooldownGradient)');
    cooldownWheel.setAttribute('stroke-width', '8');
    cooldownWheel.setAttribute('stroke-linecap', 'round');
    cooldownWheel.setAttribute('transform', 'rotate(-90 60 60)');
    cooldownWheel.setAttribute('stroke-dasharray', '263.893782902');
    cooldownWheel.setAttribute('stroke-dashoffset', '263.893782902');
    cooldownWheel.style.transition = 'stroke-dashoffset 0.1s ease-out';
    svg.appendChild(cooldownWheel);

    container.appendChild(svg);
    document.body.appendChild(container);
  }

  _updateSprintUI() {
    const container = document.getElementById('stamina-wheel');
    const staminaWheel = document.getElementById('stamina-wheel-fill');
    const cooldownWheel = document.getElementById('cooldown-wheel-fill');

    if (!container || !staminaWheel || !cooldownWheel) return;

    const staminaCircumference = 188.495559215; // 2π × 30
    const cooldownCircumference = 263.893782902; // 2π × 42

    const staminaRemaining = Math.max(
      0,
      this.sprintMaxDuration - this.#sprintTimer
    );
    const staminaPct = staminaRemaining / this.sprintMaxDuration;

    // Check if stamina or cooldown values have changed
    const staminaChanged = this.#sprintTimer !== this.#lastStaminaTimer;
    const cooldownChanged = this.#cooldownTimer !== this.#lastCooldownTimer;
    const isActive = staminaChanged || cooldownChanged || this.#isInCooldown;

    // Update activity tracking
    if (isActive) {
      this.#lastActivityTime = performance.now() / 1000; // Convert to seconds

      // Show the wheel if it's not visible
      if (!this.#isWheelVisible) {
        container.style.opacity = '1';
        this.#isWheelVisible = true;
      }
    } else {
      // Check if enough time has passed since last activity
      const currentTime = performance.now() / 1000;
      const timeSinceActivity = currentTime - this.#lastActivityTime;

      if (timeSinceActivity >= this.#fadeTimeout && this.#isWheelVisible) {
        container.style.opacity = '0';
        this.#isWheelVisible = false;
      }
    }

    // Update the wheel visuals
    const staminaOffset = staminaCircumference * (1 - staminaPct);
    staminaWheel.setAttribute('stroke-dashoffset', staminaOffset.toString());

    if (this.#isInCooldown) {
      const cooldownPct = Math.min(
        1,
        this.#cooldownTimer / this.sprintCooldownDuration
      );
      const cooldownOffset = cooldownCircumference * (1 - cooldownPct);
      cooldownWheel.setAttribute(
        'stroke-dashoffset',
        cooldownOffset.toString()
      );
      staminaWheel.style.opacity = '0.3';
    } else {
      cooldownWheel.setAttribute(
        'stroke-dashoffset',
        cooldownCircumference.toString()
      );
      staminaWheel.style.opacity = '1';
    }

    // Store current values for next frame comparison
    this.#lastStaminaTimer = this.#sprintTimer;
    this.#lastCooldownTimer = this.#cooldownTimer;
  }

  destroy() {
    const wheelContainer = document.getElementById('stamina-wheel');
    if (wheelContainer) {
      wheelContainer.remove();
    }

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
