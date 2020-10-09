import {HttpClient} from '@angular/common/http'
import {Component, ElementRef, ViewChild} from '@angular/core'
import {ActivatedRoute} from '@angular/router'
import * as THREE from 'three'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'

import {defaultState, EditorState} from '../../shared/editor'
import {EngineService} from './engine.service'

@Component({
  selector: 'app-editor',
  template: `
    <canvas
      #rendererCanvas
      id="renderCanvas"
      [class.grabbing]="grabbing"
      (mousedown)="onMouseDown()"
      (mouseup)="onMouseUp()"
    ></canvas>
    <div class="gui">
      <div>
        <div>
          <span>FOV</span>
          <input
            #fovSlider
            type="range"
            min="10"
            max="170"
            value="50"
            step="1"
            (input)="onFOV($event)"
          />
        </div>
        <button (click)="onSave()">Save</button>
      </div>
    </div>
  `,
  styles: [
    `
      .grabbing {
        cursor: grabbing;
      }

      .gui {
        position: fixed;
        top: 0;
        right: 0;
      }
    `,
  ],
})
export class EditorComponent {
  @ViewChild('rendererCanvas') renderCanvas: ElementRef<HTMLCanvasElement>
  @ViewChild('fovSlider') fovSlider: ElementRef<HTMLInputElement>
  grabbing = false
  scene: THREE.Scene
  loading = false
  state: EditorState = defaultState
  id: string

  constructor(
    private engineService: EngineService,
    private route: ActivatedRoute,
    private http: HttpClient,
  ) {}

  async ngAfterViewInit() {
    this.scene = await this.engineService.createScene(this.renderCanvas)
    this.engineService.animate()

    this.id = this.route.snapshot.paramMap.get('id')
    if (!this.id) return

    this.loading = true

    this.http.get('http://localhost:3000/editor/' + this.id).subscribe(settings => {
      this.state = settings as EditorState
      console.log(this.state)
    })

    const baseUrl = `http://localhost:3000/models/${this.id}/load`

    const loader = new GLTFLoader()
    loader.load(baseUrl, gltf => {
      this.scene.add(gltf.scene)
      this.loading = false

      const box = new THREE.Box3().setFromObject(this.scene)
      const size = box.getSize(new THREE.Vector3()).length()

      this.engineService.camera.near = size * 0.01
      this.engineService.camera.far = size * 10
      this.engineService.controls.maxDistance = size * Math.PI
      this.engineService.camera.updateProjectionMatrix()
      this.engineService.needsUpdate = true

      this.setupEditor()
    })
  }

  onFOV(event) {
    const value = event.path[0].value
    this.state.camera.fov = value
    this.engineService.camera.fov = value
    this.engineService.camera.updateProjectionMatrix()
    this.engineService.needsUpdate = true
  }

  onSave() {
    const target = new THREE.Vector3()
    this.engineService.controls.getTarget(target)
    const position = new THREE.Vector3()
    this.engineService.controls.getPosition(position)

    const payload: EditorState = {
      ...this.state,
      camera: {
        ...this.state.camera,
        position: {x: position.x, y: position.y, z: position.z},
        target: {x: target.x, y: target.y, z: target.z},
      },
    }

    console.log(payload)

    this.http.post('http://localhost:3000/editor/' + this.id, payload).subscribe()
  }

  onMouseDown() {
    this.grabbing = true
  }

  onMouseUp() {
    this.grabbing = false
  }

  private setupEditor() {
    this.engineService.camera.fov = this.state.camera.fov
    this.fovSlider.nativeElement.value = this.state.camera.fov as any

    const pos = this.state.camera.position
    const tar = this.state.camera.target
    if (pos && tar) {
      this.engineService.controls.setPosition(pos.x, pos.y, pos.z)
      this.engineService.controls.setTarget(tar.x, tar.y, tar.z)
    } else {
      const box = new THREE.Box3().setFromObject(this.scene)
      const size = box.getSize(new THREE.Vector3()).length()
      this.engineService.controls.setPosition(0, 0, size * 5)
      this.engineService.controls.rotateTo(0, Math.PI * 0.5, false)
      this.engineService.controls.fitToBox(this.scene, true)
    }

    this.engineService.camera.updateProjectionMatrix()
    this.engineService.needsUpdate = true
  }
}
