import {Component, Output, EventEmitter, HostListener} from '@angular/core';

@Component({
  selector: 'app-fullscreen-dropzone',
  template: `
    <div
      class="dropzone"
      [class.show]="dragging"
      (dragover)="onDragOver($event)"
      (drop)="onDrop($event)"
      (dragleave)="onDragLeave()"
    ></div>
    <input type="file" multiple (change)="filesSelected($event.target.files)" />
  `,
  styles: [
    `
      .dropzone {
        display: none;
        box-sizing: border-box;
        display: none;
        position: fixed;
        width: 100%;
        height: 100%;
        left: 0;
        top: 0;
        z-index: 1;
        background: rgba(86, 200, 96, 0.25);
        border: 6px dashed #56c860;
        padding: 10px;
      }

      .show {
        display: block;
      }

      input {
        position: fixed;
        left: 0;
        bottom: 0;
        z-index: 2;
      }
    `,
  ],
})
export class FullscreenDropzone {
  @Output() filesAdded = new EventEmitter<File[]>();

  dragging = false;

  @HostListener('window:dragenter')
  onWindowDragEnter() {
    this.dragging = true;
  }

  filesSelected(event: FileList) {
    const files = Array.from(event);
    this.filesAdded.emit(files);
  }

  onDragOver(event) {
    this.allowDrag(event);
  }

  onDragLeave() {
    this.dragging = false;
  }

  async onDrop(event) {
    event.preventDefault();
    this.dragging = false;
    const items = event.dataTransfer.items;
    const files = await this.getFiles(items);
    this.filesAdded.emit(files);
  }

  private allowDrag(event) {
    event.dataTransfer.dropEffect = 'copy';
    event.preventDefault();
  }

  private async getFiles(dataTransferItems: any): Promise<File[]> {
    let files: File[] = [];
    let entriesPromises = [];
    for (let it of dataTransferItems) {
      entriesPromises.push(this.traverseFileTree(it.webkitGetAsEntry(), '', files));
    }
    await Promise.all(entriesPromises);
    return files;
  }

  private traverseFileTree(item: any, path: string, files: File[]) {
    return new Promise(resolve => {
      if (item.isFile) {
        item.file(file => {
          file.path = path + file.name;
          files.push(file);
          resolve(file);
        });
      }

      if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries(entries => {
          let entriesPromises = [];
          for (let entr of entries)
            entriesPromises.push(this.traverseFileTree(entr, path + item.name + '/', files));
          resolve(Promise.all(entriesPromises));
        });
      }
    });
  }
}
