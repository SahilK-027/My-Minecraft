import * as THREE from 'three';
import Game from '../../../../Game.class';

export default class Cube {
  constructor() {
    this.game = Game.getInstance();
    this.scene = this.game.scene;
    this.resources = this.game.resources;

    this.setCubeInstance();
  }

  setCubeInstance() {
    this.cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.cubeMaterial = new THREE.MeshLambertMaterial({
      color: 'green',
    });

    this.cubeMesh = new THREE.Mesh(this.cubeGeometry, this.cubeMaterial);
    this.cubeMesh.position.set(0.0, 0.5, 0.0);

    this.scene.add(this.cubeMesh);
  }
}
