import {Injectable} from '@angular/core';
import * as THREE from 'three';

@Injectable()
export class SceneService {
  scene: THREE.Scene;
  model: THREE.Mesh;

  clear() {
    this.scene.remove(...this.scene.children);
  }
}
