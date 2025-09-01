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
    seasonGrass,
    dataStore
  ) {
    super();
    this.loaded = false;

    this.WORLD_PARAMS = WORLD_PARAMS;
    this.BLOCK_CHUNK_CONFIG = BLOCK_CHUNK_CONFIG;
    this.atlas = atlas;
    this.atlasTexture = atlasTexture;
    this.blockConfigs = blockConfigs;
    this.dataStore = dataStore;

    this.game = Game.getInstance();

    this.seasonGrass = seasonGrass;

    this.initResources();
  }

  initResources() {
    this.atlasMaterial = new THREE.MeshToonMaterial({
      map: this.atlasTexture,
      alphaTest: 0.1,
    });

    this.blockGeometries = BlockGeometry.createBlockGeometries(
      this.atlas,
      this.blockConfigs
    );
  }

  generateBlockWorld() {
    const randomNumberGenerator = new RandomNumberGenerator(
      this.WORLD_PARAMS.seed
    );

    this.initBlockWorldTerrain();
    this.generateResources(randomNumberGenerator);
    this.generateTerrain(randomNumberGenerator);
    this.generateTrees(randomNumberGenerator);
    this.generateClouds(randomNumberGenerator);
    this.loadPlayerChanges();
    this.generateMeshInstances();

    this.loaded = true;
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

    // First pass: determine terrain heights
    const terrainHeights = [];
    for (let x = 0; x < this.BLOCK_CHUNK_CONFIG.width; x++) {
      terrainHeights[x] = [];
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
        height -= 3;

        terrainHeights[x][z] = height;
      }
    }

    // Helper function to check if position is near water
    const isNearWater = (x, z, radius = 3) => {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const checkX = x + dx;
          const checkZ = z + dz;

          // Check bounds
          if (
            checkX >= 0 &&
            checkX < this.BLOCK_CHUNK_CONFIG.width &&
            checkZ >= 0 &&
            checkZ < this.BLOCK_CHUNK_CONFIG.depth
          ) {
            const terrainHeight = terrainHeights[checkX][checkZ];

            // If terrain is below water level, there's water here
            if (terrainHeight < this.WORLD_PARAMS.terrain.waterOffset) {
              return true;
            }
          }
        }
      }
      return false;
    };

    // Second pass: place blocks
    for (let x = 0; x < this.BLOCK_CHUNK_CONFIG.width; x++) {
      for (let z = 0; z < this.BLOCK_CHUNK_CONFIG.depth; z++) {
        const height = terrainHeights[x][z];
        const nearWater = isNearWater(x, z);

        for (let y = 0; y < this.BLOCK_CHUNK_CONFIG.height; y++) {
          const cell = this.getBlock(x, y, z);
          const currentId = cell ? cell.id : blocks.empty.id;

          if (y === 0) {
            // Bedrock at bottom
            this.setBlockId(x, y, z, blocks.bedrock.id);
          } else if (y < height && currentId === blocks.empty.id) {
            // Interior blocks
            if (nearWater && y <= this.WORLD_PARAMS.terrain.waterOffset) {
              // Use sand only if near water AND below/at water level
              this.setBlockId(x, y, z, blocks.sand.id);
            } else {
              // Use dirt everywhere else
              this.setBlockId(x, y, z, blocks.dirt.id);
            }
          } else if (y === height) {
            // Surface block
            if (height < this.WORLD_PARAMS.terrain.waterOffset) {
              // Surface is underwater - use sand
              this.setBlockId(x, y, z, blocks.sand.id);
            } else if (
              nearWater &&
              y <= this.WORLD_PARAMS.terrain.waterOffset + 2
            ) {
              // Surface near water and close to water level - use sand (beach)
              this.setBlockId(x, y, z, blocks.sand.id);
            } else {
              // Regular surface - use grass
              const useVariation =
                Math.random() > this.seasonGrass.variationThreshold &&
                y > this.seasonGrass.variationHeight;
              this.setBlockId(
                x,
                y,
                z,
                useVariation ? blocks.grassVariation.id : blocks.grass.id
              );
            }
          } else if (y > height) {
            // Above surface - keep empty
            this.setBlockId(x, y, z, blocks.empty.id);
          }
        }
      }
    }
  }

  generateTrees(randomNumberGenerator) {
    const simplex = new SimplexNoise(randomNumberGenerator);
    const randN = randomNumberGenerator.random();

    const canopySize = this.WORLD_PARAMS.trees.canopy.size.max;
    const { width, depth, height } = this.BLOCK_CHUNK_CONFIG;
    const treesCfg = this.WORLD_PARAMS.trees;
    const canopyCfg = treesCfg.canopy;
    const trunkCfg = treesCfg;

    const isTreeNearby = (cx, cz, minDist) => {
      if (!minDist || minDist <= 0) return false;
      const r2 = minDist * minDist;
      const startX = Math.floor(cx - minDist);
      const endX = Math.floor(cx + minDist);
      const startZ = Math.floor(cz - minDist);
      const endZ = Math.floor(cz + minDist);

      for (let sx = startX; sx <= endX; sx++) {
        const dx = sx - cx;
        const dx2 = dx * dx;
        for (let sz = startZ; sz <= endZ; sz++) {
          const dz = sz - cz;
          if (dx2 + dz * dz > r2) continue;
          for (let sy = 0; sy < height; sy++) {
            if (this.getBlock(sx, sy, sz)?.id === blocks.tree.id) return true;
          }
        }
      }
      return false;
    };

    const minDistance = treesCfg.minDistance;

    for (let baseX = canopySize; baseX < width - canopySize; baseX++) {
      for (let baseZ = canopySize; baseZ < depth - canopySize; baseZ++) {
        const n =
          simplex.noise(this.position.x + baseX, this.position.z + baseZ) *
            0.5 +
          0.5;

        if (n < 1 - treesCfg.frequency) continue;

        for (let y = height - 1; y--; y >= 0) {
          const currBlockId = this.getBlock(baseX, y, baseZ).id;
          if (
            currBlockId !== blocks.grass.id &&
            currBlockId !== blocks.grassVariation.id
          )
            continue;
          const baseY = y + 1;

          if (isTreeNearby(baseX, baseZ, minDistance)) break;

          const minH = trunkCfg.trunkHeight.min;
          const maxH = trunkCfg.trunkHeight.max;
          const trunkHeight = Math.round(randN * (maxH - minH)) + minH;
          const topY = baseY + trunkHeight;

          for (let trunkY = baseY; trunkY <= topY; trunkY++) {
            this.setBlockId(baseX, trunkY, baseZ, blocks.tree.id);
          }

          const minR = canopyCfg.size.min;
          const maxR = canopyCfg.size.max;
          const R = Math.round(randN * (maxR - minR)) + minR;

          for (let dx = -R; dx <= R; dx++) {
            for (let dy = -R; dy <= R; dy++) {
              for (let dz = -R; dz <= R; dz++) {
                if (dx * dx + dy * dy + dz * dz > R * R) continue;

                const wx = baseX + dx;
                const wy = topY + dy;
                const wz = baseZ + dz;

                if (this.getBlock(wx, wy, wz)?.id !== blocks.empty.id) continue;

                if (randN * Math.random() > canopyCfg.density) {
                  this.setBlockId(wx, wy, wz, blocks.leaves.id);
                }
              }
            }
          }

          break;
        }
      }
    }
  }

  generateClouds(randomNumberGenerator) {
    const simplex = new SimplexNoise(randomNumberGenerator);
    for (let x = 0; x < this.BLOCK_CHUNK_CONFIG.width; x++) {
      for (let z = 0; z < this.BLOCK_CHUNK_CONFIG.depth; z++) {
        const value =
          simplex.noise(
            (this.position.x + x) / this.WORLD_PARAMS.clouds.scale,
            (this.position.z + z) / this.WORLD_PARAMS.clouds.scale
          ) *
            0.5 +
          0.5;

        if (value < this.WORLD_PARAMS.clouds.density) {
          this.setBlockId(
            x,
            this.BLOCK_CHUNK_CONFIG.height - 1,
            z,
            blocks.cloud.id
          );
        }
      }
    }
  }

  loadPlayerChanges() {
    for (let x = 0; x < this.BLOCK_CHUNK_CONFIG.width; x++) {
      for (let y = 0; y < this.BLOCK_CHUNK_CONFIG.height; y++) {
        for (let z = 0; z < this.BLOCK_CHUNK_CONFIG.depth; z++) {
          if (
            this.dataStore.contains(this.position.x, this.position.z, x, y, z)
          ) {
            const blockId = this.dataStore.get(
              this.position.x,
              this.position.z,
              x,
              y,
              z
            );
            this.setBlockId(x, y, z, blockId);
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

  generateWater() {
    const { width, depth } = this.BLOCK_CHUNK_CONFIG;
    const waterGeo = new THREE.PlaneGeometry(width, depth);

    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x196475,
      transparent: true,
      opacity: 0.7,
      roughness: 0.6,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    this.waterMesh = new THREE.Mesh(waterGeo, waterMaterial);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.set(
      width / 2,
      this.WORLD_PARAMS.terrain.waterOffset - 0.4,
      depth / 2
    );
    this.waterMesh.layers.set(1);

    this.add(this.waterMesh);
  }

  generateMeshInstances() {
    this.clear();
    this.generateWater();

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

        if (!geometry.attributes.normal) {
          geometry.computeVertexNormals();
        }

        // choose material: prefer blockType.material if present, else use atlasMaterial
        const material = blockType.material || this.atlasMaterial;

        const mesh = new THREE.InstancedMesh(geometry, material, maxCount);
        mesh.name = String(blockType.id);
        mesh.count = 0;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;

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
    Object.values(meshes).forEach((mesh) => {
      if (mesh.count > 0) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.computeBoundingSphere) {
          mesh.computeBoundingSphere();
        }
        if (mesh.computeBoundingBox) {
          mesh.computeBoundingBox();
        }
      }
    });
    this.add(...Object.values(meshes));
  }

  getBlock(x, y, z) {
    if (this.inBounds(x, y, z)) {
      if (!this.data || !this.data[x] || !this.data[x][y]) {
        return null;
      }
      return this.data[x][y][z];
    } else {
      return null;
    }
  }

  // --- addBlockInstance ---
  addBlockInstance(x, y, z) {
    const block = this.getBlock(x, y, z);
    if (!block || block.id === blocks.empty.id) {
      return;
    }

    if (block.instanceId !== null) {
      return;
    }

    const mesh = this.children.find(
      (m) =>
        (m.userData && m.userData.blockId === block.id) ||
        String(m.name) === String(block.id)
    );

    if (!mesh) {
      return;
    }

    if (mesh.count >= mesh.instanceMatrix.count) {
      return;
    }

    const instanceId = mesh.count;
    mesh.count++;
    this.setBlockInstanceId(x, y, z, instanceId);

    const matrix = new THREE.Matrix4();
    matrix.setPosition(x, y, z);
    mesh.setMatrixAt(instanceId, matrix);
    mesh.instanceMatrix.needsUpdate = true;
  }

  // --- deleteBlockInstance ---
  deleteBlockInstance(x, y, z) {
    const block = this.getBlock(x, y, z);
    if (!block || block.instanceId == null) {
      return;
    }

    const mesh = this.children.find(
      (m) =>
        (m.userData && m.userData.blockId === block.id) ||
        String(m.name) === String(block.id)
    );

    if (!mesh) {
      this.setBlockInstanceId(x, y, z, null);
      this.setBlockId(x, y, z, blocks.empty.id);
      return;
    }

    const instanceId = block.instanceId;
    const lastIndex = mesh.count - 1;

    if (lastIndex < 0 || instanceId > lastIndex) {
      this.setBlockInstanceId(x, y, z, null);
      this.setBlockId(x, y, z, blocks.empty.id);
      return;
    }

    if (instanceId === lastIndex) {
      // Deleting the last instance, just decrement count
      mesh.count = lastIndex;
    } else {
      // Get the matrix for the last instance
      const lastMatrix = new THREE.Matrix4();
      mesh.getMatrixAt(lastIndex, lastMatrix);

      // Move last instance to the deleted position
      mesh.setMatrixAt(instanceId, lastMatrix);

      // Find which block corresponds to the last instance and update its mapping
      const lastPos = new THREE.Vector3();
      lastPos.setFromMatrixPosition(lastMatrix);
      const lx = Math.round(lastPos.x);
      const ly = Math.round(lastPos.y);
      const lz = Math.round(lastPos.z);

      // Update the block that was moved to point to the new instance ID
      const movedBlock = this.getBlock(lx, ly, lz);
      if (movedBlock && movedBlock.instanceId === lastIndex) {
        this.setBlockInstanceId(lx, ly, lz, instanceId);
      }

      // Decrement count
      mesh.count = lastIndex;
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (typeof mesh.computeBoundingSphere === 'function') {
      mesh.computeBoundingSphere();
    }

    // Clear the deleted block's data
    this.setBlockInstanceId(x, y, z, null);
  }

  removeBlock(x, y, z) {
    const block = this.getBlock(x, y, z);
    if (block && block.id !== blocks.empty) {
      this.deleteBlockInstance(x, y, z);
      this.setBlockId(x, y, z, blocks.empty.id);
      this.dataStore.set(
        this.position.x,
        this.position.z,
        x,
        y,
        z,
        blocks.empty.id
      );
    }
  }

  addBlock(x, y, z, blockId) {
    if (y >= this.BLOCK_CHUNK_CONFIG.height) {
      // TODO:
      console.log('OBJECT');
    }

    const existingBlock = this.getBlock(x, y, z);

    // Allow block placement if:
    // 1. existingBlock is null (position doesn't exist yet - we'll create it)
    // 2. existingBlock exists and is empty
    if (existingBlock === null || existingBlock.id === blocks.empty.id) {
      this.setBlockId(x, y, z, blockId);
      this.addBlockInstance(x, y, z);
      this.dataStore.set(this.position.x, this.position.z, x, y, z, blockId);
    }
  }

  setBlockId(x, y, z, id) {
    if (this.inBounds(x, y, z)) {
      // Ensure the data structure exists before setting
      if (!this.data[x]) {
        this.data[x] = [];
      }
      if (!this.data[x][y]) {
        this.data[x][y] = [];
        // Fill the row with empty blocks
        for (let zi = 0; zi < this.BLOCK_CHUNK_CONFIG.depth; zi++) {
          this.data[x][y].push({
            id: blocks.empty.id,
            instanceId: null,
          });
        }
      }
      if (!this.data[x][y][z]) {
        this.data[x][y][z] = {
          id: blocks.empty.id,
          instanceId: null,
        };
      }

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

  update(delta) {}
}
