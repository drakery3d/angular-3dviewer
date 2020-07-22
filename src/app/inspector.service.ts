import {Injectable} from '@angular/core';
import * as THREE from 'three';
import {VertexNormalsHelper} from 'three/examples/jsm/helpers/VertexNormalsHelper';

import {EngineService} from './engine.service';
import {SceneService} from './scene.service';
import {OBJParserService} from './obj-parser';

@Injectable()
export class InspectorService {
  mode: string | undefined;

  private fullMaterial: THREE.MeshPhysicalMaterial;

  constructor(
    private engineService: EngineService,
    private sceneService: SceneService,
    private objParser: OBJParserService,
  ) {}

  // TODO keyboard shurtcuts for switching
  changeMode(mode: string, force = false) {
    if (!force && this.mode === mode) return;
    this.mode = mode;
    this.sceneService.clear();

    if (mode === 'full') {
      this.engineService.setPostProcessing(true);
      this.full();
    }
    if (mode === 'full_no_post') {
      this.engineService.setPostProcessing(false);
      this.full();
    }

    if (mode === 'wireframe') this.wireframe();
    if (mode === 'vertices') this.vertices();
    if (mode === 'mesh') this.mesh();
    if (mode === 'vertex_normals') this.vertexNormals();
    if (mode === 'uv') this.uv();

    if (mode === 'albedo') this.albedo();
    if (mode === 'normal') this.normal();
    if (mode === 'roughness') this.roughness();
    if (mode === 'specular') this.specular();
    if (mode === 'metalness') this.metalness();
    if (mode === 'ambient_occlusion') this.ambientOcclusion();
    if (mode === 'clear_coat') this.clearCoat();
    if (mode === 'clear_coat_roughness') this.clearCoatRoughness();
    if (mode === 'clear_coat_normal') this.clearCoatNormal();
    if (mode === 'light') this.light();
    if (mode === 'emissive') this.emissive();
    if (mode === 'bump') this.bump();
    if (mode === 'displacement') this.displacement();
    if (mode === 'alpha') this.alpha();

    this.engineService.needsUpdate = true;
  }

  reset() {
    this.fullMaterial = undefined;
  }

  private full() {
    if (this.fullMaterial) this.sceneService.model.material = this.fullMaterial;
    this.sceneService.scene.add(this.sceneService.model);
  }

