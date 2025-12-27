import { Injectable, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface CameraConfig {
  fov?: number;
  near?: number;
  far?: number;
  position?: { x: number; y: number; z: number };
}

@Injectable({ providedIn: 'root' })
export class CameraControlsService implements OnDestroy {
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;

  createCamera(
    aspectRatio: number,
    config: CameraConfig = {}
  ): THREE.PerspectiveCamera {
    this.camera = new THREE.PerspectiveCamera(
      config.fov || 75,
      aspectRatio,
      config.near || 0.1,
      config.far || 1000
    );

    if (config.position) {
      this.camera.position.set(config.position.x, config.position.y, config.position.z);
    } else {
      this.camera.position.z = 5;
    }

    return this.camera;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  setupControls(renderer: THREE.WebGLRenderer): OrbitControls {
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    return this.controls;
  }

  updateAspectRatio(aspectRatio: number): void {
    if (this.camera) {
      this.camera.aspect = aspectRatio;
      this.camera.updateProjectionMatrix();
    }
  }

  updateControls(): void {
    if (this.controls) {
      this.controls.update();
    }
  }

  ngOnDestroy(): void {
    this.controls?.dispose();
  }
}
