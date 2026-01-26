import * as THREE from 'three';

export class WindowDebug {
  private debugMode: boolean = true;
  private debugMaterials: { [key: string]: THREE.Material } = {};

  constructor() {
    this.createDebugMaterials();
  }

  toggleDebugMode(): void {
    this.debugMode = !this.debugMode;
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  private createDebugMaterials(): void {
    this.debugMaterials = {
      dragArea: new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        wireframe: false
      }),
      resizeHandle: new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        wireframe: false
      }),
      closeButton: new THREE.MeshBasicMaterial({
        color: 0x0000ff,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        wireframe: false
      }),
      topSlice: new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        wireframe: false
      })
    };
  }

  getHitboxMaterial(type: string, defaultMaterial?: THREE.Material): THREE.Material {
    if (this.debugMode && this.debugMaterials[type]) {
      return this.debugMaterials[type];
    }

    return defaultMaterial || new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide
    });
  }

  getDebugMode(): boolean {
    return this.debugMode;
  }
}
