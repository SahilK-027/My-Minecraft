export default class GameplayConfig {
  static LOW = {
    WORLD_PARAMS: {
      seed: 0,
      terrain: {
        scale: 30,
        magnitude: 0.5,
        offset: 0.7,
      },
      minMiningDepth: 0,
      maxBuildHeight: 16,
    },
    BLOCK_CHUNK_CONFIG: {
      width: 16,
      height: 8,
      depth: 16,
    },
    DRAW_DISTANCE: 2,
  };

  static MODERATE = {
    WORLD_PARAMS: {
      seed: 0,
      terrain: {
        scale: 60,
        magnitude: 0.5,
        offset: 0.7,
      },
      minMiningDepth: 0,
      maxBuildHeight: 32,
    },
    BLOCK_CHUNK_CONFIG: {
      width: 32,
      height: 16,
      depth: 32,
    },
    DRAW_DISTANCE: 3,
  };

  static HIGH = {
    WORLD_PARAMS: {
      seed: 0,
      terrain: {
        scale: 60,
        magnitude: 0.5,
        offset: 0.7,
      },
      minMiningDepth: 0,
      maxBuildHeight: 32,
    },
    BLOCK_CHUNK_CONFIG: {
      width: 32,
      height: 16,
      depth: 32,
    },
    DRAW_DISTANCE: 4,
  };

  static ULTRA = {
    WORLD_PARAMS: {
      seed: 0,
      terrain: {
        scale: 120,
        magnitude: 0.5,
        offset: 0.7,
      },
      minMiningDepth: 0,
      maxBuildHeight: 128,
    },
    BLOCK_CHUNK_CONFIG: {
      width: 128,
      height: 64,
      depth: 128,
    },
    DRAW_DISTANCE: 4,
  };

  static configs = {
    low: this.LOW,
    moderate: this.MODERATE,
    high: this.HIGH,
    ultra: this.ULTRA,
  };

  static getConfig(level = 'moderate') {
    return this.configs[level] || this.configs.moderate;
  }

  static estimateMemoryUsage(config) {
    const blocksPerChunk =
      config.BLOCK_CHUNK_CONFIG.width *
      config.BLOCK_CHUNK_CONFIG.height *
      config.BLOCK_CHUNK_CONFIG.depth;
    const totalChunks = Math.pow(config.DRAW_DISTANCE * 2 + 1, 2);
    const totalBlocks = blocksPerChunk * totalChunks;
    const memoryMB = (totalBlocks * 8) / (1024 * 1024);

    return {
      blocksPerChunk,
      totalChunks,
      totalBlocks,
      memoryMB: Math.round(memoryMB * 10) / 10,
    };
  }

  static detectRecommendedLevel() {
    const memory = navigator.deviceMemory || 4; // GB
    const cores = navigator.hardwareConcurrency || 4;

    if (memory >= 8 && cores >= 8) return 'ultra';
    if (memory >= 6 && cores >= 4) return 'high';
    if (memory >= 4 && cores >= 2) return 'moderate';
    return 'low';
  }
}
