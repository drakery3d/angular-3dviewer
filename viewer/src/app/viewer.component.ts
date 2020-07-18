import {Component, ViewChild, ElementRef, AfterViewInit, HostListener} from '@angular/core';

import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {FaceNormalsHelper} from 'three/examples/jsm/helpers/FaceNormalsHelper';
import {VertexNormalsHelper} from 'three/examples/jsm/helpers/VertexNormalsHelper';

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
        <button (click)="setAlbedo()">Albedo</button>
        <button (click)="setNormal()">Normal</button>
        <button (click)="setRoughness()">Roughness</button>
        <button (click)="setMetallic()">Metallic</button>
        <button (click)="setAO()">AO</button>
        <button (click)="setFaceNormals()">Face Normals</button>
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

  private model: THREE.Mesh;
  private mesh: THREE.Mesh;
  private geometry: THREE.Geometry | undefined;
  private wireframeGroup: THREE.Group | undefined;
  private albedoModel: THREE.Mesh;
  private normalModel: THREE.Mesh;
  private roughnessModel: THREE.Mesh;
  private aoModel: THREE.Mesh;
  private metallicModel: THREE.Mesh;
  private faceNormals: THREE.Group;

  private clearColor = new THREE.Color(0xffffff);

  loading = true;

  constructor(private engineService: EngineService, private fullscreenService: FullscreenService) {}

  ngAfterViewInit() {
    this.engineService.createScene(this.renderCanvas);
    this.engineService.animate();
    this.engineService.setBackground(this.clearColor);
    this.loadGltfModel('wooden-buddha.glb');
    // this.loadGltfModel('Astronaut.glb');
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
    new GLTFLoader().load(`assets/${path}`, gltf => {
      this.mesh = gltf.scene.children[0] as THREE.Mesh;
      this.mesh.traverse(obj => {
        if ((obj as any).isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
          this.model = obj as THREE.Mesh;
        }
      });
      // TODO apply transformations of parent objects to ensure same transforms as scene
      this.model.traverse((child: any) => {
        if (!child.isMesh) return;
        this.geometry = child.geometry;
      });
      this.loading = false;
      this.engineService.focusObject(this.model);
      this.setFullRender();
    });
  }

  private clearScene() {
    if (this.wireframeGroup) this.engineService.scene.remove(this.wireframeGroup);
    if (this.model) this.engineService.scene.remove(this.model);
    if (this.albedoModel) this.engineService.scene.remove(this.albedoModel);
    if (this.normalModel) this.engineService.scene.remove(this.normalModel);
    if (this.roughnessModel) this.engineService.scene.remove(this.roughnessModel);
    if (this.metallicModel) this.engineService.scene.remove(this.metallicModel);
    if (this.aoModel) this.engineService.scene.remove(this.aoModel);
    if (this.metallicModel) this.engineService.scene.remove(this.metallicModel);
    if (this.faceNormals) this.engineService.scene.remove(this.faceNormals);
  }

  toggleFullScreen() {
    this.fullscreenService.toggle();
  }

  setFullRender() {
    this.clearScene();
    this.engineService.scene.add(this.model);
  }

  setAlbedo() {
    this.clearScene();
    if (this.albedoModel) {
      this.engineService.scene.add(this.albedoModel);
      return;
    }

    this.albedoModel = this.model.clone();
    const fullMaterial = this.albedoModel.material as THREE.MeshPhysicalMaterial;
    const material = new THREE.MeshBasicMaterial({
      color: fullMaterial.color,
      map: fullMaterial.map,
    });
    this.albedoModel.material = material;
    this.engineService.scene.add(this.albedoModel);
  }

  setNormal() {
    this.clearScene();
    if (this.normalModel) {
      this.engineService.scene.add(this.normalModel);
      return;
    }

    this.normalModel = this.model.clone();
    const fullMaterial = this.normalModel.material as THREE.MeshPhysicalMaterial;
    //  TODO colors are not really accurate yet
    const material = new THREE.MeshBasicMaterial({
      color: 0x615ced,
      map: fullMaterial.normalMap,
    });
    /* const normalLaterial = new THREE.MeshNormalMaterial({
      displacementScale: 2.436143,
      displacementBias: -0.428408,
      normalMap: fullMaterial.normalMap,
      normalScale: new THREE.Vector2(1, -1),
      flatShading: true,
      side: THREE.DoubleSide,
    }); */
    this.normalModel.material = material;
    this.engineService.scene.add(this.normalModel);
  }

  setRoughness() {
    this.clearScene();
    if (this.roughnessModel) {
      this.engineService.scene.add(this.roughnessModel);
      return;
    }

    this.roughnessModel = this.model.clone();
    const fullMaterial = this.roughnessModel.material as THREE.MeshPhysicalMaterial;
    // TODO doens't work yet
    const material = new THREE.MeshBasicMaterial({
      color: fullMaterial.roughness,
      map: fullMaterial.roughnessMap,
    });
    this.roughnessModel.material = material;
    this.engineService.scene.add(this.roughnessModel);
  }

  setMetallic() {
    this.clearScene();
    if (this.metallicModel) {
      this.engineService.scene.add(this.metallicModel);
      return;
    }

    this.metallicModel = this.model.clone();
    const fullMaterial = this.metallicModel.material as THREE.MeshPhysicalMaterial;
    // TODO doens't work yet
    const material = new THREE.MeshBasicMaterial({
      color: fullMaterial.metalness,
      map: fullMaterial.metalnessMap,
    });
    this.metallicModel.material = material;
    this.engineService.scene.add(this.metallicModel);
  }

  setAO() {
    this.clearScene();
    if (this.aoModel) {
      this.engineService.scene.add(this.aoModel);
      return;
    }

    this.aoModel = this.model.clone();
    const fullMaterial = this.aoModel.material as THREE.MeshPhysicalMaterial;
    const material = new THREE.MeshBasicMaterial({
      map: fullMaterial.aoMap,
    });
    this.aoModel.material = material;
    this.engineService.scene.add(this.aoModel);
  }

  setWireframe() {
    this.clearScene();

    if (this.wireframeGroup) {
      this.engineService.scene.add(this.wireframeGroup);
      return;
    }

    const mat = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 1,
    });
    const geo = new THREE.WireframeGeometry(this.geometry);
    this.wireframeGroup = new THREE.Group();
    const wireframe = new THREE.LineSegments(geo, mat);
    this.wireframeGroup.add(wireframe);
    const solid = new THREE.MeshStandardMaterial({
      color: this.clearColor.getHex(),
      roughness: 1,
    });
    const base = new THREE.Mesh(this.geometry, solid);
    this.wireframeGroup.add(base);
    this.engineService.scene.add(this.wireframeGroup);
  }

  // TODO doesn't work on every model
  setFaceNormals() {
    this.clearScene();

    this.faceNormals = new THREE.Group();
    this.faceNormals.add(this.model);
    // TODO how to calc size of helper lines?
    const size = 0.003;
    this.faceNormals.add(new VertexNormalsHelper(this.mesh, size, 0x000000));
    // TODO face normals don't work (only vetex normals) (this.geometry doesn't have faces properrt)
    // this.faceNormals.add(new FaceNormalsHelper(this.geometry, 0.003));

    const geo = new THREE.WireframeGeometry(this.geometry);
    const mat = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 1,
    });
    const wireframe = new THREE.LineSegments(geo, mat);
    this.faceNormals.add(wireframe);

    this.engineService.scene.add(this.faceNormals);
  }
}
