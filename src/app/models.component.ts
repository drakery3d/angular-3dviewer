import {HttpClient} from '@angular/common/http'
import {Component} from '@angular/core'

@Component({
  selector: 'app-models',
  template: `<a routerLink="/upload"><button>Upload a model</button> </a>
    <div class="card" *ngFor="let id of modelIds">
      <span>{{ id }}</span>
      <a routerLink="/viewer/{{ id }}">view</a>
      <a routerLink="/editor/{{ id }}">edit</a>
    </div> `,
  styles: [
    `
      .card {
        padding: 10px;
      }

      a {
        margin: 0 10px;
      }
    `,
  ],
})
export class ModelsComponent {
  modelIds = []

  constructor(private httpClient: HttpClient) {
    this.httpClient.get('http://localhost:3000/models').subscribe((data: any) => {
      this.modelIds = data.modelIds
    })
  }
}
