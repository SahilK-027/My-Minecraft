import * as THREE from 'three';
import BlockWorldChunk from './BlockWorldChunk.class';
import { TextureAtlas } from '../../../../Utils/TextureAtlas.class';
import { blocks, resources } from '../../../../Data/Blocks';
import Game from '../../../../Game.class';
import DebugGUI from '../../../../Utils/DebugGUI';

export default class BlockWorld extends THREE.Group {
  WORLD_PARAMS = {
    seed: 3608,
    terrain: {
      scale: 47,
      magnitude: 0.25,
      offset: 0.7,
    },
  };

  BLOCK_CHUNK_CONFIG = {
    width: 64,
    height: 32,
    depth: 64,
  };

  GRASS_SEASONS_CONFIG = {
    summer: {
      variationThreshold: 0.8,
      variationHeight:
        this.BLOCK_CHUNK_CONFIG.height * this.WORLD_PARAMS.terrain.offset,
      variationTexture: 'grassVariation',
    },
    autumn: {
      variationThreshold: 0.8,
      variationHeight:
        this.BLOCK_CHUNK_CONFIG.height * this.WORLD_PARAMS.terrain.offset,
      variationTexture: 'autumnGrassVariation',
    },
    winter: {
      variationThreshold: 0.0,
      variationHeight: 0.0,
      variationTexture: 'winterGrass',
    },
  };
  constructor(seed = 3608) {
    super();
    this.game = Game.getInstance();
    this.seed = seed;
    this.currentSeason = 'summer';
    this.seasonGrass = this.GRASS_SEASONS_CONFIG[this.currentSeason];
    this.textureResources = this.game.resources.items;
    this.isDebugMode = this.game.isDebugMode;
    this.debug = DebugGUI.getInstance();

    if (this.isDebugMode) {
      this.initGUI();
    }

    this.initTextureAtlas();
  }

  initTextureAtlas() {
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

  generateBlockWorld() {
    this.disposeChunks();
    let CCnt = 0;
    let instancesCnt = 0;
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        const chunk = new BlockWorldChunk(
          this.WORLD_PARAMS,
          this.BLOCK_CHUNK_CONFIG,
          this.atlas,
          this.atlasTexture,
          this.blockConfigs,
          this.seasonGrass
        );
        chunk.position.set(
          x * this.BLOCK_CHUNK_CONFIG.width,
          0,
          z * this.BLOCK_CHUNK_CONFIG.depth
        );
        chunk.userData = { x, z };
        instancesCnt += chunk.generateBlockWorld(CCnt);
        this.add(chunk);
        CCnt++;
      }
    }
    console.log(`Total generated instances:`, instancesCnt);
  }

  worldToChunkCoordinate(x, y, z) {
    const chunkCoords = {
      x: Math.floor(x / this.BLOCK_CHUNK_CONFIG.width),
      z: Math.floor(z / this.BLOCK_CHUNK_CONFIG.depth),
    };

    const blockCoords = {
      x: x - this.BLOCK_CHUNK_CONFIG.width * chunkCoords.x,
      y,
      z: z - this.BLOCK_CHUNK_CONFIG.depth * chunkCoords.z,
    };

    return {
      chunk: chunkCoords,
      block: blockCoords,
    };
  }

  getChunk(chunkX, chunkZ) {
    return this.children.find(
      (chunk) => chunk.userData.x === chunkX && chunk.userData.z === chunkZ
    );
  }

  getBlock(x, y, z) {
    const coords = this.worldToChunkCoordinate(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

    if (chunk) {
      return chunk.getBlock(coords.block.x, coords.block.y, coords.block.z);
    } else {
      return null;
    }
  }

  disposeChunks() {
    this.traverse((chunk) => {
      if (chunk.disposeOldMeshInstances) {
        chunk.disposeOldMeshInstances();
      }
    });
    this.clear();
  }

  onSeasonChange(newSeason) {
    if (this.currentSeason === newSeason) return;

    console.log(`Season change: ${this.currentSeason} → ${newSeason}`);

    try {
      this.currentSeason = newSeason;
      this.seasonGrass = this.GRASS_SEASONS_CONFIG[this.currentSeason];

      this.initTextureAtlas();
      this.generateBlockWorld();

      console.log(`Season change complete: ${newSeason}`);
    } catch (error) {
      console.error('Error during season change:', error);
    }
  }

  initGUI() {
    this.debug.add(
      this.BLOCK_CHUNK_CONFIG,
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
      'BlockWorldChunk Folder'
    );
    this.debug.add(
      this.BLOCK_CHUNK_CONFIG,
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
      'BlockWorldChunk Folder'
    );
    this.debug.add(
      this.BLOCK_CHUNK_CONFIG,
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
      'BlockWorldChunk Folder'
    );
    this.debug.add(
      this.WORLD_PARAMS.terrain,
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
      'BlockWorldChunk Folder'
    );
    this.debug.add(
      this.WORLD_PARAMS.terrain,
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
      'BlockWorldChunk Folder'
    );
    this.debug.add(
      this.WORLD_PARAMS.terrain,
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
      'BlockWorldChunk Folder'
    );
    this.debug.add(
      this.WORLD_PARAMS,
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
      'BlockWorldChunk Folder'
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
