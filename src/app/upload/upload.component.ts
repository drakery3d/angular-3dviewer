import {Component} from '@angular/core'
import {Router} from '@angular/router'

import {UploadService} from '../upload.service'

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.sass'],
})
export class UploadComponent {
  constructor(private uploadService: UploadService, private router: Router) {}

  onFiles(files: Map<string, File>) {
    const formData = new FormData()

    files.forEach(file => formData.append('files', file))

    this.uploadService.upload(formData).subscribe((event: any) => {
      const {modelId} = event
      this.router.navigate(['viewer', modelId])
    })
  }
}
