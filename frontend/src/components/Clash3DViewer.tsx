'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface ClashGeometry {
  vertices: number[][];
  faces: number[][];
  color: number[];
}

interface ClashSphere {
  position: number[];
  radius: number;
}

interface Visualization {
  geometries: {
    element_a: ClashGeometry;
    element_b: ClashGeometry;
  };
  clash_sphere: ClashSphere;
}

interface Clash3DViewerProps {
  clashes: any[];
  visualData: Visualization[];
}

export default function Clash3DViewer({ clashes, visualData }: Clash3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>(new THREE.Scene());
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const focusOnPosition = useCallback((position: number[], distance = 5) => {
    if (!cameraRef.current || !controlsRef.current) return;
    
    const [x, y, z] = position;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    
    // Animation fluide
    new TWEEN.Tween(camera.position)
        .to({ x: x + distance, y: y + distance, z: z + distance }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    
    new TWEEN.Tween(controls.target)
        .to({ x, y, z }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
}, []);

// Ajout à la boucle d'animation
const animate = () => {
    requestAnimationFrame(animate);
    TWEEN.update();
    controlsRef.current?.update();
    rendererRef.current?.render(sceneRef.current, cameraRef.current!);
};

  useEffect(() => {
    if (!containerRef.current || !visualData || visualData.length === 0) return;

    // Setup scene
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Camera setup
    cameraRef.current = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    
    // Renderer setup
    rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current.setSize(width, height);
    rendererRef.current.setClearColor(0xf0f0f0);
    containerRef.current.appendChild(rendererRef.current.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    sceneRef.current.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    sceneRef.current.add(directionalLight);

    // Controls
    controlsRef.current = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
    controlsRef.current.enableDamping = true;
    controlsRef.current.dampingFactor = 0.05;
    
    // Position camera initially
    cameraRef.current.position.set(5, 5, 5);
    controlsRef.current.update();

    // Load geometries
    loadClashGeometries();

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    
    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [visualData]);

  const loadClashGeometries = () => {
    if (!visualData || visualData.length === 0) return;
    
    // Clear existing meshes
    sceneRef.current.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        } else if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        }
        sceneRef.current.remove(child);
      }
    });

    // Add clash elements
    visualData.forEach((item, index) => {
      if (item.geometries && item.geometries.element_a && item.geometries.element_b) {
        // Element A
        addGeometry(
          item.geometries.element_a,
          new THREE.Color(0x66bb6a), // Green
          0.7,
          `element-a-${index}`
        );
        
        // Element B
        addGeometry(
          item.geometries.element_b,
          new THREE.Color(0xef5350), // Red
          0.7,
          `element-b-${index}`
        );

        // Add clash sphere at collision point
        if (item.clash_sphere) {
          const sphereGeometry = new THREE.SphereGeometry(item.clash_sphere.radius || 0.1, 16, 16);
          const sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0xffeb3b, // Yellow
            transparent: true,
            opacity: 0.5,
          });
          
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.set(
            item.clash_sphere.position[0],
            item.clash_sphere.position[1],
            item.clash_sphere.position[2]
          );
          sphere.name = `clash-sphere-${index}`;
          sceneRef.current.add(sphere);
        }
      }
    });

    // Add grid helper
    const gridHelper = new THREE.GridHelper(20, 20);
    sceneRef.current.add(gridHelper);

    // Center and focus camera on content
    const bbox = new THREE.Box3().setFromObject(sceneRef.current);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current?.fov || 75;
    const cameraDistance = maxDim / (2 * Math.tan(fov * Math.PI / 360));
    
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(
        center.x + cameraDistance,
        center.y + cameraDistance,
        center.z + cameraDistance
      );
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  };

  const addGeometry = (geomData: ClashGeometry, color: THREE.Color, opacity: number, name: string) => {
    if (!geomData?.vertices?.length || !geomData?.faces?.length) return;

    try {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(geomData.vertices.flat()), 3));
        geometry.setIndex(geomData.faces.flat());
        geometry.computeVertexNormals();

        // Création des niveaux de détail
        const lod = new THREE.LOD();
        
        // Haute résolution
        const detailedMaterial = new THREE.MeshPhongMaterial({
            color,
            transparent: true,
            opacity,
            side: THREE.DoubleSide
        });
        lod.addLevel(new THREE.Mesh(geometry, detailedMaterial), 50);

        // Basse résolution (simplifiée)
        const simplifiedGeometry = simplifyGeometry(geometry);
        const simplifiedMaterial = detailedMaterial.clone();
        lod.addLevel(new THREE.Mesh(simplifiedGeometry, simplifiedMaterial), 200);

        lod.name = name;
        sceneRef.current.add(lod);

    } catch (error) {
        console.error("Error creating LOD geometry:", error);
    }
};

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-gray-100 rounded-md"
      style={{ minHeight: "500px" }}
    />
  );
}