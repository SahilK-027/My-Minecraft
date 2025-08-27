import Game from '../../Game.class';
import Lighting from './components/Lighting/Lighting.class';
import BlockWorld from './components/BlockWorld/BlockWorld.class';
import Player from '../../Entities/Player.class';

export default class World {
  constructor() {
    this.game = Game.getInstance();
    this.scene = this.game.scene;

    this.blockWorld = new BlockWorld();
    this.blockWorld.generateBlockWorld();
    this.scene.add(this.blockWorld);

    this.player = new Player(
      this.game.cameraInstance.FPPCamera,
      this.game.cameraInstance.FPPControls
    );

    this.lighting = new Lighting({ helperEnabled: true }, this.player);
  }

  update(delta) {
    this.player.update(this.blockWorld, delta);
    this.blockWorld.update(this.player);
    this.lighting.update();
  }
}
