import {Injectable} from '@angular/core';
import * as THREE from 'three';
import {GLTFLoader, GLTF} from 'three/examples/jsm/loaders/GLTFLoader';
import {OBJLoader2} from 'three/examples/jsm/loaders/OBJLoader2';
import {MTLLoader} from 'three/examples/jsm/loaders/MTLLoader';

import {SceneService} from './scene.service';
import {EngineService} from './engine.service';
import {InspectorService} from './inspector.service';
import {OBJParserService} from './obj-parser';

@Injectable()
export class LoaderService {
  // TODO initialize only when necessary
  private gltfLoader = new GLTFLoader();
  private objLoader = new OBJLoader2();
  private mtlLoader = new MTLLoader();

  constructor(
    private sceneService: SceneService,
    private engineService: EngineService,
    private inspectorService: InspectorService,
    private objParser: OBJParserService,
  ) {}

  async loadObj(objFile: File, mtlFile: File, images: File[]) {
    this.sceneService.clear();
    const reader2 = new FileReader();
    reader2.addEventListener('load', e => {
      this.objParser.parse(e.target.result.toString());
    });
    reader2.readAsText(objFile);

    const [objFileUrl, mtlFileUrl] = await Promise.all([
      this.getTempFileUrl(objFile),
      mtlFile ? this.getTempFileUrl(mtlFile) : null,
    ]);

    const obj: THREE.Group = await this.objLoader.loadAsync(objFileUrl.toString());
    let mtl: MTLLoader.MaterialCreator = null;
    if (mtlFileUrl) mtl = await this.mtlLoader.loadAsync(mtlFileUrl);

    obj.children[0].traverse(c => {
      if ((c as any).isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
        this.sceneService.model = c as THREE.Mesh;
      }
    });
    // TODO also consider values of mtl file if it exists
    // TODO try to load all texture types

    const material = new THREE.MeshPhysicalMaterial({});
    for (const image of images) {
      const {name} = image;
      if (name.includes('albedo') || name.includes('diffuse') || name.includes('color')) {
        material.map = await this.laodLocalTextureMap(image);
        continue;
      }
      if (name.includes('roughness')) {
        material.roughnessMap = await this.laodLocalTextureMap(image);
        continue;
      }
      if (name.includes('normal')) {
        material.normalMap = await this.laodLocalTextureMap(image);
        continue;
      }
      if (name.includes('metal')) {
        material.metalnessMap = await this.laodLocalTextureMap(image);
        continue;
      }
      if (name.includes('ao') || (name.includes('ambient') && name.includes('occlusion'))) {
        // TODO when loading this, the model is pitch black, why? (it did work before moving to this service)
        material.aoMap = await this.laodLocalTextureMap(image);
        continue;
      }
    }
    this.sceneService.model.material = material;
    this.loadDone();
  }

  async loadGltf2(gltfFile: File, rootPath: string, allFiles: File[]) {
    this.sceneService.clear();
  }

  async loadGltf(file: File) {
    this.sceneService.clear();
    const fileUrl = await this.getTempFileUrl(file);
    const gltf: GLTF = await this.gltfLoader.loadAsync(fileUrl.toString());
    // TODO handle multiple children (e.g. test with cactus model)
    // console.log(gltf.scene);

    this.printGraph(gltf.scene);

    gltf.scene.children[0].traverse(c => {
      if ((c as any).isMesh) {
        const mesh = c as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.sceneService.model = mesh;
        // this.sceneService.model.add(mesh);
        // console.log(mesh);
        // TODO try to load textures (but don't override)
      }
    });
    this.loadDone();
  }

  private printGraph(node) {
    console.group(' <' + node.type + '> ' + node.name);
    node.children.forEach(child => this.printGraph(child));
    console.groupEnd();
  }

  private async laodLocalTextureMap(file: File) {
    const url = await this.getTempFileUrl(file);
    const loader = new THREE.TextureLoader();
    return loader.loadAsync(url);
  }

  private loadDone() {
    const maxSize = this.sceneService.calcMaxObjectSize();
    this.engineService.ssaoPass.minDistance = maxSize / 100;
    this.engineService.ssaoPass.maxDistance = maxSize / 10;
    this.inspectorService.changeMode('full', true);
    this.engineService.controls.rotateTo(0, Math.PI * 0.5, false);
    this.engineService.controls.fitTo(this.sceneService.model, true);
  }

  private async getTempFileUrl(file: File): Promise<string> {
    return new Promise(res => {
      const reader = new FileReader();
      reader.onload = e => res(e.target.result.toString());
      reader.readAsDataURL(file);
    });
  }
}
