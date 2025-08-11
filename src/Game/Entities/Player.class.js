import * as THREE from 'three';
import Game from '../Game.class';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import DebugGUI from '../Utils/DebugGUI';
import KeyboardControls from '../Input/Keyboard.class';

export default class Player {
  maxSpeed = 10;
  velocity = new THREE.Vector3();

  FPPCamera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 200);
  controls = new PointerLockControls(this.FPPCamera, document.body);

  constructor() {
    this.game = Game.getInstance();
    this.scene = this.game.scene;
    this.TPPCamera = this.game.camera.cameraInstance;
    this.resources = this.game.resources;
    this.debug = DebugGUI.getInstance();

    this.keyboard = new KeyboardControls({
      controls: this.controls,
      resetCallback: () => {
        this.playerPosition.set(15, 10, 8);
        this.velocity.set(0, 0, 0);
      },
    });

    this.playerPosition.set(15, 10, 8);
    this.scene.add(this.FPPCamera);

    this.initGUI();
  }

  applyInputs(delta) {
    if (this.controls.isLocked) {
      this.keyboard.update(delta);

      this.velocity.x = this.keyboard.input.x * this.maxSpeed;
      this.velocity.z = this.keyboard.input.z * this.maxSpeed;

      this.controls.moveRight(this.velocity.x * delta);
      this.controls.moveForward(this.velocity.z * delta);
    }

    document.getElementById('coordinates').innerHTML = this.playerPositionToString();
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
    this.debug.add(this, 'maxSpeed', { min: 0, max: 50, step: 0.1, label: 'Max Speed' }, 'Player');
  }
}
