import {Injectable, ElementRef, NgZone, OnDestroy} from '@angular/core'
import * as THREE from 'three'
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader'
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass'
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import {SSAOPass} from 'three/examples/jsm/postprocessing/SSAOPass'
import CameraControls from 'camera-controls'

CameraControls.install({THREE: THREE})

@Injectable()
export class EngineService implements OnDestroy {
  controls: CameraControls
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  bloomPass: UnrealBloomPass
  ssaoPass: SSAOPass
  needsUpdate = false

  private clock = new THREE.Clock()
  private canvas: HTMLCanvasElement
  private composer: EffectComposer
  private frameId: number
  private enablePostProcessing = true
  private renderTarget: THREE.WebGLMultisampleRenderTarget
  private renderPass: RenderPass

  constructor(private ngZone: NgZone) {}

  ngOnDestroy() {
    if (this.frameId != null) cancelAnimationFrame(this.frameId)
    this.renderer.clippingPlanes
  }

  async createScene(canvas: ElementRef<HTMLCanvasElement>) {
    window.addEventListener('resize', () => this.resize())

    const width = window.innerWidth
    const height = window.innerHeight
    this.canvas = canvas.nativeElement

    this.renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias: true})
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.shadowMap.autoUpdate = true
    // this.renderer.toneMapping = THREE.ReinhardToneMapping;
    // this.renderer.toneMappingExposure = 2.2;
    this.renderer.outputEncoding = THREE.sRGBEncoding
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)

    const scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(
      30,
      this.canvas.offsetWidth / this.canvas.offsetHeight,
      0.001,
      1000,
    )
    scene.add(this.camera)

    this.controls = new CameraControls(this.camera, this.renderer.domElement)
    this.controls.polarRotateSpeed = 3
    this.controls.dollySpeed = 2
    this.controls.truckSpeed = 3
    this.controls.dampingFactor = 0.2
    this.controls.draggingDampingFactor = 0.15
    this.controls.mouseButtons.middle = CameraControls.ACTION.TRUCK

    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2())
    /**
     * TODO don't use multisampling on low-end devices, because of performane
     * https://youtu.be/pFKalA-fd34
     *
     * TODO we can't use msaa on browsers, that don't support webgl2
     * caniuse.com/#search=webgl2
     */
    this.renderTarget = new THREE.WebGLMultisampleRenderTarget(size.width, size.height, {
      format: THREE.RGBFormat,
      stencilBuffer: false,
    })
    this.composer = new EffectComposer(this.renderer, this.renderTarget)
    this.renderPass = new RenderPass(scene, this.camera)
    this.ssaoPass = new SSAOPass(scene, this.camera, width, height)
    this.ssaoPass.kernelRadius = 16
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.1, 0.4, 0.85)
    this.composer.addPass(this.renderPass)

    // TODO rotate env and adjust exposure
    /**
     * TODO blur background (no native solution)
     * https://discourse.threejs.org/t/how-to-blur-a-background/8558/20
     * we probably have to prerender blurred hdris
     */
    const [blurry, sharp] = await Promise.all([
      this.loadEnvMap('assets/studio_small_03_1k_blur.hdr'),
      this.loadEnvMap('assets/studio_small_03_1k.hdr'),
    ])
    scene.background = blurry
    scene.environment = sharp

    this.needsUpdate = true

    return scene
  }

  setPostProcessing(enabled: boolean) {
    if (this.enablePostProcessing === enabled) return
    this.enablePostProcessing = enabled
    if (enabled) {
      this.composer.addPass(this.renderPass)
      // this.composer.addPass(this.ssaoPass); // TODO this changes the way the helmet looks
      this.composer.addPass(this.bloomPass)
    } else {
      this.composer.passes = [this.renderPass]
    }
  }

  animate() {
    this.ngZone.runOutsideAngular(() => {
      const delta = this.clock.getDelta()
      const hasControlsUpdated = this.controls.update(delta)

      this.frameId = requestAnimationFrame(() => this.animate())
      if (hasControlsUpdated || this.needsUpdate) {
        this.composer.render()
        this.needsUpdate = false
      }
    })
  }

  private resize() {
    // TODO what to run outside angular?
    this.ngZone.runOutsideAngular(() => {
      const width = window.innerWidth
      const height = window.innerHeight

      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()

      if (this.enablePostProcessing) {
        this.bloomPass.setSize(width, height)
        this.ssaoPass.setSize(width, height)
      }
      this.renderer.setSize(width, height)
      this.composer.setSize(width, height)

      this.needsUpdate = true
    })
  }

  private async loadEnvMap(path: string) {
    const texture = await new RGBELoader().loadAsync(path)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer)
    pmremGenerator.compileEquirectangularShader()
    const envMap = pmremGenerator.fromEquirectangular(texture).texture
    pmremGenerator.dispose()
    return envMap
  }
}
