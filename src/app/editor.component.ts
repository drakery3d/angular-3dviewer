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
      this.setupEditor()
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
      this.engineService.camera.updateProjectionMatrix()
      this.engineService.controls.maxDistance = size * Math.PI
      this.engineService.controls.setPosition(0, 0, size * 5)
      this.engineService.controls.rotateTo(0, Math.PI * 0.5, false)
      this.engineService.controls.fitToBox(this.scene, true)
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
    console.log(this.state)
    this.http.post('http://localhost:3000/editor/' + this.id, this.state).subscribe()
  }

  onMouseDown() {
    this.grabbing = true
  }

  onMouseUp() {
    this.grabbing = false
  }

  private setupEditor() {
    this.engineService.camera.fov = this.state.camera.fov
    this.engineService.camera.updateProjectionMatrix()
    this.engineService.needsUpdate = true
    this.fovSlider.nativeElement.value = this.state.camera.fov as any
  }
}
