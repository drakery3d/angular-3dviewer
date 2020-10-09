import {Component, ViewChild, ElementRef, AfterViewInit, HostListener} from '@angular/core'
import {ActivatedRoute} from '@angular/router'
import * as THREE from 'three'
import {GLTFLoader, GLTF} from 'three/examples/jsm/loaders/GLTFLoader'

import {EngineService} from './engine.service'
import {FullscreenService} from './fullscreen.service'
import {InspectorService} from './inspector.service'
import {LoaderService} from './loader.service'

enum Keys {
  F = 102,
  R = 114,
}
// TODO 2d texture viewer
// TODO performance optimizations (e.g. don't render on still frame)
// TODO handle unsupported browsers / devices
// TODO consider 3d loading spinner
// TODO consider adding someting when notion is looded yet
// TODO look at this debug inspector for inspiration https://www.babylonjs.com/demos/pbrglossy/
// TODO graphics settings (quality)
// TODO sharpness
// TODO dof https://threejs.org/examples/#webgl_postprocessing_dof2
// TODO nodes https://threejs.org/examples/?q=post#webgl_postprocessing_nodes
// TODO higher fov while zooming in
// TODO loading bar
// TODO load over the wire
// TODO encrypt model
// TODO quick buttons for top,bottom, etc view https://user-images.githubusercontent.com/232036/30819012-f97e7cac-a1e2-11e7-89d9-229fb802b6cc.gif
// TODO view boundary https://yomotsu.github.io/camera-controls/examples/boundary.html
// TODO https://twitter.com/jackrugile/status/966440290885156864
// https://discourse.threejs.org/t/is-it-possible-to-reduce-memory-consumption-with-new-gltf-format/3552/4?u=flolo
// TODO validate gltf https://github.com/KhronosGroup/glTF-Validator
// TODO support .zip files
// TODO support blender files
// TODO animations

@Component({
  selector: 'app-viewer',
  template: `
    <app-fullscreen-dropzone (filesAdded)="onFiles($event)"></app-fullscreen-dropzone>
    <div class="container">
      <div *ngIf="loading">Loading...</div>
      <div class="ui" *ngIf="scene">
        <app-inspector-gui
          [selected]="inspectorService.mode"
          (modeChanged)="onModeChanged($event)"
        ></app-inspector-gui>
      </div>
      <div class="wrapper">
        <canvas
          #rendererCanvas
          id="renderCanvas"
          [class.grabbing]="grabbing"
          (dblclick)="onDoubleClick($event)"
          (mousedown)="onMouseDown()"
          (mouseup)="onMouseUp()"
        ></canvas>
      </div>
    </div>
  `,
  styles: [
    `
      .container {
        position: relative;
      }
      .ui {
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.75);
      }

      canvas {
        cursor: grab;
      }
      .grabbing {
        cursor: grabbing;
      }
    `,
  ],
})
export class ViewerComponent implements AfterViewInit {
  @ViewChild('rendererCanvas') renderCanvas: ElementRef<HTMLCanvasElement>
  grabbing = false
  scene: THREE.Scene
  loading = false

  constructor(
    public inspectorService: InspectorService,
    private engineService: EngineService,
    private fullscreenService: FullscreenService,
    private loaderService: LoaderService,
    private route: ActivatedRoute,
  ) {}

  async ngAfterViewInit() {
    this.scene = await this.engineService.createScene(this.renderCanvas)
    this.engineService.animate()

    const id = this.route.snapshot.paramMap.get('id')
    if (!id) return

    this.loading = true

    const baseUrl = `http://localhost:3000/models/${id}/load`

    const loader = new GLTFLoader()
    loader.load(baseUrl, gltf => {
      this.clear()

      this.scene.add(gltf.scene)
      this.loading = false
      this.inspectorService.clear()

      const box = new THREE.Box3().setFromObject(this.scene)
      const size = box.getSize(new THREE.Vector3()).length()

      this.engineService.camera.near = size * 0.01
      this.engineService.camera.far = size * 10
      this.engineService.camera.updateProjectionMatrix()
      this.engineService.controls.maxDistance = size * Math.PI
      this.engineService.controls.setPosition(0, 0, size * 5)
      this.engineService.controls.rotateTo(0, Math.PI * 0.5, false)
      this.engineService.controls.fitToBox(this.scene, true)
    })
  }

  @HostListener('document:keypress', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.keyCode === Keys.R) this.engineService.controls.fitToBox(this.scene, true)
    if (event.keyCode === Keys.F) this.fullscreenService.toggle()
  }

  async onFiles(files: Map<string, File>) {
    const fileExtensions = {gltf: 'gltf', glb: 'glb'}
    const extensions = Array.from(files.keys()).map(path => path.split('.').pop())

    if (extensions.includes(fileExtensions.gltf) || extensions.includes(fileExtensions.glb)) {
      let root: File = undefined
      let rootPath: string
      files.forEach(file => {
        const extension = file.name.split('.').pop()
        if (extension === fileExtensions.gltf || extension === fileExtensions.glb) {
          if (root !== undefined)
            console.warn('Mutliple gltf files are not supported. Only one will be loaded!')
          root = file
          const path: string = (file as any).path || ''
          rootPath = path.replace(file.name, '')
        }
      })
      const {scene, animations} = await this.loaderService.loadGltf(root, rootPath, files)
      this.clear()

      this.scene.add(scene)
      this.inspectorService.clear()

      const box = new THREE.Box3().setFromObject(this.scene)
      const size = box.getSize(new THREE.Vector3()).length()

      this.engineService.camera.near = size * 0.01
      this.engineService.camera.far = size * 10
      this.engineService.camera.updateProjectionMatrix()
      // TODO also prevent panning to far away!
      this.engineService.controls.maxDistance = size * Math.PI
      // this.engineService.controls.boundaryEnclosesCamera = true;
      // this.engineService.controls.setBoundary(box.expandByScalar(10));
      this.engineService.controls.setPosition(0, 0, size * 5)
      this.engineService.controls.rotateTo(0, Math.PI * 0.5, false)
      this.engineService.controls.fitTo(this.scene, true)
    }
  }

  onMouseDown() {
    this.grabbing = true
  }

  onMouseUp() {
    this.grabbing = false
  }

  onDoubleClick(event) {
    if (!this.scene) return

    const x = (event.clientX / window.innerWidth) * 2 - 1
    const y = -(event.clientY / window.innerHeight) * 2 + 1
    const point = new THREE.Vector2(x, y)

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(point, this.engineService.camera)
    let intersects = []
    raycaster.intersectObject(this.scene, true, intersects)
    if (!intersects.length) return

    let min
    for (const i of intersects) {
      if (!min || i.distance < min.distance) min = i
    }
    this.engineService.controls.setTarget(min.point.x, min.point.y, min.point.z, true)
    this.engineService.controls.dolly(min.distance / 2, true)
  }

  onModeChanged(mode: string) {
    if (!this.inspectorService.initialized) this.inspectorService.initialize(this.scene)
    this.inspectorService.changeMode(mode, this.scene)
  }

  private clear() {
    this.scene.remove(...this.scene.children)
    this.inspectorService.clear()
  }
}
