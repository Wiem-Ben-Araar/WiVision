import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';

// Constants
const MAINCOLOR = 0xDDDDDD;
const ACCENTCOLOR = 0XF2F5CE;
const OUTLINECOLOR = 0xCCCCCC;
const toRad = Math.PI / 180;
const TWOPI = 2 * Math.PI;

// Face constants
const FACES = {
  TOP: 1,
  FRONT: 2,
  RIGHT: 3,
  BACK: 4,
  LEFT: 5,
  BOTTOM: 6,

  TOP_FRONT_EDGE: 7,
  TOP_RIGHT_EDGE: 8,
  TOP_BACK_EDGE: 9,
  TOP_LEFT_EDGE: 10,

  FRONT_RIGHT_EDGE: 11,
  BACK_RIGHT_EDGE: 12,
  BACK_LEFT_EDGE: 13,
  FRONT_LEFT_EDGE: 14,

  BOTTOM_FRONT_EDGE: 15,
  BOTTOM_RIGHT_EDGE: 16,
  BOTTOM_BACK_EDGE: 17,
  BOTTOM_LEFT_EDGE: 18,

  TOP_FRONT_RIGHT_CORNER: 19,
  TOP_BACK_RIGHT_CORNER: 20,
  TOP_BACK_LEFT_CORNER: 21,
  TOP_FRONT_LEFT_CORNER: 22,

  BOTTOM_FRONT_RIGHT_CORNER: 23,
  BOTTOM_BACK_RIGHT_CORNER: 24,
  BOTTOM_BACK_LEFT_CORNER: 25,
  BOTTOM_FRONT_LEFT_CORNER: 26
};

// Helper function to calculate angle delta
function calculateAngleDelta(from: number, to: number): number {
  const direct = to - from;
  const altA = direct - TWOPI;
  const altB = direct + TWOPI;
  if (Math.abs(direct) > Math.abs(altA)) {
    return altA;
  }
  else if (Math.abs(direct) > Math.abs(altB)) {
    return altB;
  }
  return direct;
}

// Helper function to create text sprite
function createTextSprite(text: string, props: any): THREE.Texture {
  const fontface = props.font || 'Helvetica';
  const fontsize = props.fontSize || 30;
  const width = props.width || 200;
  const height = props.height || 200;
  const bgColor = props.bgColor ? props.bgColor.join(', ') : "255, 255, 255, 1.0";
  const fgColor = props.color ? props.color.join(', ') : "0, 0, 0, 1.0";
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  context.font = `bold ${fontsize}px ${fontface}`;
  context.fillStyle = `rgba(${bgColor})`;
  context.fillRect(0, 0, width, height);
  
  // Get size data (height depends only on font size)
  const metrics = context.measureText(text);
  const textWidth = metrics.width;
  
  // Text color
  context.fillStyle = `rgba(${fgColor})`;
  context.fillText(text, width / 2 - textWidth / 2, height / 2 + fontsize / 2 - 2);
  
  // Canvas contents will be used for a texture
  const texture = new THREE.Texture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  
  return texture;
}

// Define face configurations
const BOX_FACES = [
  {
    name: FACES.FRONT,
    map: null as THREE.Texture | null
  },
  {
    name: FACES.RIGHT,
    map: null as THREE.Texture | null
  },
  {
    name: FACES.BACK,
    map: null as THREE.Texture | null
  },
  {
    name: FACES.LEFT,
    map: null as THREE.Texture | null
  },
  {
    name: FACES.TOP,
    map: null as THREE.Texture | null
  },
  {
    name: FACES.BOTTOM,
    map: null as THREE.Texture | null
  }
];

const CORNER_FACES = [
  { name: FACES.TOP_FRONT_RIGHT_CORNER },
  { name: FACES.TOP_BACK_RIGHT_CORNER },
  { name: FACES.TOP_BACK_LEFT_CORNER },
  { name: FACES.TOP_FRONT_LEFT_CORNER },
  { name: FACES.BOTTOM_BACK_RIGHT_CORNER },
  { name: FACES.BOTTOM_FRONT_RIGHT_CORNER },
  { name: FACES.BOTTOM_FRONT_LEFT_CORNER },
  { name: FACES.BOTTOM_BACK_LEFT_CORNER }
];

