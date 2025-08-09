import * as THREE from 'three';
import Game from '../../../../Game.class';
import DebugGUI from '../../../../Utils/DebugGUI';
import { data } from '../../../../Data/Data';
import { SimplexNoise } from 'three/examples/jsm/Addons.js';
import { RandomNumberGenerator } from '../../../../Utils/RandomNumberGenerator.class';
import { blocks } from '../../../../Data/Blocks';

const WORLD_CONFIG = {
  width: 64,
  height: 32,
  depth: 64,
};

const WORLD_PARAMS = {
  seed: 27,
  terrain: {
    scale: 30,
    magnitude: 0.5,
    offset: 0.2,
  },
};

export default class BlockWorld {
  constructor() {
    this.game = Game.getInstance();
    this.scene = this.game.scene;
    this.debug = DebugGUI.getInstance();
    this.data = data;

    this.initResources();
    this.generateBlockWorld();
    this.initGUI();
  }

  initResources() {
    this.blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.blockMaterial = new THREE.MeshLambertMaterial();
  }

  generateBlockWorld() {
    this.initBlockWorldTerrain();
    this.generateBlockWorldTerrain();
    this.generateBlockWorldMeshInstance();
  }

  initBlockWorldTerrain() {
    this.data = [];
    for (let x = 0; x < WORLD_CONFIG.width; x++) {
      const slice = [];
      for (let y = 0; y < WORLD_CONFIG.height; y++) {
        const row = [];
        for (let z = 0; z < WORLD_CONFIG.depth; z++) {
          row.push({
            id: blocks.empty.id,
            instanceId: null,
          });
        }
        slice.push(row);
      }
      this.data.push(slice);
    }
  }

  generateBlockWorldTerrain() {
    const randomNumberGenerator = new RandomNumberGenerator(WORLD_PARAMS.seed);
    const simplex = new SimplexNoise(randomNumberGenerator);
    for (let x = 0; x < WORLD_CONFIG.width; x++) {
      for (let z = 0; z < WORLD_CONFIG.depth; z++) {
        const value = simplex.noise(
          x / WORLD_PARAMS.terrain.scale,
          z / WORLD_PARAMS.terrain.scale
        );

        const scaledNoise =
          WORLD_PARAMS.terrain.offset + WORLD_PARAMS.terrain.magnitude * value;

        let height = Math.floor(WORLD_CONFIG.height * scaledNoise);

        height = Math.max(0, Math.min(height, WORLD_CONFIG.height - 1));

        for (let y = 0; y <= height; y++) {
          if (y < height) {
            this.setBlockId(x, y, z, blocks.dirt.id);
          } else if (y === height) {
            this.setBlockId(x, y, z, blocks.grass.id);
          } else {
            this.setBlockId(x, y, z, blocks.empty.id);
          }
        }
      }
    }
  }

