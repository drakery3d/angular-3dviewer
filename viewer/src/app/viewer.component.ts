import {Component, ViewChild, ElementRef, AfterViewInit, HostListener} from '@angular/core';
import * as THREE from 'three';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader';

import {EngineService} from './engine.service';
import {FullscreenService} from './fullscreen.service';
import {InspectorService} from './inspector.service';
import {SceneService} from './scene.service';
import {LoaderService} from './loader.service';

// TODO 2d texture viewer
// TODO performance optimizations (e.g. don't render on still frame)
// TODO handle unsupported browsers / devices
// TODO consider 3d loading spinner
// TODO consider adding someting when notion is looded yet
// TODO look at this debug inspector for inspiration https://www.babylonjs.com/demos/pbrglossy/
// TODO graphics settings (quality)
// TODO sharpness
// TODO dof https://threejs.org/examples/#webgl_postprocessing_dof2
// TODO nodes https://threejs.org/examples/?q=post#webgl_postprocessing_nodes
// TODO higher fov while zooming in
// TODO loading bar
// TODO load over the wire
// TODO encrypt model

@Component({
  selector: 'app-viewer',
  template: `
    <div class="container">
      <div class="ui" *ngIf="sceneService.model">
        <app-inspector-gui
          [selected]="inspectorService.mode"
          (modeChanged)="onModeChanged($event)"
        ></app-inspector-gui>
      </div>

      <div class="upload-btn-wrapper">
        <button class="btn">Upload files</button>
        <input class="custom-file-input" type="file" multiple (change)="onInputChanged($event)" />
      </div>
      <!--
      <div class="gui">

        <div>
          <button (click)="toggleFullScreen()">Fullscreen</button>
          <div>
            <span>bloom</span>
            <input
              type="range"
              min="0"
              max="1.5"
              value="0"
              step="0.01"
              (change)="onBloomChange($event)"
            />
          </div>
          <div>
            <span>ssao</span>
            <input
              type="range"
              min="0"
              max="32"
              value="16"
              step="1"
              (change)="onSSAOChange($event)"
            />
          </div>
        </div>
        </div>
        -->
      <div class="wrapper">
        <canvas
          #rendererCanvas
          id="renderCanvas"
          [class.grabbing]="grabbing"
          (dblclick)="onDoubleClick($event)"
        ></canvas>
      </div>
    </div>
  `,
  styles: [
    `
      .container {
        position: relative;
      }
      .ui {
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
      }

      canvas {
        cursor: grab;
      }
      .grabbing {
        cursor: grabbing;
      }

      .upload-btn-wrapper {
        cursor: pointer;
        position: absolute;
        overflow: hidden;
        display: inline-block;
        top: 0;
      }
      .btn {
        color: white;
        background-color: #57c860;
        padding: 8px 20px;
        font-weight: bold;
        outline: none;
        border: 0;
      }
      .upload-btn-wrapper input[type='file'] {
        font-size: 100px;
        position: absolute;
        left: 0;
        top: 0;
        opacity: 0;
      }
    `,
  ],
})
export class ViewerComponent implements AfterViewInit {
  @ViewChild('rendererCanvas', {static: false})
  private renderCanvas: ElementRef<HTMLCanvasElement>;

  private mouse = new THREE.Vector2();

  private clearColor = new THREE.Color(0xeeeeee);

  constructor(
    public inspectorService: InspectorService,
    public sceneService: SceneService,
    private engineService: EngineService,
    private fullscreenService: FullscreenService,
    private loaderService: LoaderService,
  ) {}

  ngAfterViewInit() {
    this.engineService.createScene(this.renderCanvas);
    this.engineService.animate();
    this.engineService.setBackground(this.clearColor);
    this.createTestScene();
  }

  @HostListener('document:keypress', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    enum Keys {
      F = 102,
    }
    if (event.keyCode === Keys.F) this.engineService.focusObject(this.sceneService.model, true);
  }

  onDoubleClick(event) {
    if (!this.sceneService.model) return;
    const x = event.clientX,
      y = event.clientY;
    this.mouse.x = (x / window.innerWidth) * 2 - 1;
    this.mouse.y = -(y / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this.mouse, this.engineService.camera);
    let intersects = [];
    raycaster.intersectObject(this.sceneService.model, false, intersects);
    if (!intersects.length) return;

    let min;
    for (const i of intersects) {
      if (!min || i.distance < min.distance) min = i;
    }
    // TODO animation https://stackoverflow.com/questions/18401213/
    this.engineService.controls.target.set(min.point.x, min.point.y, min.point.z);
    this.engineService.controls.dollyIn(0.5);
    // TODO idea: set small object with animation to pivot point
  }

  onModeChanged(mode: string) {
    this.inspectorService.changeMode(mode);
  }

  onBloomChange(event) {
    this.engineService.bloomPass.strength = event.path[0].value;
  }

  onSSAOChange(event) {
    this.engineService.ssaoPass.kernelRadius = event.path[0].value;
  }

  async onInputChanged(event) {
    const files: File[] = Array.from(event.target.files);
    const gltf = files.filter(
      f => f.name.split('.').pop() === 'gltf' || f.name.split('.').pop() === 'glb',
    );
    const obj = files.filter(f => f.name.split('.').pop() === 'obj');
    const mtl = files.filter(f => f.name.split('.').pop() === 'mtl');
    const images = files.filter(f => f.type.includes('image'));

    if (gltf.length) {
      await this.loaderService.loadGltf(gltf[0]);
      return;
    }

    if (obj.length) {
      await this.loaderService.loadObj(obj[0], mtl[0], images);
    }
  }

  get grabbing() {
    return this.engineService.controls ? this.engineService.controls.grabbing : false;
  }

  private async createTestScene() {
    const texture = await new RGBELoader().loadAsync('assets/studio_small_03_1k.hdr');
    const pmremGenerator = new THREE.PMREMGenerator(this.engineService.renderer);
    pmremGenerator.compileEquirectangularShader();
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    // this.sceneService.scene.background = envMap;
    this.sceneService.scene.environment = envMap;
    // TODO rotate env and adjust exposure
    // TODO set as background + blur background
    pmremGenerator.dispose();
  }

  toggleFullScreen() {
    this.fullscreenService.toggle();
  }
}
