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
  currentYear = new Date().getFullYear();

  showAbout: boolean = false;

  toggleAbout() {
    this.showAbout = !this.showAbout;
  }
}
