import * as THREE from 'three';
import Game from '../../../../Game.class';
import { SimplexNoise } from 'three/examples/jsm/Addons.js';
import { RandomNumberGenerator } from '../../../../Utils/RandomNumberGenerator.class';
import { blocks, resources } from '../../../../Data/Blocks';
import { BlockGeometry } from './BlockGeometry.class';

export default class BlockWorldChunk extends THREE.Group {
  constructor(
    WORLD_PARAMS,
    BLOCK_CHUNK_CONFIG,
    atlas,
    atlasTexture,
    blockConfigs,
    seasonGrass
  ) {
    super();

    this.WORLD_PARAMS = WORLD_PARAMS;
    this.BLOCK_CHUNK_CONFIG = BLOCK_CHUNK_CONFIG;
    this.atlas = atlas;
    this.atlasTexture = atlasTexture;
    this.blockConfigs = blockConfigs;

    this.game = Game.getInstance();

    this.seasonGrass = seasonGrass;

    this.initResources();
  }

  initResources() {
    this.atlasMaterial = new THREE.MeshToonMaterial({
      map: this.atlasTexture,
    });

    this.blockGeometries = BlockGeometry.createBlockGeometries(
      this.atlas,
      this.blockConfigs
    );
  }

  generateBlockWorld(Ccnt) {
    const randomNumberGenerator = new RandomNumberGenerator(
      this.WORLD_PARAMS.seed
    );

    this.initBlockWorldTerrain();
    this.generateResources(randomNumberGenerator);
    this.generateTerrain(randomNumberGenerator);
    return this.generateMeshInstances(Ccnt);
  }