const EDGE_FACES = [
  { name: FACES.TOP_FRONT_EDGE },
  { name: FACES.TOP_RIGHT_EDGE },
  { name: FACES.TOP_BACK_EDGE },
  { name: FACES.TOP_LEFT_EDGE },
  // Flip back and front bottom edges
  { name: FACES.BOTTOM_BACK_EDGE },
  { name: FACES.BOTTOM_RIGHT_EDGE },
  { name: FACES.BOTTOM_FRONT_EDGE },
  { name: FACES.BOTTOM_LEFT_EDGE },
];

const EDGE_FACES_SIDE = [
  { name: FACES.FRONT_RIGHT_EDGE },
  { name: FACES.BACK_RIGHT_EDGE },
  { name: FACES.BACK_LEFT_EDGE },
  { name: FACES.FRONT_LEFT_EDGE }
];

// Merge them all to ease the traversing
const CUBE_FACES = [...BOX_FACES, ...CORNER_FACES, ...EDGE_FACES, ...EDGE_FACES_SIDE];

// ViewCube class
class ViewCube extends THREE.Object3D {
  private _cubeSize: number;
  private _edgeSize: number;
  private _outline: boolean;
  private _bgColor: number;
  private _hoverColor: number;
  private _outlineColor: number;

  constructor({
    size = 60,
    edge = 5,
    outline = true,
    bgColor = 0xCCCCCC,
    hoverColor = 0xFFFFFF,
    outlineColor = 0x999999
  }) {
    super();
    this._cubeSize = size;
    this._edgeSize = edge;
    this._outline = outline;
    this._bgColor = bgColor;
    this._hoverColor = hoverColor;
    this._outlineColor = outlineColor;
    this._build();
  }

  _build(): void {
    // Initialize text textures
    BOX_FACES[0].map = createTextSprite("FRONT", { fontSize: 60, font: "Arial Narrow, sans-serif" });
    BOX_FACES[1].map = createTextSprite("RIGHT", { fontSize: 60, font: "Arial Narrow, sans-serif" });
    BOX_FACES[2].map = createTextSprite("BACK", { fontSize: 60, font: "Arial Narrow, sans-serif" });
    BOX_FACES[3].map = createTextSprite("LEFT", { fontSize: 60, font: "Arial Narrow, sans-serif" });
    BOX_FACES[4].map = createTextSprite("TOP", { fontSize: 60, font: "Arial Narrow, sans-serif" });
    BOX_FACES[5].map = createTextSprite("BOTTOM", { fontSize: 60, font: "Arial Narrow, sans-serif" });

    const faceSize = this._cubeSize - this._edgeSize * 2;
    const faceOffset = this._cubeSize / 2;
    const borderSize = this._edgeSize;

    /* faces: front, right, back, left, top, bottom */
    const cubeFaces = this._createCubeFaces(faceSize, faceOffset);
    for (let [i, props] of BOX_FACES.entries()) {
      cubeFaces.children[i].name = props.name.toString();
      (cubeFaces.children[i] as THREE.Mesh).material = new THREE.MeshBasicMaterial({ 
        color: this._bgColor,
        map: props.map
      });
    }
    this.add(cubeFaces);

    /* corners: top, bottom */
    const corners: THREE.Object3D[] = [];
    for (let [i, props] of CORNER_FACES.entries()) {
      const corner = this._createCornerFaces(borderSize, faceOffset, props.name.toString(), { color: this._bgColor });
      corner.rotateOnAxis(new THREE.Vector3(0, 1, 0), (i % 4) * 90 * toRad);
      corners.push(corner);
    }
    const topCorners = new THREE.Group();
    const bottomCorners = new THREE.Group();
    this.add(topCorners.add(...corners.slice(0, 4)));
    this.add(bottomCorners.add(...corners.slice(4)).rotateOnAxis(new THREE.Vector3(1, 0, 0), 180 * toRad));

    /* edges: top + bottom */
    const edges: THREE.Object3D[] = [];
    for (let [i, props] of EDGE_FACES.entries()) {
      const edge = this._createHorzEdgeFaces(faceSize, borderSize, faceOffset, props.name.toString(), { color: this._bgColor });
      edge.rotateOnAxis(new THREE.Vector3(0, 1, 0), (i % 4) * 90 * toRad);
      edges.push(edge);
    }
    const topEdges = new THREE.Group();
    const bottomEdges = new THREE.Group();
    this.add(topEdges.add(...edges.slice(0, 4)));
    this.add(bottomEdges.add(...edges.slice(4)).rotateOnAxis(new THREE.Vector3(1, 0, 0), 180 * toRad));

    /* edges on the side */
    const sideEdges = new THREE.Group();
    for (let [i, props] of EDGE_FACES_SIDE.entries()) {
      const edge = this._createVertEdgeFaces(borderSize, faceSize, faceOffset, props.name.toString(), { color: this._bgColor });
      edge.rotateOnAxis(new THREE.Vector3(0, 1, 0), i * 90 * toRad);
      sideEdges.add(edge);
    }
    this.add(sideEdges);

    if (this._outline) {
      this.add(this._createCubeOutline(this._cubeSize));
    }
  }

