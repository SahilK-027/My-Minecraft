import * as THREE from 'three';
import Sizes from './Utils/Sizes.class';
import Time from './Utils/Time.class';
import Camera from './Core/Camera.class';
import Renderer from './Core/Renderer.class';
import World from './Scenes/WorldScene/World.scene';
import DebugGUI from './Utils/DebugGUI';
import { getThemeConfig } from './Utils/ThemeManager.class';
import PhysicsSystem from './Systems/PhysicsSystem.class';
import Mouse from './Input/Mouse.class';

export default class Game {
  constructor(canvas, resources, isDebugMode) {
    // Singleton
    if (Game.instance) {
      return Game.instance;
    }
    Game.instance = this;

    // Debug handler
    this.isDebugMode = isDebugMode;
    if (this.isDebugMode) {
      this.debug = new DebugGUI();
    }

    // Scene essentials
    this.canvas = canvas;
    this.sizes = new Sizes();
    this.mouse = new Mouse();
    this.scene = new THREE.Scene();
    this.cameraInstance = new Camera();
    this.time = new Time(false);

    // Game essentials
    this.resources = resources;
    this.themeConfig = getThemeConfig('windsweptHills');
    this.world = new World();
    this.player = this.world.player;
    this.gameControls = this.player.controls;
    this.physics = new PhysicsSystem();
    this.camera = this.cameraInstance.orbitCamera;
    this.renderer = new Renderer();
    this.needsRenderAfterResize = false;

    // Game states
    this.isPaused = false;
    this.gameStarted = false;

    // Bind event handlers once
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    this._onWindowBlur = this._onWindowBlur.bind(this);
    this._onWindowFocus = this._onWindowFocus.bind(this);
    this._onCameraLock = this._onCameraLock.bind(this);
    this._onCameraUnlock = this._onCameraUnlock.bind(this);
    this.lockCamera = this.lockCamera.bind(this);

    // this.initFog();

    // Setup gameplay-specific event listeners only if not in debug mode
    if (!this.isDebugMode) {
      this._setupGameplayEventListeners();
    }

    if (this.isDebugMode) {
      document.getElementById('menu').style.display = 'none';
    }

    // Initialize visibility state properly (only for gameplay mode)
    if (!this.isDebugMode) {
      if (
        document.readyState === 'complete' ||
        document.readyState === 'interactive'
      ) {
        this._initializeVisibilityState();
      } else {
        document.addEventListener('DOMContentLoaded', () =>
          this._initializeVisibilityState()
        );
      }
    }

    // Setup event listeners
    this.sizes.on('resize', () => {
      this.resize();
    });
    this.mouse.on('mousedown', (event) => {
      this.handleMouseDown(event);
    });
    this.time.on('animate', () => {
      this.update(this.time.delta);
    });
    this.time.startLoop();
  }

  handleMouseDown(event) {
    if (this.gameControls.isLocked && this.player.selectedCoords) {
      const { x, y, z } = this.player.selectedCoords;
      this.world.blockWorld.removeBlock(x, y, z);
    }
  }

  initFog() {
    this.scene.fog = new THREE.Fog(
      this.themeConfig.fog_color,
      this.themeConfig.fog_start,
      this.themeConfig.fog_end
    );
  }

  _setupGameplayEventListeners() {
    // Event listeners for gameplay mode
    document.addEventListener(
      'visibilitychange',
      this._onVisibilityChange,
      false
    );
    window.addEventListener('blur', this._onWindowBlur);
    window.addEventListener('focus', this._onWindowFocus);
    this.gameControls.addEventListener('lock', this._onCameraLock);
    this.gameControls.addEventListener('unlock', this._onCameraUnlock);
    this.playBtn = document.getElementById('playbtn');
    if (this.playBtn) {
      this.playBtn.addEventListener('click', this.lockCamera);
    }
  }

  static getInstance() {
    if (!Game.instance) {
      throw new Error(
        `Game.getInstance() called before Game was constructed.
        Call new Game(canvas, resources, isDebugMode) first.`
      );
    }
    return Game.instance;
  }

  resize() {
    this.cameraInstance.resize();
    this.renderer.resize();

    if (this.isPaused) {
      this.needsRenderAfterResize = true;
      this.renderLastFrame();
    }
  }

  update(delta) {
    if (this.isPaused && !this.needsRenderAfterResize) return;

    if (!this.cameraInstance || !this.world || !this.renderer) return;

    if (this.player && this.gameControls) {
      this.camera = this.gameControls.isLocked
        ? this.cameraInstance.FPPCamera
        : this.cameraInstance.orbitCamera;
    }

    // Only update game logic if not paused
    if (!this.isPaused) {
      this.cameraInstance.update();
      this.world.update(delta);
      this.physics.update(delta, this.player, this.world.blockWorld);
    } else {
      // When paused, only update camera
      this.cameraInstance.update();
    }

    // Always Update renderer
    this.renderer.update();

    // Reset the flag after rendering
    if (this.needsRenderAfterResize) {
      this.needsRenderAfterResize = false;
    }
  }

