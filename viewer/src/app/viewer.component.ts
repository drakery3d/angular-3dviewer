import {Component, ViewChild, ElementRef, AfterViewInit, HostListener} from '@angular/core';

import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';

import {EngineService} from './engine.service';
import {FullscreenService} from './fullscreen.service';

@Component({
  selector: 'app-viewer',
  template: `
    <div class="container">
      <div class="loader" *ngIf="loading"><h1>Loading</h1></div>
      <div class="gui" *ngIf="!loading">
        <button (click)="setFullRender()">Full</button>
        <button (click)="setWireframe()">Wireframe</button>
        <button (click)="toggleFullScreen()">Fullscreen</button>
      </div>
      <div class="wrapper">
        <canvas #rendererCanvas id="renderCanvas" [class.grabbing]="grabbing"></canvas>
      </div>
    </div>
  `,
  styles: [
    `
      canvas {
        cursor: grab;
      }
      .grabbing {
        cursor: grabbing;
      }
      .container {
        position: relative;
      }
      .loader {
        position: absolute;
        top: 0;
        margin: 20px;
      }
      .gui {
        position: absolute;
        bottom: 0;
        right: 0;
        left: 0;
        background: white;
        height: 40px;
        display: flex;
        flex-direction: row;
      }
    `,
  ],
})
export class ViewerComponent implements AfterViewInit {
  @ViewChild('rendererCanvas', {static: false})
  private renderCanvas: ElementRef<HTMLCanvasElement>;

  private model: THREE.Object3D;
  private geometry: THREE.Geometry | undefined;
  private wireframeGroup: THREE.Group | undefined;

  loading = true;

  constructor(private engineService: EngineService, private fullscreenService: FullscreenService) {}

  ngAfterViewInit() {
    this.engineService.createScene(this.renderCanvas);
    this.engineService.animate();
    this.loadGltfModel('wooden-buddha.glb');
    this.createTestScene();
  }

  @HostListener('document:keypress', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // console.log(event.keyCode);
    enum Keys {
      R = 114,
      W = 119,
      F = 102,
      S = 115,
    }
    if (event.keyCode === Keys.F) this.engineService.focusObject(this.model, true);
  }

  get grabbing() {
    return this.engineService.controls ? this.engineService.controls.grabbing : false;
  }

  private createTestScene() {
    const light = new THREE.DirectionalLight(0xdfebff, 5);
    /* light.shadow.bias = -0.0001;
    light.position.set(300, 400, 50);
    light.castShadow = true;
    light.shadow.radius = 1;
    light.shadow.mapSize.width = 2 ** 12; // 4k
    light.shadow.mapSize.height = 2 ** 12; // 4k
    const d = 200;
    light.shadow.camera.left = -d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = -d;
    light.shadow.camera.far = 1000; */
    this.engineService.scene.add(light);

    var groundMaterial = new THREE.ShadowMaterial({
      color: 0xffffff,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), groundMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    this.engineService.scene.add(plane);

    this.engineService.scene.add(new THREE.AmbientLight(0x666666, 3));
  }

  private loadGltfModel(path: string) {
    new GLTFLoader().load(`assets/${path}`, result => {
      this.model = result.scene.children[0];
      this.model.traverse(obj => {
        if ((obj as any).isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      this.loading = false;
      this.engineService.focusObject(this.model);
      this.setFullRender();
    });
  }

  private clearScene() {
    if (this.wireframeGroup) this.engineService.scene.remove(this.wireframeGroup);
    if (this.model) this.engineService.scene.remove(this.model);
  }

  toggleFullScreen() {
    this.fullscreenService.toggle();
  }

  setFullRender() {
    this.clearScene();
    this.engineService.scene.add(this.model);
  }

  setWireframe() {
    this.clearScene();

    if (this.wireframeGroup) {
      this.engineService.scene.add(this.wireframeGroup);
      return;
    }

    // TODO apply transformations of parent objects to ensure same transforms as scene
    this.model.traverse((child: any) => {
      if (!child.isMesh) return 1;
      this.geometry = child.geometry;
    });
    const mat = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 2,
    });
    const geo = new THREE.WireframeGeometry(this.geometry);
    this.wireframeGroup = new THREE.Group();
    const wireframe = new THREE.LineSegments(geo, mat);
    this.wireframeGroup.add(wireframe);
    const solid = new THREE.MeshBasicMaterial({color: 0xffffff});
    const base = new THREE.Mesh(this.geometry, solid);
    this.wireframeGroup.add(base);
    this.engineService.scene.add(this.wireframeGroup);
  }
}