  _createFace(size: number | number[], position: number[], { axis = [0, 1, 0], angle = 0, name = "", matProps = {} } = {}): THREE.Mesh {
    if (!Array.isArray(size)) size = [size, size];
    const material = new THREE.MeshBasicMaterial(matProps);
    const geometry = new THREE.PlaneGeometry(size[0], size[1]);
    const face = new THREE.Mesh(geometry, material);
    face.name = name;
    face.rotateOnAxis(new THREE.Vector3(...axis), angle * toRad);
    face.position.set(...position);
    return face;
  }

  _createCubeFaces(faceSize: number, offset: number): THREE.Object3D {
    const faces = new THREE.Object3D();
    faces.add(this._createFace(faceSize, [0, 0, offset], { axis: [0, 1, 0], angle: 0 }));
    faces.add(this._createFace(faceSize, [offset, 0, 0], { axis: [0, 1, 0], angle: 90 }));
    faces.add(this._createFace(faceSize, [0, 0, -offset], { axis: [0, 1, 0], angle: 180 }));
    faces.add(this._createFace(faceSize, [-offset, 0, 0], { axis: [0, 1, 0], angle: 270 }));
    faces.add(this._createFace(faceSize, [0, offset, 0], { axis: [1, 0, 0], angle: -90 }));
    faces.add(this._createFace(faceSize, [0, -offset, 0], { axis: [1, 0, 0], angle: 90 }));
    return faces;
  }

  _createCornerFaces(faceSize: number, offset: number, name = "", matProps = {}): THREE.Object3D {
    const corner = new THREE.Object3D();
    const borderOffset = offset - faceSize / 2;
    corner.add(this._createFace(faceSize, [borderOffset, borderOffset, offset], { axis: [0, 1, 0], angle: 0, matProps, name }));
    corner.add(this._createFace(faceSize, [offset, borderOffset, borderOffset], { axis: [0, 1, 0], angle: 90, matProps, name }));
    corner.add(this._createFace(faceSize, [borderOffset, offset, borderOffset], { axis: [1, 0, 0], angle: -90, matProps, name }));
    return corner;
  }

  _createHorzEdgeFaces(w: number, h: number, offset: number, name = "", matProps = {}): THREE.Object3D {
    const edge = new THREE.Object3D();
    const borderOffset = offset - h / 2;
    edge.add(this._createFace([w, h], [0, borderOffset, offset], { axis: [0, 1, 0], angle: 0, name, matProps }));
    edge.add(this._createFace([w, h], [0, offset, borderOffset], { axis: [1, 0, 0], angle: -90, name, matProps }));
    return edge;
  }

  _createVertEdgeFaces(w: number, h: number, offset: number, name = "", matProps = {}): THREE.Object3D {
    const edge = new THREE.Object3D();
    const borderOffset = offset - w / 2;
    edge.add(this._createFace([w, h], [borderOffset, 0, offset], { axis: [0, 1, 0], angle: 0, name, matProps }));
    edge.add(this._createFace([w, h], [offset, 0, borderOffset], { axis: [0, 1, 0], angle: 90, name, matProps }));
    return edge;
  }

  _createCubeOutline(size: number): THREE.LineSegments {
    const geometry = new THREE.BoxGeometry(size, size, size);
    const geo = new THREE.EdgesGeometry(geometry);
    const mat = new THREE.LineBasicMaterial({ color: this._outlineColor, linewidth: 1 });
    const wireframe = new THREE.LineSegments(geo, mat);
    return wireframe;
  }
}

// ViewCubeControls class
class ViewCubeControls extends THREE.EventDispatcher {
  private cubeSize: number;
  private edgeSize: number;
  private domElement: HTMLElement;
  private _cube: ViewCube;
  private _camera: THREE.Camera;
  private _animation: any;

