import * as THREE from 'three';
import Game from '../Game.class';
import DebugGUI from '../Utils/DebugGUI';
import KeyboardControls from '../Input/Keyboard.class';

export default class Player {
  maxSpeed = 10;
  radius = 0.5;
  height = 1.75;
  jumpSpeed = 10;
  onGround = false;

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

    this.keyboard = new KeyboardControls({
      controls: this.controls,
      resetCallback: () => {
        this.playerPosition.set(25, 25, 25);
        this.velocity.set(0, 0, 0);
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
    if (this.controls.isLocked) {
      this.keyboard.update(delta);

      // local (camera-relative) inputs
      this.velocity.x = this.keyboard.input.x * this.maxSpeed; // right
      this.velocity.z = this.keyboard.input.z * this.maxSpeed; // forward

      if (this.onGround && this.keyboard.consumeJump()) {
        this.velocity.y = this.jumpSpeed;
        this.onGround = false;
      }

      this.playerPosition.y += this.velocity.y * delta;

      this.controls.moveRight(this.velocity.x * delta);
      this.controls.moveForward(this.velocity.z * delta);
    }

    document.getElementById('coordinates').innerHTML =
      this.playerPositionToString();
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

  destroy() {
    if (this.keyboard) {
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
