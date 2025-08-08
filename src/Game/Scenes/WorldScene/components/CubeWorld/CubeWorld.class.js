import * as THREE from 'three';
import Game from '../../../../Game.class';

const WORLD_SIZE = 32;
const WORLD_HALF = WORLD_SIZE / 2;

export default class CubeWorld {
  constructor() {
    this.game = Game.getInstance();
    this.scene = this.game.scene;
    this.resources = this.game.resources;

    this.initResources();
    this.generateCubeWorldInstance();
  }

  initResources() {
    this.cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.cubeMaterial = new THREE.MeshLambertMaterial({ color: 'green' });
  }

  generateCubeWorldInstance() {
    this.worldGroup = new THREE.Group();

    for (let x = 0; x < WORLD_SIZE; x++) {
      for (let z = 0; z < WORLD_SIZE; z++) {
        const cube = new THREE.Mesh(this.cubeGeometry, this.cubeMaterial);
        // shift by WORLD_HALF, plus 0.5 so cubes sit atop the XZ-plane
        cube.position.set(x - WORLD_HALF + 0.5, 0.5, z - WORLD_HALF + 0.5);
        this.worldGroup.add(cube);
      }
    }

    this.scene.add(this.worldGroup);
  }
}