  constructor(camera: THREE.Camera, cubeSize = 30, edgeSize = 5, domElement: HTMLElement) {
    super();
    this.cubeSize = cubeSize;
    this.edgeSize = edgeSize;
    this.domElement = domElement;
    this._cube = new ViewCube({
      size: this.cubeSize,
      edge: this.edgeSize,
      outline: true,
      bgColor: MAINCOLOR,
      hoverColor: ACCENTCOLOR,
      outlineColor: OUTLINECOLOR
    });
    this._camera = camera;
    this._animation = null;
    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleMouseClick = this._handleMouseClick.bind(this);
    this._listen();
  }

  _listen(): void {
    this.domElement.addEventListener('mousemove', this._handleMouseMove);
    this.domElement.addEventListener('click', this._handleMouseClick);
  }

  _handleMouseClick(event: MouseEvent): void {
    const x = (event.offsetX / (event.target as HTMLElement).clientWidth) * 2 - 1;
    const y = -(event.offsetY / (event.target as HTMLElement).clientHeight) * 2 + 1;
    this._checkSideTouch(x, y);
  }

  _checkSideTouch(x: number, y: number): void {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x, y }, this._camera);
    const intersects = raycaster.intersectObjects(this._cube.children, true);
    if (intersects.length) {
      for (let { object } of intersects) {
        if (object.name) {
          this._rotateTheCube(parseInt(object.name));
          break;
        }
      }
    }
  }

  _rotateTheCube(side: number): void {
    switch (side) {
      case FACES.FRONT:
        this._setCubeAngles(0, 0, 0);
        break;
      case FACES.RIGHT:
        this._setCubeAngles(0, -90, 0);
        break;
      case FACES.BACK:
        this._setCubeAngles(0, -180, 0);
        break;
      case FACES.LEFT:
        this._setCubeAngles(0, -270, 0);
        break;
      case FACES.TOP:
        this._setCubeAngles(90, 0, 0);
        break;
      case FACES.BOTTOM:
        this._setCubeAngles(-90, 0, 0);
        break;

      case FACES.TOP_FRONT_EDGE:
        this._setCubeAngles(45, 0, 0);
        break;
      case FACES.TOP_RIGHT_EDGE:
        this._setCubeAngles(45, -90, 0);
        break;
      case FACES.TOP_BACK_EDGE:
        this._setCubeAngles(45, -180, 0);
        break;
      case FACES.TOP_LEFT_EDGE:
        this._setCubeAngles(45, -270, 0);
        break;

      case FACES.BOTTOM_FRONT_EDGE:
        this._setCubeAngles(-45, 0, 0);
        break;
      case FACES.BOTTOM_RIGHT_EDGE:
        this._setCubeAngles(-45, -90, 0);
        break;
      case FACES.BOTTOM_BACK_EDGE:
        this._setCubeAngles(-45, -180, 0);
        break;
      case FACES.BOTTOM_LEFT_EDGE:
        this._setCubeAngles(-45, -270, 0);
        break;

      case FACES.FRONT_RIGHT_EDGE:
        this._setCubeAngles(0, -45, 0);
        break;
      case FACES.BACK_RIGHT_EDGE:
        this._setCubeAngles(0, -135, 0);
        break;
      case FACES.BACK_LEFT_EDGE:
        this._setCubeAngles(0, -225, 0);
        break;
      case FACES.FRONT_LEFT_EDGE:
        this._setCubeAngles(0, -315, 0);
        break;

      case FACES.TOP_FRONT_RIGHT_CORNER:
        this._setCubeAngles(45, -45, 0);
        break;
      case FACES.TOP_BACK_RIGHT_CORNER:
        this._setCubeAngles(45, -135, 0);
        break;
      case FACES.TOP_BACK_LEFT_CORNER:
        this._setCubeAngles(45, -225, 0);
        break;
      case FACES.TOP_FRONT_LEFT_CORNER:
        this._setCubeAngles(45, -315, 0);
        break;

      case FACES.BOTTOM_FRONT_RIGHT_CORNER:
        this._setCubeAngles(-45, -45, 0);
        break;
      case FACES.BOTTOM_BACK_RIGHT_CORNER:
        this._setCubeAngles(-45, -135, 0);
        break;
      case FACES.BOTTOM_BACK_LEFT_CORNER:
        this._setCubeAngles(-45, -225, 0);
        break;
      case FACES.BOTTOM_FRONT_LEFT_CORNER:
        this._setCubeAngles(-45, -315, 0);
        break;

      default:
        break;
    }
  }

  _setCubeAngles(x: number, y: number, z: number): void {
    const base = this._cube.rotation;
    this._animation = {
      base: {
        x: base.x,
        y: base.y,
        z: base.z
      },
      delta: {
        x: calculateAngleDelta(base.x, x * toRad),
        y: calculateAngleDelta(base.y, y * toRad),
        z: calculateAngleDelta(base.z, z * toRad)
      },
      duration: 500,
      time: Date.now()
    };
  }

  _handleMouseMove(event: MouseEvent): void {
    const x = (event.offsetX / (event.target as HTMLElement).clientWidth) * 2 - 1;
    const y = -(event.offsetY / (event.target as HTMLElement).clientHeight) * 2 + 1;
    this._checkSideOver(x, y);
  }

  _checkSideOver(x: number, y: number): void {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x, y }, this._camera);
    const intersects = raycaster.intersectObjects(this._cube.children, true);
    
    // Unhover
    this._cube.traverse(function (obj) {
      if (obj.name && obj instanceof THREE.Mesh) {
        obj.material.color.setHex(MAINCOLOR);
      }
    });
    
    // Check hover
    if (intersects.length) {
      for (let { object } of intersects) {
        if (object.name) {
          if (object instanceof THREE.Mesh) {
            object.material.color.setHex(ACCENTCOLOR);
          }
          break;
        }
      }
    }
  }

  update(): void {
    this._animate();
  }

  _animate(): void {
    if (!this._animation) return;
    const now = Date.now();
    const { duration, time } = this._animation;
    const alpha = Math.min(((now - time) / duration), 1);
    this._animateCubeRotation(this._animation, alpha);
    if (alpha === 1) this._animation = null;
    this.dispatchEvent({
      type: 'angle-change',
      quaternion: this._cube.quaternion.clone()
    });
  }

  _animateCubeRotation({ base, delta }: any, alpha: number): void {
    const ease = (Math.sin(((alpha * 2) - 1) * Math.PI * 0.5) + 1) * 0.5;
    let angleX = -TWOPI + base.x + delta.x * ease;
    let angleY = -TWOPI + base.y + delta.y * ease;
    let angleZ = -TWOPI + base.z + delta.z * ease;
    this._cube.rotation.set(angleX % TWOPI, angleY % TWOPI, angleZ % TWOPI);
  }

  setQuaternion(quaternion: THREE.Quaternion): void {
    this._cube.setRotationFromQuaternion(quaternion);
  }

  getObject(): THREE.Object3D {
    return this._cube;
  }
  
  /**
   * Clean up event listeners when component unmounts
   */
  dispose(): void {
    this.domElement.removeEventListener('mousemove', this._handleMouseMove);
    this.domElement.removeEventListener('click', this._handleMouseClick);
  }
}

