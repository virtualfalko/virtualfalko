import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { WindowBase } from './window-base';
import { WindowGraphics } from './window-graphics';
import { WindowDebug } from './window-debug';

export abstract class ResizableWindow extends WindowBase {
  protected isResizing: boolean = false;
  protected resizeEdge: string = '';
  protected windowStartSize = new THREE.Vector2();
  protected slices: THREE.Mesh[] = [];
  protected dragArea!: THREE.Mesh;
  protected resizeHandles: THREE.Mesh[] = [];
  protected minWidth: number = 0.4;
  protected minHeight: number = 0.3;
  protected maxWidth: number = 1.0;
  protected maxHeight: number = 0.8;
  protected resizeHandleSize: number = 0.08;
  protected dragAreaPadding: number = 0.02;
  protected cornerSize: number = 0.04;

  protected graphics: WindowGraphics;
  protected debug?: WindowDebug;
  protected renderer?: THREE.WebGLRenderer;

  // HTML Textbox properties - ONLY for content
  protected contentText: string = '';
  protected titleText: string = 'Window';
  protected textboxElement: HTMLTextAreaElement | null = null;
  protected textboxContainer: HTMLDivElement | null = null;
  // REMOVED: textboxTitleElement since title is now part of window texture

  // Three.js title text mesh
  protected titleMesh: THREE.Mesh | null = null;

  constructor(
    position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    width: number = 0.6,
    height: number = 0.4,
    texturePath: string = '/assets/computer/window.png',
    enableDebug: boolean = false
  ) {
    super(position, width, height, texturePath);
    this.graphics = new WindowGraphics(texturePath);

    if (enableDebug) {
      this.debug = new WindowDebug();
    }

    this.createWindow();
  }

  // Abstract methods
  protected abstract createResizeHandles(): void;
  protected abstract updateWindowGeometry(): void;

  // HTML Textbox methods - ONLY for content
  protected createHTMLTextbox(): void {
    if (this.textboxContainer) {
      this.textboxContainer.remove();
    }

    // Create container for textbox (content only)
    this.textboxContainer = document.createElement('div');
    this.textboxContainer.style.position = 'absolute';
    this.textboxContainer.style.pointerEvents = 'auto';
    this.textboxContainer.style.overflow = 'hidden';
    this.textboxContainer.style.border = 'none';
    this.textboxContainer.style.backgroundColor = 'transparent';

    // Create textarea for content only
    this.textboxElement = document.createElement('textarea');
    this.textboxElement.value = this.contentText;
    this.textboxElement.style.width = '100%';
    this.textboxElement.style.height = '100%'; // Full height for content area
    this.textboxElement.style.backgroundColor = 'transparent';
    this.textboxElement.style.color = '#000000';
    this.textboxElement.style.fontSize = '14px';
    this.textboxElement.style.fontFamily = 'Arial, sans-serif';
    this.textboxElement.style.border = 'none';
    this.textboxElement.style.resize = 'none';
    this.textboxElement.style.outline = 'none';
    this.textboxElement.style.padding = '8px';
    this.textboxElement.style.margin = '0';
    this.textboxElement.style.overflow = 'auto';
    this.textboxElement.style.wordWrap = 'break-word';
    this.textboxElement.style.whiteSpace = 'pre-wrap';
    this.textboxElement.style.lineHeight = '1.4';
    this.textboxElement.readOnly = true;
    this.textboxElement.style.pointerEvents = 'auto';

    this.textboxContainer.appendChild(this.textboxElement);
    document.body.appendChild(this.textboxContainer);

    // Update position and size
    this.updateHTMLTextbox();
  }