  private wireframe() {
    // TODO factor in opacity map of object
    // TODO lines are invisiable at certain view angles
    // TODO not all edges are drawn (e.g. visbile when importing a cube)
    this.engineService.setPostProcessing(false);
    const group = new THREE.Group();
    const model = this.sceneService.model.clone(true);
    const filler = new THREE.Mesh(model.geometry, new THREE.MeshBasicMaterial());
    group.add(filler);

    const material = new THREE.LineBasicMaterial({color: 0x000000, linewidth: 1});

    // TODO do this only if obj was imported
    // TODO remove lines clipping with mesh
    if (this.objParser.points.length) {
      const indices = this.objParser.indices;
      let sortedPoints = [];
      for (let i = 0; i < indices.length; i += 2) {
        sortedPoints.push(this.objParser.points[indices[i]], this.objParser.points[indices[i + 1]]);
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(sortedPoints);
      const lines = new THREE.LineSegments(geometry, material);
      group.add(lines);
    } else {
      model.geometry = new THREE.WireframeGeometry(model.geometry);
      const wireframe = new THREE.LineSegments(model.geometry, material);
      group.add(wireframe);
      this.copyTransforms(this.sceneService.model, group);
    }
    this.sceneService.scene.add(group);
  }

  private uv() {
    this.engineService.setPostProcessing(false);
    // TODO render uv-checker board onto model
  }

  private vertices() {
    this.engineService.setPostProcessing(false);
    const group = new THREE.Group();
    const model = this.sceneService.model.clone(true);
    const filler = new THREE.Mesh(
      model.geometry,
      new THREE.MeshBasicMaterial({transparent: true, opacity: 0.5}),
    );
    group.add(filler);
    this.copyTransforms(this.sceneService.model, group);
    this.sceneService.scene.add(group);

    const pointsMaterial = new THREE.PointsMaterial({
      size: 5,
      sizeAttenuation: false,
      map: new THREE.TextureLoader().load('assets/dot.png'),
      alphaTest: 0.5,
    });
    const points = new THREE.Points(filler.geometry, pointsMaterial);
    points.morphTargetInfluences = filler.morphTargetInfluences;
    points.morphTargetDictionary = filler.morphTargetDictionary;
    filler.add(points);
  }

  private mesh() {
    this.engineService.setPostProcessing(false);
    const mesh = this.sceneService.model.clone(true);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x555555,
      reflectivity: 1,
      roughness: 0.01,
    });
    mesh.material = material;
    this.sceneService.scene.add(mesh);
  }

  private vertexNormals() {
    this.engineService.setPostProcessing(false);
    const group = new THREE.Group();
    group.add(this.sceneService.model);

    const size = this.sceneService.calcMaxObjectSize() / 100;
    // TODO determine helper line color based on scene
    const normals = new VertexNormalsHelper(this.sceneService.model, size, 0x56c860);
    group.add(normals);
    const model = this.sceneService.model.clone(true);
    model.geometry = new THREE.WireframeGeometry(this.sceneService.model.geometry);
    this.sceneService.scene.add(group);
  }

  private albedo() {
    this.prepareShaderMode();
    const material = new THREE.MeshBasicMaterial();
    if (this.fullMaterial.map) material.map = this.fullMaterial.map;
    else material.color = this.fullMaterial.color;
    this.sceneService.model.material = material;
    this.sceneService.scene.add(this.sceneService.model);
  }

  private normal() {
    this.prepareShaderMode();
    const material = new THREE.MeshBasicMaterial();
    if (this.fullMaterial.normalMap) material.map = this.fullMaterial.normalMap;
    else material.color = new THREE.Color(0x0000ff);
    this.sceneService.model.material = material;
    this.sceneService.scene.add(this.sceneService.model);
  }

  private roughness() {
    this.prepareShaderMode();
    const material = new THREE.MeshBasicMaterial();
    if (this.fullMaterial.roughnessMap) material.map = this.fullMaterial.roughnessMap;
    else material.color = new THREE.Color(this.fullMaterial.roughness.toString(16));
    this.sceneService.model.material = material;
    this.sceneService.scene.add(this.sceneService.model);
  }

  private specular() {
    this.prepareShaderMode();
    // TODO specular map
  }

  private metalness() {
    this.prepareShaderMode();
    const material = new THREE.MeshBasicMaterial();
    // TODO metalnessMap is defined, although it is not presetn
    if (this.fullMaterial.metalnessMap) material.map = this.fullMaterial.metalnessMap;
    else material.color = new THREE.Color(this.fullMaterial.metalness.toString(16));
    this.sceneService.model.material = material;
    this.sceneService.scene.add(this.sceneService.model);
  }

  private ambientOcclusion() {
    this.prepareShaderMode();
    const material = new THREE.MeshBasicMaterial();
    if (this.fullMaterial.aoMap) material.map = this.fullMaterial.aoMap;
    else material.color = new THREE.Color(0xffffff);
    this.sceneService.model.material = material;
    this.sceneService.scene.add(this.sceneService.model);
  }

  private clearCoat() {
    this.prepareShaderMode();
    const material = new THREE.MeshBasicMaterial();
    if (this.fullMaterial.clearcoatMap) material.map = this.fullMaterial.clearcoatMap;
    else material.color = new THREE.Color(this.fullMaterial.clearcoat.toString(16));
    this.sceneService.model.material = material;
    this.sceneService.scene.add(this.sceneService.model);
  }

  private clearCoatRoughness() {
    this.prepareShaderMode();
    const material = new THREE.MeshBasicMaterial();
    if (this.fullMaterial.clearcoatRoughnessMap)
      material.map = this.fullMaterial.clearcoatRoughnessMap;
    else material.color = new THREE.Color(this.fullMaterial.clearcoatRoughness.toString(16));
    this.sceneService.model.material = material;
    this.sceneService.scene.add(this.sceneService.model);
  }

  private clearCoatNormal() {
    this.prepareShaderMode();
    const material = new THREE.MeshBasicMaterial();
    if (this.fullMaterial.clearcoatNormalMap) material.map = this.fullMaterial.clearcoatNormalMap;
    else material.color = new THREE.Color(0x0000ff);
    this.sceneService.model.material = material;
    this.sceneService.scene.add(this.sceneService.model);
  }

  private light() {
    this.prepareShaderMode();
    const material = new THREE.MeshBasicMaterial();
    if (this.fullMaterial.lightMap) material.map = this.fullMaterial.lightMap;
    else material.color = new THREE.Color(0x000000);
    this.sceneService.model.material = material;
    this.sceneService.scene.add(this.sceneService.model);
  }

  private emissive() {
    this.prepareShaderMode();
    const material = new THREE.MeshBasicMaterial();
    // TODO factor in emissive intensity
    if (this.fullMaterial.emissiveMap) material.map = this.fullMaterial.emissiveMap;
    else material.color = new THREE.Color(0x000000);
    this.sceneService.model.material = material;
    this.sceneService.scene.add(this.sceneService.model);
  }

  private bump() {
    this.prepareShaderMode();
    const material = new THREE.MeshBasicMaterial();
    if (this.fullMaterial.bumpMap) material.map = this.fullMaterial.bumpMap;
    else material.color = new THREE.Color(0x000000);
    this.sceneService.model.material = material;
    this.sceneService.scene.add(this.sceneService.model);
  }

  private displacement() {
    this.prepareShaderMode();
    const material = new THREE.MeshBasicMaterial();
    if (this.fullMaterial.displacementMap) material.map = this.fullMaterial.displacementMap;
    else material.color = new THREE.Color(0x000000);
    this.sceneService.model.material = material;
    this.sceneService.scene.add(this.sceneService.model);
  }

  private alpha() {
    this.prepareShaderMode();
    const material = new THREE.MeshBasicMaterial();
    if (this.fullMaterial.alphaMap) material.map = this.fullMaterial.alphaMap;
    else material.color = new THREE.Color(0xffffff);
    this.sceneService.model.material = material;
    this.sceneService.scene.add(this.sceneService.model);
  }

  // TODO what the hell is envMap?
  // TODO and what about subsurface scattering?

  private prepareShaderMode() {
    this.engineService.setPostProcessing(false);
    if (!this.fullMaterial)
      this.fullMaterial = this.sceneService.model.material as THREE.MeshPhysicalMaterial;
  }

  private copyTransforms(from: THREE.Mesh | THREE.Group | any, to: THREE.Mesh | THREE.Group | any) {
    to.rotation.set(from.rotation.x, from.rotation.y, from.rotation.z);
    to.scale.set(from.scale.x, from.scale.y, from.scale.z);
    to.position.set(from.position.x, from.position.y, from.position.z);
    to.updateMatrix();
  }
}
