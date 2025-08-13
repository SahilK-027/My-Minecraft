import * as THREE from 'three';
import Game from '../../../../Game.class';
import DebugGUI from '../../../../Utils/DebugGUI';
import { SimplexNoise } from 'three/examples/jsm/Addons.js';
import { RandomNumberGenerator } from '../../../../Utils/RandomNumberGenerator.class';
import { blocks, resources } from '../../../../Data/Blocks';
import { TextureAtlas } from '../../../../Utils/TextureAtlas.class';
import { BlockGeometry } from './BlockGeometry.class';

const WORLD_CONFIG = {
  width: 64,
  height: 32,
  depth: 64,
};

const WORLD_PARAMS = {
  seed: 3608,
  terrain: {
    scale: 30,
    magnitude: 0.14,
    offset: 0.2,
  },
};

const MATERIAL_CONSTRUCTORS = {
  lambert: THREE.MeshLambertMaterial,
  toon: THREE.MeshToonMaterial,
  standard: THREE.MeshStandardMaterial,
};

const QUALITY_MAP = {
  low: 'lambert',
  medium: 'toon',
  high: 'standard',
};

const GRASS_SEASONS_CONFIG = {
  summer: {
    variationThreshold: 0.8,
    variationHeight: WORLD_CONFIG.height * WORLD_PARAMS.terrain.offset,
    variationTexture: 'grassVariation',
  },
  autumn: {
    variationThreshold: 0.8,
    variationHeight: WORLD_CONFIG.height * WORLD_PARAMS.terrain.offset,
    variationTexture: 'autumnGrassVariation',
  },
  winter: {
    variationThreshold: 0.0,
    variationHeight: 0.0,
    variationTexture: 'winterGrass',
  },
};

export default class BlockWorld {
  constructor() {
    this.game = Game.getInstance();
    this.scene = this.game.scene;
    this.textureResources = this.game.resources.items;
    this.isDebugMode = this.game.isDebugMode;

    this.debug = DebugGUI.getInstance();
    this.quality = 'medium';
    this.currentSeason = 'winter';

    this.seasonGrass = GRASS_SEASONS_CONFIG[this.currentSeason];

    this.initTextureAtlas();
    this.initResources();
    this.generateBlockWorld();
    if (this.isDebugMode) {
      this.initGUI();
    }
  }

