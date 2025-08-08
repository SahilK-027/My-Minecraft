import * as THREE from 'three';
import Game from '../../Game.class';
import DebugFloor from './components/DebugFloor/DebugFloor.class';
import Lighting from './components/Lighting/Lighting.class';
import CubeWorld from './components/CubeWorld/CubeWorld.class';

export default class World {
  constructor() {
    this.game = Game.getInstance();
    this.scene = this.game.scene;

    /**
     * Scene objects
     */
    this.cubeWorld = new CubeWorld();
    this.debugFloor = new DebugFloor();

    this.lighting = new Lighting({ helperEnabled: false });
  }

  update() {}
}
