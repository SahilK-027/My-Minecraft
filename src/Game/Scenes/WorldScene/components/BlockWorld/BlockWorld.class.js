import * as THREE from 'three';
import Game from '../../../../Game.class';

const WORLD_SIZE = 32;
const WORLD_HALF = WORLD_SIZE / 2;

export default class BlockWorld {
  constructor() {
    this.game = Game.getInstance();
    this.scene = this.game.scene;
    this.resources = this.game.resources;

    this.initResources();
    this.generateBlockWorldInstance();
  }

  initResources() {
    this.blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.blockMaterial = new THREE.MeshLambertMaterial({ color: 'green' });
  }

  generateBlockWorldInstance() {
    this.worldGroup = new THREE.Group();

    for (let x = 0; x < WORLD_SIZE; x++) {
      for (let z = 0; z < WORLD_SIZE; z++) {
        const block = new THREE.Mesh(this.blockGeometry, this.blockMaterial);
        // shift by WORLD_HALF, plus 0.5 so blocks sit atop the XZ-plane
        block.position.set(x - WORLD_HALF + 0.5, 0.5, z - WORLD_HALF + 0.5);
        this.worldGroup.add(block);
      }
    }

    this.scene.add(this.worldGroup);
  }
}
