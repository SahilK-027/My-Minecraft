import * as THREE from 'three';
import Game from '../../../../Game.class';
import DebugGUI from '../../../../Utils/DebugGUI';

const WORLD_CONFIG = {
  width: 64,
  height: 32,
  depth: 64,
};
export default class BlockWorld {
  constructor() {
    this.game = Game.getInstance();
    this.scene = this.game.scene;
    this.debug = DebugGUI.getInstance();

    this.initResources();
    this.generateBlockWorldInstance();
    this.initGUI();
  }

  initResources() {
    this.blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.blockMaterial = new THREE.MeshLambertMaterial({ color: 'green' });
  }

  generateBlockWorldInstance() {
    // ——— Remove old world if it exists ———
    if (this.worldGroup) {
      this.scene.remove(this.worldGroup);
      this.worldGroup.traverse((child) => {
        if (child.isInstancedMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
    }

    // ——— Compute fresh counts from current config ———
    const { width, height, depth } = WORLD_CONFIG;
    const maxCount = width * height * depth;
    const halfW = width / 2;
    const halfD = depth / 2;

    this.worldGroup = new THREE.Group();

    const blockMesh = new THREE.InstancedMesh(
      this.blockGeometry,
      this.blockMaterial,
      maxCount
    );

    let count = 0;
    const matrix = new THREE.Matrix4();

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        for (let z = 0; z < depth; z++) {
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

  initGUI() {
    this.debug.add(
      WORLD_CONFIG,
      'width',
      {
        min: 2,
        max: 120,
        step: 1,
        label: 'Width_X',
        onChange: () => {
          this.generateBlockWorldInstance();
        },
      },

      'Block World Folder'
    );
    this.debug.add(
      WORLD_CONFIG,
      'height',
      {
        min: 2,
        max: 64,
        step: 1,
        label: 'Height_Y',
        onChange: () => {
          this.generateBlockWorldInstance();
        },
      },

      'Block World Folder'
    );
    this.debug.add(
      WORLD_CONFIG,
      'depth',
      {
        min: 2,
        max: 120,
        step: 1,
        label: 'Depth_Z',
        onChange: () => {
          this.generateBlockWorldInstance();
        },
      },

      'Block World Folder'
    );
  }
}
