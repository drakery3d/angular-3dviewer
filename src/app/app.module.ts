import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {ViewerComponent} from './viewer.component';
import {FullscreenService} from './fullscreen.service';
import {EngineService} from './engine.service';
import {InspectorGuiComnponent} from './inspector-gui.component';
import {InspectorService} from './inspector.service';
import {LoaderService} from './loader.service';
import {OBJParserService} from './obj-parser';
import {FullscreenDropzone} from './fullscreen-dropzone.component';
import {EditorComponent} from './editor.component';

@NgModule({
  declarations: [
    AppComponent,
    ViewerComponent,
    InspectorGuiComnponent,
    FullscreenDropzone,
    EditorComponent,
  ],
  imports: [BrowserModule],
  providers: [FullscreenService, EngineService, InspectorService, LoaderService, OBJParserService],
  bootstrap: [AppComponent],
})
export class AppModule {}