  protected updateHTMLTextbox(): void {
    if (!this.textboxContainer || !this.camera || !(this.camera instanceof THREE.OrthographicCamera)) {
      return;
    }

    // Convert Three.js window position to screen coordinates
    const worldPosition = new THREE.Vector3();
    this.windowGroup.getWorldPosition(worldPosition);

    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const rendererSize = new THREE.Vector2();
    this.renderer?.getSize(rendererSize);

    // Convert world position to normalized device coordinates
    worldPosition.project(this.camera);

    // Convert NDC to screen coordinates
    const screenX = (worldPosition.x * 0.5 + 0.5) * canvasRect.width;
    const screenY = (1 - (worldPosition.y * 0.5 + 0.5)) * canvasRect.height;

    // Calculate window size in screen pixels
    const worldWidth = this.width;
    const worldHeight = this.height;

    // Convert world units to pixels
    const frustumWidth = this.camera.right - this.camera.left;
    const pixelWidth = (worldWidth / frustumWidth) * canvasRect.width;
    const pixelHeight = (worldHeight / frustumWidth) * canvasRect.width;

    // Adjust for window corners and title bar
    const cornerSizePx = (this.cornerSize / frustumWidth) * canvasRect.width;
    const titleBarHeightPx = cornerSizePx; // Title bar is same as corner size

    // Content area starts below title bar
    const contentWidth = pixelWidth - (2 * cornerSizePx);
    const contentHeight = pixelHeight - (2 * cornerSizePx) - titleBarHeightPx;

    // Position the textbox (content area)
    this.textboxContainer.style.left = `${screenX - pixelWidth/2 + cornerSizePx}px`;
    this.textboxContainer.style.top = `${screenY - pixelHeight/2 + (2 * cornerSizePx)}px`; // Start below title bar
    this.textboxContainer.style.width = `${contentWidth}px`;
    this.textboxContainer.style.height = `${contentHeight}px`;

    // Update content
    if (this.textboxElement) {
      this.textboxElement.value = this.contentText;
    }
  }

  protected destroyHTMLTextbox(): void {
    if (this.textboxContainer) {
      this.textboxContainer.remove();
      this.textboxContainer = null;
      this.textboxElement = null;
    }
  }

