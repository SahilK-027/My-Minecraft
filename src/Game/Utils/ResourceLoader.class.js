import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import * as THREE from 'three';
import EventEmitter from './EventEmitter.class';

export default class ResourceLoader extends EventEmitter {
  constructor(assets) {
    super();

    this.sources = assets;
    this.items = {};
    this.sourceByUrl = {};

    // Build a map of every URL → its src record
    this.sources.forEach((src) => {
      const paths = Array.isArray(src.path) ? src.path : [src.path];
      paths.forEach((url) => {
        this.sourceByUrl[url] = src;
      });
    });

    // Total URLs we expect Three.js to load
    this.toLoad = Object.keys(this.sourceByUrl).length;
    this.loaded = 0;

    // Create and wire the manager
    this.manager = new THREE.LoadingManager();

    this.manager.onProgress = (_url, itemsLoaded, itemsTotal) => {
      this.loaded = itemsLoaded;
      const src = this.sourceByUrl[_url];
      const id = src ? src.id : _url;
      const file = _url.substring(_url.lastIndexOf('/') + 1);

      this.trigger('progress', {
        id: `${id} - ${file}`,
        itemsLoaded,
        itemsTotal,
        percent: (itemsLoaded / itemsTotal) * 100,
      });
    };

    this.manager.onLoad = () => {
      this.trigger('loaded', {
        itemsLoaded: this.toLoad,
        itemsTotal: this.toLoad,
        percent: 100,
      });
    };

    this.manager.onError = (url) => {
      const src = this.sourceByUrl[url];
      const id = src ? src.id : url;

      this.trigger('error', {
        id,
        url,
        itemsLoaded: this.loaded,
        itemsTotal: this.toLoad,
      });
    };

    this.setLoaders();
    this.initLoading();

    // If there was nothing to load, fire the loaded event right away
    if (this.toLoad === 0) {
      // Give the manager a tick to settle, then call onLoad
      setTimeout(() => this.manager.onLoad(), 0);
    }
  }

  setLoaders() {
    // feed the manager into each loader
    this.loaders = {};

    // Draco‐compression for glTF‑compressed
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    this.loaders.dracoLoader = dracoLoader;

    // glTF loaders
    this.loaders.gltfCompressLoader = new GLTFLoader(this.manager);
    this.loaders.gltfCompressLoader.setDRACOLoader(dracoLoader);
    this.loaders.gltfLoader = new GLTFLoader(this.manager);

    // textures
    this.loaders.textureLoader = new THREE.TextureLoader(this.manager);
    this.loaders.hdriLoader = new RGBELoader(this.manager);
    this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader(this.manager);
  }

  initLoading() {
    for (const source of this.sources) {
      const { type, path, id } = source;

      const onLoad = (file) => {
        this.items[id] = file;
      };
      const onProgress = undefined;

      switch (type) {
        case 'gltfModelCompressed':
          this.loaders.gltfCompressLoader.load(path, onLoad, onProgress);
          break;
        case 'gltfModel':
          this.loaders.gltfLoader.load(path, onLoad, onProgress);
          break;
        case 'texture':
          this.loaders.textureLoader.load(path, onLoad, onProgress);
          break;
        case 'HDRITexture':
          this.loaders.hdriLoader.load(path, onLoad, onProgress);
          break;
        case 'cubeMap':
          this.loaders.cubeTextureLoader.load(path, onLoad, onProgress);
          break;
        default:
          console.warn(`Unknown asset type: ${type}`);
      }
    }
  }
}
