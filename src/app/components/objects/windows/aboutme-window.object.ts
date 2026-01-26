import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js';

export class AboutMeWindowObject {
  private windowGroup: THREE.Group;
  private cornerSize: number = 0.04;
  private closeButton!: THREE.Mesh;
  private textMesh: THREE.Mesh | null = null;
  private isVisible: boolean = false;
  private isAnimating: boolean = false;
  private animationProgress: number = 0;
  private animationSpeed: number = 0.1;
  private isDragging: boolean = false;
  private isResizing: boolean = false;
  private resizeEdge: string = '';
  private dragStartPosition = new THREE.Vector2();
  private windowStartPosition = new THREE.Vector3();
  private windowStartSize = new THREE.Vector2();
  private camera: THREE.Camera | null = null;
  private slices: THREE.Mesh[] = [];
  private dragArea!: THREE.Mesh;
  private resizeHandles: THREE.Mesh[] = [];
  private minWidth: number = 0.4;
  private minHeight: number = 0.3;
  private maxWidth: number = 1.0;
  private maxHeight: number = 0.8;
  private currentFont: Font | null = null;
  private texture: THREE.Texture | null = null;

  // Increase hitbox sizes
  private resizeHandleSize: number = 0.08; // Doubled from 0.04
  private dragAreaPadding: number = 0.02; // Extra padding for drag area

  // Debug mode to visualize hitboxes
  private debugMode: boolean = true; // Set to false to hide hitboxes
  private debugMaterials: { [key: string]: THREE.Material } = {};

  constructor(
    private position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    private width: number = 0.6,
    private height: number = 0.4,
    private texturePath: string = '/assets/computer/window.png'
  ) {
    this.windowGroup = new THREE.Group();
    this.createDebugMaterials();
    this.createWindow();
  }

  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  // Toggle debug mode
  toggleDebugMode(): void {
    this.debugMode = !this.debugMode;
    this.updateDebugVisualization();
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.updateDebugVisualization();
  }

  private createDebugMaterials(): void {
    // Create different colored materials for different hitbox types
    this.debugMaterials = {
      dragArea: new THREE.MeshBasicMaterial({
        color: 0x00ff00, // Green for drag area
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        wireframe: false
      }),
      resizeHandle: new THREE.MeshBasicMaterial({
        color: 0xff0000, // Red for resize handles
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        wireframe: false
      }),
      closeButton: new THREE.MeshBasicMaterial({
        color: 0x0000ff, // Blue for close button
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        wireframe: false
      }),
      topSlice: new THREE.MeshBasicMaterial({
        color: 0xffff00, // Yellow for top slices (title bar)
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        wireframe: false
      }),
      windowBackground: new THREE.MeshBasicMaterial({
        color: 0x888888, // Gray for window background
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
        wireframe: false
      })
    };
  }

