import {Injectable} from '@angular/core';
import * as THREE from 'three';

@Injectable()
export class SceneService {
  scene: THREE.Scene;
  model: THREE.Mesh;

  private maxSize: number;

  clear() {
    this.scene.remove(...this.scene.children);
  }

  calcMaxObjectSize() {
    if (this.maxSize) return this.maxSize;
    const model = this.model;
    model.geometry.computeBoundingBox();
    const bb = model.geometry.boundingBox;
    this.maxSize = Math.max(
      Math.abs(bb.max.x * model.scale.x - bb.min.x * model.scale.x),
      Math.abs(bb.max.y * model.scale.y - bb.min.y * model.scale.y),
      Math.abs(bb.max.z * model.scale.z - bb.min.z * model.scale.z),
    );
    return this.maxSize;
  }
}
