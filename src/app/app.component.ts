import { Component } from '@angular/core';
import { ThreeViewerComponent } from './components/three-viewer/three-viewer.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [ThreeViewerComponent, CommonModule],
  standalone: true
})
export class AppComponent {
  isTvZoomed: boolean = false;
  onTvZoomChanged = (zoomed: boolean) => this.isTvZoomed = zoomed;
}
