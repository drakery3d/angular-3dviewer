import { Component, ViewChild, HostListener } from '@angular/core';

import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  HemisphereLight,
} from 'three';
import { FXAAShader } from 'three-full';
import * as THREE from 'three';
import * as FromOrbitControls from 'three-orbit-controls';
import GLTFLoader from 'three-gltf-loader';
import {
  EffectComposer,
  RenderPass,
  BloomEffect,
  EffectPass,
  ShaderPass,
} from 'postprocessing';

const OrbitControls = FromOrbitControls(THREE);
enum Modes {
  default = 'default',
  wireframe = 'wireframe',
}

@Component({
  selector: 'app-engine',
  templateUrl: './engine.component.html',
  styles: [
    `
      div {
        height: 100vh;
        cursor: grab;
      }
      .button {
        position: absolute;
      }
      #dropdown {
        bottom: 0;
        left: 0;
      }
    `,
  ],
})
export class EngineComponent {
  @ViewChild('viewer', { static: false })
  container;

  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  loader: GLTFLoader;
  controls: any;
  composer: EffectComposer;
  hemiLight: HemisphereLight;

  modes = Object.keys(Modes).map((key) => Modes[key]);
  mode: Modes = Modes.default;

  gltf;
  wireframe;
  fxaaPass;
  wireframeEnabled = false;
  baseMesh;
  scenePath = 'assets/scene.gltf';

  onModeChanged(mode: Modes) {
    console.log(mode);
    this.clear();
    switch (mode) {
      case Modes.default: {
        this.loadDefault();
        break;
      }
      case Modes.wireframe: {
        this.loadWireframe();
        break;
      }
    }
  }

  private clear = () => {
    this.scene.remove(this.wireframe);
    this.scene.remove(this.gltf);
    this.scene.remove(this.baseMesh);
  };

  private loadDefault = () => {
    this.loader.load(this.scenePath, (loadedGltf) => {
      this.gltf = loadedGltf;
      this.scene.add(this.gltf.scene);
      const bb = new THREE.Box3();
      bb.setFromObject(this.gltf.scene);
      bb.getCenter(this.controls.target);
    });
  };

  private loadWireframe = () => {
    this.loader.load(this.scenePath, (loadedGltf) => {
      this.gltf = loadedGltf;
      const bb = new THREE.Box3();
      bb.setFromObject(this.gltf.scene);
      bb.getCenter(this.controls.target);

      this.gltf.scene.traverse((child: any) => {
        if (child.isMesh) {
          const edgeMaterial = new THREE.EdgesGeometry(child.geometry);
          const wireframeMaterial = new THREE.LineBasicMaterial({
            color: 0x000000,
            linewidth: 2,
          });
          const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
          this.baseMesh = new THREE.Mesh(child.geometry, material);
          this.wireframe = new THREE.LineSegments(
            edgeMaterial,
            wireframeMaterial
          );
          this.scene.add(this.wireframe);
          this.scene.add(this.baseMesh);
        }
      });
    });
  };

  ngAfterViewInit() {
    this.setupRenderer();
    this.setupLights();
    this.setupComposer();
    this.setupControls();
    this.onWindowResize();
    this.animate();

    this.loadDefault();
    this.container.nativeElement.appendChild(this.renderer.domElement);
  }

  toggleWireframe = () => {
    this.wireframeEnabled = !this.wireframeEnabled;
    if (this.wireframeEnabled) {
      this.scene.remove(this.gltf.scene);
      this.gltf.scene.traverse((child: any) => {
        if (child.isMesh) {
          const geo = new THREE.EdgesGeometry(child.geometry);
          const mat = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 2,
            linecap: 'round',
            linejoin: 'round',
          });
          this.wireframe = new THREE.LineSegments(geo, mat);
          this.scene.add(this.wireframe);
        }
      });
    } else {
      this.scene.remove(this.wireframe);
      this.scene.add(this.gltf.scene);
    }
  };

  private setupLights() {
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 3);
    this.hemiLight.color.setHSL(0.6, 1, 0.6);
    this.hemiLight.groundColor.setHSL(0.095, 1, 0.75);
    this.hemiLight.position.set(0, 50, 0);
    //  this.scene.add(this.hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    this.scene.add(ambientLight);
  }

  private setupRenderer() {
    this.scene = new Scene();
    this.loader = new GLTFLoader();

    // this.scene.fog = new THREE.Fog(0xffffff, 1, 1000);

    this.camera = new PerspectiveCamera(60);
    this.camera.position.z = 2;

    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x455a64, 1);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = true;
  }

  private setupComposer() {
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloom = new BloomEffect({
      luminanceThreshold: 0.9,
      luminanceSmoothing: 0.2,
      resolutionScale: 1,
    });
    const effectPass = new EffectPass(this.camera, bloom);
    effectPass.renderToScreen = true;
    this.composer.addPass(effectPass);
  }

  private setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.rotateSpeed = 0.2;
  }

  private animate(): void {
    this.composer.render();
    this.controls.update();
    window.requestAnimationFrame(() => this.animate());
  }

  private onWindowResize(): void {
    this.camera.aspect =
      this.container.nativeElement.clientWidth /
      this.container.nativeElement.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(
      this.container.nativeElement.clientWidth,
      this.container.nativeElement.clientHeight
    );

    /* this.fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = this.renderer.getPixelRatio();
    this.fxaaPass.screen.material.uniforms['resolution'].value.x =
      1 / (this.container.nativeElement.offsetWidth * pixelRatio);
    this.fxaaPass.screen.material.uniforms['resolution'].value.y =
      1 / (this.container.nativeElement.offsetHeight * pixelRatio);
    this.composer.addPass(this.fxaaPass);
    this.fxaaPass.renderToScreen = true;
    console.log('resize'); */
  }

  @HostListener('window:resize')
  onResize() {
    this.onWindowResize();
  }
}
