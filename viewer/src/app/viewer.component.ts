import {Component, ViewChild, ElementRef, AfterViewInit, HostListener, NgZone} from '@angular/core';

import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {OBJLoader2} from 'three/examples/jsm/loaders/OBJLoader2';
import {MtlObjBridge} from 'three/examples/jsm/loaders/obj2/bridge/MtlObjBridge';
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader';
import {MTLLoader} from 'three/examples/jsm/loaders/MTLLoader';
import {FaceNormalsHelper} from 'three/examples/jsm/helpers/FaceNormalsHelper';
import {VertexNormalsHelper} from 'three/examples/jsm/helpers/VertexNormalsHelper';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader';

import {EngineService} from './engine.service';
import {FullscreenService} from './fullscreen.service';

@Component({
  selector: 'app-viewer',
  template: `
    <div class="container">
      <div class="loader" *ngIf="loading"><h1>Loading</h1></div>
      <div class="gui">
        <div class="upload-btn-wrapper">
          <button class="btn">Upload files</button>
          <input class="custom-file-input" type="file" multiple (change)="onInputChanged($event)" />
        </div>
        <div *ngIf="!loading || true">
          <button (click)="setFullRender()">Full</button>
          <button (click)="setWireframe()">Wireframe</button>
          <button (click)="setAlbedo()">Albedo</button>
          <button (click)="setNormal()">Normal</button>
          <button (click)="setRoughness()">Roughness</button>
          <button (click)="setMetallic()">Metallic</button>
          <button (click)="setAO()">AO</button>
          <button (click)="setSpecular()">Specular</button>
          <button (click)="setFaceNormals()">Face Normals</button>
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
        </div>
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
        height: 80px;
        display: flex;
        flex-direction: row;
      }

      .upload-btn-wrapper {
        cursor: pointer;
        position: relative;
        overflow: hidden;
        display: inline-block;
        cursor: pointer;
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

  private scene = new THREE.Group();
  private model: THREE.Mesh;
  private wireframeModel: THREE.Mesh;
  private wireframeGroup: THREE.Group | undefined;
  private albedoModel: THREE.Mesh;
  private normalModel: THREE.Mesh;
  private roughnessModel: THREE.Mesh;
  private aoModel: THREE.Mesh;
  private metallicModel: THREE.Mesh;
  private specularModel: THREE.Mesh;
  private faceNormals: THREE.Group;

  private mouse = new THREE.Vector2();

  // private clearColor = new THREE.Color(0xffffff);
  private clearColor = new THREE.Color(0xeeeeee);

  loading = true;

  // TODO dof https://threejs.org/examples/#webgl_postprocessing_dof2
  // TODO ssao https://threejs.org/examples/#webgl_postprocessing_ssao
  // TODO bloom https://threejs.org/examples/#webgl_postprocessing_unreal_bloom
  // TODO nodes https://threejs.org/examples/?q=post#webgl_postprocessing_nodes

  constructor(private engineService: EngineService, private fullscreenService: FullscreenService) {}

  ngAfterViewInit() {
    this.engineService.createScene(this.renderCanvas);
    this.engineService.animate();
    this.engineService.setBackground(this.clearColor);
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

  @HostListener('document:dblclick', ['$event'])
  handleMouseDown(event: MouseEvent) {
    const x = event.clientX,
      y = event.clientY;
    this.mouse.x = (x / window.innerWidth) * 2 - 1;
    this.mouse.y = -(y / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this.mouse, this.engineService.camera);
    let intersects = [];
    raycaster.intersectObject(this.model, false, intersects);
    if (!intersects.length) {
      console.log('no intersestions');
      return;
    }
    let min;
    for (const i of intersects) {
      if (!min || i.distance < min.distance) min = i;
    }
    this.engineService.controls.target.set(min.point.x, min.point.y, min.point.z);
    // TODO idea: set small object with animation to pivot point
    // TODO animation https://stackoverflow.com/questions/18401213/
  }

  onBloomChange(event) {
    console.log(event);
    this.engineService.bloomPass.strength = event.path[0].value;
  }

  onInputChanged(event) {
    const files: File[] = Array.from(event.target.files);
    const gltf = files.filter(
      f => f.name.split('.').pop() === 'gltf' || f.name.split('.').pop() === 'glb',
    );
    const obj = files.filter(f => f.name.split('.').pop() === 'obj');
    const mtl = files.filter(f => f.name.split('.').pop() === 'mtl');
    const images = files.filter(f => f.type.includes('image'));
    if (gltf.length) {
      const reader = new FileReader();
      reader.onload = e => this.loadGltfModel(e.target.result);
      reader.readAsDataURL(gltf[0]);
    }
    if (obj.length) {
      const reader = new FileReader();
      reader.onload = e => {
        if (mtl.length) {
          const reader2 = new FileReader();
          reader2.onload = e2 => this.loadObjModel(e.target.result, e2.target.result, images);
          reader2.readAsDataURL(mtl[0]);
        } else {
          this.loadObjModel(e.target.result, null, images);
        }
      };
      reader.readAsDataURL(obj[0]);
    }

    if (images.length) {
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
    // this.engineService.scene.background = envMap;
    this.engineService.scene.environment = envMap;
    // TODO rotate env and adjust exposure
    // TODO set as background + blur background
    pmremGenerator.dispose();
  }
  private async loadObjModel(
    objFile: string | ArrayBuffer,
    mtlFile: string | ArrayBuffer | undefined,
    images: File[],
  ) {
    this.clearScene();
    const objLoader2 = new OBJLoader2();
    const obj: THREE.Group = await objLoader2.loadAsync(objFile.toString());
    const mtl: MTLLoader.MaterialCreator =
      mtlFile && (await new MTLLoader().loadAsync(mtlFile.toString()));

    console.log(mtl.materialsInfo, images);
    obj.children[0].traverse(async obj => {
      if ((obj as any).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        this.model = obj as THREE.Mesh;

        let albedoMap, roughnessMap, normalMap, metalnessMap, aoMap;
        // TODO consider values in mtl file
        for (const image of images) {
          const {name} = image;
          if (name.includes('albedo') || name.includes('diffuse') || name.includes('color')) {
            albedoMap = await this.laodLocalTextureMap(image);
            continue;
          }
          if (name.includes('roughness')) {
            roughnessMap = await this.laodLocalTextureMap(image);
            continue;
          }
          if (name.includes('normal')) {
            normalMap = await this.laodLocalTextureMap(image);
            continue;
          }
          if (name.includes('metal')) {
            metalnessMap = await this.laodLocalTextureMap(image);
            continue;
          }
          if (name.includes('ao') || (name.includes('ambient') && name.includes('occlusion'))) {
            aoMap = await this.laodLocalTextureMap(image);
            continue;
          }
        }

        const material = new THREE.MeshPhysicalMaterial({});
        if (albedoMap) material.map = albedoMap;
        if (roughnessMap) material.roughnessMap = roughnessMap;
        if (normalMap) material.normalMap = normalMap;
        if (metalnessMap) material.metalnessMap = metalnessMap;
        if (aoMap) material.aoMap = aoMap;

        this.model.material = material;
      }
    });
    this.loading = false;
    this.engineService.focusObject(this.model);
    this.setFullRender();
  }

  private async laodLocalTextureMap(file: File) {
    const url = await this.getTempFileUrl(file);
    const loader = new THREE.TextureLoader();
    return loader.loadAsync(url);
  }

  private loadGltfModel(file: string | ArrayBuffer) {
    this.clearScene();
    new GLTFLoader().load(file.toString(), gltf => {
      this.scene = gltf.scene;
      // TODO multiple children
      this.scene.children[0].traverse(obj => {
        if ((obj as any).isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
          this.model = obj as THREE.Mesh;
        }
      });
      this.loading = false;
      this.engineService.focusObject(this.model);
      this.setFullRender();
    });
  }

  private async getTempFileUrl(file: File): Promise<string> {
    return new Promise(res => {
      const reader = new FileReader();
      reader.onload = e => res(e.target.result.toString());
      reader.readAsDataURL(file);
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
    if (this.specularModel) this.engineService.scene.remove(this.specularModel);
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
      // color: fullMaterial.color,
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

    const materialOptimistic = new THREE.MeshBasicMaterial({
      map: fullMaterial.metalnessMap,
    });
    const materialPessimistic = new THREE.MeshBasicMaterial({
      color: fullMaterial.metalness,
    });
    this.metallicModel.material = fullMaterial.metalnessMap
      ? materialOptimistic
      : materialPessimistic;
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

  setSpecular() {
    // TODO specular
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
    this.wireframeModel = this.model.clone(true);
    this.wireframeModel.geometry = new THREE.WireframeGeometry(this.model.geometry);

    this.wireframeGroup = new THREE.Group();
    const wireframe = new THREE.LineSegments(this.wireframeModel.geometry, mat);

    this.wireframeGroup.add(wireframe);
    this.wireframeGroup.rotation.set(
      this.model.rotation.x,
      this.model.rotation.y,
      this.model.rotation.z,
    );
    this.wireframeGroup.scale.set(this.model.scale.x, this.model.scale.y, this.model.scale.z);
    this.wireframeGroup.position.set(
      this.model.position.x,
      this.model.position.y,
      this.model.position.z,
    );
    this.wireframeGroup.updateMatrix();
    const solid = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    const base = new THREE.Mesh(this.model.geometry, solid);
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
    this.faceNormals.add(new VertexNormalsHelper(this.model, size, 0x000000));
    // TODO face normals don't work (only vetex normals) (this.geometry doesn't have faces properrt)
    // this.faceNormals.add(new FaceNormalsHelper(this.model.geometry, 0.003));

    const mat = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 1,
    });
    const wireframeModel = this.model.clone(true);
    wireframeModel.geometry = new THREE.WireframeGeometry(this.model.geometry);
    const wireframe = new THREE.LineSegments(wireframeModel.geometry, mat);

    this.faceNormals.add(wireframe);

    this.engineService.scene.add(this.faceNormals);
  }
}
