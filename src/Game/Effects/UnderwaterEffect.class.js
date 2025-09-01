import * as THREE from 'three';
import DebugGUI from '../Utils/DebugGUI';

export class UnderwaterEffect {
  constructor(game) {
    this.game = game;
    this.renderer = game.renderer;
    this.scene = game.scene;
    this.isUnderwater = false;
    this.textureResources = game.resources.items;

    // Underwater settings
    this.underwaterTint = new THREE.Color(0x548ebb);
    this.underwaterFogColor = new THREE.Color(0x196475);
    this.underwaterFogNear = 1;
    this.underwaterFogFar = 30;

    // Store original settings
    this.originalFogColor = null;
    this.originalFogNear = null;
    this.originalFogFar = null;
    this.originalMaterials = new Map();

    // Transition
    this.currentTintStrength = 0;
    this.transitionSpeed = 0.3;

    // Bubble system - now using 2D planes
    this.bubbles = [];
    this.bubbleGeometry = new THREE.PlaneGeometry(0.3, 0.3);
    this.bubbleTexture = this.textureResources.bubbleTexture;
    this.bubbleMaterial = new THREE.MeshBasicMaterial({
      map: this.bubbleTexture,
      transparent: true,
      opacity: 0.8,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.bubbleSpawnTimer = 0;
    this.bubbleSpawnRate = 0.4;

    // Debug
    this.isDebugMode = this.game.isDebugMode;
    this.debug = DebugGUI.getInstance();
    this._debugColors = {
      tint: `#${this.underwaterTint.getHexString()}`,
      fog: `#${this.underwaterFogColor.getHexString()}`,
    };

    this._debugParams = {
      fogNear: this.underwaterFogNear,
      fogFar: this.underwaterFogFar,
      transitionSpeed: this.transitionSpeed,
      bubbleSpawnRate: this.bubbleSpawnRate,
      bubbleCountPerSpawn: 2,
      bubbleMaxLife: 6,
      bubbleSize: 0.3,
    };
  }

  initialize() {
    // Store original fog settings
    if (this.scene.fog) {
      this.originalFogColor = this.scene.fog.color.clone();
      this.originalFogNear = this.scene.fog.near;
      this.originalFogFar = this.scene.fog.far;
    }

    // Collect all materials in the scene for color modification
    this.collectSceneMaterials();

    // Setup debug GUI controls (if debug enabled)
    if (this.isDebugMode) {
      this.initGUI();
    }
  }

  collectSceneMaterials() {
    this.scene.traverse((object) => {
      if (object.material) {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach((material) => {
          if (
            material &&
            material.color &&
            !this.originalMaterials.has(material.uuid)
          ) {
            // Store original color
            this.originalMaterials.set(material.uuid, {
              material: material,
              originalColor: material.color.clone(),
            });
          }
        });
      }
    });
  }

  initGUI() {
    // Follow the same usage pattern as BlockWorld: this.debug.add(target, prop, options, folderName)
    const folder = 'Underwater Effect';

    // Color pickers (DebugGUI detects strings as colors if options.color is true)
    this.debug.add(
      this._debugColors,
      'tint',
      {
        color: true,
        label: 'Underwater Tint',
        onChange: (v) => {
          try {
            this.underwaterTint.set(v);
          } catch (e) {
            // ignore invalid color
          }
        },
      },
      folder
    );

    this.debug.add(
      this._debugColors,
      'fog',
      {
        color: true,
        label: 'Underwater Fog Color',
        onChange: (v) => {
          try {
            this.underwaterFogColor.set(v);
          } catch (e) {}
        },
      },
      folder
    );

    // Numeric sliders
    this.debug.add(
      this._debugParams,
      'fogNear',
      {
        min: 0,
        max: 50,
        step: 0.1,
        label: 'Fog Near',
        onChange: (v) => {
          this.underwaterFogNear = v;
        },
      },
      folder
    );

    this.debug.add(
      this._debugParams,
      'fogFar',
      {
        min: 0.1,
        max: 200,
        step: 0.1,
        label: 'Fog Far',
        onChange: (v) => {
          this.underwaterFogFar = v;
        },
      },
      folder
    );

    this.debug.add(
      this._debugParams,
      'transitionSpeed',
      {
        min: 0.001,
        max: 0.2,
        step: 0.001,
        label: 'Transition Speed',
        onChange: (v) => {
          this.transitionSpeed = v;
        },
      },
      folder
    );

    this.debug.add(
      this._debugParams,
      'bubbleSpawnRate',
      {
        min: 0.01,
        max: 3,
        step: 0.01,
        label: 'Bubble Spawn Rate',
        onChange: (v) => {
          this.bubbleSpawnRate = v;
        },
      },
      folder
    );

    this.debug.add(
      this._debugParams,
      'bubbleCountPerSpawn',
      {
        min: 0,
        max: 8,
        step: 1,
        label: 'Bubbles Per Spawn',
        onChange: (v) => {
          this._debugParams.bubbleCountPerSpawn = Math.max(0, Math.floor(v));
        },
      },
      folder
    );

    this.debug.add(
      this._debugParams,
      'bubbleMaxLife',
      {
        min: 0.1,
        max: 20,
        step: 0.1,
        label: 'Bubble Max Life',
        onChange: (v) => {
          this._debugParams.bubbleMaxLife = v;
        },
      },
      folder
    );

    this.debug.add(
      this._debugParams,
      'bubbleSize',
      {
        min: 0.1,
        max: 1.0,
        step: 0.05,
        label: 'Bubble Size',
        onChange: (v) => {
          this._debugParams.bubbleSize = v;
          // Update geometry if needed
          this.bubbleGeometry.dispose();
          this.bubbleGeometry = new THREE.PlaneGeometry(v, v);
        },
      },
      folder
    );
  }

  update(playerPosition, waterLevel, delta) {
    // console.log('Updating under water');
    if (!this.originalFogColor) return;

    const wasUnderwater = this.isUnderwater;
    this.isUnderwater = playerPosition.y < waterLevel;

    // Update tint strength
    if (this.isUnderwater) {
      this.currentTintStrength = Math.min(
        1,
        this.currentTintStrength + this.transitionSpeed
      );
    } else {
      this.currentTintStrength = Math.max(
        0,
        this.currentTintStrength - this.transitionSpeed
      );
    }

    // Apply color multiplier to all materials
    this.applyColorMultiplier();

    // Apply fog effects
    this.applyUnderwaterFog();

    // Update bubbles
    if (this.isUnderwater) {
      this.spawnBubbles(playerPosition, delta);
      this.updateBubbles(playerPosition, delta);
    } else {
      this.clearBubbles();
    }

    // Trigger enter/exit events
    if (wasUnderwater !== this.isUnderwater) {
      if (this.isUnderwater) {
        this.onEnterWater();
      } else {
        this.onExitWater();
      }
    }
  }

  applyColorMultiplier() {
    // Apply blue tint multiplier to all materials
    this.originalMaterials.forEach((data) => {
      const { material, originalColor } = data;

      if (this.currentTintStrength > 0) {
        // Create tinted color by multiplying with underwater tint
        const tintedColor = originalColor.clone().multiply(this.underwaterTint);
        // Lerp between original and tinted color
        material.color.lerpColors(
          originalColor,
          tintedColor,
          this.currentTintStrength
        );
      } else {
        // Reset to original color
        material.color.copy(originalColor);
      }
    });
  }

  applyUnderwaterFog() {
    if (!this.scene.fog || !this.originalFogColor) return;

    if (this.isUnderwater) {
      this.scene.fog.color.lerpColors(
        this.originalFogColor,
        this.underwaterFogColor,
        this.currentTintStrength
      );

      // Adjust fog distance
      this.scene.fog.near = THREE.MathUtils.lerp(
        this.originalFogNear,
        this.underwaterFogNear,
        this.currentTintStrength
      );

      this.scene.fog.far = THREE.MathUtils.lerp(
        this.originalFogFar,
        this.underwaterFogFar,
        this.currentTintStrength
      );
    } else {
      this.scene.fog.color.copy(this.originalFogColor);
      this.scene.fog.near = this.originalFogNear;
      this.scene.fog.far = this.originalFogFar;
    }
  }

  spawnBubbles(playerPosition, delta) {
    this.bubbleSpawnTimer += delta;

    if (this.bubbleSpawnTimer >= this.bubbleSpawnRate) {
      this.bubbleSpawnTimer = 0;

      // Spawn bubbles from seafloor around player
      const count = Math.max(
        0,
        Math.floor(this._debugParams.bubbleCountPerSpawn || 2)
      );
      for (let i = 0; i < count; i++) {
        const bubble = new THREE.Mesh(
          this.bubbleGeometry,
          this.bubbleMaterial.clone()
        );

        // Random position around player at ground level
        const angle = Math.random() * Math.PI * 2;
        const distance = 1 + Math.random() * 4;

        bubble.position.set(
          playerPosition.x + Math.cos(angle) * distance,
          Math.floor(playerPosition.y) - 2 - Math.random(),
          playerPosition.z + Math.sin(angle) * distance
        );

        // Make bubbles always face the camera (billboard effect)
        bubble.lookAt(this.game.camera.position);

        // Bubble properties
        const scale = 0.5 + Math.random() * 0.5;
        bubble.scale.setScalar(scale);
        const maxLife =
          this._debugParams.bubbleMaxLife || 4 + Math.random() * 2;
        bubble.userData = {
          velocity: 1.0 + Math.random() * 0.5,
          life: maxLife,
          maxLife: maxLife,
          wobble: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 2, // Random rotation
        };

        this.scene.add(bubble);
        this.bubbles.push(bubble);
      }
    }
  }

  updateBubbles(playerPosition, delta) {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i];

      // Move bubble upward
      bubble.position.y += bubble.userData.velocity * delta;

      // Add wobbling movement
      bubble.userData.wobble += delta * 2;
      bubble.position.x += Math.sin(bubble.userData.wobble) * 0.1 * delta;
      bubble.position.z += Math.cos(bubble.userData.wobble * 0.7) * 0.1 * delta;

      // Update life
      bubble.userData.life -= delta;

      // Fade out
      const lifeRatio = bubble.userData.life / bubble.userData.maxLife;
      bubble.material.opacity = Math.max(0, lifeRatio * 0.7);

      // Remove bubble
      const distanceFromPlayer = bubble.position.distanceTo(playerPosition);
      const reachedSurface = bubble.position.y > playerPosition.y + 3;

      if (
        bubble.userData.life <= 0 ||
        distanceFromPlayer > 12 ||
        reachedSurface
      ) {
        this.scene.remove(bubble);
        bubble.material.dispose();
        this.bubbles.splice(i, 1);
      }
    }
  }

  clearBubbles() {
    for (const bubble of this.bubbles) {
      this.scene.remove(bubble);
      bubble.material.dispose();
    }
    this.bubbles = [];
  }

  onEnterWater() {
    console.log('Player entered water');
    // Refresh material collection to catch any new objects
    this.collectSceneMaterials();
  }

  onExitWater() {
    console.log('Player exited water');
  }

  destroy() {
    // Reset all material colors to original
    this.originalMaterials.forEach((data) => {
      const { material, originalColor } = data;
      material.color.copy(originalColor);
    });

    // Reset fog
    if (this.scene?.fog && this.originalFogColor) {
      this.scene.fog.color.copy(this.originalFogColor);
      this.scene.fog.near = this.originalFogNear;
      this.scene.fog.far = this.originalFogFar;
    }

    // Clean up bubbles
    this.clearBubbles();
    this.bubbleGeometry.dispose();
    this.bubbleMaterial.dispose();
    this.bubbleTexture.dispose();

    // Clear material references
    this.originalMaterials.clear();
  }
}
