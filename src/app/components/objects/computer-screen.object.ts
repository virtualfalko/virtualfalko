import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { IconObject, IconConfig } from './icon.interface';
import { PopupWindowObject } from './windows/popup-window.object';
import { AboutMeWindowObject } from './windows/aboutme-window.object';

export class ComputerScreenObject {
  private background: THREE.Mesh | null = null;
  private icons: Map<string, IconObject> = new Map();
  private popupWindows: Map<string, any> = new Map();
  private textureLoader: THREE.TextureLoader;
  private font: Font | null = null;
  private windowGroup: THREE.Group = new THREE.Group();

  private iconConfigs: IconConfig[] = [
    {
      id: 'text-icon',
      texturePath: '/assets/computer/Icons/texticon.png',
      text: 'About me',
      position: { x: -0.6, y: 0.34 },
      size: 0.08,
      windowClass: AboutMeWindowObject,
    },
    {
      id: 'text-icon2',
      texturePath: '/assets/computer/Icons/texticon.png',
      text: 'Text2',
      position: { x: -0.6, y: 0.20 },
      size: 0.08,
      windowClass: PopupWindowObject
    },
  ];

  constructor(
    private position = { x: 0, y: 0.018, z: 2 },
    private width = 1.3,
    private height = 0.9
  ) {
    this.textureLoader = new THREE.TextureLoader();
    this.windowGroup.position.set(this.position.x, this.position.y, this.position.z);
  }

  async create(): Promise<void> {
    return new Promise((resolve) => {
      this.textureLoader.load(
        '/assets/computer/background.png',
        async (texture: THREE.Texture) => {
          const geometry = new THREE.PlaneGeometry(this.width, this.height);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
          });
          this.background = new THREE.Mesh(geometry, material);
          this.background.position.set(this.position.x, this.position.y, this.position.z);
          this.makeBackgroundClickable();

          await this.loadFont();
          await this.createIcons();
          this.hide();
          resolve();
        },
        undefined,
        () => resolve()
      );
    });
  }

  private async createIcons(): Promise<void> {
    if (!this.font) return;

    for (const config of this.iconConfigs) {
      const icon = new IconObject(config, this.font, this.handleIconClick.bind(this));
      const iconObject = icon.getObject();
      iconObject.position.set(
        this.position.x + config.position.x,
        this.position.y + config.position.y,
        this.position.z
      );

      iconObject.traverse((child: any) => {
        if (child.isMesh) {
          child.userData['clickable'] = true;
          child.userData['object'] = this;
          child.userData['isIcon'] = true;
        }
      });

      this.icons.set(config.id, icon);
      this.windowGroup.add(iconObject);
      await this.createPopupWindow(config);
    }
  }

  private async createPopupWindow(config: IconConfig): Promise<void> {
    const WindowClass = config.windowClass;

    // Check if it's an AboutMeWindow to enable debug
    const enableDebug = WindowClass.name === 'AboutMeWindowObject';

    const window = new WindowClass({
        x: this.position.x + config.position.x,
        y: this.position.y + config.position.y,
        z: this.position.z + 2
      },
      0.6, // width
      0.4, // height
      '/assets/computer/window.png', // texture path
      enableDebug // debug mode
    );

    await window.loadFont();
    window.hide();
    window.getObject().visible = false;

    window.getObject().traverse((child: any) => {
      if (child.isMesh) {
        child.renderOrder = 2;
      }
    });

    this.popupWindows.set(config.id, window);

    const icon = this.icons.get(config.id);
    if (icon) {
      icon.setAssociatedWindow(window);
    }
  }

  handleIconClick(clickedIcon: IconObject): void {
    const iconId = clickedIcon.getId();
    const window = this.popupWindows.get(iconId);

    if (window) {
      if (window.isWindowVisible()) {
        console.log('Hiding window:', iconId);
        window.hide();
      } else {
        console.log('Showing window:', iconId);
        window.show();
        window.getObject().visible = true;
      }
    }
  }

  handleIconClickByObject(clickedObject: THREE.Object3D): void {
    this.icons.forEach((icon) => {
      const iconObj = icon.getObject();
      if (clickedObject === iconObj ||
        iconObj.children.includes(clickedObject) ||
        clickedObject.parent === iconObj) {
        console.log('Icon clicked:', icon.getId());
        icon.handleClick();
        return;
      }
    });
  }

  addPopupWindowsToScene(scene: THREE.Scene): void {
    this.popupWindows.forEach(window => {
      scene.add(window.getObject());
      window.getObject().visible = false;
    });
  }

  setCamera(camera: THREE.Camera): void {
    this.popupWindows.forEach(window => {
      if (window.setCamera) {
        window.setCamera(camera);
      }
    });
  }

  handleBackgroundClick(): void {
  }

  show(): void {
    if (this.background) {
      this.background.scale.set(1, 1, 1);
      this.background.visible = true;
    }

    this.windowGroup.scale.set(1, 1, 1);
    this.windowGroup.visible = true;

    this.popupWindows.forEach(window => {
      window.hide();
      window.getObject().visible = false;
    });
  }

  hide(): void {
    if (this.background) {
      this.background.scale.set(0, 0, 0);
      this.background.visible = false;
    }

    this.windowGroup.scale.set(0, 0, 0);
    this.windowGroup.visible = false;

    this.popupWindows.forEach(window => {
      window.hide();
      window.getObject().visible = false;
      window.getObject().scale.set(0, 0, 0);
    });
  }

  private async loadFont(): Promise<void> {
    return new Promise((resolve, reject) => {
      const loader = new FontLoader();
      loader.load(
        '/assets/fonts/helvetiker_regular.typeface.json',
        (font: Font) => {
          this.font = font;
          resolve();
        },
        undefined,
        () => reject(new Error('Failed to load font'))
      );
    });
  }

  private makeBackgroundClickable(): void {
    if (!this.background) return;
    this.background.userData['clickable'] = true;
    this.background.userData['object'] = this;
    this.background.userData['isScreenBackground'] = true;
  }

  update(): void {
    this.popupWindows.forEach(window => {
      window.update();
    });
  }

  getObjects(): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    if (this.background) objects.push(this.background);
    objects.push(this.windowGroup);
    return objects;
  }
}
