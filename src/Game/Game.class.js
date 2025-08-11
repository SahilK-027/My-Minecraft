import * as THREE from 'three';
import Sizes from './Utils/Sizes.class';
import Time from './Utils/Time.class';
import Camera from './Core/Camera.class';
import Renderer from './Core/Renderer.class';
import World from './Scenes/WorldScene/World.scene';
import DebugGUI from './Utils/DebugGUI';
import { getThemeConfig } from './Utils/ThemeManager.class';

export default class Game {
  constructor(canvas, resources) {
    // Singleton
    if (Game.instance) {
      return Game.instance;
    }
    Game.instance = this;

    this.canvas = canvas;
    this.resources = resources;

    this.sizes = new Sizes();
    this.time = new Time();
    this.debug = new DebugGUI();
    this.scene = new THREE.Scene();
    this.themeConfig = getThemeConfig('windsweptHills');
    this.cameraInstance = new Camera();
    this.world = new World();
    this.player = this.world.player;
    this.camera = this.cameraInstance.orbitCamera;
    this.renderer = new Renderer();

    this.time.on('animate', () => {
      this.update(this.time.delta);
    });
    this.sizes.on('resize', () => {
      this.resize();
    });
  }

  static getInstance() {
    if (!Game.instance) {
      Game.instance = new Game();
    }
    return Game.instance;
  }

  resize() {
    this.cameraInstance.resize();
    this.renderer.resize();
  }

  update(delta) {
    if (this.player && this.player.controls) {
      this.camera = this.player.controls.isLocked
        ? this.cameraInstance.FPPCamera
        : this.cameraInstance.orbitCamera;
    }
    this.cameraInstance.update();
    this.world.update(delta);
    this.renderer.update();
  }

  destroy() {
    this.sizes.off('resize');
    this.time.off('animate');

    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();

        for (const key in child.material) {
          const value = child.material[key];

          if (typeof value?.dispose === 'function') {
            value.dispose();
          }
        }
      }
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const mats = Array.isArray(child.material)
          ? child.material
          : [child.material];
        mats.forEach((m) => {
          // dispose textures
          for (const key in m) {
            const prop = m[key];
            if (prop && prop.isTexture) prop.dispose();
          }
          m.dispose();
        });
      }
    });

    this.camera.controls.dispose();
    this.renderer.rendererInstance.dispose();
    this.debug.gui.destroy();

    // Null references
    this.canvas = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.world = null;
    this.debug = null;
  }
}
