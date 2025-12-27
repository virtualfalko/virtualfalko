import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({ providedIn: 'root' })
export class SceneManagerService {
  private scene!: THREE.Scene;

  createScene(backgroundColor: number = 0x000000): THREE.Scene {
    this.scene = new THREE.Scene();
    return this.scene;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  addBasicLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(directionalLight);
  }

  addHemisphereLighting(): void {
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.scene.add(hemisphereLight);
  }

  clearScene(): void {
    while(this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
  }
}
