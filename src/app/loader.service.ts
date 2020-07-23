import {Injectable} from '@angular/core';
import * as THREE from 'three';
import {GLTFLoader, GLTF} from 'three/examples/jsm/loaders/GLTFLoader';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader';

@Injectable()
export class LoaderService {
  async loadGltf(rootFile: File, rootPath: string, allFiles: Map<string, File>) {
    const fileUrl = URL.createObjectURL(rootFile);
    const baseUrl = this.extractUrlBase(fileUrl);
    const blobUrls = [];

    const manager = new THREE.LoadingManager();
    manager.setURLModifier(url => {
      const normalizedUrl =
        rootPath +
        decodeURI(url)
          .replace(baseUrl, '')
          .replace(/^(\.?\/)/, '');

      if (allFiles.has(normalizedUrl)) {
        const blob = allFiles.get(normalizedUrl);
        const blobURL = URL.createObjectURL(blob);
        blobUrls.push(blobURL);
        return blobURL;
      }

      return url;
    });

    const loader = new GLTFLoader(manager);
    loader.setCrossOrigin('anonymous');

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('assets/draco/');
    loader.setDRACOLoader(dracoLoader);

    const gltf: GLTF = await loader.loadAsync(fileUrl);
    blobUrls.forEach(URL.revokeObjectURL);
    URL.revokeObjectURL(fileUrl);

    if (gltf.scenes.length > 1)
      console.warn('multiple scenes are not supported. only one will be loaded');
    const scene = gltf.scene || gltf.scenes[0];
    const animations = gltf.animations || [];

    if (!scene) throw new Error('file has no scene');
    return {scene, animations};
  }

  private extractUrlBase(url: string) {
    const index = url.lastIndexOf('/');
    if (index === -1) return './';
    return url.substr(0, index + 1);
  }
  /* async loadObj(objFile: File, mtlFile: File, images: File[]) {
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

  private async laodLocalTextureMap(file: File) {
    const url = await this.getTempFileUrl(file);
    const loader = new THREE.TextureLoader();
    return loader.loadAsync(url);
  }

  private async getTempFileUrl(file: File): Promise<string> {
    return new Promise(res => {
      const reader = new FileReader();
      reader.onload = e => res(e.target.result.toString());
      reader.readAsDataURL(file);
    });
  }*/
}
