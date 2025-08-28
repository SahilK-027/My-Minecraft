export class DataStore {
  constructor() {
    this.data = {};
  }

  clear() {
    this.data = {};
  }

  contains(chunkX, chunkZ, blockX, blockY, blockZ) {
    const key = this.#getKey(chunkX, chunkZ, blockX, blockY, blockZ);
    return this.data[key] !== undefined;
  }

  get(chunkX, chunkZ, blockX, blockY, blockZ) {
    const key = this.#getKey(chunkX, chunkZ, blockX, blockY, blockZ);
    const blockId = this.data[key];
    return blockId;
  }

  set(chunkX, chunkZ, blockX, blockY, blockZ, blockId) {
    const key = this.#getKey(chunkX, chunkZ, blockX, blockY, blockZ);
    this.data[key] = blockId;
  }

  #getKey(chunkX, chunkZ, blockX, blockY, blockZ) {
    const cx = Number.isFinite(chunkX) ? Math.trunc(chunkX) : chunkX;
    const cz = Number.isFinite(chunkZ) ? Math.trunc(chunkZ) : chunkZ;
    return `${cx},${cz},${blockX},${blockY},${blockZ}`;
  }
}