  renderLastFrame() {
    if (!this.cameraInstance || !this.renderer) return;

    // Update camera for current view
    this.cameraInstance.update();
    // Render one frame
    this.renderer.update();
  }

  pause() {
    // Don't pause in debug mode
    if (this.isDebugMode || this.isPaused) return;

    this.isPaused = true;

    if (this.player?.keyboard) {
      this.player.keyboard.input.set(0, 0, 0);
      this.player.keyboard.target.set(0, 0, 0);
      this.player.keyboard.jumpPressed = false;
      this.player.keyboard.sprintPressed = false;
    }

    this._pauseSubsystem(this.physics, 'Physics');
    this._pauseSubsystem(this.player, 'Player');
  }

  resume() {
    // Don't handle resume in debug mode
    if (this.isDebugMode || !this.isPaused) return;

    this._resumeSubsystem(this.physics, 'Physics');
    this._resumeSubsystem(this.player, 'Player');

    this.isPaused = false;
  }

  _initializeVisibilityState() {
    // Only initialize visibility state for gameplay mode
    if (!this.isDebugMode && document.hidden && this.gameStarted) {
      this.isPaused = true;
    }
  }

  _pauseSubsystem(subsystem, name) {
    if (subsystem?.pause) {
      try {
        subsystem.pause();
      } catch (e) {
        console.warn(`Failed to pause ${name}:`, e);
      }
    }
  }

  _resumeSubsystem(subsystem, name) {
    if (subsystem?.resume) {
      try {
        subsystem.resume();
      } catch (e) {
        console.warn(`Failed to resume ${name}:`, e);
      }
    }
  }

  _onVisibilityChange() {
    // Only handle visibility changes in gameplay mode
    if (this.isDebugMode) return;

    if (document.hidden) {
      if (this.gameStarted) {
        this.pause();
      }
    } else if (this.gameControls.isLocked && this.gameStarted) {
      this.resume();
    }
  }

  _onWindowBlur() {
    // Only handle window blur in gameplay mode
    if (this.isDebugMode) return;

    if (this.gameStarted) {
      this.pause();
    }
  }

  _onWindowFocus() {
    // Only handle window focus in gameplay mode
    if (this.isDebugMode) return;

    if (this.gameControls.isLocked && this.gameStarted) {
      this.resume();
    }
  }

  lockCamera() {
    this.gameControls.lock();
  }

  _onCameraLock() {
    // Only handle UI changes and game state in gameplay mode
    if (!this.isDebugMode) {
      document.getElementById('menu').style.display = 'none';
      if (this.playBtn) {
        this.playBtn.style.display = 'none';
      }
      this.gameStarted = true;
      this.resume();
    }
  }

  _onCameraUnlock() {
    // Only handle UI changes and game state in gameplay mode
    if (!this.isDebugMode) {
      document.getElementById('menu').style.display = 'flex';
      if (this.playBtn) {
        this.playBtn.style.display = 'block';
        this.playBtn.innerText = 'Resume Exploration';
        this.playBtn.style.cursor = 'not-allowed';
        this.playBtn.style.pointerEvents = 'none';
        this.playBtn.style.opacity = '0.8';
        this.playBtn.disabled = true;

        setTimeout(() => {
          if (this.playBtn) {
            this.playBtn.style.pointerEvents = 'auto';
            this.playBtn.style.cursor = 'pointer';
            this.playBtn.style.opacity = '1';
            this.playBtn.disabled = false;
          }
        }, 1000);
      }
      this.gameStarted = false;
      this.pause();
    }
  }

  destroy() {
    this.sizes.off('resize');
    this.time.off('animate');

    // Only remove gameplay event listeners if they were added
    if (!this.isDebugMode) {
      document.removeEventListener(
        'visibilitychange',
        this._onVisibilityChange,
        false
      );
      window.removeEventListener('blur', this._onWindowBlur);
      window.removeEventListener('focus', this._onWindowFocus);

      if (this.gameControls) {
        this.gameControls.removeEventListener('lock', this._onCameraLock);
        this.gameControls.removeEventListener('unlock', this._onCameraUnlock);
      }

      if (this.playBtn) {
        this.playBtn.removeEventListener('click', this.lockCamera);
      }
    }

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
    Game.instance = null;
  }
}
