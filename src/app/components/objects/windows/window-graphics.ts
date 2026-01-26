import * as THREE from 'three';

export class WindowGraphics {
  private texture: THREE.Texture | null = null;
  private textureLoader = new THREE.TextureLoader();

  constructor(private texturePath: string) {}

  getTexture(): THREE.Texture {
    if (!this.texture) {
      this.texture = this.textureLoader.load(this.texturePath);
    }
    return this.texture;
  }

  createWindowSlices(width: number, height: number, cornerSize: number = 0.04): {
    slices: THREE.Mesh[];
    slicesData: Array<{ row: number; col: number }>
  } {
    const texture = this.getTexture();
    const uvTileSize = 1/3;
    const slices: THREE.Mesh[] = [];
    const slicesData: Array<{ row: number; col: number }> = [];

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        let sliceWidth, sliceHeight;
        let posX, posY;

        if (col === 0) {
          sliceWidth = cornerSize;
          posX = -width/2 + cornerSize/2;
        } else if (col === 1) {
          sliceWidth = width - (2 * cornerSize);
          posX = 0;
        } else {
          sliceWidth = cornerSize;
          posX = width/2 - cornerSize/2;
        }

        if (row === 0) {
          sliceHeight = cornerSize;
          posY = height/2 - cornerSize/2;
        } else if (row === 1) {
          sliceHeight = height - (2 * cornerSize);
          posY = 0;
        } else {
          sliceHeight = cornerSize;
          posY = -height/2 + cornerSize/2;
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

        slices.push(slice);
        slicesData.push({ row, col });
      }
    }

    return { slices, slicesData };
  }

  updateSliceGeometry(slice: THREE.Mesh, row: number, col: number, width: number, height: number, cornerSize: number): void {
    const uvTileSize = 1/3;

    let sliceWidth, sliceHeight;
    let posX, posY;

    if (col === 0) {
      sliceWidth = cornerSize;
      posX = -width/2 + cornerSize/2;
    } else if (col === 1) {
      sliceWidth = width - (2 * cornerSize);
      posX = 0;
    } else {
      sliceWidth = cornerSize;
      posX = width/2 - cornerSize/2;
    }

    if (row === 0) {
      sliceHeight = cornerSize;
      posY = height/2 - cornerSize/2;
    } else if (row === 1) {
      sliceHeight = height - (2 * cornerSize);
      posY = 0;
    } else {
      sliceHeight = cornerSize;
      posY = -height/2 + cornerSize/2;
    }

    // Create new geometry
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

    // Dispose old geometry and assign new one
    slice.geometry.dispose();
    slice.geometry = newGeometry;

    // Update position
    slice.position.set(posX, posY, 0);
  }
}
