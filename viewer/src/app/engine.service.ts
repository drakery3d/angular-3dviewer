import {Injectable, ElementRef, NgZone, OnDestroy} from '@angular/core';
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass';

import {OrbitControls} from './controls';

@Injectable()
export class EngineService implements OnDestroy {
  scene: THREE.Scene;
  controls: OrbitControls;
  camera: THREE.PerspectiveCamera;

  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private frameId: number;

  constructor(private ngZone: NgZone) {}

  ngOnDestroy() {
    if (this.frameId != null) cancelAnimationFrame(this.frameId);
  }

  createScene(canvas: ElementRef<HTMLCanvasElement>) {
    this.canvas = canvas.nativeElement;

    this.renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias: true});
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = true;
    // this.renderer.toneMapping = THREE.ReinhardToneMapping;
    // this.renderer.toneMappingExposure = 2.2;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);
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
    this.controls.dampingFactor = 0.08;

    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
  }

  setBackground(color: THREE.Color) {
    this.scene.background = color;
  }

  focusObject(object: THREE.Object3D, maintainAngle = false) {
    this.ngZone.runOutsideAngular(() => {
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
    });
  }

  animate() {
    this.ngZone.runOutsideAngular(() => {
      this.render();
      window.addEventListener('resize', () => this.resize());
    });
  }

  private render() {
    this.frameId = requestAnimationFrame(() => this.render());
    this.controls.update(); // for control.damping
    this.composer.render();
    // this.renderer.render(this.scene, this.camera);
  }

  private resize() {
    this.ngZone.runOutsideAngular(() => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height);
      this.composer.setSize(width, height);
    });
  }
}
