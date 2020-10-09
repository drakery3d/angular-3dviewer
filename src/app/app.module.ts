import {BrowserModule} from '@angular/platform-browser'
import {NgModule} from '@angular/core'
import {RouterModule} from '@angular/router'
import {HttpClientModule} from '@angular/common/http'

import {AppComponent} from './app.component'
import {ViewerComponent} from './viewer.component'
import {FullscreenService} from './fullscreen.service'
import {EngineService} from './engine.service'
import {InspectorGuiComnponent} from './inspector-gui.component'
import {InspectorService} from './inspector.service'
import {LoaderService} from './loader.service'
import {OBJParserService} from './obj-parser'
import {FullscreenDropzone} from './fullscreen-dropzone.component'
import {EditorComponent} from './editor.component'
import {UploadComponent} from './upload/upload.component'
import {ModelsComponent} from './models.component'
import {UploadService} from './upload.service'

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
    HttpClientModule,
    RouterModule.forRoot([
      {path: 'upload', component: UploadComponent},
      {path: 'viewer/:id', component: ViewerComponent},
      {path: 'models', component: ModelsComponent},
      {path: 'editor/:id', component: EditorComponent},
      {path: '', redirectTo: '/models', pathMatch: 'full'},
    ]),
  ],
  providers: [
    FullscreenService,
    EngineService,
    InspectorService,
    LoaderService,
    OBJParserService,
    UploadService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
