export const blocks = {
  bedrock: {
    id: -1,
    name: 'bedrock',
  },
  empty: {
    id: 0,
    name: 'empty',
  },
  grass: {
    id: 1,
    name: 'grass',
  },
  grassVariation: {
    id: 2,
    name: 'grassVariation',
  },
  dirt: {
    id: 3,
    name: 'dirt',
  },
  tree: {
    id: 4,
    name: 'tree',
  },
  sand: {
    id: 5,
    name: 'sand',
  },
  leaves: {
    id: 6,
    name: 'leaves',
  },
  cloud: {
    id: 7,
    name: 'cloud',
  },
  stone: {
    id: 8,
    name: 'stone',
    scale: {
      x: 52,
      y: 35,
      z: 40,
    },
    scarcity: 0.59,
  },
  coalOre: {
    id: 9,
    name: 'coalOre',
    scale: { x: 45, y: 30, z: 42 },
    scarcity: 0.6,
  },
  ironOre: {
    id: 10,
    name: 'ironOre',
    scale: { x: 18.9, y: 54.2, z: 41 },
    scarcity: 0.85,
  },
  goldOre: {
    id: 11,
    name: 'goldOre',
    scale: { x: 50, y: 55, z: 52 },
    scarcity: 0.92,
  },
};

export const resources = [
  blocks.stone,
  blocks.coalOre,
  blocks.ironOre,
  blocks.goldOre,
];