  // Create Three.js title text for the window bar
  protected createWindowTitle(font: Font): void {
    // Remove existing title mesh
    if (this.titleMesh) {
      this.windowGroup.remove(this.titleMesh);
      this.titleMesh.geometry.dispose();
      (this.titleMesh.material as THREE.Material).dispose();
      this.titleMesh = null;
    }

    // Create title geometry
    const titleGeometry = new TextGeometry(this.titleText, {
      font: font,
      size: 0.02, // Smaller size for title bar
      depth: 0.001,
      curveSegments: 4,
    });

    const titleMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000, // Black text for title
      transparent: true,
      opacity: 0.9
    });

    this.titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    this.titleMesh.renderOrder = 104;

    // Position title in the top bar (centered horizontally, near top of window)
    titleGeometry.computeBoundingBox();
    const titleWidth = titleGeometry.boundingBox!.max.x - titleGeometry.boundingBox!.min.x;

    this.titleMesh.position.set(
      -titleWidth / 2, // Center horizontally
      this.height/2 - this.cornerSize/2, // Position in title bar area
      0.002
    );

    this.windowGroup.add(this.titleMesh);
  }

  protected updateWindowTitlePosition(): void {
    if (!this.titleMesh || !this.currentFont) return;

    const geometry = this.titleMesh.geometry as TextGeometry;
    geometry.computeBoundingBox();
    const titleWidth = geometry.boundingBox!.max.x - geometry.boundingBox!.min.x;

    this.titleMesh.position.set(
      -titleWidth / 2,
      this.height/2 - this.cornerSize/2,
      0.002
    );
  }

  // Override createText to create both HTML textbox and Three.js title
  protected override createText(font: Font): void {
    // Remove any existing Three.js content text meshes
    if (this.textMesh) {
      this.windowGroup.remove(this.textMesh);
      this.textMesh.geometry.dispose();
      (this.textMesh.material as THREE.Material).dispose();
      this.textMesh = null;
    }

    // Create window title (Three.js text on title bar)
    this.createWindowTitle(font);

    // Create HTML textbox for content
    this.createHTMLTextbox();
  }

  // Public methods to set text
  setContentText(text: string): void {
    this.contentText = text;
    if (this.textboxElement) {
      this.textboxElement.value = text;
    }
  }

  setTitleText(text: string): void {
    this.titleText = text;
    if (this.currentFont && this.titleMesh) {
      // Update existing title geometry
      const oldGeometry = this.titleMesh.geometry as TextGeometry;
      oldGeometry.dispose();

      const newGeometry = new TextGeometry(text, {
        font: this.currentFont,
        size: 0.02,
        depth: 0.001,
        curveSegments: 4,
      });

      this.titleMesh.geometry = newGeometry;
      this.updateWindowTitlePosition();
    }
  }

  // Override resize handling
  private handleResize(mouseX: number, mouseY: number): void {
    if (!this.camera || !(this.camera instanceof THREE.OrthographicCamera)) return;

    const frustumWidth = this.camera.right - this.camera.left;
    const frustumHeight = this.camera.top - this.camera.bottom;

    const deltaX = (mouseX - this.dragStartPosition.x) * frustumWidth;
    const deltaY = (mouseY - this.dragStartPosition.y) * frustumHeight;

    let newWidth = this.windowStartSize.x;
    let newHeight = this.windowStartSize.y;
    let deltaPosX = 0;
    let deltaPosY = 0;

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

    this.windowGroup.position.x = this.windowStartPosition.x + deltaPosX;
    this.windowGroup.position.y = this.windowStartPosition.y + deltaPosY;

    if (newWidth !== this.width || newHeight !== this.height) {
      this.width = newWidth;
      this.height = newHeight;
      this.updateWindowGeometry();

      // Update window title position
      this.updateWindowTitlePosition();

      // Update HTML textbox continuously during resize
      this.updateHTMLTextbox();
    }
  }

  // Override drag handling
  override updateDrag(mouseX: number, mouseY: number): void {
    if (!this.camera) return;

    if (this.isDragging) {
      super.updateDrag(mouseX, mouseY);
      this.updateWindowTitlePosition();
      this.updateHTMLTextbox();
    } else if (this.isResizing) {
      this.handleResize(mouseX, mouseY);
    }
  }

  // Override visibility methods
  override show(): void {
    super.show();
    if (this.textboxContainer) {
      this.textboxContainer.style.display = 'block';
      this.updateHTMLTextbox();
    }
  }

  override hide(): void {
    super.hide();
    if (this.textboxContainer) {
      this.textboxContainer.style.display = 'none';
    }
  }

  override update(): void {
    super.update();
    // Update positions during animations
    if (this.isAnimating) {
      this.updateWindowTitlePosition();
      this.updateHTMLTextbox();
    }
  }

  // Clean up on destruction
  dispose(): void {
    this.destroyHTMLTextbox();

    // Clean up title mesh
    if (this.titleMesh) {
      this.windowGroup.remove(this.titleMesh);
      this.titleMesh.geometry.dispose();
      (this.titleMesh.material as THREE.Material).dispose();
      this.titleMesh = null;
    }

    super.hide();
  }

  // Resize functionality
  startResize(mouseX: number, mouseY: number, edge: string): void {
    if (!this.isVisible || !this.camera) return;
    this.isResizing = true;
    this.resizeEdge = edge;
    this.dragStartPosition.set(mouseX, mouseY);
    this.windowStartPosition.copy(this.windowGroup.position);
    this.windowStartSize.set(this.width, this.height);
  }

  // Override stopDrag
  override stopDrag(): void {
    super.stopDrag();
    this.isResizing = false;
    this.resizeEdge = '';
  }

  isResizable(): boolean {
    return true;
  }

  override isDraggingWindow(): boolean {
    return this.isDragging || this.isResizing;
  }

  // Method to set renderer for coordinate conversion
  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }
}
