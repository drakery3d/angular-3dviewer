import {
  Component,
  ViewChild,
  ElementRef,
  NgZone,
  OnDestroy,
  AfterViewInit,
} from '@angular/core';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
// import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader';
// import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader';
// import { EffectPass } from 'postprocessing';
// import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass';

@Component({
  selector: 'app-viewer',
  template: `
    <div class="engine-wrapper">
      <canvas #rendererCanvas id="renderCanvas"></canvas>
    </div>
  `,
  styles: [
    `
      canvas {
        cursor: grab;
      }
    `,
  ],
})
export class ViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('rendererCanvas', { static: false })
  renderCanvas: ElementRef<HTMLCanvasElement>;

  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private fxaaPass: ShaderPass;

  private frameId: number = null;

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

  createScene(canvas: ElementRef<HTMLCanvasElement>): void {
    this.canvas = canvas.nativeElement;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.toneMappingExposure = 2.2;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0xffffff, 1);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    const hemiLight = new THREE.HemisphereLight();
    hemiLight.intensity = 3;
    hemiLight.castShadow = true;
    this.scene.add(hemiLight);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 3, 3);

    this.scene.add(this.camera);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.rotateSpeed = 1.5;
    this.controls.zoomSpeed = 2;

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
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    planeGeometry.rotateX(-Math.PI / 2);
    const planeMaterial = new THREE.ShadowMaterial({ color: 0xdddddd });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;
    this.scene.add(plane);

    const boxGeometry = new THREE.BoxGeometry();
    const boxMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x11687a,
    });
    const cube = new THREE.Mesh(boxGeometry, boxMaterial);
    cube.receiveShadow = true;
    cube.castShadow = true;
    this.scene.add(cube);
    /* new GLTFLoader().load('assets/Astronaut.glb', (result) => {
      const model = result.scene.children[0];
      model.scale.set(10, 10, 10);
      model.traverse((obj) => {
        if ((obj as any).isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
          if ((obj as any).material.map) {
            (obj as any).material.map.anisotropy = 16;
          }
        }
      });

      var bb = new THREE.Box3();
      bb.setFromObject(model);
      bb.getCenter(this.controls.target);

      this.scene.add(model);
    }); */
  }

  render(): void {
    this.frameId = requestAnimationFrame(() => this.render());
    this.composer.render();
  }

  resize(): void {
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
}
