import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js';

export class PopupWindowObject {
  private windowGroup: THREE.Group;
  private background!: THREE.Mesh;
  private closeButton!: THREE.Mesh;
  private titleBar!: THREE.Mesh;
  private textMesh: THREE.Mesh | null = null;
  private isVisible: boolean = false;
  private isAnimating: boolean = false;
  private animationProgress: number = 0;
  private animationSpeed: number = 0.1;
  private isDragging: boolean = false;
  private dragStartPosition = new THREE.Vector2();
  private windowStartPosition = new THREE.Vector3();

  private camera: THREE.Camera | null = null;

  constructor(
    private position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
  ) {
    this.windowGroup = new THREE.Group();
    this.createWindow();
  }

  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  private createWindow(): void {
    const backgroundGeometry = new THREE.PlaneGeometry(0.6, 0.4);
    const backgroundMaterial = new THREE.MeshBasicMaterial({
      color: 0x2c3e50,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    this.background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    this.background.position.set(0, 0, 0);
    this.windowGroup.add(this.background);

    this.createTitleBar();
    this.createCloseButton();

    this.windowGroup.position.set(this.position.x, this.position.y, this.position.z + 0.1);
    this.makeClickable();
    this.windowGroup.scale.set(0, 0, 0);
  }

  private createTitleBar(): void {
    const titleBarGeometry = new THREE.PlaneGeometry(0.6, 0.06);
    const titleBarMaterial = new THREE.MeshBasicMaterial({
      color: 0x3498db,
      transparent: true,
      opacity: 0.9
    });
    this.titleBar = new THREE.Mesh(titleBarGeometry, titleBarMaterial);
    this.titleBar.position.set(0, 0.17, 0);

    this.titleBar.userData['clickable'] = true;
    this.titleBar.userData['object'] = this;
    this.titleBar.userData['isTitleBar'] = true;

    this.windowGroup.add(this.titleBar);
  }

  private createText(font: Font): void {
    const textGeometry = new TextGeometry('classic popup window', {
      font: font,
      size: 0.04,
      depth: 0.01,
    });

    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.textMesh = new THREE.Mesh(textGeometry, textMaterial);

    textGeometry.computeBoundingBox();
    const textWidth = textGeometry.boundingBox!.max.x - textGeometry.boundingBox!.min.x;
    this.textMesh.position.set(-textWidth / 2, -0.02, 0);

    this.windowGroup.add(this.textMesh);
  }

  private createCloseButton(): void {
    const closeButtonGeometry = new THREE.PlaneGeometry(0.06, 0.06);
    const closeButtonMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.9
    });
    this.closeButton = new THREE.Mesh(closeButtonGeometry, closeButtonMaterial);
    this.closeButton.position.set(0.25, 0.17, 0.1);

    this.closeButton.userData['clickable'] = true;
    this.closeButton.userData['object'] = this;
    this.closeButton.userData['isCloseButton'] = true;

    this.windowGroup.add(this.closeButton);
  }

  private makeClickable(): void {
    this.background.userData['clickable'] = true;
    this.background.userData['object'] = this;
    this.background.userData['isPopupWindow'] = true;
  }

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

  handlePopupClick(clickedObject: THREE.Object3D): void {
    if (clickedObject.userData['isCloseButton']) {
      this.hide();
    }
  }

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
      this.windowGroup.position.y = this.windowStartPosition.y - deltaY; // Invert Y for Three.js coordinate system
    }
  }

  stopDrag(): void {
    this.isDragging = false;
  }

  async loadFont(): Promise<void> {
    return new Promise((resolve, reject) => {
      const loader = new FontLoader();
      loader.load(
        '/assets/fonts/helvetiker_regular.typeface.json',
        (font) => {
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
