import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class SunObject {
  private model: THREE.Group | null = null;
  private originalScale: number = 1;
  private isAnimating: boolean = false;
  private animationTime: number = 0;
  private isSpinning: boolean = false;
  private spinDuration: number = 0;
  private originalRotationSpeed: number = 0.0085;

  constructor(
    private position: { x: number; y: number; z: number } = { x: 0, y: -0.39, z: 0 },
    private scale: number = 1.05,
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
        (error) => {
          reject(error);
        }
      );
    });
  }

  update(): void {
    if (!this.model) return;

    // Normal rotation
    this.model.rotation.y += 0.0085;

    // Spinning animation
    if (this.isSpinning) {
      this.spinDuration += 0.016;
      this.model.rotation.y += 0.085;

      const pulse = Math.sin(this.spinDuration * 15);
      const scale = 1 + (pulse * 0);
      this.model.scale.setScalar(this.originalScale * scale);

      // Spinning animation stop
      if (this.spinDuration >= 1.5) {
        this.isSpinning = false;
        this.spinDuration = 0;
        this.model.scale.setScalar(this.originalScale);
      }
    }

    if (this.isAnimating && !this.isSpinning) {
      this.animationTime += 0.08;
      const pulse = Math.sin(this.animationTime);
      const scale = 1 + (pulse * 0.1);
      this.model.scale.setScalar(this.originalScale * scale);

      if (this.animationTime >= Math.PI) {
        this.isAnimating = false;
        this.animationTime = 0;
        this.model.scale.setScalar(this.originalScale);
      }
    }
  }

  handleClick(): void {
    console.log('[SunObject] handleClick() called');
    if (!this.isSpinning) {
      console.log('[SunObject] Starting spin animation');
      this.isSpinning = true;
      this.spinDuration = 0;

      if (!this.isAnimating) {
        this.isAnimating = true;
        this.animationTime = 0;
      }

      this.onClick();
    } else {
    }
  }

  private makeClickable(): void {
    if (!this.model) return;
    let meshCount = 0;
    this.model.traverse((child: any) => {
      if (child.isMesh) {
        child.userData.clickable = true;
        child.userData.object = this;
        meshCount++;
      }
    });
  }

  getObject(): THREE.Group | null {
    return this.model;
  }
}
