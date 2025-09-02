import * as THREE from 'three';
import BlockWorldChunk from './BlockWorldChunk.class';
import { TextureAtlas } from '../../../../Utils/TextureAtlas.class';
import { blocks, resources } from '../../../../Data/Blocks';
import Game from '../../../../Game.class';
import DebugGUI from '../../../../Utils/DebugGUI';
import { DataStore } from '../../../../Utils/Datastore.class';

export default class BlockWorld extends THREE.Group {
  WORLD_PARAMS = {
    seed: 0,
    terrain: {
      scale: 64,
      magnitude: 0.2,
      offset: 0.45,
      waterOffset: 10,
    },
    minMiningDepth: 0,
    maxBuildHeight: 32,
    trees: {
      frequency: 0.004,
      trunkHeight: {
        min: 3,
        max: 6,
      },
      canopy: {
        size: {
          min: 2,
          max: 5,
        },
        density: 0.2,
      },
      minDistance: 10,
    },
    clouds: {
      density: 0.27,
      scale: 30,
    },
  };

  BLOCK_CHUNK_CONFIG = {
    width: 32,
    height: 32,
    depth: 32,
  };

  DRAW_DISTANCE = 2;

  GRASS_SEASONS_CONFIG = {
    summer: {
      variationThreshold: 0.9,
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

  LEAVES_SEASONS_CONFIG = {
    summer: {
      variationThreshold: 0.6,
      variationTexture: 'leavesVariation',
      leavesTexture: 'leaves',
    },
    autumn: {
      variationThreshold: 0.8,
      variationTexture: 'autumnLeavesVariation',
      leavesTexture: 'autumnLeaves',
    },
    winter: {
      variationThreshold: 0.8,
      variationTexture: 'winterLeavesVariation',
      leavesTexture: 'winterLeaves',
    },
  };

  ASYNC_LOADING = true;

  dataStore = new DataStore();

  constructor(seed = 3608) {
    super();
    this.game = Game.getInstance();
    this.seed = seed;
    this.currentSeason = 'autumn';
    this.seasonGrass = this.GRASS_SEASONS_CONFIG[this.currentSeason];
    this.seasonLeaves = this.LEAVES_SEASONS_CONFIG[this.currentSeason];
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
      [blocks.bedrock.id]: {
        faces: {
          front: 'bedrock',
          back: 'bedrock',
          top: 'bedrock',
          bottom: 'bedrock',
          right: 'bedrock',
          left: 'bedrock',
        },
      },
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
      [blocks.tree.id]: {
        faces: {
          front: 'treeSide',
          back: 'treeSide',
          top: 'treeTop',
          bottom: 'treeTop',
          right: 'treeSide',
          left: 'treeSide',
        },
      },
      [blocks.sand.id]: {
        faces: {
          front: 'sand',
          back: 'sand',
          top: 'sand',
          bottom: 'sand',
          right: 'sand',
          left: 'sand',
        },
      },
      [blocks.leaves.id]: {
        faces: {
          front: `${this.seasonLeaves.leavesTexture}`,
          back: `${this.seasonLeaves.leavesTexture}`,
          top: `${this.seasonLeaves.leavesTexture}`,
          bottom: `${this.seasonLeaves.leavesTexture}`,
          right: `${this.seasonLeaves.leavesTexture}`,
          left: `${this.seasonLeaves.leavesTexture}`,
        },
      },
      [blocks.leavesVariation.id]: {
        faces: {
          front: `${this.seasonLeaves.variationTexture}`,
          back: `${this.seasonLeaves.variationTexture}`,
          top: `${this.seasonLeaves.variationTexture}`,
          bottom: `${this.seasonLeaves.variationTexture}`,
          right: `${this.seasonLeaves.variationTexture}`,
          left: `${this.seasonLeaves.variationTexture}`,
        },
      },
      [blocks.cloud.id]: {
        faces: {
          front: 'cloud',
          back: 'cloud',
          top: 'cloud',
          bottom: 'cloud',
          right: 'cloud',
          left: 'cloud',
        },
      },
    };

    let grassTextureTopToRender, grassTextureSideToRender, leavesTexture;
    switch (this.currentSeason) {
      case 'summer':
        grassTextureTopToRender = this.textureResources.grassTexture;
        grassTextureSideToRender = this.textureResources.grassSideTexture;
        leavesTexture = this.textureResources.leavesTexture;
        break;
      case 'winter':
        grassTextureTopToRender = this.textureResources.winterGrassTexture;
        grassTextureSideToRender = this.textureResources.winterGrassSideTexture;
        leavesTexture = this.textureResources.winterLeavesTexture;
        break;
      case 'autumn':
        grassTextureTopToRender = this.textureResources.autumnGrassTexture;
        grassTextureSideToRender = this.textureResources.autumnGrassSideTexture;
        leavesTexture = this.textureResources.autumnLeavesTexture;
        break;
    }

    this.atlas.addTexture('bedrock', this.textureResources.bedrockTexture);
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
    this.atlas.addTexture('treeSide', this.textureResources.treeSideTexture);
    this.atlas.addTexture('treeTop', this.textureResources.treeTopTexture);
    this.atlas.addTexture('sand', this.textureResources.sandTexture);
    this.atlas.addTexture(this.seasonLeaves.leavesTexture, leavesTexture);
    this.atlas.addTexture(
      this.seasonLeaves.variationTexture,
      this.textureResources[`${this.seasonLeaves.variationTexture}Texture`]
    );
    this.atlas.addTexture('cloud', this.textureResources.cloudTexture);

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
    this.dataStore.clear();

    this.disposeChunks();

    for (let x = -this.DRAW_DISTANCE; x <= this.DRAW_DISTANCE; x++) {
      for (let z = -this.DRAW_DISTANCE; z <= this.DRAW_DISTANCE; z++) {
        const chunk = new BlockWorldChunk(
          this.WORLD_PARAMS,
          this.BLOCK_CHUNK_CONFIG,
          this.atlas,
          this.atlasTexture,
          this.blockConfigs,
          this.seasonGrass,
          this.seasonLeaves,
          this.dataStore
        );
        chunk.position.set(
          x * this.BLOCK_CHUNK_CONFIG.width,
          0,
          z * this.BLOCK_CHUNK_CONFIG.depth
        );
        chunk.userData = { x, z };
        chunk.generateBlockWorld();
        this.add(chunk);
      }
    }

    console.log('All initial chunks instantiated');
  }

  update(player) {
    // Find the visible chunks based on players position
    const visibleChunks = this.getVisibleChunks(player);
    // Compare with the current set of chunks
    const chunksToAdd = this.getChunksToAdd(visibleChunks);
    // Remove chunks that are no longer visible
    this.removeUnusedChunksFromWorld(visibleChunks);
    // Add newly visible chunks
    for (const chunk of chunksToAdd) {
      this.generateChunk(chunk.x, chunk.z);
    }
  }

  getVisibleChunks(player) {
    const visibleChunks = [];
    const coords = this.worldToChunkCoordinate(
      player.playerPosition.x,
      player.playerPosition.y,
      player.playerPosition.z
    );

    const chunkX = coords.chunk.x;
    const chunkZ = coords.chunk.z;

    for (
      let x = chunkX - this.DRAW_DISTANCE;
      x <= chunkX + this.DRAW_DISTANCE;
      x++
    ) {
      for (
        let z = chunkZ - this.DRAW_DISTANCE;
        z <= chunkZ + this.DRAW_DISTANCE;
        z++
      ) {
        visibleChunks.push({ x, z });
      }
    }
    return visibleChunks;
  }

  getChunksToAdd(visibleChunks) {
    return visibleChunks.filter((chunk) => {
      const chunkExists = this.children
        .map((obj) => obj.userData)
        .find(({ x, z }) => chunk.x === x && chunk.z === z);

      return !chunkExists;
    });
  }

  removeUnusedChunksFromWorld(visibleChunks) {
    const chunksToRemove = this.children.filter((chunk) => {
      const { x, z } = chunk.userData;
      const chunkExists = visibleChunks.find(
        (visibleChunk) => visibleChunk.x === x && visibleChunk.z === z
      );
      return !chunkExists;
    });

    for (const chunk of chunksToRemove) {
      chunk.disposeOldMeshInstances();
      this.remove(chunk);
    }
  }

  generateChunk(x, z) {
    const chunk = new BlockWorldChunk(
      this.WORLD_PARAMS,
      this.BLOCK_CHUNK_CONFIG,
      this.atlas,
      this.atlasTexture,
      this.blockConfigs,
      this.seasonGrass,
      this.seasonLeaves,
      this.dataStore
    );
    chunk.position.set(
      x * this.BLOCK_CHUNK_CONFIG.width,
      0,
      z * this.BLOCK_CHUNK_CONFIG.depth
    );
    chunk.userData = { x, z };
    if (this.ASYNC_LOADING) {
      requestIdleCallback(chunk.generateBlockWorld.bind(chunk), {
        timeout: 1000,
      });
    } else {
      chunk.generateBlockWorld();
    }

    this.add(chunk);
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

    if (chunk && chunk.loaded) {
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

  addBlock(x, y, z, blockId) {
    if (y > this.WORLD_PARAMS.maxBuildHeight) {
      window.alert('Cannot build above height limit');
      return false;
    }

    const coords = this.worldToChunkCoordinate(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

    if (chunk) {
      chunk.addBlock(coords.block.x, coords.block.y, coords.block.z, blockId);

      const neighbors = [
        { x: x + 1, y: y, z: z }, // right
        { x: x - 1, y: y, z: z }, // left
        { x: x, y: y + 1, z: z }, // up
        { x: x, y: y - 1, z: z }, // down
        { x: x, y: y, z: z + 1 }, // forward
        { x: x, y: y, z: z - 1 }, // back
      ];

      for (const neighbor of neighbors) {
        this.hideBlock(neighbor.x, neighbor.y, neighbor.z);
      }
    }
  }

  removeBlock(x, y, z) {
    if (y <= this.WORLD_PARAMS.minMiningDepth) {
      window.alert('Cannot mine beyond this depth!');
      return;
    }

    const coords = this.worldToChunkCoordinate(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

    if (chunk) {
      chunk.removeBlock(coords.block.x, coords.block.y, coords.block.z);

      const neighbors = [
        { x: x + 1, y: y, z: z }, // right
        { x: x - 1, y: y, z: z }, // left
        { x: x, y: y + 1, z: z }, // up
        { x: x, y: y - 1, z: z }, // down
        { x: x, y: y, z: z + 1 }, // forward
        { x: x, y: y, z: z - 1 }, // back
      ];

      for (const neighbor of neighbors) {
        this.revealBlock(neighbor.x, neighbor.y, neighbor.z);
      }
    }
  }

  revealBlock(x, y, z) {
    const coords = this.worldToChunkCoordinate(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

    if (!chunk || !chunk.loaded) {
      return;
    }

    const block = chunk.getBlock(
      coords.block.x,
      coords.block.y,
      coords.block.z
    );
    if (!block || block.id === blocks.empty.id) {
      return;
    }

    // Only reveal if block was previously obscured
    if (chunk.isBlockObscured(coords.block.x, coords.block.y, coords.block.z)) {
      return; // Still obscured, don't reveal
    }

    // Block should be visible now, add instance if it doesn't have one
    if (block.instanceId === null) {
      console.log(
        `added ${coords.block.x}, ${coords.block.y}, ${coords.block.z}`
      );
      chunk.addBlockInstance(coords.block.x, coords.block.y, coords.block.z);
    }
  }

  hideBlock(x, y, z) {
    const coords = this.worldToChunkCoordinate(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

    if (!chunk || !chunk.loaded) return;

    const block = chunk.getBlock(
      coords.block.x,
      coords.block.y,
      coords.block.z
    );
    if (!block || block.id === blocks.empty.id) return;

    // If the block is still visible, don't hide it
    if (
      !chunk.isBlockObscured(coords.block.x, coords.block.y, coords.block.z)
    ) {
      return;
    }

    // Block is obscured now — remove its instance if it has one
    if (block.instanceId !== null) {
      chunk.deleteBlockInstance(coords.block.x, coords.block.y, coords.block.z);
    }
  }

  onSeasonChange(newSeason) {
    if (this.currentSeason === newSeason) return;

    console.log(`Season change: ${this.currentSeason} → ${newSeason}`);

    try {
      this.currentSeason = newSeason;
      this.seasonGrass = this.GRASS_SEASONS_CONFIG[this.currentSeason];
      this.seasonLeaves = this.LEAVES_SEASONS_CONFIG[this.currentSeason];

      this.initTextureAtlas();
      this.generateBlockWorld();

      console.log(`Season change complete: ${newSeason}`);
    } catch (error) {
      console.error('Error during season change:', error);
    }
  }

  initGUI() {
    this.debug.add(
      this,
      'DRAW_DISTANCE',
      {
        min: 0,
        max: 5,
        step: 1,
        label: 'Draw Distance',
        onChange: () => {
          this.generateBlockWorld();
        },
      },
      'BlockWorld Folder'
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
      this.WORLD_PARAMS.trees,
      'frequency',
      {
        min: 0,
        max: 1,
        step: 0.0001,
        label: 'Tree Frequency',
        onChange: () => {
          this.generateBlockWorld();
        },
      },
      'BlockWorldChunk Folder'
    );

    this.debug.add(
      this.WORLD_PARAMS.trees,
      'minDistance',
      {
        min: 0,
        max: 100,
        step: 1,
        label: 'Tree separation',
        onChange: () => {
          this.generateBlockWorld();
        },
      },
      'BlockWorldChunk Folder'
    );
    this.debug.add(
      this.WORLD_PARAMS.trees.trunkHeight,
      'min',
      {
        min: 0,
        max: 10,
        step: 1,
        label: 'Tree trunkHeight Min',
        onChange: () => {
          this.generateBlockWorld();
        },
      },
      'BlockWorldChunk Folder'
    );
    this.debug.add(
      this.WORLD_PARAMS.trees.trunkHeight,
      'max',
      {
        min: 0,
        max: 10,
        step: 1,
        label: 'Tree trunkHeight Max',
        onChange: () => {
          this.generateBlockWorld();
        },
      },
      'BlockWorldChunk Folder'
    );
    this.debug.add(
      this.WORLD_PARAMS.trees.canopy.size,
      'min',
      {
        min: 0,
        max: 10,
        step: 1,
        label: 'Tree canopy rad min',
        onChange: () => {
          this.generateBlockWorld();
        },
      },
      'BlockWorldChunk Folder'
    );
    this.debug.add(
      this.WORLD_PARAMS.trees.canopy.size,
      'max',
      {
        min: 0,
        max: 10,
        step: 1,
        label: 'Tree canopy rad max',
        onChange: () => {
          this.generateBlockWorld();
        },
      },
      'BlockWorldChunk Folder'
    );
    this.debug.add(
      this.WORLD_PARAMS.trees.canopy,
      'density',
      {
        min: 0,
        max: 1,
        step: 0.01,
        label: 'Tree canopy density',
        onChange: () => {
          this.generateBlockWorld();
        },
      },
      'BlockWorldChunk Folder'
    );
    this.debug.add(
      this.WORLD_PARAMS.clouds,
      'density',
      {
        min: 0,
        max: 1,
        step: 0.01,
        label: 'Clouds density',
        onChange: () => {
          this.generateBlockWorld();
        },
      },
      'BlockWorldChunk Folder'
    );
    this.debug.add(
      this.WORLD_PARAMS.clouds,
      'scale',
      {
        min: 0,
        max: 100,
        step: 1,
        label: 'Clouds scale',
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
