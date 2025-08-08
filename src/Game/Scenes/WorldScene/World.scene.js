import Game from '../../Game.class';
import DebugFloor from './components/DebugFloor/DebugFloor.class';
import Lighting from './components/Lighting/Lighting.class';
import BlockWorld from './components/BlockWorld/BlockWorld.class';

export default class World {
  constructor() {
    this.game = Game.getInstance();
    this.scene = this.game.scene;

    /**
     * Scene objects
     */
    this.blockWorld = new BlockWorld();
    this.debugFloor = new DebugFloor();

    this.lighting = new Lighting({ helperEnabled: false });
  }

  update() {}
}