// Interface pour la ref exposée
interface ViewCubeRef {
  setQuaternion: (quaternion: THREE.Quaternion) => void;
}

// React component with forwardRef for ref access
const ViewCubeComponent = forwardRef<ViewCubeRef, {
  onViewChange?: (quaternion: THREE.Quaternion) => void;
  size?: number;
  className?: string;
}>(({ onViewChange, size = 100, className = "" }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [controls, setControls] = useState<ViewCubeControls | null>(null);
  
  // Expose setQuaternion method via ref
  useImperativeHandle(ref, () => ({
    setQuaternion: (quaternion: THREE.Quaternion) => {
      if (controls) {
        controls.setQuaternion(quaternion);
      }
    }
  }));
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(0, 0, 120);
    camera.lookAt(0, 0, 0);
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(size, size);
    containerRef.current.appendChild(renderer.domElement);
    
    // Create controls
    const cubeControls = new ViewCubeControls(camera, 60, 6, renderer.domElement);
    setControls(cubeControls);
    
    // Add cube to scene
    scene.add(cubeControls.getObject());
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);
    
    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      cubeControls.update();
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Clean up
    return () => {
      cancelAnimationFrame(animationId);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      cubeControls.dispose();
      renderer.dispose();
    };
  }, [size]);
  
  // Set up event listener for view change
  useEffect(() => {
    if (!controls || !onViewChange) return;
    
    const handleViewChange = (event: any) => {
      if (onViewChange) {
        onViewChange(event.quaternion);
      }
    };
    
    controls.addEventListener('angle-change', handleViewChange);
    
    return () => {
      controls?.removeEventListener('angle-change', handleViewChange);
    };
  }, [controls, onViewChange]);
  
  return (
    <div 
      ref={containerRef} 
      className={`viewcube-container ${className}`}
      style={{ 
        width: size, 
        height: size, 
        backgroundColor: '#fff',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    />
  );
});

export default ViewCubeComponent;