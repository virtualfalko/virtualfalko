import * as THREE from 'three';
import { ResizableWindow } from './window-resizable';

export class AboutMeWindowObject extends ResizableWindow {
  private slicesData: Array<{ row: number; col: number }> = [];

  constructor(
    position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    width: number = 0.6,
    height: number = 0.4,
    texturePath: string = '/assets/computer/window.png',
    enableDebug: boolean = true
  ) {
    super(position, width, height, texturePath, enableDebug);
    // Set default content text
    this.setContentText('Cow tipping is the purported activity of sneaking up on any unsuspecting or sleeping upright cow and pushing it over for entertainment. The practice of cow tipping is generally considered an urban legend[1] and stories of such feats are viewed as tall tales.[2] The implication that rural citizens seek such entertainment due to lack of alternatives is viewed as a stereotype.[3][4] The concept of cow tipping apparently developed in the 1970s, though tales of animals that cannot rise if they fall has historical antecedents dating to the Roman Empire. ');
    this.setTitleText('Cow tipping');
  }

  // Override to return only corner handles
  protected getResizeHandlePositions(): Array<{ posX: number; posY: number; edge: string }> {
    return [
      // Only corner handles
      { posX: -this.width/2, posY: this.height/2, edge: 'top-left' },
      { posX: this.width/2, posY: this.height/2, edge: 'top-right' },
      { posX: -this.width/2, posY: -this.height/2, edge: 'bottom-left' },
      { posX: this.width/2, posY: -this.height/2, edge: 'bottom-right' }
    ];
  }

  createWindow(): void {
    this.createWindowSlices();
    this.createDragArea();
    this.createCloseButton();
    this.createResizeHandles();
    this.makeClickable();
  }

  private createWindowSlices(): void {
    const result = this.graphics.createWindowSlices(this.width, this.height, this.cornerSize);
    this.slices = result.slices;
    this.slicesData = result.slicesData;

    this.slices.forEach((slice, index) => {
      const data = result.slicesData[index];
      (slice as any).userData['sliceRow'] = data.row;
      (slice as any).userData['sliceCol'] = data.col;

      if (data.row === 0) { // Top row
        (slice as any).userData['clickable'] = true;
        (slice as any).userData['object'] = this;
        (slice as any).userData['isTopSlice'] = true;
      }
      this.windowGroup.add(slice);
    });
  }

  private createDragArea(): void {
    const dragAreaWidth = this.width + (2 * this.dragAreaPadding);
    const dragAreaHeight = this.cornerSize + (2 * this.dragAreaPadding);
    const dragAreaGeometry = new THREE.PlaneGeometry(dragAreaWidth, dragAreaHeight);

    const dragAreaMaterial = this.debug?.getHitboxMaterial('dragArea') || new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide
    });

    this.dragArea = new THREE.Mesh(dragAreaGeometry, dragAreaMaterial);
    this.dragArea.position.set(0, this.height/2, 0.001);
    this.dragArea.renderOrder = 101;

    (this.dragArea as any).userData['clickable'] = true;
    (this.dragArea as any).userData['object'] = this;
    (this.dragArea as any).userData['isTitleBar'] = true;

    this.windowGroup.add(this.dragArea);
  }

  private createCloseButton(): void {
    const closeButtonSize = 0.04;
    const closeButtonGeometry = new THREE.PlaneGeometry(closeButtonSize, closeButtonSize);

    const closeButtonMaterial = this.debug?.getHitboxMaterial('closeButton', new THREE.MeshBasicMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    }));

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

  protected createResizeHandles(): void {
    const handleSize = this.resizeHandleSize;
    const handleGeometry = new THREE.PlaneGeometry(handleSize, handleSize);
    const handleMaterial = this.debug?.getHitboxMaterial('resizeHandle') || new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide
    });

    const handlePositions = this.getResizeHandlePositions();

    for (const handlePos of handlePositions) {
      const resizeHandle = new THREE.Mesh(handleGeometry, handleMaterial);
      resizeHandle.position.set(handlePos.posX, handlePos.posY, 0.003);
      resizeHandle.renderOrder = 103;

      (resizeHandle as any).userData['edge'] = handlePos.edge;
      (resizeHandle as any).userData['isResizeHandle'] = true;
      (resizeHandle as any).userData['clickable'] = true;
      (resizeHandle as any).userData['object'] = this;

      this.resizeHandles.push(resizeHandle);
      this.windowGroup.add(resizeHandle);
    }
  }

  protected updateWindowGeometry(): void {
    // Update slices
    for (let i = 0; i < this.slices.length; i++) {
      const slice = this.slices[i];
      const row = (slice as any).userData['sliceRow'];
      const col = (slice as any).userData['sliceCol'];

      if (row !== undefined && col !== undefined) {
        this.graphics.updateSliceGeometry(slice, row, col, this.width, this.height, this.cornerSize);
      }
    }

    // Update drag area
    const dragAreaWidth = this.width + (2 * this.dragAreaPadding);
    const dragAreaHeight = this.cornerSize + (2 * this.dragAreaPadding);
    this.dragArea.geometry.dispose();
    this.dragArea.geometry = new THREE.PlaneGeometry(dragAreaWidth, dragAreaHeight);
    this.dragArea.position.set(0, this.height/2, 0.001);

    // Update close button position
    const closeButtonSize = 0.04;
    this.closeButton.position.set(
      this.width/2 - closeButtonSize/2 - 0.02,
      this.height/2 - closeButtonSize/2 - 0.02,
      0.002
    );

    // Update resize handle positions
    const handlePositions = this.getResizeHandlePositions();

    for (let i = 0; i < this.resizeHandles.length; i++) {
      const handle = this.resizeHandles[i];
      const pos = handlePositions[i];
      handle.position.set(pos.posX, pos.posY, 0.003);
      // Make sure the edge info stays updated
      (handle as any).userData['edge'] = pos.edge;
    }
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

  // Add debug toggle method
  toggleDebug(): void {
    if (this.debug) {
      this.debug.toggleDebugMode();
      this.updateDebugVisualization();
    }
  }

  private updateDebugVisualization(): void {
    // Update materials based on debug mode
    if (this.debug) {
      this.dragArea.material = this.debug.getHitboxMaterial('dragArea');

      this.resizeHandles.forEach(handle => {
        handle.material = this.debug!.getHitboxMaterial('resizeHandle');
      });

      this.closeButton.material = this.debug.getHitboxMaterial('closeButton', new THREE.MeshBasicMaterial({
        color: 0xff6b6b,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      }));
    }
  }
}
