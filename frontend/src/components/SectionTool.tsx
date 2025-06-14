"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import * as THREE from "three"

// Types adaptés pour web-ifc-viewer
type ViewerContext = {
  camera?: THREE.Camera;
  getCamera: () => THREE.Camera;
};

type Model = {
  mesh?: THREE.Object3D;
};

type IfcManagerState = {
  models: Record<number, Model>;
};

type IfcManager = {
  state: IfcManagerState;
};

type IFCLoader = {
  ifcManager?: IfcManager;
  loader?: {
    ifcManager: IfcManager;
  };
  models?: Record<number, Model> | Model[];
};

// Type simplifié pour le clipper
type Clipper = {
  createPlane: (plane?: THREE.Plane) => void;
  deleteAllPlanes: () => void;
  // Ne pas inclure pickPlane car il est privé dans IfcClipper
};

type Viewer = {
  context: ViewerContext;
  IFC: IFCLoader;
  clipper: Clipper;
};

interface SectionPlane {
  normal: THREE.Vector3;
  distance: number;
  active: boolean;
}

interface SectionToolProps {
  viewer: Viewer | null;
  containerRef: React.RefObject<HTMLDivElement>;
  isActive: boolean;
  onSectionCreated?: (plane: THREE.Plane) => void;
}

const SectionTool: React.FC<SectionToolProps> = ({ 
  viewer, 
  containerRef, 
  isActive, 
  onSectionCreated 
}) => {
  const [currentPlane, setCurrentPlane] = useState<SectionPlane | null>(null);
  const [sectionOffset, setSectionOffset] = useState<number>(0);
  const planeRef = useRef<THREE.Plane | null>(null);
  const isCreatingRef = useRef<boolean>(false);
  const isPlaneCreatedRef = useRef<boolean>(false);
  const lastOffsetRef = useRef<number>(0);
  const currentPlaneRef = useRef<SectionPlane | null>(null);

  // Synchroniser la référence avec l'état
  useEffect(() => {
    currentPlaneRef.current = currentPlane;
  }, [currentPlane]);

  // Désactiver les fonctionnalités automatiques de coupe
  useEffect(() => {
    if (!viewer || !viewer.clipper) return;

    const originalCreatePlane = viewer.clipper.createPlane;
    const originalDeleteAllPlanes = viewer.clipper.deleteAllPlanes;

    // Surcharger uniquement les méthodes nécessaires
    viewer.clipper.createPlane = function (plane?: THREE.Plane) {
      if (isCreatingRef.current && plane) {
        return originalCreatePlane.call(this, plane);
      }
      return;
    };

    viewer.clipper.deleteAllPlanes = function () {
      if (isCreatingRef.current) {
        return originalDeleteAllPlanes.call(this);
      }
      return;
    };

    return () => {
      if (viewer.clipper) {
        viewer.clipper.createPlane = originalCreatePlane;
        viewer.clipper.deleteAllPlanes = originalDeleteAllPlanes;
      }
    };
  }, [viewer]);
  
  // Appliquer le plan de coupe
  const applyClippingPlane = useCallback((plane: THREE.Plane) => {
    if (!viewer || !viewer.clipper) return;

    isCreatingRef.current = true;
    try {
      planeRef.current = plane;
      viewer.clipper.deleteAllPlanes();
      viewer.clipper.createPlane(plane);

      if (onSectionCreated) {
        onSectionCreated(plane);
      }
    } catch (error) {
      console.error("Erreur d'application du plan de coupe:", error);
    } finally {
      isCreatingRef.current = false;
    }
  }, [viewer, onSectionCreated]);

  // Gestion de l'activation/désactivation
  useEffect(() => {
    if (!viewer || !viewer.clipper) return;

    if (isActive) {
      if (currentPlaneRef.current?.active && planeRef.current) {
        applyClippingPlane(planeRef.current);
      }
    } else {
      isCreatingRef.current = true;
      viewer.clipper.deleteAllPlanes();
      isCreatingRef.current = false;
      isPlaneCreatedRef.current = false;
    }
  }, [isActive, viewer, applyClippingPlane]);

  // Mise à jour de l'offset
  useEffect(() => {
    if (!isActive || !viewer || !currentPlaneRef.current?.active) return;

    lastOffsetRef.current = sectionOffset;
    const plane = new THREE.Plane(
      currentPlaneRef.current.normal.clone(),
      currentPlaneRef.current.distance - sectionOffset,
    );
    applyClippingPlane(plane);
  }, [sectionOffset, isActive, viewer, applyClippingPlane]);

  // Gestion du clic pour créer un plan
  useEffect(() => {
    if (!isActive || !viewer || !containerRef.current) return;

    const container = containerRef.current;

    const handleClick = (event: MouseEvent) => {
      if (isPlaneCreatedRef.current) return;
      if (event.button !== 0 || event.ctrlKey || event.shiftKey || event.altKey) return;

      try {
        const rect = container.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        );

        if (!viewer.context) {
          throw new Error("Viewer context non disponible");
        }
        
        const camera = viewer.context.camera || 
                      (viewer.context.getCamera ? viewer.context.getCamera() : null);
        if (!camera) {
          throw new Error("Caméra non disponible");
        }

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        // Récupérer les modèles IFC
        let models: Model[] = [];
        if (viewer.IFC?.loader?.ifcManager?.state?.models) {
          models = Object.values(viewer.IFC.loader.ifcManager.state.models);
        } else if (viewer.IFC?.ifcManager?.state?.models) {
          models = Object.values(viewer.IFC.ifcManager.state.models);
        } else if (viewer.IFC?.models) {
          models = Array.isArray(viewer.IFC.models) 
            ? viewer.IFC.models 
            : Object.values(viewer.IFC.models);
        } else {
          throw new Error("Modèles IFC introuvables");
        }

        // Collecter les meshes visibles
        const ifcMeshes: THREE.Object3D[] = [];
        models.forEach((model) => {
          if (model.mesh?.visible) {
            model.mesh.traverse((child) => {
              if (child instanceof THREE.Mesh && child.visible) {
                ifcMeshes.push(child);
              }
            });
          }
        });

        // Trouver les intersections
        const intersects = raycaster.intersectObjects(ifcMeshes, true);
        if (intersects.length === 0 || !intersects[0].face) return;

        const intersect = intersects[0];
        const face = intersect.face;
        if (!face) return;

        const normal = face.normal.clone()
          .transformDirection(intersect.object.matrixWorld)
          .normalize();
        
        const point = intersect.point;
        const distance = -normal.dot(point);

        const newPlane = new THREE.Plane(normal, distance);
        const newSectionPlane = { normal, distance, active: true };
        
        setCurrentPlane(newSectionPlane);
        currentPlaneRef.current = newSectionPlane;
        setSectionOffset(0);
        lastOffsetRef.current = 0;
        applyClippingPlane(newPlane);
        isPlaneCreatedRef.current = true;
        
        event.stopPropagation();
      } catch (error) {
        console.error("Erreur de création du plan:", error);
      }
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [isActive, viewer, containerRef, applyClippingPlane]);

  // Réinitialiser l'offset
  const handleReset = () => {
    setSectionOffset(0);
    lastOffsetRef.current = 0;

    if (currentPlaneRef.current && planeRef.current) {
      const resetPlane = new THREE.Plane(
        currentPlaneRef.current.normal.clone(), 
        currentPlaneRef.current.distance
      );
      applyClippingPlane(resetPlane);
    }
  };

  // Créer un nouveau plan
  const handleNewPlane = () => {
    isPlaneCreatedRef.current = false;

    if (viewer?.clipper) {
      isCreatingRef.current = true;
      viewer.clipper.deleteAllPlanes();
      isCreatingRef.current = false;
    }

    setCurrentPlane(null);
    currentPlaneRef.current = null;
    planeRef.current = null;
    setSectionOffset(0);
    lastOffsetRef.current = 0;
  };

  return (
    <>
      {isActive && (
        <div className="section-controls">
          {currentPlane && (
            <>
              <label>Ajustement de la coupe:</label>
              <input
                type="range"
                min="-5"
                max="5"
                step="0.1"
                value={sectionOffset}
                onChange={(e) => setSectionOffset(Number.parseFloat(e.target.value))}
              />
              <div className="section-offset-value">Offset: {sectionOffset.toFixed(2)}</div>
              <button onClick={handleReset}>Réinitialiser</button>
            </>
          )}
          <button onClick={handleNewPlane}>Nouvelle coupe</button>
        </div>
      )}
    </>
  );
};

export default SectionTool;