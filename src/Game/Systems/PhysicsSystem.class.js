import { blocks } from '../Data/Blocks';
import * as THREE from 'three';
import Game from '../Game.class';

export default class PhysicsSystem {
  gravity = 9.81 * 3.28; // ft/s^2
  simulationRate = 200;
  timeStep = 1 / this.simulationRate;
  accumulator = 0;

  constructor() {
    this.game = Game.getInstance();
    this.scene = this.game.scene;
    this.isDebugMode = this.game.isDebugMode;

    this.isPaused = false;

    if (this.isDebugMode) {
      this.createCollisionHelperBlocksPool(this.helperPoolSize);
    }
  }

  createCollisionHelperBlocksPool() {
    this.collisionHelperMaterial = new THREE.MeshBasicMaterial({
      color: 'purple',
      transparent: true,
      opacity: 0.5,
    });
    this.collisionHelperGeometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);

    this.helperBlocks = new THREE.Group();
    this.scene.add(this.helperBlocks);
  }

  addCollisionHelperBlocksToScene(blockPosition) {
    const mesh = new THREE.Mesh(
      this.collisionHelperGeometry,
      this.collisionHelperMaterial
    );
    mesh.position.set(blockPosition.x, blockPosition.y, blockPosition.z);

    this.helperBlocks.add(mesh);
  }

  pause() {
    if (this.isPaused) return;
    this.isPaused = true;

    this.accumulator = 0;

    if (this.isDebugMode && this.helperBlocks) {
      this.helperBlocks.visible = false;
    }
  }

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;

    this.accumulator = 0;

    if (this.isDebugMode && this.helperBlocks) {
      this.helperBlocks.visible = true;
    }
  }

  update(delta, player, world) {
    if (this.isPaused) return;

    this.accumulator += delta;

    while (this.accumulator >= this.timeStep) {
      if (this.helperBlocks) {
        this.helperBlocks.clear();
      }

      if (!player.onGround) {
        player.velocity.y -= this.gravity * this.timeStep;
      } else {
        if (player.velocity.y < 0) player.velocity.y = 0;
      }

      player.applyInputs(this.timeStep);

      if (this.isDebugMode) {
        player.updateBoundsHelper();
      }

      this.detectCollisions(player, world);
      this.accumulator -= this.timeStep;
    }
  }

  detectCollisions(player, world) {
    player.onGround = false;

    const candidates = this.broadPhase(player, world);
    const collisions = this.narrowPhase(candidates, player);

    if (collisions.length > 0) {
      this.resolveCollisions(collisions, player);
    }
  }

  pointInPlayerBoundingCylinder(p, player) {
    const dx = p.x - player.playerPosition.x;
    const dy = p.y - (player.playerPosition.y - player.height / 2);
    const dz = p.z - player.playerPosition.z;
    const r_sq = dx * dx + dz * dz;

    return (
      Math.abs(dy) < player.height / 2 && r_sq < player.radius * player.radius
    );
  }

  broadPhase(player, world) {
    const candidates = [];

    const extents = {
      x: {
        min: Math.floor(player.playerPosition.x - player.radius),
        max: Math.ceil(player.playerPosition.x + player.radius),
      },
      y: {
        min: Math.floor(player.playerPosition.y - player.height),
        max: Math.floor(player.playerPosition.y),
      },
      z: {
        min: Math.floor(player.playerPosition.z - player.radius),
        max: Math.ceil(player.playerPosition.z + player.radius),
      },
    };

    if (this.isDebugMode && this.helperPool) {
      this.clearHelperPool();
    }

    for (let x = extents.x.min; x <= extents.x.max; x++) {
      for (let y = extents.y.min; y <= extents.y.max; y++) {
        for (let z = extents.z.min; z <= extents.z.max; z++) {
          const block = world.getBlock(x, y, z);
          if (block && block.id !== blocks.empty.id) {
            const blockPosition = { x, y, z };
            candidates.push(blockPosition);
            if (this.isDebugMode) {
              this.addCollisionHelperBlocksToScene(blockPosition);
            }
          }
        }
      }
    }

    return candidates;
  }

  narrowPhase(candidates, player) {
    const collisions = [];
    for (const blockPosition of candidates) {
      const p = player.playerPosition;
      const playerBottomY = p.y - player.height / 2;

      const clamp = (v, a, b) => Math.max(a, Math.min(v, b));
      const closestPoint = {
        x: clamp(p.x, blockPosition.x - 0.5, blockPosition.x + 0.5),
        y: clamp(playerBottomY, blockPosition.y - 0.5, blockPosition.y + 0.5),
        z: clamp(p.z, blockPosition.z - 0.5, blockPosition.z + 0.5),
      };

      const dx = closestPoint.x - player.playerPosition.x;
      const dy = closestPoint.y - (player.playerPosition.y - player.height / 2);
      const dz = closestPoint.z - player.playerPosition.z;

      if (this.pointInPlayerBoundingCylinder(closestPoint, player)) {
        const overlapY = player.height / 2 - Math.abs(dy);
        const overlapXZ = player.radius - Math.sqrt(dx * dx + dz * dz);

        let normal, overlap;
        if (overlapY < overlapXZ) {
          normal = new THREE.Vector3(0, -Math.sign(dy), 0);
          overlap = overlapY;
          player.onGround = true;
        } else {
          normal = new THREE.Vector3(-dx, 0, -dz).normalize();
          overlap = overlapXZ;
        }

        collisions.push({
          blockPosition,
          contactPoint: closestPoint,
          normal,
          overlap,
        });
      }
    }

    return collisions;
  }

  resolveCollisions(collisions, player) {
    collisions.sort((a, b) => a.overlap < b.overlap);

    for (const collision of collisions) {
      if (!this.pointInPlayerBoundingCylinder(collision.contactPoint, player)) {
        continue;
      }
      let deltaPosition = collision.normal.clone();
      deltaPosition.multiplyScalar(collision.overlap);
      player.playerPosition.add(deltaPosition);

      let magnitude = player.worldVelocity.dot(collision.normal);
      let velocityAdjustment = collision.normal
        .clone()
        .multiplyScalar(magnitude);

      player.applyWorldDeltaVelocity(velocityAdjustment.negate());
    }
  }
}
