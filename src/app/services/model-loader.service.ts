import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ModelLoadOptions {
  scale?: number;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
}

@Injectable({ providedIn: 'root' })
export class ModelLoaderService {
  private gltfLoader = new GLTFLoader();

  async loadGLTF(
    url: string,
    options: ModelLoadOptions = {}
  ): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          const model = gltf.scene;

          // Apply transformations
          if (options.scale) {
            model.scale.setScalar(options.scale);
          }

          if (options.position) {
            model.position.set(options.position.x, options.position.y, options.position.z);
          }

          if (options.rotation) {
            model.rotation.set(options.rotation.x, options.rotation.y, options.rotation.z);
          }

          // Center model
          this.centerModel(model);

          resolve(model);
        },
        (progress) => {
          // Optional: Emit progress events
          const percent = (progress.loaded / progress.total * 100);
          console.log(`Loading: ${percent.toFixed(1)}%`);
        },
        (error) => {
          console.error('Failed to load model:', error);
          reject(error);
        }
      );
    });
  }

  private centerModel(model: THREE.Group): void {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
  }

  createFallbackCube(): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshNormalMaterial();
    return new THREE.Mesh(geometry, material);
  }
}
