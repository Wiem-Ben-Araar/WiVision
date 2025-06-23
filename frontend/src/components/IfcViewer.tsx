"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { IFCLoader } from "web-ifc-three/IFCLoader";
import { Button } from "@/components/ui/button";
import {ZoomIn, ZoomOut, RotateCw, Home } from "lucide-react";

export default function IFCViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
 
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const [controls, setControls] = useState<OrbitControls | null>(null);

  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const currentContainer = containerRef.current; // Stockez la référence actuelle
  
    if (!currentContainer) return;
  
    // Scene setup
    const newScene = new THREE.Scene();
    newScene.background = new THREE.Color(0xf0f0f0);
  
    // Camera setup
    const newCamera = new THREE.PerspectiveCamera(
      75,
      currentContainer.clientWidth / currentContainer.clientHeight,
      0.1,
      1000
    );
    newCamera.position.set(5, 5, 5);
  
    // Renderer setup
    const newRenderer = new THREE.WebGLRenderer({ antialias: true });
    newRenderer.setSize(currentContainer.clientWidth, currentContainer.clientHeight);
    newRenderer.setPixelRatio(window.devicePixelRatio);
    currentContainer.appendChild(newRenderer.domElement);
  
    // Controls setup
    const newControls = new OrbitControls(newCamera, newRenderer.domElement);
    newControls.enableDamping = true;
    newControls.dampingFactor = 0.05;
  
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    newScene.add(ambientLight, directionalLight);
  
    // Grid helper
    const grid = new THREE.GridHelper(50, 50);
    newScene.add(grid);
  
    // IFC Loader setup
    const newIfcLoader = new IFCLoader();
    newIfcLoader.ifcManager.setWasmPath("/wasm-proxy/");
  
    setCamera(newCamera);
    setRenderer(newRenderer);
    setControls(newControls);
  
    // Animation loop
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      newControls.update();
      newRenderer.render(newScene, newCamera);
    };
    animate();
  
    // Cleanup
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      newRenderer.dispose();
      currentContainer.removeChild(newRenderer.domElement);
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
  
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
  
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
  
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [camera, renderer]);

  const toggleAutoRotate = () => {
    if (controls) {
      const newAutoRotate = !isAutoRotating;
      controls.autoRotate = newAutoRotate;
      controls.autoRotateSpeed = 2.0;
      setIsAutoRotating(newAutoRotate);
    }
  };

  const resetCamera = () => {
    if (camera && controls) {
      camera.position.set(5, 5, 5);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  };

  const zoomIn = () => {
    if (camera) {
      camera.position.multiplyScalar(0.9);
      if (controls) controls.update();
    }
  };

  const zoomOut = () => {
    if (camera) {
      camera.position.multiplyScalar(1.1);
      if (controls) controls.update();
    }
  };

  return (
    <div className="relative w-full h-full">
      <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={zoomIn}
          title="Zoom avant"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={zoomOut}
          title="Zoom arrière"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={toggleAutoRotate}
          title="Rotation automatique"
          className={isAutoRotating ? "bg-primary text-primary-foreground" : ""}
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={resetCamera}
          title="Réinitialiser la vue"
        >
          <Home className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={containerRef}
        className="w-full h-full min-h-[600px] bg-white rounded-lg shadow-lg"
      />
    </div>
  );
}