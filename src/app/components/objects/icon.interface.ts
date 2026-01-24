import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js';

export interface IconConfig {
  id: string;
  texturePath: string;
  text: string;
  position: { x: number; y: number };
  size: number;
  windowClass: any;
}

export class IconObject {
  private group: THREE.Group;
  private icon!: THREE.Mesh;
  private textMesh: THREE.Mesh | null = null;
  private associatedWindow: any = null;

  constructor(
    private config: IconConfig,
    private font: Font,
    private onIconClick: (icon: IconObject) => void
  ) {
    this.group = new THREE.Group();
    this.group.renderOrder = 0;
    this.group.userData['clickable'] = true;
    this.group.userData['object'] = this;
    this.group.userData['isIcon'] = true;
    this.group.userData['iconId'] = config.id;
    this.createIcon();
    this.createText();
  }

  private createIcon(): void {
    const geometry = new THREE.PlaneGeometry(this.config.size, this.config.size);
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(
      this.config.texturePath,
      (texture: THREE.Texture) => {
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          depthTest: true,
          depthWrite: true
        });
        this.icon = new THREE.Mesh(geometry, material);
        this.icon.position.set(0, this.config.size / 2, 0);
        this.icon.renderOrder = 1; // Changed from 2 to 1
        this.icon.userData['clickable'] = true;
        this.icon.userData['object'] = this;
        this.icon.userData['isIcon'] = true;
        this.icon.userData['iconId'] = this.config.id;
        this.group.add(this.icon);
      },
      undefined,
      () => {
        const material = new THREE.MeshBasicMaterial({
          color: 0x4a90e2,
          depthTest: true,
          depthWrite: true
        });
        this.icon = new THREE.Mesh(geometry, material);
        this.icon.position.set(0, this.config.size / 2, 0);
        this.icon.renderOrder = 1;
        this.icon.userData['clickable'] = true;
        this.icon.userData['object'] = this;
        this.icon.userData['isIcon'] = true;
        this.icon.userData['iconId'] = this.config.id;
        this.group.add(this.icon);
      }
    );
  }

  private createText(): void {
    if (!this.font) return;

    const textGeometry = new TextGeometry(this.config.text, {
      font: this.font,
      size: 0.02,
      depth: 0.001,
    });

    const textMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthTest: true,
      depthWrite: true
    });
    this.textMesh = new THREE.Mesh(textGeometry, textMaterial);
    this.textMesh.renderOrder = 1;

    textGeometry.computeBoundingBox();
    const textWidth = textGeometry.boundingBox!.max.x - textGeometry.boundingBox!.min.x;
    this.textMesh.position.set(-textWidth / 2, -0.03, 0);

    this.textMesh.userData['clickable'] = true;
    this.textMesh.userData['object'] = this;
    this.textMesh.userData['isIcon'] = true;
    this.textMesh.userData['iconId'] = this.config.id;

    this.group.add(this.textMesh);
  }

  handleClick(): void {
    console.log(this.associatedWindow, this.config.id, 'Window visibility:', this.associatedWindow?.isWindowVisible());

    if (this.icon && this.icon.material) {
      const material = this.icon.material as THREE.MeshBasicMaterial;
      const originalColor = material.color.getHex();
      material.color.setHex(0xffffff);
      setTimeout(() => {
        material.color.setHex(originalColor);
      }, 100);
    }
    this.onIconClick(this);
  }

  setAssociatedWindow(window: any): void {
    this.associatedWindow = window;
  }

  getAssociatedWindow(): any {
    return this.associatedWindow;
  }

  getObject(): THREE.Group {
    return this.group;
  }

  getPosition(): { x: number; y: number } {
    return this.config.position;
  }

  getId(): string {
    return this.config.id;
  }
}
