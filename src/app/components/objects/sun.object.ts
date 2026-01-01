import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class SunObject {
  private model: THREE.Group | null = null;
  private originalScale: number = 1;
  private isAnimating: boolean = false;
  private animationTime: number = 0;

  constructor(
    private position: { x: number; y: number; z: number } = { x: -0.75, y: 0.9, z: 0 },
    private scale: number = 0.3,
    private onClick: () => void = () => {}
  ) {}

  async load(): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      new GLTFLoader().load(
        '/assets/models/sun.glb',
        (gltf) => {
          this.model = gltf.scene;
          this.originalScale = this.scale;

          this.model.scale.setScalar(this.scale);
          this.model.position.set(this.position.x, this.position.y, this.position.z);

          this.makeClickable();
          resolve(this.model);
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  update(): void {
    if (!this.model) return;

    this.model.rotation.y += 0.0005;
    this.model.rotation.x += 0.0005;

    if (this.isAnimating) {
      this.animationTime += 0.08;
      const pulse = Math.sin(this.animationTime);
      const scale = 1 + (pulse * 0.2);
      this.model.scale.setScalar(this.originalScale * scale);

      if (this.animationTime >= Math.PI) {
        this.isAnimating = false;
        this.animationTime = 0;
        this.model.scale.setScalar(this.originalScale);
      }
    }
  }

  handleClick(): void {
    if (!this.isAnimating) {
      this.isAnimating = true;
      this.animationTime = 0;
      this.onClick();
    }
  }

  private makeClickable(): void {
    if (!this.model) return;
    this.model.traverse((child: any) => {
      if (child.isMesh) {
        child.userData.clickable = true;
        child.userData.object = this;
      }
    });
  }

  getObject(): THREE.Group | null {
    return this.model;
  }
}
