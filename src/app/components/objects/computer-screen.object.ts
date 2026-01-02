import * as THREE from 'three';

export class ComputerScreenObject {
  private background: THREE.Mesh | null = null;
  private icon: THREE.Mesh | null = null;
  private isVisible = false;
  private animationProgress = 0;
  private animationSpeed = 0.08;
  private isAnimating = false;
  private textureLoader: THREE.TextureLoader;

  constructor(
    private position = { x: 0, y: 0.018, z: 1.5 },
    private width = 1.3,
    private height = 0.9
  ) {
    this.textureLoader = new THREE.TextureLoader();
  }

  async create(): Promise<void> {
    return new Promise((resolve) => {
      this.textureLoader.load(
        '/assets/computer/background.png',
        (texture) => {
          const geometry = new THREE.PlaneGeometry(this.width, this.height);
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(1, 1);

          const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true
          });

          this.background = new THREE.Mesh(geometry, material);
          this.background.position.set(this.position.x, this.position.y, this.position.z);
          this.background.rotation.y = 0;
          this.background.scale.set(0, 0, 0);

          this.makeBackgroundClickable();
          this.createIcon();

          resolve();
        },
        undefined,
        () => {
          this.createFallbackBackground();
          resolve();
        }
      );
    });
  }

  private createFallbackBackground(): void {
    const geometry = new THREE.PlaneGeometry(this.width, this.height);
    const material = new THREE.MeshBasicMaterial({
      color: 0x1a1a2e,
      side: THREE.DoubleSide
    });

    this.background = new THREE.Mesh(geometry, material);
    this.background.position.set(this.position.x, this.position.y, this.position.z);
    this.background.rotation.y = 0;
    this.background.scale.set(0, 0, 0);

    this.makeBackgroundClickable();
    this.createIcon();
  }

  private createIcon(): void {
    const iconSize = 0.08;
    const geometry = new THREE.BoxGeometry(iconSize, iconSize, iconSize * 0.2);
    const material = new THREE.MeshBasicMaterial({ color: 0x4a90e2 });

    this.icon = new THREE.Mesh(geometry, material);
    this.icon.position.set(this.position.x + 0.5, this.position.y + 0.35, this.position.z + 0.01);
    this.icon.rotation.y = 0;
    this.icon.scale.set(0, 0, 0);

    this.makeIconClickable();
  }

  private makeBackgroundClickable(): void {
    if (!this.background) return;

    (this.background.userData as any)['clickable'] = true;
    (this.background.userData as any)['object'] = this;
    (this.background.userData as any)['isBackground'] = true;
  }

  private makeIconClickable(): void {
    if (!this.icon) return;

    (this.icon.userData as any)['clickable'] = true;
    (this.icon.userData as any)['object'] = this;
    (this.icon.userData as any)['isIcon'] = true;
  }

  handleBackgroundClick(): void {}

  handleIconClick(): void {
    if (this.icon && this.icon.material) {
      const material = this.icon.material as THREE.MeshBasicMaterial;
      const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      material.color.setHex(randomColor);
    }
  }

  show(): void {
    if ((!this.background && !this.icon) || this.isAnimating) return;

    this.isVisible = true;
    this.isAnimating = true;
    this.animationProgress = 0;
  }

  hide(): void {
    if ((!this.background && !this.icon) || this.isAnimating) return;

    this.isVisible = false;
    this.isAnimating = true;
    this.animationProgress = 0;
  }

  update(): void {
    if (this.isAnimating) {
      this.animationProgress = Math.min(this.animationProgress + this.animationSpeed, 1);

      const easing = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const easedProgress = easing(this.animationProgress);

      if (this.isVisible) {
        const scale = THREE.MathUtils.lerp(0, 1, easedProgress);
        if (this.background) this.background.scale.set(scale, scale, scale);
        if (this.icon) this.icon.scale.set(scale, scale, scale);
      } else {
        const scale = THREE.MathUtils.lerp(1, 0, easedProgress);
        if (this.background) this.background.scale.set(scale, scale, scale);
        if (this.icon) this.icon.scale.set(scale, scale, scale);
      }

      if (this.animationProgress >= 1) {
        this.isAnimating = false;
      }
    }
  }

  getObjects(): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    if (this.background) objects.push(this.background);
    if (this.icon) objects.push(this.icon);
    return objects;
  }

  getBackground(): THREE.Mesh | null {
    return this.background;
  }

  getIcon(): THREE.Mesh | null {
    return this.icon;
  }

  isBackgroundVisible(): boolean {
    return this.isVisible;
  }
}
