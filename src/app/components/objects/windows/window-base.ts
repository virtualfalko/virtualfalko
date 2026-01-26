import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js';

export abstract class WindowBase {
  protected windowGroup: THREE.Group;
  protected closeButton!: THREE.Mesh;
  protected textMesh: THREE.Mesh | null = null;
  protected isVisible: boolean = false;
  protected isAnimating: boolean = false;
  protected animationProgress: number = 0;
  protected animationSpeed: number = 0.1;
  protected isDragging: boolean = false;
  protected dragStartPosition = new THREE.Vector2();
  protected windowStartPosition = new THREE.Vector3();
  protected camera: THREE.Camera | null = null;
  protected currentFont: Font | null = null;

  constructor(
    protected position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    protected width: number = 0.6,
    protected height: number = 0.4,
    protected texturePath: string = '/assets/computer/window.png'
  ) {
    this.windowGroup = new THREE.Group();
    this.windowGroup.position.set(this.position.x, this.position.y, this.position.z);
    this.windowGroup.scale.set(0, 0, 0);
  }

  abstract createWindow(): void;

  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  // Common click handling
  handlePopupClick(clickedObject: THREE.Object3D): void {
    const obj = clickedObject as any;
    if (obj.userData?.['isCloseButton']) {
      this.hide();
    }
  }

  // Drag functionality
  startDrag(mouseX: number, mouseY: number): void {
    if (!this.isVisible || !this.camera) return;
    this.isDragging = true;
    this.dragStartPosition.set(mouseX, mouseY);
    this.windowStartPosition.copy(this.windowGroup.position);
  }

  updateDrag(mouseX: number, mouseY: number): void {
    if (!this.isDragging || !this.camera) return;

    if (this.camera instanceof THREE.OrthographicCamera) {
      const frustumWidth = this.camera.right - this.camera.left;
      const frustumHeight = this.camera.top - this.camera.bottom;

      const deltaX = (mouseX - this.dragStartPosition.x) * frustumWidth;
      const deltaY = (mouseY - this.dragStartPosition.y) * frustumHeight;

      this.windowGroup.position.x = this.windowStartPosition.x + deltaX;
      this.windowGroup.position.y = this.windowStartPosition.y - deltaY;
    }
  }

  stopDrag(): void {
    this.isDragging = false;
  }

  // Visibility control
  show(): void {
    if (this.isAnimating) return;
    this.isVisible = true;
    this.isAnimating = true;
    this.animationProgress = 0;
    this.windowGroup.visible = true;
  }

  hide(): void {
    if (this.isAnimating) return;
    this.isVisible = false;
    this.isAnimating = true;
    this.animationProgress = 0;
  }

  // Font loading
  async loadFont(): Promise<void> {
    return new Promise((resolve, reject) => {
      const loader = new FontLoader();
      loader.load(
        '/assets/fonts/helvetiker_regular.typeface.json',
        (font) => {
          this.currentFont = font;
          this.createText(font);
          resolve();
        },
        undefined,
        () => {
          reject(new Error('Failed to load font'));
        }
      );
    });
  }

  // Abstract method - must be implemented by subclasses
  protected abstract createText(font: Font): void;

  // Animation update
  update(): void {
    if (!this.isAnimating) return;

    this.animationProgress = Math.min(this.animationProgress + this.animationSpeed, 1);
    const easing = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const easedProgress = easing(this.animationProgress);

    if (this.isVisible) {
      const scale = THREE.MathUtils.lerp(0, 1, easedProgress);
      this.windowGroup.scale.set(scale, scale, scale);
    } else {
      const scale = THREE.MathUtils.lerp(1, 0, easedProgress);
      this.windowGroup.scale.set(scale, scale, scale);
    }

    if (this.animationProgress >= 1) {
      this.isAnimating = false;
      if (!this.isVisible) {
        this.windowGroup.visible = false;
      }
    }
  }

  // Getters
  getObject(): THREE.Group {
    return this.windowGroup;
  }

  isWindowVisible(): boolean {
    return this.isVisible;
  }

  isDraggingWindow(): boolean {
    return this.isDragging;
  }
}
