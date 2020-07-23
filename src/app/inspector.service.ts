import {Injectable} from '@angular/core';
import * as THREE from 'three';
import {VertexNormalsHelper} from 'three/examples/jsm/helpers/VertexNormalsHelper';

import {EngineService} from './engine.service';
import {OBJParserService} from './obj-parser';

// TODO consider lazy loading this service

@Injectable()
export class InspectorService {
  mode: string | undefined;

  private scene0: THREE.Scene;

  constructor(private engineService: EngineService, private objParser: OBJParserService) {}

  get initialized() {
    return !!this.scene0;
  }

  initialize(scene: THREE.Scene) {
    this.scene0 = scene.clone(true);
  }

  // TODO keyboard shurtcuts for switching
  changeMode(mode: string, scene: THREE.Scene, force = false) {
    if (!this.scene0)
      throw new Error('inspector service has not been initiliazed yet. please call "initialize"');
    if (!force && this.mode === mode) return;
    this.mode = mode;

    // TODO toggling post processing is still buggy
    if (mode === 'full') {
      this.engineService.setPostProcessing(true);
      this.full(scene);
    }
    if (mode === 'full_no_post') {
      this.engineService.setPostProcessing(false);
      this.full(scene);
    }

    if (mode === 'wireframe') this.wireframe(scene);
    if (mode === 'vertices') this.vertices(scene);
    if (mode === 'mesh') this.mesh(scene);
    if (mode === 'vertex_normals') this.vertexNormals(scene);
    if (mode === 'uv') this.uv(scene);

    if (mode === 'albedo') this.albedo(scene);
    if (mode === 'normal') this.normal(scene);
    if (mode === 'roughness') this.roughness(scene);
    if (mode === 'specular') this.specular(scene);
    if (mode === 'metalness') this.metalness(scene);
    if (mode === 'ambient_occlusion') this.ambientOcclusion(scene);
    if (mode === 'clear_coat') this.clearCoat(scene);
    if (mode === 'clear_coat_roughness') this.clearCoatRoughness(scene);
    if (mode === 'clear_coat_normal') this.clearCoatNormal(scene);
    if (mode === 'light') this.light(scene);
    if (mode === 'emissive') this.emissive(scene);
    if (mode === 'bump') this.bump(scene);
    if (mode === 'displacement') this.displacement(scene);
    if (mode === 'alpha') this.alpha(scene);
    // TODO what about subsurface scattering?

    this.engineService.needsUpdate = true;
  }

  clear() {
    this.scene0 = undefined;
    this.mode = 'full';
  }

  get initialScene() {
    return this.scene0;
  }

  private async full(scene: THREE.Scene) {
    scene.children = [];
    scene.add(...this.scene0.children.map(c => c.clone(true)));
  }

