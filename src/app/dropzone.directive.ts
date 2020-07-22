import {Directive, EventEmitter, HostListener, Output} from '@angular/core';

@Directive({selector: '[dropZone]'})
export class DropZoneDirective {
  @Output() dropped = new EventEmitter<Promise<File[]>>();
  @Output() hovered = new EventEmitter<boolean>();

  @HostListener('drop', ['$event'])
  onDrop(event) {
    event.preventDefault();

    const items = event.dataTransfer.items;
    const files = this.getFilesFromWebkitDataTransferItems(items);

    this.dropped.emit(files);
    this.hovered.emit(false);
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event) {
    event.preventDefault();
    this.hovered.emit(true);
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event) {
    event.preventDefault();
    this.hovered.emit(false);
  }

  private getFilesFromWebkitDataTransferItems(dataTransferItems): Promise<File[]> {
    function traverseFileTreePromise(item, path = '') {
      return new Promise(resolve => {
        if (item.isFile) {
          item.file(file => {
            file.filepath = path + file.name; //save full path
            files.push(file);
            resolve(file);
          });
        } else if (item.isDirectory) {
          let dirReader = item.createReader();
          dirReader.readEntries(entries => {
            let entriesPromises = [];
            for (let entr of entries)
              entriesPromises.push(traverseFileTreePromise(entr, path + item.name + '/'));
            resolve(Promise.all(entriesPromises));
          });
        }
      });
    }

    let files = [];
    return new Promise((resolve, reject) => {
      let entriesPromises = [];
      for (let it of dataTransferItems)
        entriesPromises.push(traverseFileTreePromise(it.webkitGetAsEntry()));
      Promise.all(entriesPromises).then(entries => {
        //console.log(entries)
        resolve(files);
      });
    });
  }
}
