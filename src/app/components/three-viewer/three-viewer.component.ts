import { Component, ElementRef, AfterViewInit, OnDestroy, ViewChild, Output, EventEmitter } from '@angular/core';
import * as THREE from 'three';
import { IconObject } from '../objects/icon.interface';
import { SunObject } from '../objects/sun.object';
import { Sun2Object } from '../objects/sun2.object';
import { TvObject } from '../objects/tv.object';
import { BaloonObject } from '../objects/baloon.object';
import { ComputerScreenObject } from '../objects/computer-screen.object';
import { PopupWindowObject } from '../objects/windows/popup-window.object';
import { AboutMeWindowObject } from '../objects/windows/aboutme-window.object';

@Component({
  selector: 'app-three-viewer',
  templateUrl: './three-viewer.component.html',
  styleUrls: ['./three-viewer.component.css'],
  standalone: true
})
export class ThreeViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Output() tvZoomChange = new EventEmitter<boolean>();
  @Output() screenVisibleChange = new EventEmitter<boolean>();

  private scene: THREE.Scene | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private frameId: number = 0;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private isMouseDown: boolean = false;
  private draggingWindow: any = null;

  private sun1 = new SunObject();
  private sun2 = new Sun2Object();
  private tv = new TvObject();
  private baloon = new BaloonObject();

  async ngAfterViewInit(): Promise<void> {
    await this.init();
    window.addEventListener('resize', () => this.resize());

    this.setupEventListeners();

    this.tv.onZoomToggle = (isZoomed: boolean) => {
      this.handleTvZoom(isZoomed);
      this.tvZoomChange.emit(isZoomed);
    };

    this.tv.onScreenToggle = (visible: boolean) => {
      this.screenVisibleChange.emit(visible);
    };
  }

  private async init(): Promise<void> {
    const canvas = this.canvasRef.nativeElement;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();

    this.setupLights();
    this.updateCamera(canvas);

    await this.loadAndAddObjects();

    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene!.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 10, 10);
    this.scene!.add(directionalLight);
  }


  private async loadAndAddObjects(): Promise<void> {
    const objects = await Promise.all([
      this.sun1.load(),
      this.sun2.load(),
      this.tv.load(),
      this.baloon.load()
    ]);

    if (objects.every(obj => obj) && this.scene) {
      objects.forEach(model => this.scene!.add(model!));
      await this.tv.createScreen(this.scene);

      if (this.camera) {
        this.tv.getScreen().getObjects().forEach(obj => {
          const userData = obj.userData as any;
          if (userData && userData['object'] && userData['object'].setCamera) {
            userData['object'].setCamera(this.camera!);
          }
        });
      }
    }
  }

  private setupEventListeners(): void {
    const canvas = this.canvasRef.nativeElement;

    const eventHandlers = {
      click: (event: MouseEvent) => this.onCanvasClick(event),
      mousedown: (event: MouseEvent) => this.onMouseDown(event),
      mousemove: (event: MouseEvent) => this.onMouseMove(event),
      mouseup: () => this.onMouseUp()
    };

    (this as any)._eventHandlers = eventHandlers;

    canvas.addEventListener('click', eventHandlers.click);
    canvas.addEventListener('mousedown', eventHandlers.mousedown);
    canvas.addEventListener('mousemove', eventHandlers.mousemove);
    canvas.addEventListener('mouseup', eventHandlers.mouseup);
  }

  private removeEventListeners(): void {
    const canvas = this.canvasRef.nativeElement;
    const eventHandlers = (this as any)._eventHandlers;

    if (eventHandlers) {
      canvas.removeEventListener('click', eventHandlers.click);
      canvas.removeEventListener('mousedown', eventHandlers.mousedown);
      canvas.removeEventListener('mousemove', eventHandlers.mousemove);
      canvas.removeEventListener('mouseup', eventHandlers.mouseup);
    }
  }

  private getCanvasRect(): DOMRect {
    return this.canvasRef.nativeElement.getBoundingClientRect();
  }

  private calculateMouseCoordinates(event: MouseEvent, type: 'raycast' | 'drag' = 'raycast'): {x: number, y: number} {
    const canvas = this.canvasRef.nativeElement;
    const rect = this.getCanvasRect();

    const clientX = (event.clientX - rect.left) / canvas.clientWidth;
    const clientY = (event.clientY - rect.top) / canvas.clientHeight;

    if (type === 'raycast') {
      return {
        x: clientX * 2 - 1,
        y: -(clientY * 2 - 1)
      };
    } else {
      return { x: clientX, y: clientY };
    }
  }

  private handleObjectIntersection(intersects: THREE.Intersection[], handler: (targetObject: any, object: THREE.Object3D) => boolean): boolean {
    for (const intersect of intersects) {
      const object = intersect.object;
      if (object.userData['clickable'] && object.userData['object']) {
        const targetObject = object.userData['object'];
        if (handler(targetObject, object)) {
          return true;
        }
      }
    }
    return false;
  }

  private onMouseDown(event: MouseEvent): void {
    const { x, y } = this.calculateMouseCoordinates(event, 'raycast');
    this.mouse.set(x, y);

    this.raycaster.setFromCamera(this.mouse, this.camera!);

    if (!this.scene) return;

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    intersects.sort((a, b) => a.distance - b.distance);

    for (const intersect of intersects) {
      const object = intersect.object;
      if (object.userData['clickable'] && object.userData['object']) {
        const targetObject = object.userData['object'];

        if ((targetObject instanceof PopupWindowObject ||
            targetObject instanceof AboutMeWindowObject) &&
          object.userData['isTitleBar']) {

          this.isMouseDown = true;
          this.draggingWindow = targetObject;

          const dragCoords = this.calculateMouseCoordinates(event, 'drag');
          this.draggingWindow.startDrag(dragCoords.x, dragCoords.y);
          return;
        }
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isMouseDown || !this.draggingWindow) return;

    const { x, y } = this.calculateMouseCoordinates(event, 'drag');
    this.draggingWindow.updateDrag(x, y);
  }

  private onMouseUp(): void {
    if (this.draggingWindow) {
      this.draggingWindow.stopDrag();
    }
    this.isMouseDown = false;
    this.draggingWindow = null;
  }

  private handleTvZoom(isZoomed: boolean): void {
    if (!this.scene) return;

    if (isZoomed) {
      this.tv.hideOtherObjects(this.scene);
    } else {
      this.tv.showOtherObjects(this.scene);
    }
  }

  private onCanvasClick(event: MouseEvent): void {
    if (this.isMouseDown) return;

    const { x, y } = this.calculateMouseCoordinates(event, 'raycast');
    this.mouse.set(x, y);

    this.raycaster.setFromCamera(this.mouse, this.camera!);

    if (!this.scene) return;

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    intersects.sort((a, b) => a.distance - b.distance);

    for (const intersect of intersects) {
      const object = intersect.object;
      if (object.userData['clickable'] && object.userData['object']) {
        const targetObject = object.userData['object'];

        if (targetObject instanceof PopupWindowObject ||
          targetObject instanceof AboutMeWindowObject) {

          if (object.userData['isCloseButton']) {
            targetObject.handlePopupClick(object);
          }
          return;
        }

        if (targetObject instanceof IconObject) {
          targetObject.handleClick();
          return;
        }

        if (targetObject instanceof ComputerScreenObject) {
          if (object.userData['isIcon']) {
            targetObject.handleIconClickByObject(object);
            return;
          } else if (object.userData['isScreenBackground']) {
            targetObject.handleBackgroundClick();
            return;
          }
        }

        if (targetObject.handleClick) {
          targetObject.handleClick();
          return;
        }
      }
    }
  }

  private updateCamera(canvas: HTMLCanvasElement): void {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const aspect = width / height;
    const frustum = 1;

    if (!this.camera) {
      if (aspect > 1) {
        this.camera = new THREE.OrthographicCamera(-frustum * aspect, frustum * aspect, frustum, -frustum, 0.1, 1000);
      } else {
        this.camera = new THREE.OrthographicCamera(-frustum, frustum, frustum / aspect, -frustum / aspect, 0.1, 1000);
      }
      this.camera.position.z = 5;
    } else {
      if (aspect > 1) {
        this.camera.left = -frustum * aspect;
        this.camera.right = frustum * aspect;
        this.camera.top = frustum;
        this.camera.bottom = -frustum;
      } else {
        this.camera.left = -frustum;
        this.camera.right = frustum;
        this.camera.top = frustum / aspect;
        this.camera.bottom = -frustum / aspect;
      }
    }

    this.camera.updateProjectionMatrix();

    if (this.renderer) {
      this.renderer.setSize(width, height, false);
    }
  }

  private resize(): void {
    const canvas = this.canvasRef.nativeElement;
    if (canvas && this.renderer) {
      this.updateCamera(canvas);
    }
  }

  private animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);

    [this.sun1, this.sun2, this.tv, this.baloon].forEach(obj => obj.update());
    this.tv.getScreen().update();

    if (this.scene && this.camera && this.renderer) {
      this.renderer.sortObjects = false;
      this.renderer.render(this.scene, this.camera);
    }
  };

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', () => this.resize());

    this.removeEventListeners();
    this.renderer?.dispose();
  }
}
