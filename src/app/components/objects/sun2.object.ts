import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Sun2Object {
  private model: THREE.Group | null = null;

  constructor(
    private position: { x: number; y: number; z: number } = { x: 0.6, y: 0.4, z: 0 },
    private scale: number = 0.3
  ) {}

  async load(): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      new GLTFLoader().load(
        '/assets/models/sun.glb',
        (gltf) => {
          this.model = gltf.scene;

          // Keep original materials
          this.model.scale.setScalar(this.scale);
          this.model.position.set(this.position.x, this.position.y, this.position.z);

          resolve(this.model);
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  update(): void {
    if (this.model) {
      this.model.rotation.y += 0;
      this.model.rotation.x += 0;
    }
  }

  getObject(): THREE.Group | null {
    return this.model;
  }
}
