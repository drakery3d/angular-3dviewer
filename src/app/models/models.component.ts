import {HttpClient} from '@angular/common/http'
import {Component} from '@angular/core'

@Component({
  selector: 'app-models',
  templateUrl: './models.component.html',
  styleUrls: ['./models.component.sass'],
})
export class ModelsComponent {
  modelIds = []

  constructor(private httpClient: HttpClient) {
    this.httpClient.get('http://localhost:3000/models').subscribe((data: any) => {
      this.modelIds = data.modelIds
    })
  }
}