  initTextureAtlas() {
    console.log('Creating texture atlas...');

    // 32x32 textures, 512x512 atlas
    this.atlas = new TextureAtlas(32, 512);

    this.blockConfigs = {
      [blocks.grass.id]: {
        faces: {
          front: 'grassSide',
          back: 'grassSide',
          top: 'grassTop',
          bottom: 'dirt',
          right: 'grassSide',
          left: 'grassSide',
        },
      },
      [blocks.grassVariation.id]: {
        faces: {
          front: 'grassSide',
          back: 'grassSide',
          top: `${this.seasonGrass.variationTexture}`,
          bottom: 'dirt',
          right: 'grassSide',
          left: 'grassSide',
        },
      },
      [blocks.dirt.id]: {
        faces: {
          front: 'dirt',
          back: 'dirt',
          top: 'dirt',
          bottom: 'dirt',
          right: 'dirt',
          left: 'dirt',
        },
      },
      [blocks.stone.id]: {
        faces: {
          front: 'stone',
          back: 'stone',
          top: 'stone',
          bottom: 'stone',
          right: 'stone',
          left: 'stone',
        },
      },
      [blocks.coalOre.id]: {
        faces: {
          front: 'coalOre',
          back: 'coalOre',
          top: 'coalOre',
          bottom: 'coalOre',
          right: 'coalOre',
          left: 'coalOre',
        },
      },
      [blocks.ironOre.id]: {
        faces: {
          front: 'ironOre',
          back: 'ironOre',
          top: 'ironOre',
          bottom: 'ironOre',
          right: 'ironOre',
          left: 'ironOre',
        },
      },
      [blocks.goldOre.id]: {
        faces: {
          front: 'goldOre',
          back: 'goldOre',
          top: 'goldOre',
          bottom: 'goldOre',
          right: 'goldOre',
          left: 'goldOre',
        },
      },
    };

    let grassTextureTopToRender, grassTextureSideToRender;
    switch (this.currentSeason) {
      case 'summer':
        grassTextureTopToRender = this.textureResources.grassTexture;
        grassTextureSideToRender = this.textureResources.grassSideTexture;
        break;
      case 'winter':
        grassTextureTopToRender = this.textureResources.winterGrassTexture;
        grassTextureSideToRender = this.textureResources.winterGrassSideTexture;
        break;
      case 'autumn':
        grassTextureTopToRender = this.textureResources.autumnGrassTexture;
        grassTextureSideToRender = this.textureResources.autumnGrassSideTexture;
    }

    this.atlas.addTexture('grassTop', grassTextureTopToRender);
    this.atlas.addTexture(
      this.seasonGrass.variationTexture,
      this.textureResources[`${this.seasonGrass.variationTexture}Texture`]
    );
    this.atlas.addTexture('grassSide', grassTextureSideToRender);
    this.atlas.addTexture('dirt', this.textureResources.dirtTexture);
    this.atlas.addTexture('stone', this.textureResources.stoneTexture);
    this.atlas.addTexture('coalOre', this.textureResources.coalOreTexture);
    this.atlas.addTexture('ironOre', this.textureResources.ironOreTexture);
    this.atlas.addTexture('goldOre', this.textureResources.goldOreTexture);

    this.atlasTexture = this.atlas.generateAtlasTexture();

    if ('colorSpace' in this.atlasTexture) {
      this.atlasTexture.colorSpace = THREE.SRGBColorSpace;
    } else {
      this.atlasTexture.encoding = THREE.sRGBEncoding;
    }

    // Debug: show atlas
    if (this.isDebugMode) {
      this.atlas.debugAtlas();
    }

    console.log(
      'Texture atlas created with',
      this.atlas.getTextureNames().length,
      'textures'
    );
  }

  initResources() {
    const ctorKey = QUALITY_MAP[this.quality];
    const MaterialConstructor = MATERIAL_CONSTRUCTORS[ctorKey];

    this.atlasMaterial = new MaterialConstructor({
      map: this.atlasTexture,
    });

    this.blockGeometries = BlockGeometry.createBlockGeometries(
      this.atlas,
      this.blockConfigs
    );
  }

  generateBlockWorld() {
    const randomNumberGenerator = new RandomNumberGenerator(WORLD_PARAMS.seed);

    this.initBlockWorldTerrain();
    this.generateResources(randomNumberGenerator);
    this.generateTerrain(randomNumberGenerator);
    this.generateMeshInstances();
  }

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

