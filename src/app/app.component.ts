import { Component } from '@angular/core';
import { ThreeViewerComponent } from './components/three-viewer/three-viewer.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [ThreeViewerComponent],
  standalone: true
})
export class AppComponent {}
