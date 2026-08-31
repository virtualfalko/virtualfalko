import { Component, ElementRef, AfterViewInit, OnDestroy, ViewChild, Output } from '@angular/core';
import * as THREE from 'three';
import { SunObject } from '../objects/sun.object';

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
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private sun1 = new SunObject();

  async ngAfterViewInit(): Promise<void> {
    await this.init();
    window.addEventListener('resize', () => this.resize());
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const canvas = this.canvasRef.nativeElement;

    canvas.addEventListener('click', (event) => {
      this.onCanvasClick(event);
    });

    canvas.addEventListener('mousedown', (event) => {
    });
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

    this.setupLights();
    this.updateCamera(canvas);

    await this.loadAndAddObjects();

    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene!.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 10, 10);
    this.scene!.add(directionalLight);
  }

  private async loadAndAddObjects(): Promise<void> {
    const objects = await Promise.all([
      this.sun1.load()
    ]);

    if (objects.every(obj => obj) && this.scene) {
      objects.forEach(model => {
        this.scene!.add(model!);
      });
    }
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
    }

    this.camera.updateProjectionMatrix();

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

  private onCanvasClick(event: MouseEvent): void {

    if (!this.scene || !this.camera) {
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
    const y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

    this.mouse.set(x, y);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
    }

    for (const intersect of intersects) {
      const object = intersect.object;

      if (object.userData['clickable'] && object.userData['object']) {
        const targetObject = object.userData['object'];

        if (targetObject instanceof SunObject) {
          targetObject.handleClick();
          return;
        }
      }
    }
  }

  private animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);

    this.sun1.update();

    if (this.scene && this.camera && this.renderer) {
      this.renderer.sortObjects = false;
      this.renderer.render(this.scene, this.camera);
    }
  };

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', () => this.resize());
    this.renderer?.dispose();
  }
}
