import {Component} from '@angular/core'
import {Router} from '@angular/router'

@Component({
  selector: 'app-root',
  template: `
    <div class="nav">
      <button (click)="onModels()">Models</button>
      <button (click)="onUpload()">Upload</button>
    </div>
    <router-outlet></router-outlet>
  `,
  styles: [
    `
      .nav {
        position: fixed;
        bottom: 0;
        right: 0;
        z-index: 100000;
      }
    `,
  ],
})
export class AppComponent {
  constructor(private router: Router) {}

  onModels() {
    this.router.navigate(['models'])
  }
  onUpload() {
    this.router.navigate(['upload'])
  }
}
