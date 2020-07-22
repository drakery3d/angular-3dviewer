import {Component, Output, EventEmitter, Input} from '@angular/core';

// TODO only show map modes, which are available
@Component({
  selector: 'app-inspector-gui',
  template: `
    <div class="container">
      <div
        *ngFor="let mode of modes"
        class="mode"
        [class.selected]="selected === mode"
        (click)="onClick(mode)"
      >
        {{ mode }}
      </div>
      <div
        *ngFor="let mode of shaderModes"
        class="mode"
        [class.selected]="selected === mode"
        (click)="onClick(mode)"
      >
        {{ mode }}
      </div>
    </div>
  `,
  styles: [
    `
      .container {
        overflow-y: scroll;
      }
      .mode {
        padding: 6px 10px;
        cursor: pointer;
      }
      .selected {
        background: #eeeeee;
      }
    `,
  ],
})
export class InspectorGuiComnponent {
  @Input() selected: string;

  @Output() modeChanged = new EventEmitter<string>();

  modes = ['full', 'full_no_post', 'wireframe', 'vertices', 'vertex_normals', 'mesh'];
  shaderModes = [
    'albedo',
    'normal',
    'bump',
    'specular',
    'roughness',
    'metalness',
    'ambient_occlusion',
    'clear_coat',
    'clear_coat_roughness',
    'clear_coat_normal',
    'alpha',
    'light',
    'displacement',
    'emissive',
  ];

  onClick(mode: string) {
    this.modeChanged.emit(mode);
  }
}
