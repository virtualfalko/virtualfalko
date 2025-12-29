import { Component, ElementRef, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { SunObject } from '../objects/sun.object';
import { Sun2Object } from '../objects/sun2.object';

@Component({
  selector: 'app-three-viewer',
  templateUrl: './three-viewer.component.html',
  styleUrls: ['./three-viewer.component.css'],
  standalone: true
})
export class ThreeViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private scene: THREE.Scene | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private frameId: number = 0;

  private sun1 = new SunObject({ x: -0.6, y: 0.1, z: 0 }, 0.3);
  private sun2 = new Sun2Object({ x: 0.6, y: 0.4, z: 0 }, 0.3);

  async ngAfterViewInit(): Promise<void> {
    await this.init();
    window.addEventListener('resize', () => this.resize());
  }

  private async init(): Promise<void> {
    const canvas = this.canvasRef.nativeElement;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();

    // IMPORTANT: Add proper lighting for materials to show
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);

    this.updateCamera(canvas);

    const sun1Model = await this.sun1.load();
    const sun2Model = await this.sun2.load();

    if (sun1Model && sun2Model && this.scene) {
      this.scene.add(sun1Model);
      this.scene.add(sun2Model);
    }

    this.animate();
  }

  private updateCamera(canvas: HTMLCanvasElement): void {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const aspect = width / height;
    const frustum = 1;

    if (!this.camera) {
      if (aspect > 1) {
        this.camera = new THREE.OrthographicCamera(-frustum * aspect, frustum * aspect, frustum, -frustum, 0.1, 1000);
      } else {
        this.camera = new THREE.OrthographicCamera(-frustum, frustum, frustum / aspect, -frustum / aspect, 0.1, 1000);
      }
      this.camera.position.z = 5;
    } else {
      if (aspect > 1) {
        this.camera.left = -frustum * aspect;
        this.camera.right = frustum * aspect;
        this.camera.top = frustum;
        this.camera.bottom = -frustum;
      } else {
        this.camera.left = -frustum;
        this.camera.right = frustum;
        this.camera.top = frustum / aspect;
        this.camera.bottom = -frustum / aspect;
      }
      this.camera.updateProjectionMatrix();
    }

    if (this.renderer) {
      this.renderer.setSize(width, height, false);
    }
  }

  private resize(): void {
    const canvas = this.canvasRef.nativeElement;
    if (canvas && this.renderer) {
      this.updateCamera(canvas);
    }
  }

  private animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);

    this.sun1.update();
    this.sun2.update();

    if (this.scene && this.camera && this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', () => this.resize());
    this.renderer?.dispose();
  }
}
