import {Injectable, ElementRef, NgZone, OnDestroy} from '@angular/core';
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {FXAAShader} from 'three/examples/jsm/shaders/FXAAShader';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass';

import {OrbitControls} from './controls';

@Injectable()
export class EngineService implements OnDestroy {
  scene: THREE.Scene;
  controls: OrbitControls;

  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private fxaaPass: ShaderPass;
  private frameId: number;

  constructor(private ngZone: NgZone) {}

  ngOnDestroy(): void {
    if (this.frameId != null) {
      cancelAnimationFrame(this.frameId);
    }
  }

  createScene(canvas: ElementRef<HTMLCanvasElement>) {
    this.canvas = canvas.nativeElement;

    this.renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias: true});
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = true;
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.toneMappingExposure = 2.2;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);
    this.camera = new THREE.PerspectiveCamera(
      30,
      this.canvas.offsetWidth / this.canvas.offsetHeight,
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
    const renderPass = new RenderPass(this.scene, this.camera);
    this.fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = this.renderer.getPixelRatio();
    const uniforms = this.fxaaPass.material.uniforms;
    uniforms['resolution'].value.x = 1 / (this.canvas.offsetWidth * pixelRatio);
    uniforms['resolution'].value.y = 1 / (this.canvas.offsetHeight * pixelRatio);
    this.composer.addPass(renderPass);
    this.composer.addPass(this.fxaaPass);
  }

  focusObject(object: THREE.Object3D, maintainAngle = false) {
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

  animate() {
    this.ngZone.runOutsideAngular(() => {
      this.render();
      window.addEventListener('resize', () => this.resize());
    });
  }

  private render() {
    this.frameId = requestAnimationFrame(() => this.render());
    this.composer.render();
    // this.renderer.render(this.scene, this.camera);
  }

  private resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);

    const pixelRatio = this.renderer.getPixelRatio();
    this.fxaaPass.material.uniforms['resolution'].value.x =
      1 / (this.canvas.offsetWidth * pixelRatio);
    this.fxaaPass.material.uniforms['resolution'].value.y =
      1 / (this.canvas.offsetHeight * pixelRatio);
  }
}
