import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ComputerScreenObject } from './computer-screen.object';

export class TvObject {
  private model: THREE.Group | null = null;
  private screen: ComputerScreenObject;
  private originalScale: number = 1;
  private originalPosition: THREE.Vector3 = new THREE.Vector3();
  private originalRotation: THREE.Euler = new THREE.Euler();
  private isZoomed: boolean = false;
  private isAnimatingZoom: boolean = false;
  private zoomProgress: number = 0;
  private zoomSpeed: number = 0.05;
  private zoomTargetScale: number = 0.8;
  private zoomTargetPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 1);
  private zoomTargetRotation: THREE.Euler = new THREE.Euler(0, -1.6, 0);

  private originalVisibility: Map<THREE.Object3D, boolean> = new Map();

  public onZoomToggle: ((isZoomed: boolean) => void) | null = null;
  public onScreenToggle: ((visible: boolean) => void) | null = null;

  constructor(
    private position: { x: number; y: number; z: number } = { x: 0.7, y: 0.2, z: 0 },
    private scale: number = 0.15
  ) {
    this.screen = new ComputerScreenObject();
  }

  async load(): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      new GLTFLoader().load(
        '/assets/models/tv.glb',
        (gltf) => {
          this.model = gltf.scene;
          this.originalScale = this.scale;

          this.model.rotation.y = -2.0000;
          this.originalRotation.copy(this.model.rotation);

          this.model.scale.setScalar(this.scale);
          this.model.position.set(this.position.x, this.position.y, this.position.z);
          this.originalPosition.copy(this.model.position);

          this.makeClickable();
          resolve(this.model);
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  async createScreen(scene: THREE.Scene): Promise<void> {
    await this.screen.create();
    const screenObjects = this.screen.getObjects();
    if (screenObjects && scene) {
      screenObjects.forEach(obj => {
        scene.add(obj);
      });
    }
  }

  update(): void {
    this.updateZoomAnimation();
    this.screen.update();
  }

  handleClick(): void {
    if (!this.isAnimatingZoom) {
      this.toggleZoom();
    }
  }

  handleIconClick(): void {
    this.screen.handleIconClick();
  }

  getIcon(): THREE.Mesh | null {
    return this.screen.getIcon();
  }

  private toggleZoom(): void {
    this.isZoomed = !this.isZoomed;
    this.isAnimatingZoom = true;
    this.zoomProgress = 0;

    if (this.isZoomed) {
      this.screen.show();
    } else {
      this.screen.hide();
    }

    if (this.onZoomToggle) {
      this.onZoomToggle(this.isZoomed);
    }

    if (this.onScreenToggle) {
      this.onScreenToggle(this.isZoomed);
    }
  }

  private updateZoomAnimation(): void {
    if (!this.isAnimatingZoom || !this.model) return;

    this.zoomProgress = Math.min(this.zoomProgress + this.zoomSpeed, 1);

    const easing = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const easedProgress = easing(this.zoomProgress);

    if (this.isZoomed) {
      const targetScale = this.zoomTargetScale;
      const currentScale = THREE.MathUtils.lerp(this.originalScale, targetScale, easedProgress);
      this.model.scale.setScalar(currentScale);

      const currentPos = new THREE.Vector3().lerpVectors(
        this.originalPosition,
        this.zoomTargetPosition,
        easedProgress
      );
      this.model.position.copy(currentPos);

      const targetQuat = new THREE.Quaternion().setFromEuler(this.zoomTargetRotation);
      const startQuat = new THREE.Quaternion().setFromEuler(this.originalRotation);
      const currentQuat = new THREE.Quaternion().slerpQuaternions(startQuat, targetQuat, easedProgress);
      this.model.setRotationFromQuaternion(currentQuat);

    } else {
      const currentScale = THREE.MathUtils.lerp(this.zoomTargetScale, this.originalScale, easedProgress);
      this.model.scale.setScalar(currentScale);

      const currentPos = new THREE.Vector3().lerpVectors(
        this.zoomTargetPosition,
        this.originalPosition,
        easedProgress
      );
      this.model.position.copy(currentPos);

      const targetQuat = new THREE.Quaternion().setFromEuler(this.originalRotation);
      const startQuat = new THREE.Quaternion().setFromEuler(this.zoomTargetRotation);
      const currentQuat = new THREE.Quaternion().slerpQuaternions(startQuat, targetQuat, easedProgress);
      this.model.setRotationFromQuaternion(currentQuat);
    }

    if (this.zoomProgress >= 1) {
      this.isAnimatingZoom = false;
    }
  }

  hideOtherObjects(scene: THREE.Scene): void {
    if (!scene) return;

    // Get all screen objects (screen + icon)
    const screenObjects = this.screen.getObjects();

    scene.children.forEach(child => {
      // Don't hide: TV model, screen objects, lights, or camera
      const isScreenObject = screenObjects.some(obj => obj === child);
      const isLight = child instanceof THREE.Light;
      const isCamera = child instanceof THREE.Camera;

      if (child !== this.model && !isScreenObject && !isLight && !isCamera) {
        this.originalVisibility.set(child, child.visible);
        child.visible = false;
      }
    });
  }

  showOtherObjects(scene: THREE.Scene): void {
    if (!scene) return;

    const screenObjects = this.screen.getObjects();

    scene.children.forEach(child => {
      // Don't restore visibility for screen objects
      const isScreenObject = screenObjects.some(obj => obj === child);

      if (child !== this.model && !isScreenObject) {
        const wasVisible = this.originalVisibility.get(child);
        if (wasVisible !== undefined) {
          child.visible = wasVisible;
        }
      }
    });

    this.originalVisibility.clear();
  }

  getZoomState(): boolean {
    return this.isZoomed;
  }

  getScreen(): ComputerScreenObject {
    return this.screen;
  }

  private makeClickable(): void {
    if (!this.model) return;

    this.model.traverse((child: any) => {
      if (child.isMesh) {
        child.userData['clickable'] = true;
        child.userData['object'] = this;
      }
    });
  }

  getObject(): THREE.Group | null {
    return this.model;
  }
}
