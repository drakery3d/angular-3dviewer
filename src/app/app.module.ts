import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {ViewerComponent} from './viewer.component';
import {FullscreenService} from './fullscreen.service';
import {EngineService} from './engine.service';
import {InspectorGuiComnponent} from './inspector-gui.component';
import {InspectorService} from './inspector.service';
import {SceneService} from './scene.service';
import {LoaderService} from './loader.service';
import {OBJParserService} from './obj-parser';
import {DropZoneDirective} from './dropzone.directive';
import {FullscreenDropzone} from './fullscreen-dropzone.component';

@NgModule({
  declarations: [
    AppComponent,
    ViewerComponent,
    InspectorGuiComnponent,
    DropZoneDirective,
    FullscreenDropzone,
  ],
  imports: [BrowserModule],
  providers: [
    FullscreenService,
    EngineService,
    InspectorService,
    SceneService,
    LoaderService,
    OBJParserService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
