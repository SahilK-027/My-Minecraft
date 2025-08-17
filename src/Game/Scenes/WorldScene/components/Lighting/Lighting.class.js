import * as THREE from 'three';
import Game from '../../../../Game.class';
import DebugGUI from '../../../../Utils/DebugGUI';

export default class Lighting {
  constructor({ helperEnabled = false } = {}, player) {
    this.game = Game.getInstance();
    this.scene = this.game.scene;
    this.resources = this.game.resources;
    this.helperEnabled = helperEnabled;
    this.debug = DebugGUI.getInstance();
    this.isDebugMode = this.game.isDebugMode;
    this.player = player;

    this.originalKeyOffset = new THREE.Vector3(-120, 52, -8);
    this.originalFillOffset = new THREE.Vector3(50, 30, 40);
    this.originalRimOffset = new THREE.Vector3(60, 30, -60);

    this.shadowCameraSize = 100;
    this.lastShadowUpdatePos = new THREE.Vector3();
    this.shadowUpdateDistance = 10;

    this.setThreePointLights();
    if (this.isDebugMode) {
      this.initGUI();
    }
  }

  setThreePointLights() {
    // ---------- KEY LIGHT (Sun) - FIXED FOR STABLE SHADOWS ----------
    this.keyLight = new THREE.DirectionalLight(0xfff1d6, 2.0);
    this.keyLight.position.set(-120, 52, -8);
    this.keyLight.castShadow = true;

    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.left = -this.shadowCameraSize;
    this.keyLight.shadow.camera.right = this.shadowCameraSize;
    this.keyLight.shadow.camera.bottom = -this.shadowCameraSize;
    this.keyLight.shadow.camera.top = this.shadowCameraSize;
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 300;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.keyLight.shadow.radius = 1;
    this.keyLight.shadow.autoUpdate = false;

    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    // ---------- HEMISPHERE LIGHT ----------
    this.hemisphere = new THREE.HemisphereLight(0xbfe7ff, 0x8b6b4a, 1.0);
    this.scene.add(this.hemisphere);

    // ---------- FILL LIGHT ----------
    this.fillLight = new THREE.DirectionalLight(0xddeeff, 0.6);
    this.fillLight.position.set(50, 30, 40);
    this.fillLight.castShadow = false;
    this.scene.add(this.fillLight);

    // ---------- RIM / BACK LIGHT ----------
    this.rimLight = new THREE.DirectionalLight(0xfff8e0, 0.5);
    this.rimLight.position.set(60, 30, -60);
    this.rimLight.castShadow = false;
    this.scene.add(this.rimLight);

    // ---------- AMBIENT LIGHT ----------
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.keyLight.shadow.needsUpdate = true;

    // ---------------- HELPERS ----------------
    if (this.helperEnabled) {
      this.scene.add(new THREE.DirectionalLightHelper(this.keyLight, 3));
      this.shadowHelper = new THREE.CameraHelper(this.keyLight.shadow.camera);
      this.scene.add(this.shadowHelper);
      this.scene.add(new THREE.DirectionalLightHelper(this.fillLight, 1));
      this.scene.add(new THREE.DirectionalLightHelper(this.rimLight, 1));
      this.scene.add(new THREE.HemisphereLightHelper(this.hemisphere, 4));
    }
  }

  update() {
    const playerPos = this.player.playerPosition;
    if (!this.player || !playerPos) return;

    this.keyLight.target.position.copy(playerPos);

    this.fillLight.position.copy(playerPos).add(this.originalFillOffset);
    this.rimLight.position.copy(playerPos).add(this.originalRimOffset);

    const distanceFromLastUpdate =
      this.lastShadowUpdatePos.distanceTo(playerPos);

    if (distanceFromLastUpdate > this.shadowUpdateDistance) {
      const roundedPos = new THREE.Vector3(
        Math.round(playerPos.x / 5) * 5,
        Math.round(playerPos.y / 5) * 5,
        Math.round(playerPos.z / 5) * 5
      );

      this.keyLight.shadow.camera.position.copy(roundedPos);
      this.keyLight.shadow.camera.updateProjectionMatrix();
      this.keyLight.shadow.needsUpdate = true;

      this.lastShadowUpdatePos.copy(playerPos);
    }
  }

