import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';

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

import {UploadComponent} from './upload/upload.component';
import {ModelsComponent} from './models/models.component';

@NgModule({
  declarations: [
    AppComponent,
    ViewerComponent,
    InspectorGuiComnponent,
    FullscreenDropzone,
    EditorComponent,
    UploadComponent,
    ModelsComponent,
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot([
      {path: 'upload', component: UploadComponent},
      {path: 'viewer', component: ViewerComponent},
      {path: 'models', component: ModelsComponent},
      {path: '', redirectTo: '/models', pathMatch: 'full'},
    ]),
  ],
  providers: [FullscreenService, EngineService, InspectorService, LoaderService, OBJParserService],
  bootstrap: [AppComponent],
})
export class AppModule {}
