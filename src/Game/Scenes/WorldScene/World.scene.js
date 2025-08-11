import Game from '../../Game.class';
import DebugFloor from './components/DebugFloor/DebugFloor.class';
import Lighting from './components/Lighting/Lighting.class';
import BlockWorld from './components/BlockWorld/BlockWorld.class';
import Player from '../../Entities/Player.class';

export default class World {
  constructor() {
    this.game = Game.getInstance();
    this.scene = this.game.scene;

    this.blockWorld = new BlockWorld();
    this.player = new Player(
      this.game.cameraInstance.FPPCamera,
      this.game.cameraInstance.FPPControls
    );
    this.debugFloor = new DebugFloor();

    this.lighting = new Lighting({ helperEnabled: false });
  }

  update(delta) {
    this.player.applyInputs(delta);
  }
}