  private getHitboxMaterial(type: string): THREE.Material {
    if (this.debugMode && this.debugMaterials[type]) {
      return this.debugMaterials[type];
    }

    switch (type) {
      case 'dragArea':
      case 'resizeHandle':
        return new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.0,
          side: THREE.DoubleSide
        });
      case 'closeButton':
        return new THREE.MeshBasicMaterial({
          color: 0xff6b6b,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide
        });
      default:
        return new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.0,
          side: THREE.DoubleSide
        });
    }
  }

  private updateDebugVisualization(): void {
    this.dragArea.material = this.getHitboxMaterial('dragArea');

    this.resizeHandles.forEach(handle => {
      handle.material = this.getHitboxMaterial('resizeHandle');
    });

    if (this.debugMode) {
      this.closeButton.material = this.getHitboxMaterial('closeButton');
    } else {
      this.closeButton.material = new THREE.MeshBasicMaterial({
        color: 0xff6b6b,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
    }

    this.slices.forEach(slice => {
      const sliceWithData = slice as any;
      if (sliceWithData.userData?.['isTopSlice']) {
        if (this.debugMode) {
          const originalMaterial = slice.material as THREE.MeshBasicMaterial;
          const debugMaterial = this.debugMaterials['topSlice'].clone() as THREE.MeshBasicMaterial;

          if (originalMaterial.map) {
            debugMaterial.map = originalMaterial.map;
          }
          debugMaterial.transparent = true;
          debugMaterial.opacity = 0.5;
          slice.material = debugMaterial;
        } else {
          const texture = this.getTexture();
          slice.material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            opacity: 1
          });
        }
      }
    });
  }

  private createWindow(): void {
    this.createWindowSlices();
    this.createDragArea();
    this.createCloseButton();
    this.createResizeHandles();

    this.windowGroup.position.set(this.position.x, this.position.y, this.position.z);
    this.makeClickable();
    this.windowGroup.scale.set(0, 0, 0);
  }

  private createWindowSlices(): void {
    const texture = this.getTexture();
    const uvTileSize = 1/3;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        let sliceWidth, sliceHeight;
        let posX, posY;

        if (col === 0) {
          sliceWidth = this.cornerSize;
          posX = -this.width/2 + this.cornerSize/2;
        } else if (col === 1) {
          sliceWidth = this.width - (2 * this.cornerSize);
          posX = 0;
        } else {
          sliceWidth = this.cornerSize;
          posX = this.width/2 - this.cornerSize/2;
        }

        if (row === 0) {
          sliceHeight = this.cornerSize;
          posY = this.height/2 - this.cornerSize/2;
        } else if (row === 1) {
          sliceHeight = this.height - (2 * this.cornerSize);
          posY = 0;
        } else {
          sliceHeight = this.cornerSize;
          posY = -this.height/2 + this.cornerSize/2;
        }

        const geometry = new THREE.PlaneGeometry(sliceWidth, sliceHeight);
        const uvAttribute = geometry.getAttribute('uv') as THREE.BufferAttribute;
        const uvs = uvAttribute.array as Float32Array;

        const uvLeft = col * uvTileSize;
        const uvRight = (col + 1) * uvTileSize;
        const uvBottom = row * uvTileSize;
        const uvTop = (row + 1) * uvTileSize;

        uvs[0] = uvLeft;   uvs[1] = uvBottom;
        uvs[2] = uvRight;  uvs[3] = uvBottom;
        uvs[4] = uvLeft;   uvs[5] = uvTop;
        uvs[6] = uvRight;  uvs[7] = uvTop;

        uvAttribute.needsUpdate = true;

        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
          opacity: 1
        });

        const slice = new THREE.Mesh(geometry, material);
        slice.position.set(posX, posY, 0);
        slice.renderOrder = 100;

        // Store the slice's original row and column for easy updating
        (slice as any).userData['sliceRow'] = row;
        (slice as any).userData['sliceCol'] = col;

        if (row === 0) {
          (slice as any).userData['clickable'] = true;
          (slice as any).userData['object'] = this;
          (slice as any).userData['isTopSlice'] = true;
        }

        this.slices.push(slice);
        this.windowGroup.add(slice);
      }
    }
  }

  private createDragArea(): void {
    // Make drag area wider and taller for easier grabbing
    const dragAreaWidth = this.width + (2 * this.dragAreaPadding);
    const dragAreaHeight = this.cornerSize + (2 * this.dragAreaPadding);
    const dragAreaGeometry = new THREE.PlaneGeometry(dragAreaWidth, dragAreaHeight);

    const dragAreaMaterial = this.getHitboxMaterial('dragArea');

    this.dragArea = new THREE.Mesh(dragAreaGeometry, dragAreaMaterial);
    this.dragArea.position.set(0, this.height/2, 0.001); // Position at top center
    this.dragArea.renderOrder = 101;

    (this.dragArea as any).userData['clickable'] = true;
    (this.dragArea as any).userData['object'] = this;
    (this.dragArea as any).userData['isTitleBar'] = true;

    this.windowGroup.add(this.dragArea);
  }

  private createCloseButton(): void {
    const closeButtonSize = 0.04;
    const closeButtonGeometry = new THREE.PlaneGeometry(closeButtonSize, closeButtonSize);

    const closeButtonMaterial = this.getHitboxMaterial('closeButton');

    this.closeButton = new THREE.Mesh(closeButtonGeometry, closeButtonMaterial);
    this.closeButton.position.set(
      this.width/2 - closeButtonSize/2 - 0.02,
      this.height/2 - closeButtonSize/2 - 0.02,
      0.002
    );
    this.closeButton.renderOrder = 102;

    (this.closeButton as any).userData['clickable'] = true;
    (this.closeButton as any).userData['object'] = this;
    (this.closeButton as any).userData['isCloseButton'] = true;

    this.windowGroup.add(this.closeButton);
  }

  private createResizeHandles(): void {
    const handleSize = this.resizeHandleSize; // Use the larger size
    const handleGeometry = new THREE.PlaneGeometry(handleSize, handleSize);
    const handleMaterial = this.getHitboxMaterial('resizeHandle');

    // Create 8 resize handles (corners and edges) with larger hitboxes
    const handles = [
      // Corners - position at the actual corners
      { posX: -this.width/2, posY: this.height/2, edge: 'top-left' },
      { posX: this.width/2, posY: this.height/2, edge: 'top-right' },
      { posX: -this.width/2, posY: -this.height/2, edge: 'bottom-left' },
      { posX: this.width/2, posY: -this.height/2, edge: 'bottom-right' },
      // Edges - position centered on edges with larger hitboxes
      { posX: 0, posY: this.height/2, edge: 'top' },
      { posX: 0, posY: -this.height/2, edge: 'bottom' },
      { posX: -this.width/2, posY: 0, edge: 'left' },
      { posX: this.width/2, posY: 0, edge: 'right' }
    ];

    for (const handle of handles) {
      const resizeHandle = new THREE.Mesh(handleGeometry, handleMaterial);
      resizeHandle.position.set(handle.posX, handle.posY, 0.003);
      resizeHandle.renderOrder = 103;

      // Store the handle's original position data
      (resizeHandle as any).userData['edge'] = handle.edge;
      (resizeHandle as any).userData['isResizeHandle'] = true;
      (resizeHandle as any).userData['clickable'] = true;
      (resizeHandle as any).userData['object'] = this;

      this.resizeHandles.push(resizeHandle);
      this.windowGroup.add(resizeHandle);
    }
  }

  private createText(font: Font): void {
    const textGeometry = new TextGeometry('About Me', {
      font: font,
      size: 0.03,
      depth: 0.005,
    });

    const textMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    });

    this.textMesh = new THREE.Mesh(textGeometry, textMaterial);
    this.textMesh.renderOrder = 104;

    textGeometry.computeBoundingBox();
    const textWidth = textGeometry.boundingBox!.max.x - textGeometry.boundingBox!.min.x;

    this.textMesh.position.set(
      -textWidth / 2,
      this.height/2 - 0.04,
      0.004
    );

    this.windowGroup.add(this.textMesh);
  }

  private makeClickable(): void {
    this.slices.forEach(slice => {
      const sliceWithData = slice as any;
      if (!sliceWithData.userData?.['isTopSlice']) {
        sliceWithData.userData = sliceWithData.userData || {};
        sliceWithData.userData['clickable'] = true;
        sliceWithData.userData['object'] = this;
        sliceWithData.userData['isPopupWindow'] = true;
      }
    });
  }

  private updateWindowGeometry(): void {
    const uvTileSize = 1/3;

    // Update slice geometries and positions
    for (const slice of this.slices) {
      const row = (slice as any).userData['sliceRow'];
      const col = (slice as any).userData['sliceCol'];

      let sliceWidth, sliceHeight;
      let posX, posY;

      if (col === 0) {
        sliceWidth = this.cornerSize;
        posX = -this.width/2 + this.cornerSize/2;
      } else if (col === 1) {
        sliceWidth = this.width - (2 * this.cornerSize);
        posX = 0;
      } else {
        sliceWidth = this.cornerSize;
        posX = this.width/2 - this.cornerSize/2;
      }

      if (row === 0) {
        sliceHeight = this.cornerSize;
        posY = this.height/2 - this.cornerSize/2;
      } else if (row === 1) {
        sliceHeight = this.height - (2 * this.cornerSize);
        posY = 0;
      } else {
        sliceHeight = this.cornerSize;
        posY = -this.height/2 + this.cornerSize/2;
      }

      // Update the geometry
      slice.geometry.dispose();
      const newGeometry = new THREE.PlaneGeometry(sliceWidth, sliceHeight);

      // Update UV coordinates
      const uvAttribute = newGeometry.getAttribute('uv') as THREE.BufferAttribute;
      const uvs = uvAttribute.array as Float32Array;

      const uvLeft = col * uvTileSize;
      const uvRight = (col + 1) * uvTileSize;
      const uvBottom = row * uvTileSize;
      const uvTop = (row + 1) * uvTileSize;

      uvs[0] = uvLeft;   uvs[1] = uvBottom;
      uvs[2] = uvRight;  uvs[3] = uvBottom;
      uvs[4] = uvLeft;   uvs[5] = uvTop;
      uvs[6] = uvRight;  uvs[7] = uvTop;

      uvAttribute.needsUpdate = true;

      slice.geometry = newGeometry;

      // Update position
      slice.position.set(posX, posY, 0);
    }

    // Update drag area with larger hitbox
    const dragAreaWidth = this.width + (2 * this.dragAreaPadding);
    const dragAreaHeight = this.cornerSize + (2 * this.dragAreaPadding);
    this.dragArea.geometry.dispose();
    this.dragArea.geometry = new THREE.PlaneGeometry(dragAreaWidth, dragAreaHeight);
    this.dragArea.position.set(0, this.height/2, 0.001);

    // Update drag area material for debug mode
    this.dragArea.material = this.getHitboxMaterial('dragArea');

    // Update close button position
    const closeButtonSize = 0.04;
    this.closeButton.position.set(
      this.width/2 - closeButtonSize/2 - 0.02,
      this.height/2 - closeButtonSize/2 - 0.02,
      0.002
    );

    // Update close button material for debug mode
    this.closeButton.material = this.getHitboxMaterial('closeButton');

    // Update resize handle positions with larger hitboxes
    const handlePositions = [
      { posX: -this.width/2, posY: this.height/2, edge: 'top-left' },
      { posX: this.width/2, posY: this.height/2, edge: 'top-right' },
      { posX: -this.width/2, posY: -this.height/2, edge: 'bottom-left' },
      { posX: this.width/2, posY: -this.height/2, edge: 'bottom-right' },
      { posX: 0, posY: this.height/2, edge: 'top' },
      { posX: 0, posY: -this.height/2, edge: 'bottom' },
      { posX: -this.width/2, posY: 0, edge: 'left' },
      { posX: this.width/2, posY: 0, edge: 'right' }
    ];

    for (let i = 0; i < this.resizeHandles.length; i++) {
      const handle = this.resizeHandles[i];
      const pos = handlePositions[i];
      handle.position.set(pos.posX, pos.posY, 0.003);
      // Make sure the edge info stays updated
      (handle as any).userData['edge'] = pos.edge;
      // Update resize handle material for debug mode
      handle.material = this.getHitboxMaterial('resizeHandle');
    }

    // Update text position
    if (this.textMesh) {
      this.textMesh.geometry.computeBoundingBox();
      const textWidth = this.textMesh.geometry.boundingBox!.max.x - this.textMesh.geometry.boundingBox!.min.x;
      this.textMesh.position.set(
        -textWidth / 2,
        this.height/2 - 0.04,
        0.004
      );
    }

    // Update top slices for debug mode
    if (this.debugMode) {
      this.updateDebugVisualization();
    }
  }

  private getTexture(): THREE.Texture {
    if (!this.texture) {
      const textureLoader = new THREE.TextureLoader();
      this.texture = textureLoader.load(this.texturePath);
    }
    return this.texture;
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
    const obj = clickedObject as any;
    if (obj.userData?.['isCloseButton']) {
      this.hide();
    }
  }

  startDrag(mouseX: number, mouseY: number): void {
    if (!this.isVisible || !this.camera) return;

    this.isDragging = true;
    this.dragStartPosition.set(mouseX, mouseY);
    this.windowStartPosition.copy(this.windowGroup.position);
  }

  startResize(mouseX: number, mouseY: number, edge: string): void {
    if (!this.isVisible || !this.camera) return;

    this.isResizing = true;
    this.resizeEdge = edge;
    this.dragStartPosition.set(mouseX, mouseY);
    this.windowStartPosition.copy(this.windowGroup.position);
    this.windowStartSize.set(this.width, this.height);
  }

  updateDrag(mouseX: number, mouseY: number): void {
    if (!this.camera) return;

    if (this.isDragging) {
      if (this.camera instanceof THREE.OrthographicCamera) {
        const frustumWidth = this.camera.right - this.camera.left;
        const frustumHeight = this.camera.top - this.camera.bottom;

        const deltaX = (mouseX - this.dragStartPosition.x) * frustumWidth;
        const deltaY = (mouseY - this.dragStartPosition.y) * frustumHeight;

        this.windowGroup.position.x = this.windowStartPosition.x + deltaX;
        this.windowGroup.position.y = this.windowStartPosition.y - deltaY;
      }
    } else if (this.isResizing) {
      if (this.camera instanceof THREE.OrthographicCamera) {
        const frustumWidth = this.camera.right - this.camera.left;
        const frustumHeight = this.camera.top - this.camera.bottom;

        const deltaX = (mouseX - this.dragStartPosition.x) * frustumWidth;
        const deltaY = (mouseY - this.dragStartPosition.y) * frustumHeight;

        let newWidth = this.windowStartSize.x;
        let newHeight = this.windowStartSize.y;
        let deltaPosX = 0;
        let deltaPosY = 0;

        // Calculate new dimensions based on which edge is being dragged
        switch (this.resizeEdge) {
          case 'right':
            newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, this.windowStartSize.x + deltaX));
            break;
          case 'left':
            newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, this.windowStartSize.x - deltaX));
            deltaPosX = deltaX / 2;
            break;
          case 'top':
            newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, this.windowStartSize.y - deltaY));
            deltaPosY = -deltaY / 2;
            break;
          case 'bottom':
            newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, this.windowStartSize.y + deltaY));
            deltaPosY = -deltaY / 2;
            break;
          case 'top-right':
            newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, this.windowStartSize.x + deltaX));
            newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, this.windowStartSize.y - deltaY));
            deltaPosY = -deltaY / 2;
            break;
          case 'top-left':
            newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, this.windowStartSize.x - deltaX));
            newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, this.windowStartSize.y - deltaY));
            deltaPosX = deltaX / 2;
            deltaPosY = -deltaY / 2;
            break;
          case 'bottom-right':
            newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, this.windowStartSize.x + deltaX));
            newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, this.windowStartSize.y + deltaY));
            deltaPosY = -deltaY / 2;
            break;
          case 'bottom-left':
            newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, this.windowStartSize.x - deltaX));
            newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, this.windowStartSize.y + deltaY));
            deltaPosX = deltaX / 2;
            deltaPosY = -deltaY / 2;
            break;
        }

        // Update window position to keep it centered during resize
        this.windowGroup.position.x = this.windowStartPosition.x + deltaPosX;
        this.windowGroup.position.y = this.windowStartPosition.y + deltaPosY;

        // Update window dimensions if they changed
        if (newWidth !== this.width || newHeight !== this.height) {
          this.width = newWidth;
          this.height = newHeight;
          this.updateWindowGeometry();
        }
      }
    }
  }

  stopDrag(): void {
    this.isDragging = false;
    this.isResizing = false;
    this.resizeEdge = '';
  }

  isResizable(): boolean {
    return true;
  }

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
    return this.isDragging || this.isResizing;
  }
}