  generateResources(randomNumberGenerator) {
    const simplex = new SimplexNoise(randomNumberGenerator);
    resources.forEach((resource) => {
      for (let x = 0; x < WORLD_CONFIG.width; x++) {
        for (let y = 0; y < WORLD_CONFIG.height; y++) {
          for (let z = 0; z < WORLD_CONFIG.depth; z++) {
            const value = simplex.noise3d(
              x / resource.scale.x,
              y / resource.scale.y,
              z / resource.scale.z
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

        for (let y = 0; y < WORLD_CONFIG.height; y++) {
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
    if (this.worldGroup) {
      this.scene.remove(this.worldGroup);
      this.worldGroup.traverse((child) => {
        if (child.isInstancedMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });
    }
  }

  generateMeshInstances() {
    if (this.worldGroup) {
      this.disposeOldMeshInstances();
    }

    const { width, height, depth } = WORLD_CONFIG;

    this.worldGroup = new THREE.Group();

    // ---- PASS 1: Count ----
    const counts = new Map();
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        for (let z = 0; z < depth; z++) {
          const { id } = this.getBlock(x, y, z);
          if (id === blocks.empty.id) continue;
          if (this.isBlockObscured(x, y, z)) continue;
          counts.set(id, (counts.get(id) || 0) + 1);
        }
      }
    }

    // ---- PASS 2: Allocate meshes ----
    const meshes = new Map();
    for (const [blockId, count] of counts) {
      const geometry = this.blockGeometries.get(blockId);
      if (!geometry) continue;

      const mesh = new THREE.InstancedMesh(geometry, this.atlasMaterial, count);
      mesh.count = 0;
      mesh.userData.blockId = blockId;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      meshes.set(blockId, mesh);
    }

    // ---- PASS 3: Fill ----
    const matrix = new THREE.Matrix4();
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        for (let z = 0; z < depth; z++) {
          const { id } = this.getBlock(x, y, z);
          if (id === blocks.empty.id) continue;
          if (this.isBlockObscured(x, y, z)) continue;

          const mesh = meshes.get(id);
          if (!mesh) continue;

          matrix.makeTranslation(x, y, z);
          mesh.setMatrixAt(mesh.count, matrix);
          this.setBlockInstanceId(x, y, z, mesh.count);
          mesh.count++;
        }
      }
    }

    // ---- PASS 4: Finalize ----
    for (const mesh of meshes.values()) {
      this.worldGroup.add(mesh);
    }

    this.meshes = meshes;
    this.scene.add(this.worldGroup);

    console.log(
      `Generated world with ${meshes.size} mesh types, total instances:`,
      Array.from(meshes.values()).reduce((sum, mesh) => sum + mesh.count, 0)
    );
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
      x < WORLD_CONFIG.width &&
      y >= 0 &&
      y < WORLD_CONFIG.height &&
      z >= 0 &&
      z < WORLD_CONFIG.depth
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

  onQualityChange(newQuality) {
    if (this.quality === newQuality) return;

    console.log(`Quality change: ${this.quality} → ${newQuality}`);

    try {
      this.quality = newQuality;

      if (this.atlasMaterial) {
        this.atlasMaterial.dispose();
      }

      const ctorKey = QUALITY_MAP[this.quality];
      const MaterialConstructor = MATERIAL_CONSTRUCTORS[ctorKey];
      this.atlasMaterial = new MaterialConstructor({
        map: this.atlasTexture,
      });

      if (this.meshes) {
        this.meshes.forEach((mesh) => {
          mesh.material = this.atlasMaterial;
        });
      }

      console.log(`Quality change complete: ${newQuality}`);
    } catch (error) {
      console.error('Error during quality change:', error);
    }
  }

  onSeasonChange(newSeason) {
    if (this.currentSeason === newSeason) return;

    console.log(`Season change: ${this.currentSeason} → ${newSeason}`);

    try {
      this.currentSeason = newSeason;
      this.seasonGrass = GRASS_SEASONS_CONFIG[this.currentSeason];

      // Recreate atlas, materials and block geometries so textures/UVs reflect new season
      this.initTextureAtlas();
      this.initResources();

      // Rebuild the world meshes (old meshes will be disposed by generateMeshInstances)
      this.generateBlockWorld();

      console.log(`Season change complete: ${newSeason}`);
    } catch (error) {
      console.error('Error during season change:', error);
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
    });

    const qualityControl = {
      quality: this.quality,
    };

    this.debug.add(
      qualityControl,
      'quality',
      {
        options: {
          'Low (Diffused)': 'low',
          'Medium (Toon)': 'medium',
          'High (Physical)': 'high',
        },
        label: 'Graphics Quality',
        onChange: (q) => {
          this.onQualityChange(q);
        },
      },
      'Graphics Settings'
    );

    const seasonControl = {
      season: this.currentSeason,
    };

    this.debug.add(
      seasonControl,
      'season',
      {
        options: {
          Summer: 'summer',
          Autumn: 'autumn',
          Winter: 'winter',
        },
        label: 'Season',
        onChange: (s) => {
          this.onSeasonChange(s);
        },
      },
      'Seasons Settings'
    );
  }
}
