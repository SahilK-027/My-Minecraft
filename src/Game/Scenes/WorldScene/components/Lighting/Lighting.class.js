import * as THREE from 'three';
import Game from '../../../../Game.class';
import DebugGUI from '../../../../Utils/DebugGUI';

export default class Lighting {
  constructor({ helperEnabled = false } = {}) {
    this.game = Game.getInstance();
    this.scene = this.game.scene;
    this.resources = this.game.resources;
    this.helperEnabled = helperEnabled;
    this.debug = DebugGUI.getInstance();

    this.setThreePointLights();
    this.initGUI();
  }

  setThreePointLights() {
    // ---------- KEY LIGHT (Sun) ----------
    this.keyLight = new THREE.DirectionalLight(0xfff1d6, 3.0);
    this.keyLight.position.set(-120, 52, -8);
    this.keyLight.castShadow = true;

    this.keyLight.shadow.mapSize.set(512, 512);
    const d = 120;
    this.keyLight.shadow.camera.left = -d / 2;
    this.keyLight.shadow.camera.right = d / 2;
    this.keyLight.shadow.camera.bottom = -d / 4;
    this.keyLight.shadow.camera.top = d / 4;
    this.keyLight.shadow.camera.near = 0.1;
    this.keyLight.shadow.camera.far = 350;
    this.keyLight.shadow.radius = 2;
    this.keyLight.shadow.bias = -0.00155;

    this.scene.add(this.keyLight);

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

    // ---------- DIFFUSE LIGHT ----------
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

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

  initGUI() {
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
    this.debug.add(
      this.keyLight,
      'position',
      { min: -200, max: 200, step: 0.1, label: 'Key Position' },
      'Light Folder'
    );

    if (this.keyLight.shadow) {
      this.debug.add(
        this.keyLight.shadow,
        'bias',
        { min: -0.01, max: 0.01, step: 0.00001, label: 'Shadow Bias' },
        'Light Folder'
      );
      this.debug.add(
        this.keyLight.shadow,
        'radius',
        { min: 0, max: 10, step: 0.1, label: 'Shadow Radius' },
        'Light Folder'
      );
      this.debug.add(
        this.keyLight.shadow.mapSize,
        'x',
        { min: 128, max: 2048, step: 128, label: 'Shadow Map Size X' },
        'Light Folder'
      );
      this.debug.add(
        this.keyLight.shadow.mapSize,
        'y',
        { min: 128, max: 2048, step: 128, label: 'Shadow Map Size Y' },
        'Light Folder'
      );
    }

    this.debug.add(
      this.fillLight,
      'color',
      { color: true, label: 'Fill Light Color' },
      'Light Folder'
    );
    this.debug.add(
      this.fillLight,
      'intensity',
      { min: 0, max: 2, step: 0.01, label: 'Fill Intensity' },
      'Light Folder'
    );

    this.debug.add(
      this.rimLight,
      'color',
      { color: true, label: 'Rim Light Color' },
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

    if (this.debug.addColor) {
      this.debug.addColor(
        this.hemisphere,
        'skyColor',
        { label: 'Sky Color' },
        'Light Folder'
      );
      this.debug.addColor(
        this.hemisphere,
        'groundColor',
        { label: 'Ground Color' },
        'Light Folder'
      );
    }

    this.debug.add(
      this.ambientLight,
      'intensity',
      { min: 0, max: 2, step: 0.01, label: 'Ambient Intensity' },
      'Light Folder'
    );

    this.debug.add(
      this.ambientLight,
      'visible',
      { label: 'Ambient Enabled' },
      'Light Folder'
    );
  }
}
