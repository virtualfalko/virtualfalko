import { Injectable, NgZone, OnDestroy } from '@angular/core';
import * as THREE from 'three';

export interface RenderLoopCallback {
  (deltaTime: number): void;
}

@Injectable({ providedIn: 'root' })
export class ThreeEngineService implements OnDestroy {
  private renderer!: THREE.WebGLRenderer;
  private animationId!: number;
  private clock = new THREE.Clock();
  private callbacks: RenderLoopCallback[] = [];

  initialize(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 0);
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  startRenderLoop(callback?: RenderLoopCallback): void {
    if (callback) {
      this.callbacks.push(callback);
    }

    if (!this.animationId) {
      const animate = () => {
        this.animationId = requestAnimationFrame(animate);
        this.render();
      };
      animate();
    }
  }

  stopRenderLoop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private render(): void {
    const deltaTime = this.clock.getDelta();

    // Execute all registered callbacks
    this.callbacks.forEach(callback => callback(deltaTime));
  }

  setSize(width: number, height: number): void {
    if (this.renderer) {
      this.renderer.setSize(width, height);
    }
  }

  ngOnDestroy(): void {
    this.stopRenderLoop();
    this.renderer?.dispose();
    this.callbacks = [];
  }
}