  private wireframe(scene: THREE.Scene) {
    // TODO factor in opacity map of object
    // TODO lines are invisiable at certain view angles from obj
    // TODO not all edges are drawn from obj (e.g. visbile when importing a cube)
    // TODO save wireframe once created, so that it diesn't need to be recalculated
    // TODO this loads slow (e.g. red car)

    const children = this.scene0.children.map(c => c.clone(true));

    const fillerMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, side: THREE.DoubleSide});
    const wireframeMaterial = new THREE.LineBasicMaterial({color: 0x000000, linewidth: 1});

    for (const child of children) {
      child.traverse(node => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;
          mesh.material = fillerMaterial;

          const geometry = new THREE.WireframeGeometry(mesh.geometry);
          const wireframe = new THREE.LineSegments(geometry, wireframeMaterial);
          mesh.add(wireframe);
        }
      });
    }

    scene.children = children;

    /*
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
    }
    */
  }

  private vertices(scene: THREE.Scene) {
    this.engineService.setPostProcessing(false);

    const fillerMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: 1});
    const pointsMaterial = new THREE.PointsMaterial({
      size: 5,
      sizeAttenuation: false,
      map: new THREE.TextureLoader().load('assets/dot.png'),
      alphaTest: 0.5,
    });

    const children = this.scene0.children.map(c => c.clone(true));
    for (const child of children) {
      child.traverse(node => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;

          mesh.material = fillerMaterial;
          const points = new THREE.Points(mesh.geometry, pointsMaterial);
          mesh.add(points);
        }
      });
    }

    scene.children = children;
  }

  private mesh(scene: THREE.Scene) {
    this.engineService.setPostProcessing(false);

    const children = this.scene0.children.map(c => c.clone(true));
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x555555,
      reflectivity: 1,
      roughness: 0.01,
      side: THREE.DoubleSide,
    });

    for (const child of children) {
      child.traverse(node => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;
          mesh.material = material;
        }
      });
    }

    scene.children = children;
  }

  private vertexNormals(scene: THREE.Scene) {
    this.engineService.setPostProcessing(false);

    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3()).length();
    const children = this.scene0.children.map(c => c.clone(true));

    for (const child of children) {
      child.traverse(node => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;
          // TODO determine helper line color based on scene?!
          const normals = new VertexNormalsHelper(mesh, size * 0.01, 0x56c860);
          // TODO transforms are messed up, why?
          mesh.add(normals);
        }
      });
    }

    scene.children = children;
  }

  private uv(scene: THREE.Scene) {
    // TODO checker pattern is streched indefinitely on helmet model... maybe because of udims?
    this.engineService.setPostProcessing(false);

    const loader = new THREE.TextureLoader();
    const children = this.scene0.children.map(c => c.clone(true));
    const material = new THREE.MeshBasicMaterial({
      map: loader.load('assets/uv-grid.png'),
      side: THREE.DoubleSide,
    });

    for (const child of children) {
      child.traverse(node => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;
          mesh.material = material;
        }
      });
    }

    scene.children = children;
  }

  private albedo(scene: THREE.Scene) {
    this.engineService.setPostProcessing(false);
    const children = this.scene0.children.map(c => c.clone(true));

    for (const child of children) {
      child.traverse(node => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;
          const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
          if (mesh.material) {
            const original = mesh.material as THREE.MeshPhysicalMaterial;
            material.map = original.map;
            if (!material.map) material.color = original.color;
          } else {
            mesh.material = material;
          }
          mesh.material = material;
        }
      });
    }

    scene.children = children;
  }

  private normal(scene: THREE.Scene) {
    this.engineService.setPostProcessing(false);
    const children = this.scene0.children.map(c => c.clone(true));

    for (const child of children) {
      child.traverse(node => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;
          const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
          if (mesh.material) {
            const original = mesh.material as THREE.MeshPhysicalMaterial;
            material.map = original.normalMap;
            if (!material.map) material.color = new THREE.Color(0x0000ff);
          } else {
            mesh.material = material;
          }
          mesh.material = material;
        }
      });
    }

    scene.children = children;
  }

  private roughness(scene: THREE.Scene) {
    this.engineService.setPostProcessing(false);
    const children = this.scene0.children.map(c => c.clone(true));

    for (const child of children) {
      child.traverse(node => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;
          const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
          if (mesh.material) {
            const original = mesh.material as THREE.MeshPhysicalMaterial;
            material.map = original.roughnessMap;
            if (!material.map) material.color = new THREE.Color().setScalar(original.roughness);
          } else {
            mesh.material = material;
          }
          mesh.material = material;
        }
      });
    }

    scene.children = children;
  }

  private specular(scene: THREE.Scene) {
    // TODO specular map
  }

  private metalness(scene: THREE.Scene) {
    // TODO metalnessMap is defined, although it is not presetn
    this.engineService.setPostProcessing(false);
    const children = this.scene0.children.map(c => c.clone(true));

    for (const child of children) {
      child.traverse(node => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;
          const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
          if (mesh.material) {
            const original = mesh.material as THREE.MeshPhysicalMaterial;
            material.map = original.metalnessMap;
            if (!material.map) material.color = new THREE.Color().setScalar(original.metalness);
          } else {
            mesh.material = material;
          }
          mesh.material = material;
        }
      });
    }

    scene.children = children;
  }

  private ambientOcclusion(scene: THREE.Scene) {
    this.engineService.setPostProcessing(false);
    const children = this.scene0.children.map(c => c.clone(true));

    for (const child of children) {
      child.traverse(node => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;
          const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
          if (mesh.material) {
            const original = mesh.material as THREE.MeshPhysicalMaterial;
            material.map = original.aoMap;
            if (!material.map) material.color = new THREE.Color(0xffffff);
          } else {
            mesh.material = material;
          }
          mesh.material = material;
        }
      });
    }

    scene.children = children;
  }

  private clearCoat(scene: THREE.Scene) {
    this.engineService.setPostProcessing(false);
    const children = this.scene0.children.map(c => c.clone(true));

    for (const child of children) {
      child.traverse(node => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;
          const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
          if (mesh.material) {
            const original = mesh.material as THREE.MeshPhysicalMaterial;
            material.map = original.clearcoatMap;
            if (!material.map) material.color = new THREE.Color().setScalar(original.clearcoat);
          } else {
            mesh.material = material;
          }
          mesh.material = material;
        }
      });
    }

    scene.children = children;
  }

  private clearCoatRoughness(scene: THREE.Scene) {
    this.engineService.setPostProcessing(false);
    const children = this.scene0.children.map(c => c.clone(true));

    for (const child of children) {
      child.traverse(node => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;
          const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
          if (mesh.material) {
            const original = mesh.material as THREE.MeshPhysicalMaterial;
            material.map = original.clearcoatRoughnessMap;
            if (!material.map)
              material.color = new THREE.Color().setScalar(original.clearcoatRoughness);
          } else {
            mesh.material = material;
          }
          mesh.material = material;
        }
      });
    }

    scene.children = children;
  }

  private clearCoatNormal(scene: THREE.Scene) {
    this.engineService.setPostProcessing(false);
    const children = this.scene0.children.map(c => c.clone(true));

    for (const child of children) {
      child.traverse(node => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;
          const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
          if (mesh.material) {
            const original = mesh.material as THREE.MeshPhysicalMaterial;
            material.map = original.clearcoatNormalMap;
            if (!material.map) material.color = new THREE.Color(0x0000ff);
          } else {
            mesh.material = material;
          }
          mesh.material = material;
        }
      });
    }

    scene.children = children;
  }

  private light(scene: THREE.Scene) {
    this.engineService.setPostProcessing(false);
    const children = this.scene0.children.map(c => c.clone(true));

    for (const child of children) {
      child.traverse(node => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;
          const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
          if (mesh.material) {
            const original = mesh.material as THREE.MeshPhysicalMaterial;
            material.map = original.lightMap;
            if (!material.map) material.color = new THREE.Color(0x000000);
          } else {
            mesh.material = material;
          }
          mesh.material = material;
        }
      });
    }

    scene.children = children;
  }

  private emissive(scene: THREE.Scene) {
    // TODO factor in emissive intensity
    this.engineService.setPostProcessing(false);
    const children = this.scene0.children.map(c => c.clone(true));

    for (const child of children) {
      child.traverse(node => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;
          const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
          if (mesh.material) {
            const original = mesh.material as THREE.MeshPhysicalMaterial;
            material.map = original.emissiveMap;
            if (!material.map) material.color = new THREE.Color(0x000000);
          } else {
            mesh.material = material;
          }
          mesh.material = material;
        }
      });
    }

    scene.children = children;
  }

  private bump(scene: THREE.Scene) {
    this.engineService.setPostProcessing(false);
    const children = this.scene0.children.map(c => c.clone(true));

    for (const child of children) {
      child.traverse(node => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;
          const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
          if (mesh.material) {
            const original = mesh.material as THREE.MeshPhysicalMaterial;
            material.map = original.bumpMap;
            if (!material.map) material.color = new THREE.Color(0x000000);
          } else {
            mesh.material = material;
          }
          mesh.material = material;
        }
      });
    }

    scene.children = children;
  }

  private displacement(scene: THREE.Scene) {
    this.engineService.setPostProcessing(false);
    const children = this.scene0.children.map(c => c.clone(true));

    for (const child of children) {
      child.traverse(node => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;
          const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
          if (mesh.material) {
            const original = mesh.material as THREE.MeshPhysicalMaterial;
            material.map = original.displacementMap;
            if (!material.map) material.color = new THREE.Color(0x000000);
          } else {
            mesh.material = material;
          }
          mesh.material = material;
        }
      });
    }

    scene.children = children;
  }

  private alpha(scene: THREE.Scene) {
    this.engineService.setPostProcessing(false);
    const children = this.scene0.children.map(c => c.clone(true));

    for (const child of children) {
      child.traverse(node => {
        if ((node as any).isMesh) {
          const mesh = node as THREE.Mesh;
          const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
          if (mesh.material) {
            const original = mesh.material as THREE.MeshPhysicalMaterial;
            material.map = original.alphaMap;
            if (!material.map) material.color = new THREE.Color(0xffffff);
          } else {
            mesh.material = material;
          }
          mesh.material = material;
        }
      });
    }

    scene.children = children;
  }
}
