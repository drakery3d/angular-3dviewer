import {Component} from '@angular/core'

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

    this.uploadService.upload(formData).subscribe((event: any) => {
      const {modelId} = event
    })
  }
}
