import {Injectable} from '@angular/core';
import * as THREE from 'three';

@Injectable()
export class OBJParserService {
  points: THREE.Vector3[] = [];
  indices: number[] = [];

  // TODO this doesn't work on all obj's
  // https://i.imgur.com/EH8EH0M.png
  parse(content: string) {
    let buffer = new Array(128);

    let bufferPointer = 0;
    let slashesCount = 0;
    let word = '';
    let currentByte = 0;

    for (let char; currentByte < content.length; currentByte++) {
      char = content[currentByte];
      switch (char) {
        case ' ':
          if (word.length > 0) buffer[bufferPointer++] = word;
          word = '';
          break;
        case '/':
          if (word.length > 0) buffer[bufferPointer++] = word;
          slashesCount++;
          word = '';
          break;
        case '\n':
          this.parseLine(buffer, bufferPointer, slashesCount, word, currentByte);
          word = '';
          bufferPointer = 0;
          slashesCount = 0;
          break;
        case '\r':
          break;
        default:
          word += char;
      }
    }
  }

  reset() {
    this.indices = [];
    this.points = [];
  }

  private parseLine(
    buffer: any[],
    bufferPointer: number,
    slashesCount: number,
    word: string,
    currentByte: number,
  ) {
    if (bufferPointer < 1) return;
    if (word.length > 0) buffer[bufferPointer++] = word;
    let bufferLength, length, i, lineDesignation;
    lineDesignation = buffer[0];

    switch (lineDesignation) {
      case 'v':
        this.points.push(new THREE.Vector3(buffer[1], buffer[2], buffer[3]));
        break;
      case 'f':
        // TODO this is incomplete
        bufferLength = bufferPointer - 1;
        if (slashesCount === 0) {
          // "f vertex ..."
          for (let i = 1; i < buffer.length; i++) {
            if (buffer[i] === undefined) break;
            this.indices.push(buffer[i] - 1);
          }
        } else if (bufferLength === slashesCount * 2) {
          // "f vertex/uv ..."
          for (let i = 1; i < buffer.length; i += 2) {
            if (buffer[i] === undefined) break;
            this.indices.push(buffer[i] - 1);
          }
        } else if (bufferLength * 2 === slashesCount * 3) {
          // "f vertex/uv/normal ..."
          for (let i = 1; i < buffer.length; i += 3) {
            if (buffer[i] === undefined) break;
            this.indices.push(buffer[i] - 1);
          }
        } else {
          // "f vertex//normal ..."
          for (let i = 1; i < buffer.length; i += 2) {
            if (buffer[i] === undefined) break;
            this.indices.push(buffer[i] - 1);
          }
        }

        break;
    }
  }
}
