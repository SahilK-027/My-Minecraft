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

    this.setThreeDirectionalLights();
    this.initGUI();
  }

  setThreeDirectionalLights() {
    // Sunlight
    this.sunLight = new THREE.DirectionalLight(0xfffce5, 4, 0, 2);
    this.sunLight.position.set(-45, 25, 45);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(512, 512);
    this.sunLight.shadow.camera.left = -75;
    this.sunLight.shadow.camera.right = 75;
    this.sunLight.shadow.camera.bottom = -25;
    this.sunLight.shadow.camera.top = 35;
    this.sunLight.shadow.camera.near = 0.1;
    this.sunLight.shadow.camera.far = 135;
    this.sunLight.shadow.bias = -0.005;
    this.scene.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);


    if (this.helperEnabled) {
      this.shadowHelper = new THREE.CameraHelper(this.sunLight.shadow.camera);
      this.scene.add(this.shadowHelper);
      this.scene.add(new THREE.DirectionalLightHelper(this.sunLight, 0.5));
    }
  }

  initGUI() {
    this.debug.add(
      this.sunLight,
      'color',
      {
        color: true,
        label: 'Sunlight color'
      },
      'Light Folder'
    );
    this.debug.add(
      this.sunLight,
      'intensity',
      {
        min: 0,
        max: 10,
        step: 0.01,
        label: 'Sunlight Intensity'
      },
      'Light Folder'
    );
  }
}
