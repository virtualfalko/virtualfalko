import { Component, ElementRef, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import { ThreeEngineService } from '../../services/three-engine.service';
import { SceneManagerService } from '../../services/scene-manager.service';
import { CameraControlsService } from '../../services/camera-controls.service';
import { ModelLoaderService } from '../../services/model-loader.service';
import * as THREE from 'three';

@Component({
  selector: 'app-three-viewer',
  templateUrl: './three-viewer.component.html',
  styleUrls: ['./three-viewer.component.css'],
  standalone: true
})
export class ThreeViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private animationFrameId!: number;

  constructor(
    private threeEngine: ThreeEngineService,
    private sceneManager: SceneManagerService,
    private cameraControls: CameraControlsService,
    private modelLoader: ModelLoaderService
  ) {}

  async ngAfterViewInit(): Promise<void> {
    await this.initializeThreeJS();
    this.setupResizeObserver();
  }

  private async initializeThreeJS(): Promise<void> {
    const canvas = this.canvasRef.nativeElement;

    // 1. Initialize core engine
    this.threeEngine.initialize(canvas);

    // 2. Create scene with lighting
    const scene = this.sceneManager.createScene(); // Don't pass color
    this.sceneManager.addBasicLighting();

    // 3. Create camera
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const camera = this.cameraControls.createCamera(aspect, {
      fov: 60,
      position: { x: 0, y: 0, z: 5 }
    });

    // 4. Setup controls
    const renderer = this.threeEngine.getRenderer();
    this.cameraControls.setupControls(renderer);

    // 5. Load model
    try {
      const model = await this.modelLoader.loadGLTF('/assets/models/sun.glb', {
        scale: 2.5,
        position: { x: 0, y: 0, z: 0 }
      });
      scene.add(model);
    } catch (error) {
      console.log('Using fallback cube');
      const cube = this.modelLoader.createFallbackCube();
      scene.add(cube);
    }

    // 6. Start render loop
    this.threeEngine.startRenderLoop((deltaTime) => {
      this.update(deltaTime);
      this.render(scene, camera);
    });
  }

  private update(deltaTime: number): void {
    // Update camera controls
    this.cameraControls.updateControls();

    // Add rotation animation
    const scene = this.sceneManager.getScene();
    if (scene) {
      scene.rotation.y += 0.002 * deltaTime * 60; // Smooth rotation
    }
  }

  private render(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    const renderer = this.threeEngine.getRenderer();
    renderer.render(scene, camera);
  }

  private setupResizeObserver(): void {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;

        // Update engine size
        this.threeEngine.setSize(width, height);

        // Update camera aspect ratio
        this.cameraControls.updateAspectRatio(width / height);
      }
    });

    resizeObserver.observe(this.canvasRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.threeEngine.ngOnDestroy();
    this.cameraControls.ngOnDestroy();
  }
}
