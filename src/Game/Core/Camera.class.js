import * as THREE from 'three';
import Game from '../Game.class';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export default class Camera {
  constructor(fov = 45, near = 0.1, far = 1000) {
    this.game = Game.getInstance();
    this.canvas = this.game.canvas;
    this.sizes = this.game.sizes;
    this.scene = this.game.scene;
    this.isDebugMode = this.game.isDebugMode;

    this.setOrbitCamera(fov, near, far);
    this.setFPPCamera(80, near, 100);
    this.setControls();

    if (this.isDebugMode) {
      this.scene.add(new THREE.CameraHelper(this.FPPCamera));
    }
  }

  setOrbitCamera(fov, near, far) {
    const aspectRatio = this.sizes.width / this.sizes.height;
    this.orbitCamera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);
    this.orbitCamera.position.set(-64, 32, -64);
    this.scene.add(this.orbitCamera);
  }

  setFPPCamera(fov, near, far) {
    const aspectRatio = this.sizes.width / this.sizes.height;
    this.FPPCamera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);
    this.FPPCamera.position.set(-18, 14, 23);
    this.scene.add(this.FPPCamera);
  }

  setControls() {
    this.orbitControls = new OrbitControls(this.orbitCamera, this.canvas);
    this.orbitControls.enableDamping = true;
    this.orbitControls.maxPolarAngle = Math.PI / 2.3;
    this.orbitControls.target.set(32, 16, 32);

    this.FPPControls = new PointerLockControls(this.FPPCamera, document.body);
  }

  resize() {
    const aspectRatio = this.sizes.width / this.sizes.height;
    this.orbitCamera.aspect = aspectRatio;
    this.orbitCamera.updateProjectionMatrix();
    this.FPPCamera.aspect = aspectRatio;
    this.FPPCamera.updateProjectionMatrix();
  }

  update() {
    this.orbitControls.update();
  }
}