  updateStatic() {
    const playerPos = this.player.playerPosition;
    if (!this.player || !playerPos) return;

    this.keyLight.target.position.copy(playerPos);

    this.fillLight.position.copy(playerPos).add(this.originalFillOffset);
    this.rimLight.position.copy(playerPos).add(this.originalRimOffset);
  }

  updateDiscrete() {
    const playerPos = this.player.playerPosition;
    if (!this.player || !playerPos) return;

    this.keyLight.target.position.copy(playerPos);

    const gridSize = 10;
    const snappedPos = new THREE.Vector3(
      Math.round(playerPos.x / gridSize) * gridSize,
      Math.round(playerPos.y / gridSize) * gridSize,
      Math.round(playerPos.z / gridSize) * gridSize
    );

    if (!this.lastGridPosition || !this.lastGridPosition.equals(snappedPos)) {
      this.keyLight.position.copy(snappedPos).add(this.originalKeyOffset);
      this.keyLight.shadow.needsUpdate = true;
      this.lastGridPosition = snappedPos.clone();
    }

    this.fillLight.position.copy(playerPos).add(this.originalFillOffset);
    this.rimLight.position.copy(playerPos).add(this.originalRimOffset);
  }

  initGUI() {
    this.debug.add(
      this,
      'shadowUpdateDistance',
      { min: 1, max: 20, step: 1, label: 'Shadow Update Distance' },
      'Light Folder'
    );

    this.debug
      .add(
        this,
        'shadowCameraSize',
        { min: 50, max: 200, step: 10, label: 'Shadow Camera Size' },
        'Light Folder'
      )
      .onChange(() => {
        this.keyLight.shadow.camera.left = -this.shadowCameraSize;
        this.keyLight.shadow.camera.right = this.shadowCameraSize;
        this.keyLight.shadow.camera.bottom = -this.shadowCameraSize;
        this.keyLight.shadow.camera.top = this.shadowCameraSize;
        this.keyLight.shadow.camera.updateProjectionMatrix();
        this.keyLight.shadow.needsUpdate = true;
      });

    this.debug.add(
      this.keyLight,
      'color',
      { color: true, label: 'Key Light Color' },
      'Light Folder'
    );
    this.debug.add(
      this.keyLight,
      'intensity',
      { min: 0, max: 6, step: 0.01, label: 'Key Intensity' },
      'Light Folder'
    );

    if (this.keyLight.shadow) {
      this.debug.add(
        this.keyLight.shadow,
        'bias',
        { min: -0.001, max: 0.001, step: 0.00001, label: 'Shadow Bias' },
        'Light Folder'
      );
      this.debug.add(
        this.keyLight.shadow,
        'normalBias',
        { min: 0, max: 0.1, step: 0.001, label: 'Normal Bias' },
        'Light Folder'
      );
      this.debug.add(
        this.keyLight.shadow,
        'radius',
        { min: 0, max: 5, step: 0.1, label: 'Shadow Radius' },
        'Light Folder'
      );
    }

    this.debug.add(
      this.fillLight,
      'intensity',
      { min: 0, max: 2, step: 0.01, label: 'Fill Intensity' },
      'Light Folder'
    );

    this.debug.add(
      this.rimLight,
      'intensity',
      { min: 0, max: 2, step: 0.01, label: 'Rim Intensity' },
      'Light Folder'
    );

    this.debug.add(
      this.hemisphere,
      'intensity',
      { min: 0, max: 2, step: 0.01, label: 'Hemisphere Intensity' },
      'Light Folder'
    );

    this.debug.add(
      this.ambientLight,
      'intensity',
      { min: 0, max: 2, step: 0.01, label: 'Ambient Intensity' },
      'Light Folder'
    );
  }
}