  initBlockWorldTerrain() {
    this.data = [];
    for (let x = 0; x < this.BLOCK_CHUNK_CONFIG.width; x++) {
      const slice = [];
      for (let y = 0; y < this.BLOCK_CHUNK_CONFIG.height; y++) {
        const row = [];
        for (let z = 0; z < this.BLOCK_CHUNK_CONFIG.depth; z++) {
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

  generateResources(randomNumberGenerator) {
    const simplex = new SimplexNoise(randomNumberGenerator);
    resources.forEach((resource) => {
      for (let x = 0; x < this.BLOCK_CHUNK_CONFIG.width; x++) {
        for (let y = 0; y < this.BLOCK_CHUNK_CONFIG.height; y++) {
          for (let z = 0; z < this.BLOCK_CHUNK_CONFIG.depth; z++) {
            const value = simplex.noise3d(
              (this.position.x + x) / resource.scale.x,
              (this.position.y + y) / resource.scale.y,
              (this.position.z + z) / resource.scale.z
            );

            if (value > resource.scarcity) {
              this.setBlockId(x, y, z, resource.id);
            }
          }
        }
      }
    });
  }

  generateTerrain(randomNumberGenerator) {
    const simplex = new SimplexNoise(randomNumberGenerator);
    for (let x = 0; x < this.BLOCK_CHUNK_CONFIG.width; x++) {
      for (let z = 0; z < this.BLOCK_CHUNK_CONFIG.depth; z++) {
        const value = simplex.noise(
          (this.position.x + x) / this.WORLD_PARAMS.terrain.scale,
          (this.position.z + z) / this.WORLD_PARAMS.terrain.scale
        );

        const scaledNoise =
          this.WORLD_PARAMS.terrain.offset +
          this.WORLD_PARAMS.terrain.magnitude * value;

        let height = Math.floor(this.BLOCK_CHUNK_CONFIG.height * scaledNoise);
        height = Math.max(
          0,
          Math.min(height, this.BLOCK_CHUNK_CONFIG.height - 1)
        );

        for (let y = 0; y < this.BLOCK_CHUNK_CONFIG.height; y++) {
          const cell = this.getBlock(x, y, z);
          const currentId = cell ? cell.id : blocks.empty.id;

          if (y < height && currentId === blocks.empty.id) {
            // fill interior with dirt only if it wasn't already set by resources
            this.setBlockId(x, y, z, blocks.dirt.id);
          } else if (y === height) {
            // On surface grass
            const useVariation =
              Math.random() > this.seasonGrass.variationThreshold &&
              y > this.seasonGrass.variationHeight;

            this.setBlockId(
              x,
              y,
              z,
              useVariation ? blocks.grassVariation.id : blocks.grass.id
            );
          } else if (y > height) {
            // above the surface remains empty
            this.setBlockId(x, y, z, blocks.empty.id);
          }
        }
      }
    }
  }

  disposeOldMeshInstances() {
    this.traverse((child) => {
      if (child.isInstancedMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      }
    });
    this.clear();
  }

  generateMeshInstances(Ccnt) {
    this.clear();
    const { width, height, depth } = this.BLOCK_CHUNK_CONFIG;

    // ---- PASS 1: Count ----
    const maxCount = width * depth * height;

    // ---- PASS 2: Allocate meshes ----
    const meshes = {};
    Object.values(blocks)
      .filter((blockType) => blockType.id !== blocks.empty.id)
      .forEach((blockType) => {
        // get geometry for this block (fall back to a unit box)
        const geometry =
          (this.blockGeometries && this.blockGeometries.get(blockType.id)) ||
          new THREE.BoxGeometry(1, 1, 1);

        // choose material: prefer blockType.material if present, else use atlasMaterial
        const material = blockType.material || this.atlasMaterial;

        const mesh = new THREE.InstancedMesh(geometry, material, maxCount);
        mesh.name = String(blockType.id);
        mesh.count = 0;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        meshes[blockType.id] = mesh;
      });

    // ---- PASS 3: Fill ----
    const matrix = new THREE.Matrix4();
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        for (let z = 0; z < depth; z++) {
          const blockId = this.getBlock(x, y, z).id;

          if (blockId === blocks.empty.id) continue;

          if (this.isBlockObscured(x, y, z)) continue;

          const mesh = meshes[blockId];
          if (!mesh) continue;

          const instanceId = mesh.count;
          matrix.setPosition(x, y, z);
          mesh.setMatrixAt(instanceId, matrix);
          this.setBlockInstanceId(x, y, z, instanceId);
          mesh.count++;
        }
      }
    }

    // ---- PASS 4: Add to world ----
    this.add(...Object.values(meshes));

    console.log(`Generated chunk with ID: ${Ccnt}`);
    return Object.values(meshes).reduce((sum, m) => sum + (m.count || 0), 0);
  }

  getBlock(x, y, z) {
    if (this.inBounds(x, y, z)) {
      return this.data[x][y][z];
    } else {
      return null;
    }
  }

  setBlockId(x, y, z, id) {
    if (this.inBounds(x, y, z)) {
      this.data[x][y][z].id = id;
    }
  }

  setBlockInstanceId(x, y, z, instanceId) {
    if (this.inBounds(x, y, z)) {
      this.data[x][y][z].instanceId = instanceId;
    }
  }

  inBounds(x, y, z) {
    if (
      x >= 0 &&
      x < this.BLOCK_CHUNK_CONFIG.width &&
      y >= 0 &&
      y < this.BLOCK_CHUNK_CONFIG.height &&
      z >= 0 &&
      z < this.BLOCK_CHUNK_CONFIG.depth
    ) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Returns true if this block is completely hidden by other blocks
   */
  isBlockObscured(x, y, z) {
    const up = this.getBlock(x, y + 1, z)?.id ?? blocks.empty.id;
    const down = this.getBlock(x, y - 1, z)?.id ?? blocks.empty.id;
    const left = this.getBlock(x - 1, y, z)?.id ?? blocks.empty.id;
    const right = this.getBlock(x + 1, y, z)?.id ?? blocks.empty.id;
    const forward = this.getBlock(x, y, z + 1)?.id ?? blocks.empty.id;
    const back = this.getBlock(x, y, z - 1)?.id ?? blocks.empty.id;

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
}
