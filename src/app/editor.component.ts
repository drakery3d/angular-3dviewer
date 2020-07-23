import {Component} from '@angular/core';

import {EngineService} from './engine.service';

@Component({
  selector: 'app-editor',
  template: `
    <div class="gui">
      <div>
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
        <div>
          <span>ssao</span>
          <input
            type="range"
            min="0"
            max="32"
            value="16"
            step="1"
            (change)="onSSAOChange($event)"
          />
        </div>
      </div>
    </div>
  `,
  styles: [``],
})
export class EditorComponent {
  constructor(private engineService: EngineService) {}

  toggleFullScreen() {}

  onBloomChange(event) {
    this.engineService.bloomPass.strength = event.path[0].value;
  }

  onSSAOChange(event) {
    this.engineService.ssaoPass.kernelRadius = event.path[0].value;
  }
}
