import * as THREE from 'three';
import Game from '../../../../Game.class';
import DebugGUI from '../../../../Utils/DebugGUI';
import { data } from '../../../../Data/Data';
import { SimplexNoise } from 'three/examples/jsm/Addons.js';
import { RandomNumberGenerator } from '../../../../Utils/RandomNumberGenerator.class';
import { blocks, resources } from '../../../../Data/Blocks';

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
    this.textureResources = this.game.resources.items;

    // Ensure textures are using sRGB color space for correct color rendering.
    Object.values(this.textureResources).forEach((res) => {
      if (res instanceof THREE.Texture) {
        res.colorSpace = THREE.SRGBColorSpace;
      }
    });

    this.debug = DebugGUI.getInstance();
    this.data = data;

    this.initResources();
    this.generateBlockWorld();
    this.initGUI();
  }

  /**
   * Create shared geometry and materials for each block type.
   * Materials use the textures from this.textureResources and are configured
   * for a pixelated look (nearest filtering and no mipmaps).
   */

  initResources() {
    this.blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    // Create materials for each block type
    this.blockMaterials = {
      [blocks.grass.id]: [
        // right
        new THREE.MeshLambertMaterial({
          map: this.textureResources.grassTextureSide
        }),
        // left
        new THREE.MeshLambertMaterial({
          map: this.textureResources.grassTextureSide
        }),
        // top
        new THREE.MeshLambertMaterial({
          map: this.textureResources.grassTexture
        }),
        // bottom
        new THREE.MeshLambertMaterial({
          map: this.textureResources.dirtTexture
        }),
        // front
        new THREE.MeshLambertMaterial({
          map: this.textureResources.grassTextureSide
        }),
        // back
        new THREE.MeshLambertMaterial({
          map: this.textureResources.grassTextureSide
        }),
      ],
      [blocks.dirt.id]: new THREE.MeshLambertMaterial({
        map: this.textureResources.dirtTexture
      }),
      [blocks.stone.id]: new THREE.MeshLambertMaterial({
        map: this.textureResources.stoneTexture
      }),
      [blocks.coalOre.id]: new THREE.MeshLambertMaterial({
        map: this.textureResources.coalOreTexture
      }),
      [blocks.ironOre.id]: new THREE.MeshLambertMaterial({
        map: this.textureResources.ironOreTexture
      }),
      [blocks.goldOre.id]: new THREE.MeshLambertMaterial({
        map: this.textureResources.goldOreTexture
      }),
    };

    /**
     * Set texture filtering for pixelated look. This loop handles both the
     * case where a value in blockMaterials is a single material or an array
     * (for per-face materials like grass). For each material we set nearest
     * filtering and disable mipmaps for a crisp, pixel-art aesthetic.
     */
    Object.values(this.blockMaterials).forEach(matOrArray => {
      if (Array.isArray(matOrArray)) {
        matOrArray.forEach(mat => {
          if (mat.map) {
            mat.map.magFilter = THREE.NearestFilter;
            mat.map.minFilter = THREE.NearestFilter;
            mat.map.generateMipmaps = false;
            mat.map.needsUpdate = true;
          }
        });
      } else if (matOrArray.map) {
        matOrArray.map.magFilter = THREE.NearestFilter;
        matOrArray.map.minFilter = THREE.NearestFilter;
        matOrArray.map.generateMipmaps = false;
        matOrArray.map.needsUpdate = true;
      }
    });

  }

  /**
   * High level orchestrator that builds the world data and creates the mesh
   * instances. A RandomNumberGenerator seeded with WORLD_PARAMS.seed is used to
   * provide deterministic noise for both resources and terrain.
   */
  generateBlockWorld() {
    const randomNumberGenerator = new RandomNumberGenerator(WORLD_PARAMS.seed);

    // Create empty 3D array for blocks
    this.initBlockWorldTerrain();

    // Scatter ores/resources first (they operate over full 3D volume)
    this.generateResources(randomNumberGenerator);

    // Then generate the 2D-over-XZ terrain surface (dirt + grass on top)
    this.generateTerrain(randomNumberGenerator);

    // Convert the data array into InstancedMesh instances for rendering
    this.generateMeshInstances();
  }

  /**
   * Initialize the this.data 3D array with empty blocks. Structure is
   * data[x][y][z] to allow fast lookup by x first (column-major in x).
   */
  initBlockWorldTerrain() {
    this.data = [];
    for (let x = 0; x < WORLD_CONFIG.width; x++) {
      const slice = [];
      for (let y = 0; y < WORLD_CONFIG.height; y++) {
        const row = [];
        for (let z = 0; z < WORLD_CONFIG.depth; z++) {
          // each cell stores the block id and the instanceId (filled later)
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

  /**
   * Scatter resource blocks (ores etc.) through the world using 3D simplex noise.
   * If the noise value at a voxel exceeds resource.scarcity, the resource is placed.
   */
  generateResources(randomNumberGenerator) {
    const simplex = new SimplexNoise(randomNumberGenerator);
    resources.forEach((resource) => {
      for (let x = 0; x < WORLD_CONFIG.width; x++) {
        for (let y = 0; y < WORLD_CONFIG.height; y++) {
          for (let z = 0; z < WORLD_CONFIG.depth; z++) {
            // Use resource-specific scale to control frequency/size of veins
            const value = simplex.noise3d(x / resource.scale.x, y / resource.scale.y, z / resource.scale.z);

            if (value > resource.scarcity) {
              this.setBlockId(x, y, z, resource.id);
            }
          }
        }
      }
    })
  }

  /**
   * Generate surface terrain using 2D simplex noise (x,z). The noise value is
   * scaled and converted to an integer height; below that height is dirt and
   * exactly at that height is grass. Note: this logic assumes a single
   * column 'surface' per (x,z) coordinate.
   */
  generateTerrain(randomNumberGenerator) {
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

        // clamp height into valid range
        height = Math.max(0, Math.min(height, WORLD_CONFIG.height - 1));

        /**
         * iterate vertical column and assign dirt/grass/empty
         * NOTE: loop uses <= WORLD_CONFIG.height which will iterate one step
         * beyond the last index; the code below guards with inBounds checks in
         * setBlockId/getBlock, but this is a spot to be careful about off-by-one
         * behaviour if you later change inBounds.
         */
        for (let y = 0; y <= WORLD_CONFIG.height; y++) {
          if (y < height && this.getBlock(x, y, z).id === blocks.empty.id) {
            // fill interior with dirt only if it wasn't already set by resources
            this.setBlockId(x, y, z, blocks.dirt.id);
          } else if (y === height) {
            // the top-most voxel becomes grass
            this.setBlockId(x, y, z, blocks.grass.id);
          } else if (y > height) {
            // above the surface remains empty
            this.setBlockId(x, y, z, blocks.empty.id);
          }
        }
      }
    }
  }

  /**
   * Helper method to Remove previously created instanced meshes and dispose their geometries
   * and materials to free GPU memory. Note that texture disposal is commented
   * out — if you want to free textures as well, uncomment the map.dispose() calls.
   */
  disposeOldMeshInstances() {
    if (this.worldGroup) {
      this.scene.remove(this.worldGroup);
      this.worldGroup.traverse((child) => {
        if (child.isInstancedMesh) {
          // dispose geometry
          if (child.geometry) child.geometry.dispose();

          // dispose material(s) safely: may be an array or single material
          const mat = child.material;
          if (Array.isArray(mat)) {
            mat.forEach(m => {
              if (m) {
                // optionally dispose the material's texture maps here:
                // if (m.map) m.map.dispose();
                m.dispose();
              }
            });
          } else if (mat) {
            // optionally: if (mat.map) mat.map.dispose();
            mat.dispose();
          }
        }
      });
    }
  }

  /**
   * Create InstancedMesh objects for each block type and populate them with
   * instance matrices only for visible (non-obscured) blocks.
   */
  generateMeshInstances() {
    if (this.worldGroup) {
      this.disposeOldMeshInstances();
    }

    const { width, height, depth } = WORLD_CONFIG;
    // worst-case number of instances. we will generate lesser than this
    const maxCount = width * height * depth;
    const halfW = width / 2;
    const halfD = depth / 2;

    this.worldGroup = new THREE.Group();

    // Meshes map
    const meshes = new Map();

    // Iterate entries to get blockId -> material
    Object.entries(this.blockMaterials).forEach(([blockId, material]) => {
      const blockMesh = new THREE.InstancedMesh(this.blockGeometry, material, maxCount);
      blockMesh.count = 0;
      blockMesh.userData.blockId = Number(blockId);
      blockMesh.name = `block-${blockId}`;
      blockMesh.castShadow = true;
      blockMesh.receiveShadow = true;

      meshes.set(Number(blockId), blockMesh); // store by numeric id
    });

    const matrix = new THREE.Matrix4();

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        for (let z = 0; z < depth; z++) {
          const { id: blockId } = this.getBlock(x, y, z);
          if (blockId === blocks.empty.id || this.isBlockObscured(x, y, z)) continue;

          const blockMesh = meshes.get(blockId);
          if (!blockMesh) continue; // just in case a material is missing

          const instanceId = blockMesh.count;
          matrix.makeTranslation(x - halfW + 0.5, y, z - halfD + 0.5);
          blockMesh.setMatrixAt(instanceId, matrix);

          this.setBlockInstanceId(x, y, z, instanceId);
          blockMesh.count++;
        }
      }
    }

    // add all meshes to group
    for (const m of meshes.values()) this.worldGroup.add(m);

    // keep a reference for later use
    this.meshes = meshes; // Map of blockId -> InstancedMesh
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
    resources.forEach((resource) => {
      this.debug.add(
        resource,
        'scarcity',
        {
          min: 0,
          max: 1,
          step: 0.001,
          label: `${resource.name} Scarcity`,
          onChange: () => {
            this.generateBlockWorld();
          },
        },
        'Resources Folder'
      );
      this.debug.add(
        resource,
        'scale',
        {
          min: 0,
          max: 100,
          step: 0.1,
          label: `${resource.name} Scale`,
          onChange: () => {
            this.generateBlockWorld();
          },
        },
        'Resources Folder'
      );
    })

  }
}
