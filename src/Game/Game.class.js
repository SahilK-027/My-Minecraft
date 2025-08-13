import * as THREE from 'three';
import Sizes from './Utils/Sizes.class';
import Time from './Utils/Time.class';
import Camera from './Core/Camera.class';
import Renderer from './Core/Renderer.class';
import World from './Scenes/WorldScene/World.scene';
import DebugGUI from './Utils/DebugGUI';
import { getThemeConfig } from './Utils/ThemeManager.class';
import PhysicsSystem from './Systems/PhysicsSystem.class';

export default class Game {
  constructor(canvas, resources, isDebugMode) {
    // Singleton
    if (Game.instance) {
      return Game.instance;
    }
    Game.instance = this;

    this.canvas = canvas;
    this.resources = resources;

    this.sizes = new Sizes();
    this.time = new Time(false);

    this.isDebugMode = isDebugMode;
    if (this.isDebugMode) {
      this.debug = new DebugGUI();
    }

    this.scene = new THREE.Scene();
    this.themeConfig = getThemeConfig('windsweptHills');
    this.cameraInstance = new Camera();
    this.world = new World();
    this.player = this.world.player;
    this.physics = new PhysicsSystem();
    this.camera = this.cameraInstance.orbitCamera;
    this.renderer = new Renderer();

    // pause / resume game context state
    this.isPaused = false;
    this.suppressNextFrame = false;

    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    this._onWindowBlur = this._onWindowBlur.bind(this);
    this._onWindowFocus = this._onWindowFocus.bind(this);

    this.time.on('animate', () => {
      this.update(this.time.delta);
    });
    this.sizes.on('resize', () => {
      this.resize();
    });

    const initVisibility = () => {
      this._onVisibilityChange();
      this._onWindowBlur();
      this._onWindowFocus();
    };

    if (
      document.readyState === 'complete' ||
      document.readyState === 'interactive'
    ) {
      initVisibility();
    } else {
      document.addEventListener('DOMContentLoaded', initVisibility);
    }

    document.addEventListener(
      'visibilitychange',
      this._onVisibilityChange,
      false
    );
    window.addEventListener('blur', this._onWindowBlur);
    window.addEventListener('focus', this._onWindowFocus);

    this.time.startLoop();
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
    if (this.suppressNextFrame) {
      this.suppressNextFrame = false;
      return;
    }
    if (this.isPaused) return;
    if (!this.cameraInstance || !this.world || !this.renderer) return;

    if (this.player && this.player.controls) {
      this.camera = this.player.controls.isLocked
        ? this.cameraInstance.FPPCamera
        : this.cameraInstance.orbitCamera;
    }
    this.cameraInstance.update();
    this.world.update();
    this.physics.update(delta, this.player, this.world.blockWorld);
    this.renderer.update();
  }

  pause() {
    console.log('Game context paused');
    if (this.isPaused) return;
    this.isPaused = true;

    // Pause time
    if (this.time && typeof this.time.pause === 'function') {
      try {
        this.time.pause();
        console.log('Paused Time!');
      } catch (e) {
        console.warn(e);
      }
    }

    // Pause physics
    if (this.physics && typeof this.physics.pause === 'function') {
      try {
        this.physics.pause();
        console.log('Paused Physics!');
      } catch (e) {
        console.warn(e);
      }
    }

    // Pause renderer
    if (this.renderer && typeof this.renderer.pause === 'function') {
      try {
        this.renderer.pause();
        console.log('Paused Renderer!');
      } catch (e) {}
    }

    this.suppressNextFrame = true;

    if (this.isDebugMode) console.log('Game paused (visibility/focus change).');
  }

  resume() {
    console.log('Game context resumed');
    if (!this.isPaused) return;

    // Resume time
    if (this.time && typeof this.time.resume === 'function') {
      try {
        this.time.resume();
        console.log('Resumed Time!');
      } catch (e) {
        console.warn(e);
      }
    }

    // Resume physics
    if (this.physics && typeof this.physics.resume === 'function') {
      try {
        this.physics.resume();
        console.log('Resumed Physics!');
      } catch (e) {
        console.warn(e);
      }
    }

    // Resume renderer
    if (this.renderer && typeof this.renderer.resume === 'function') {
      try {
        this.renderer.resume();
        console.log('Resumed Renderer!');
      } catch (e) {
        console.warn(e);
      }
    }

    this.isPaused = false;
    this.suppressNextFrame = true;

    if (this.isDebugMode)
      console.log('Game resumed (visibility/focus change).');
  }

  _onVisibilityChange() {
    if (document.hidden) this.pause();
    else this.resume();
  }

  _onWindowBlur() {
    this.pause();
  }

  _onWindowFocus() {
    this.resume();
  }

  destroy() {
    this.sizes.off('resize');
    this.time.off('animate');

    try {
      document.removeEventListener(
        'visibilitychange',
        this._onVisibilityChange,
        false
      );
      window.removeEventListener('blur', this._onWindowBlur);
      window.removeEventListener('focus', this._onWindowFocus);
    } catch (e) {}

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

    if (this.debug) {
      try {
        this.debug.gui.destroy();
      } catch (e) {}
    }

    // Null references
    this.canvas = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.world = null;
    this.debug = null;
  }
}
