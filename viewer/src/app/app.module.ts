import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {ViewerComponent} from './viewer.component';
import {FullscreenService} from './fullscreen.service';
import {EngineService} from './engine.service';

@NgModule({
  declarations: [AppComponent, ViewerComponent],
  imports: [BrowserModule],
  providers: [FullscreenService, EngineService],
  bootstrap: [AppComponent],
})
export class AppModule {}
