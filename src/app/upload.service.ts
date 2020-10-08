import {Injectable} from '@angular/core'
import {HttpClient} from '@angular/common/http'

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  constructor(private httpClient: HttpClient) {}

  public upload(formData) {
    return this.httpClient.post<any>('http://localhost:3000/upload', formData, {
      reportProgress: true,
      observe: 'events',
    })
  }
}
