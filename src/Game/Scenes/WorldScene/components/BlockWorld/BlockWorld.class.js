import * as THREE from 'three';
import Game from '../../../../Game.class';

const WORLD_CONFIG = {
  width: 64,
  height: 32,
  depth: 64,
};

const MAX_BLOCK_COUNT =
  WORLD_CONFIG.width * WORLD_CONFIG.height * WORLD_CONFIG.depth;
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

    const blockMesh = new THREE.InstancedMesh(
      this.blockGeometry,
      this.blockMaterial,
      MAX_BLOCK_COUNT
    );

    let count = 0;
    const matrix = new THREE.Matrix4();

    const halfW = WORLD_CONFIG.width / 2;
    const halfD = WORLD_CONFIG.depth / 2;

    for (let x = 0; x < WORLD_CONFIG.width; x++) {
      for (let y = 0; y < WORLD_CONFIG.height; y++) {
        for (let z = 0; z < WORLD_CONFIG.depth; z++) {
          matrix.setPosition(x - halfW + 0.5, y, z - halfD + 0.5);
          blockMesh.setMatrixAt(count++, matrix);
        }
      }
    }
    blockMesh.count = count;
    blockMesh.instanceMatrix.needsUpdate = true;

    this.worldGroup.add(blockMesh);
    this.scene.add(this.worldGroup);
  }
}
