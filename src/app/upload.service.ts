import {Injectable} from '@angular/core'
import {HttpClient} from '@angular/common/http'

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  constructor(private httpClient: HttpClient) {}

  public upload(formData) {
    return this.httpClient.post('http://localhost:3000/upload', formData)
  }
}
