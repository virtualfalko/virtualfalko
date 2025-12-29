import { Component, ElementRef, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

@Component({
  selector: 'app-three-viewer',
  templateUrl: './three-viewer.component.html',
  styleUrls: ['./three-viewer.component.css'],
  standalone: true
})
export class ThreeViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private sun1: THREE.Group | null = null;
  private sun2: THREE.Group | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private frameId: number = 0;

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

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);

    this.updateCamera(canvas);

    this.sun1 = await this.loadSun();
    this.sun2 = await this.loadSun();

    if (this.sun1 && this.sun2 && this.scene) {
      this.scene.add(this.sun1);
      this.scene.add(this.sun2);

      this.sun1.scale.setScalar(0.3);
      this.sun1.position.set(-0.6, 0.1, 0);

      this.sun2.scale.setScalar(0.3);
      this.sun2.position.set(0.6, 0.4, 0);
    }

    this.animate();
  }

  private updateCamera(canvas: HTMLCanvasElement): void {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const aspect = width / height;

    if (!this.camera) {
      const frustum = 1;
      if (aspect > 1) {
        this.camera = new THREE.OrthographicCamera(-frustum * aspect, frustum * aspect, frustum, -frustum, 0.1, 1000);
      } else {
        this.camera = new THREE.OrthographicCamera(-frustum, frustum, frustum / aspect, -frustum / aspect, 0.1, 1000);
      }
      this.camera.position.z = 5;
    } else {
      const frustum = 1;
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

  private loadSun(): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      new GLTFLoader().load(
        '/assets/models/sun.glb',
        (gltf) => {
          const sun = gltf.scene;

          // FIX: Add basic material if model doesn't have textures
          sun.traverse((child: any) => {
            if (child.isMesh) {
              // Add emissive material to make it glow
              if (!child.material.emissive) {
                child.material = new THREE.MeshStandardMaterial({
                  color: 0xffaa00,
                  emissive: 0xff8800,
                  emissiveIntensity: 0.5
                });
              }
            }
          });

          resolve(sun);
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  private resize(): void {
    const canvas = this.canvasRef.nativeElement;
    if (canvas && this.renderer) {
      this.updateCamera(canvas);
    }
  }

  private animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);

    if (this.sun1) {
      this.sun1.rotation.y += 0.0005;
      this.sun1.rotation.x += 0.0005;
    }

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
