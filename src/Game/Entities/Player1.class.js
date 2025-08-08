import * as THREE from 'three';
import Game from '../Game.class';

export default class Player1 {
  constructor() {
    this.game = Game.getInstance();
    this.scene = this.game.scene;
    this.resources = this.game.resources;
    this.time = this.game.time;
  }
}
