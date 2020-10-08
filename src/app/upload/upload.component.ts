import {HttpErrorResponse} from '@angular/common/http'
import {Component} from '@angular/core'
import {of} from 'rxjs'
import {catchError} from 'rxjs/operators'

import {UploadService} from '../upload.service'

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.sass'],
})
export class UploadComponent {
  constructor(private uploadService: UploadService) {}

  onFiles(files: Map<string, File>) {
    const file: any = Array.from(files)[0][1]

    const formData = new FormData()
    formData.append('file', file)

    this.uploadService
      .upload(formData)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          file.inProgress = false
          return of(`${file.data.name} upload failed.`)
        }),
      )
      .subscribe((event: any) => {
        if (typeof event === 'object') {
          console.log(event.body)
        }
      })
  }
}
