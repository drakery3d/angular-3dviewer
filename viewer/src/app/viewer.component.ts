import {
  Component,
  ViewChild,
  ElementRef,
  NgZone,
  OnDestroy,
  AfterViewInit,
  HostListener,
  Host,
} from '@angular/core';

import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {FXAAShader} from 'three/examples/jsm/shaders/FXAAShader';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass';

// import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {OrbitControls} from './controls';

@Component({
  selector: 'app-viewer',
  template: `
    <div class="container">
      <div class="loader" *ngIf="loading"><h1>Loading</h1></div>
      <div class="wrapper">
        <canvas #rendererCanvas id="renderCanvas"></canvas>
      </div>
    </div>
  `,
  styles: [
    `
      canvas {
        cursor: grab;
      }
      .container {
        position: relative;
      }
      .loader {
        position: absolute;
        top: 0;
        margin: 20px;
      }
    `,
  ],
})
export class ViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('rendererCanvas', {static: false})
  private renderCanvas: ElementRef<HTMLCanvasElement>;

  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private fxaaPass: ShaderPass;

  private frameId: number = null;
  private model;

  loading = true;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit() {
    this.createScene(this.renderCanvas);
    this.createTestScene();

    this.ngZone.runOutsideAngular(() => {
      this.render();
      window.addEventListener('resize', () => this.resize());
    });
  }

  ngOnDestroy(): void {
    if (this.frameId != null) {
      cancelAnimationFrame(this.frameId);
    }
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
    if (event.keyCode === Keys.F) this.focusObject(this.model, true);
  }

  private createScene(canvas: ElementRef<HTMLCanvasElement>): void {
    this.canvas = canvas.nativeElement;

    this.renderer = new THREE.WebGLRenderer({canvas: this.canvas});
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = true;
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.toneMappingExposure = 2.2;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();
    // this.scene.background = new THREE.Color(0xffffff);
    this.scene.background = new THREE.Color(0x111111);
    this.camera = new THREE.PerspectiveCamera(
      30,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );

    this.scene.add(this.camera);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.rotateSpeed = 1.5;
    this.controls.panSpeed = 1.5;
    this.controls.zoomSpeed = 3;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;

    this.composer = new EffectComposer(this.renderer);
    var renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.fxaaPass = new ShaderPass(FXAAShader);
    var pixelRatio = this.renderer.getPixelRatio();
    this.fxaaPass.material.uniforms['resolution'].value.x =
      1 / (this.canvas.offsetWidth * pixelRatio);
    this.fxaaPass.material.uniforms['resolution'].value.y =
      1 / (this.canvas.offsetHeight * pixelRatio);
    this.composer.addPass(this.fxaaPass);
  }

  private createTestScene() {
    this.loadGltfModel('Astronaut.glb');

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
    this.scene.add(light);

    var groundMaterial = new THREE.ShadowMaterial({
      color: 0xffffff,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), groundMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    this.scene.add(plane);

    this.scene.add(new THREE.AmbientLight(0x666666, 1.5));
  }

  private render() {
    this.frameId = requestAnimationFrame(() => this.render());
    this.composer.render();
  }

  private resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);

    var pixelRatio = this.renderer.getPixelRatio();

    this.fxaaPass.material.uniforms['resolution'].value.x =
      1 / (this.canvas.offsetWidth * pixelRatio);
    this.fxaaPass.material.uniforms['resolution'].value.y =
      1 / (this.canvas.offsetHeight * pixelRatio);
  }

  private loadGltfModel(path: string) {
    new GLTFLoader().load(`assets/${path}`, result => {
      this.model = result.scene.children[0];
      this.model.traverse(obj => {
        if ((obj as any).isMesh) {
          (obj as any).material.clearcoat = 1;
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      this.loading = false;
      this.scene.add(this.model);
      this.focusObject(this.model);
    });
  }

  private focusObject(object: THREE.Mesh, maintainAngle = false) {
    const box = new THREE.Box3();
    box.expandByObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance = maxSize / (2 * Math.atan((Math.PI * this.camera.fov) / 360));
    const fitWidthDistance = fitHeightDistance / this.camera.aspect;
    const distance = Math.max(fitHeightDistance, fitWidthDistance);

    const direction = new THREE.Vector3(0, 0, -1)
      .clone()
      .sub(maintainAngle ? this.camera.position : new THREE.Vector3())
      .normalize()
      .multiplyScalar(distance);

    this.controls.maxDistance = distance * 10;
    this.controls.target.copy(center);

    this.camera.near = distance / 100;
    this.camera.far = distance * 100;
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(this.controls.target).sub(direction);

    this.controls.update();
  }
}
