import * as THREE from 'three';
import Game from '../../../../Game.class';

export default class Lighting {
  constructor({ helperEnabled = false } = {}) {
    this.game = Game.getInstance();
    this.scene = this.game.scene;
    this.resources = this.game.resources;
    this.helperEnabled = helperEnabled;

    this.setThreeDirectionalLights();
  }

  setThreeDirectionalLights() {
    // Key light: primary, bright, casts strong shadows
    this.keyLight = new THREE.DirectionalLight(0xffffff, 4, 0, 2);
    this.keyLight.position.set(2, 2, -2);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.scene.add(this.keyLight);

    // Fill light: softer, reduces shadows
    this.fillLight = new THREE.DirectionalLight(0xffffff, 0.7, 0, 2);
    this.fillLight.position.set(0, 1.0, 2);
    this.scene.add(this.fillLight);

    // Back (rim) light: highlights edges
    this.backLight = new THREE.DirectionalLight(0xffffff, 1.0, 0, 2);
    this.backLight.position.set(-2, 2, -2);
    this.scene.add(this.backLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    if (this.helperEnabled) {
      this.scene.add(new THREE.DirectionalLightHelper(this.keyLight, 0.5));
      this.scene.add(new THREE.DirectionalLightHelper(this.fillLight, 0.5));
      this.scene.add(new THREE.DirectionalLightHelper(this.backLight, 0.5));
    }
  }
}
