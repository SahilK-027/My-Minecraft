export const blocks = {
  empty: {
    id: 0,
    name: 'empty',
  },
  grass: {
    id: 1,
    name: 'grass',
    color: '#0eaf0e',
  },
  dirt: {
    id: 2,
    name: 'dirt',
    color: '#5d4c0e',
  },
  stone: {
    id: 3,
    name: 'stone',
    color: '#3a3d40',
    scale: {
      x: 40,
      y: 35,
      z: 40,
    },
    scarcity: 0.5
  },
  coalOre: {
    id: 4,
    name: 'coalOre',
    color: '#000000',
    scale: { x: 30, y: 30, z: 30 },
    scarcity: 0.6
  },
  ironOre: {
    id: 5,
    name: 'ironOre',
    color: '#ff0000',
    scale: { x: 20, y: 20, z: 20 },
    scarcity: 0.85
  },
  goldOre: {
    id: 6,
    name: 'goldOre',
    color: '#ffca0a',
    scale: { x: 40, y: 40, z: 40 },
    scarcity: 0.95
  },
};

export const resources = [
  blocks.stone,
  blocks.coalOre,
  blocks.ironOre,
  blocks.goldOre,
];