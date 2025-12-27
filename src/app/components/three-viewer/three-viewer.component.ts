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
  private sun1: THREE.Group | null = null;  // Store reference to sun1
  private sun2: THREE.Group | null = null;  // Store reference to sun2

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
    const scene = this.sceneManager.createScene();
    this.sceneManager.addBasicLighting();

    // 3. Create camera
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const camera = this.cameraControls.createCamera(aspect, {
      fov: 60,
      position: { x: 0, y: 0, z: 8 }
    });

    // 4. Setup controls
    const renderer = this.threeEngine.getRenderer();
    this.cameraControls.setupControls(renderer);

    // 5. Load FIRST sun model
    try {
      this.sun1 = await this.modelLoader.loadGLTF('/assets/models/sun.glb', {
        scale: 1.0,
      });
      scene.add(this.sun1);
      this.sun1.position.set(-2, 0, 0);

      // 6. Load SECOND sun model
      this.sun2 = await this.modelLoader.loadGLTF('/assets/models/sun.glb', {
        scale: 1.0,
      });
      scene.add(this.sun2);
      this.sun2.position.set(2, 0, 0);

    } catch (error) {
      console.log('Couldnt load');
    }

    // 7. Start render loop
    this.threeEngine.startRenderLoop((deltaTime) => {
      this.update(deltaTime);
      this.render(scene, camera);
    });
  }

  private update(deltaTime: number): void {
    this.cameraControls.updateControls();

    if (this.sun1) {
      this.sun1.rotation.y += 0.0005;
      this.sun1.rotation.x += 0.0005;
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