  generateBlockWorldMeshInstance() {
    if (this.worldGroup) {
      this.scene.remove(this.worldGroup);
      this.worldGroup.traverse((child) => {
        if (child.isInstancedMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
    }

    const { width, height, depth } = WORLD_CONFIG;
    const maxCount = width * height * depth;
    const halfW = width / 2;
    const halfD = depth / 2;

    // Build fast lookup: id -> blockType
    const blocksById = {};
    Object.values(blocks).forEach((b) => (blocksById[b.id] = b));

    // Cache THREE.Color objects for each block type color
    const colorById = {};
    Object.values(blocks).forEach((b) => {
      colorById[b.id] = new THREE.Color(b.color);
    });

    this.worldGroup = new THREE.Group();

    const blockMesh = new THREE.InstancedMesh(
      this.blockGeometry,
      this.blockMaterial,
      maxCount
    );

    let count = 0;
    const matrix = new THREE.Matrix4();
    const tmpColor = new THREE.Color();

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        for (let z = 0; z < depth; z++) {
          const { id: blockId } = this.getBlock(x, y, z);
          if (blockId === blocks.empty.id || this.isBlockObscured(x, y, z))
            continue;

          const instanceId = count;

          matrix.makeTranslation(x - halfW + 0.5, y, z - halfD + 0.5);
          blockMesh.setMatrixAt(instanceId, matrix);

          // use cached color object
          tmpColor.copy(colorById[blockId]);
          blockMesh.setColorAt(instanceId, tmpColor);

          this.setBlockInstanceId(x, y, z, instanceId);
          count++;
        }
      }
    }

    blockMesh.count = count;
    blockMesh.instanceMatrix.needsUpdate = true;
    if (blockMesh.instanceColor) blockMesh.instanceColor.needsUpdate = true;

    this.worldGroup.add(blockMesh);
    this.scene.add(this.worldGroup);
  }

  /**
   * Gets the block data at (x, y, z)
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {{id: number, instanceId: number}}
   */
  getBlock(x, y, z) {
    if (this.inBounds(x, y, z)) {
      return this.data[x][y][z];
    } else {
      return null;
    }
  }

  /**
   * Sets the block id for the block at (x, y, z)
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {number} id
   */
  setBlockId(x, y, z, id) {
    if (this.inBounds(x, y, z)) {
      this.data[x][y][z].id = id;
    }
  }

  /**
   * Sets the block instance id for the block at (x, y, z)
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {number} instanceId
   */
  setBlockInstanceId(x, y, z, instanceId) {
    if (this.inBounds(x, y, z)) {
      this.data[x][y][z].instanceId = instanceId;
    }
  }

  /**
   * Checks if the (x, y, z) coordinates are within bounds
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {boolean}
   */
  inBounds(x, y, z) {
    if (
      x >= 0 &&
      x < WORLD_CONFIG.width &&
      y >= 0 &&
      y < WORLD_CONFIG.height &&
      z >= 0 &&
      z < WORLD_CONFIG.width
    ) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Returns true if this block is completely hidden by other blocks
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {boolean}
   */
  isBlockObscured(x, y, z) {
    const up = this.getBlock(x, y + 1, z)?.id ?? blocks.empty.id;
    const down = this.getBlock(x, y - 1, z)?.id ?? blocks.empty.id;
    const left = this.getBlock(x + 1, y, z)?.id ?? blocks.empty.id;
    const right = this.getBlock(x - 1, y, z)?.id ?? blocks.empty.id;
    const forward = this.getBlock(x, y, z + 1)?.id ?? blocks.empty.id;
    const back = this.getBlock(x, y, z - 1)?.id ?? blocks.empty.id;

    // If any of the block's sides is exposed, it is not obscured
    if (
      up === blocks.empty.id ||
      down === blocks.empty.id ||
      left === blocks.empty.id ||
      right === blocks.empty.id ||
      forward === blocks.empty.id ||
      back === blocks.empty.id
    ) {
      return false;
    } else {
      return true;
    }
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
          this.generateBlockWorld();
        },
      },
      'Blockworld Folder'
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
          this.generateBlockWorld();
        },
      },
      'Blockworld Folder'
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
          this.generateBlockWorld();
        },
      },
      'Blockworld Folder'
    );
    this.debug.add(
      WORLD_PARAMS.terrain,
      'scale',
      {
        min: 10,
        max: 100,
        step: 0.1,
        label: 'Scale',
        onChange: () => {
          this.generateBlockWorld();
        },
      },
      'Blockworld Folder'
    );
    this.debug.add(
      WORLD_PARAMS.terrain,
      'offset',
      {
        min: 0,
        max: 1,
        step: 0.001,
        label: 'Offset',
        onChange: () => {
          this.generateBlockWorld();
        },
      },
      'Blockworld Folder'
    );
    this.debug.add(
      WORLD_PARAMS.terrain,
      'magnitude',
      {
        min: 0,
        max: 1,
        step: 0.001,
        label: 'Magnitude',
        onChange: () => {
          this.generateBlockWorld();
        },
      },
      'Blockworld Folder'
    );
    this.debug.add(
      WORLD_PARAMS,
      'seed',
      {
        min: 0,
        max: 10000,
        step: 1,
        label: 'Seed',
        onChange: () => {
          this.generateBlockWorld();
        },
      },
      'Blockworld Folder'
    );
    this.debug.add(
      blocks.grass,
      'color',
      {
        color: true,
        label: 'Grass Color',
        onChange: () => {
          this.generateBlockWorld();
        },
      },
      'Blocks Folder'
    );
    this.debug.add(
      blocks.dirt,
      'color',
      {
        color: true,
        label: 'Dirt Color',
        onChange: () => {
          this.generateBlockWorld();
        },
      },
      'Blocks Folder'
    );
  }
}
