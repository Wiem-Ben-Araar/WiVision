import { useEffect, useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';

export type MeasurementMode = 'none' | 'distance' | 'perpendicular' | 'angle';

export interface Measurement {
  id: string;
  points: THREE.Vector3[];
  distance?: number;
  angle?: number;
  line?: THREE.Line;
  labels: CSS2DObject[];
}

interface MeasurementToolProps {
  viewer: any;
  containerRef: React.RefObject<HTMLDivElement>;
  active: boolean;
  measurementMode: MeasurementMode;
  onMeasurementComplete?: (measurement: Measurement) => void;
  onClearMeasurements?: () => void;
  clearMeasurementsRef?: React.MutableRefObject<(() => void) | null>; // Nouvelle prop pour exposer la fonction de suppression
}

export const MeasurementTool: React.FC<MeasurementToolProps> = ({
  viewer,
  containerRef,
  active,
  measurementMode,
  onMeasurementComplete,
  onClearMeasurements,
  clearMeasurementsRef,
}) => {
  const [currentPoints, setCurrentPoints] = useState<THREE.Vector3[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const previewLineRef = useRef<THREE.Line | null>(null);
  const snapMarkerRef = useRef<THREE.Mesh | null>(null);
  const snapDistanceThreshold = 0.5;
  const originalClickHandlerRef = useRef<((event: MouseEvent) => void) | null>(null);
  const originalOnClick = useRef<any>(null);
  const lastHoverPointRef = useRef<THREE.Vector3 | null>(null);
  
  const createLabel = (text: string, position: THREE.Vector3) => {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'measurement-label';
    labelDiv.textContent = text;
    
    // Style amélioré pour une meilleure lisibilité
    labelDiv.style.cssText = `
      color: white;
      font-size: 16px;
      font-weight: bold;
      font-family: 'Arial', sans-serif;
      background-color: rgba(0, 0, 0, 0.7);
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
    `;
    
    const labelObj = new CSS2DObject(labelDiv);
    labelObj.position.copy(position);
    return labelObj;
  };

  const createSnapMarker = (position: THREE.Vector3) => {
    if (snapMarkerRef.current) {
      viewer.context.getScene().remove(snapMarkerRef.current);
    }
    
    const group = new THREE.Group();
    
    // Cercle
    const circleGeometry = new THREE.CircleGeometry(0.07, 32);
    const circleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffff00,
      side: THREE.DoubleSide
    });
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    circle.rotation.x = Math.PI / 2;
    group.add(circle);
    
    // Croix
    const crossMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const crossGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.1, 0.01, 0),
      new THREE.Vector3(0.1, 0.01, 0),
      new THREE.Vector3(0, 0.01, -0.1),
      new THREE.Vector3(0, 0.01, 0.1)
    ]);
    const cross = new THREE.LineSegments(crossGeometry, crossMaterial);
    group.add(cross);
    
    group.position.copy(position);
    viewer.context.getScene().add(group);
    snapMarkerRef.current = group;
    
    return group;
  };

  const findSnapPoint = (point: THREE.Vector3): THREE.Vector3 | null => {
    if (!viewer) return null;
    
    const snapThreshold = snapDistanceThreshold;
    let closestPoint: THREE.Vector3 | null = null;
    let minDistance = Infinity;
  
    // 1. Snap aux points existants des mesures
    for (const measurement of measurements) {
      for (const existingPoint of measurement.points) {
        const distance = existingPoint.distanceTo(point);
        if (distance < snapThreshold && distance < minDistance) {
          minDistance = distance;
          closestPoint = existingPoint.clone();
        }
      }
    }
  
    // 2. Snap aux sommets des éléments IFC
    const ifcMeshes = viewer.IFC.loader.ifcManager.state.models
      .filter((model: any) => model.mesh)
      .map((model: any) => model.mesh);
  
    const sphere = new THREE.Sphere(point.clone(), snapThreshold);
    
    for (const mesh of ifcMeshes) {
      if (!mesh.geometry) continue;
      
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      
      const positionAttribute = geometry.getAttribute('position');
      for (let i = 0; i < positionAttribute.count; i++) {
        const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
        const distance = vertex.distanceTo(point);
        if (distance < snapThreshold && distance < minDistance) {
          minDistance = distance;
          closestPoint = vertex.clone();
        }
      }
    }
  
    return closestPoint;
  };

  const getIntersectionPoint = (event: MouseEvent): THREE.Vector3 | null => {
    const container = containerRef.current;
    if (!container || !viewer) return null;
    
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, viewer.context.getCamera());

    const ifcMeshes: THREE.Mesh[] = [];
    
    if (viewer.IFC?.loader?.ifcManager?.state?.models) {
      Object.values(viewer.IFC.loader.ifcManager.state.models).forEach((model: any) => {
        if (model.mesh) {
          ifcMeshes.push(model.mesh);
        }
      });
    }
    
    if (ifcMeshes.length > 0) {
      const intersects = raycaster.intersectObjects(ifcMeshes, true);
      if (intersects.length > 0) {
        return intersects[0].point.clone();
      }
    }
    
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectionPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, intersectionPoint)) {
      return intersectionPoint;
    }
    
    return null;
  };

  const handleMeasureClick = (event: MouseEvent) => {
    if (!active || measurementMode === 'none' || !viewer) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const point = lastHoverPointRef.current;
    if (!point) return;

    setCurrentPoints(prev => {
      const newPoints = [...prev, point.clone()];
      
      if ((measurementMode === 'distance' && newPoints.length === 2) ||
          (measurementMode === 'angle' && newPoints.length === 3) ||
          (measurementMode === 'perpendicular' && newPoints.length === 3)) {
        setTimeout(() => finalizeMeasurement(newPoints, measurementMode), 0);
        return [];
      }
      
      return newPoints;
    });
  };

  const finalizeMeasurement = (points: THREE.Vector3[], mode: MeasurementMode) => {
    if (!viewer) return;
    
    let distance, angle;
    let line: THREE.Line | undefined;
    const labels: CSS2DObject[] = [];
    const scene = viewer.context.getScene();
    
    if (mode === 'distance' && points.length === 2) {
      distance = points[0].distanceTo(points[1]);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
      line = new THREE.Line(lineGeometry, lineMaterial);
      const midPoint = new THREE.Vector3().addVectors(points[0], points[1]).multiplyScalar(0.5);
      const label = createLabel(`${distance.toFixed(2)} m`, midPoint);
      scene.add(line);
      scene.add(label);
      labels.push(label);
    } 
    else if (mode === 'angle' && points.length === 3) {
      const v1 = new THREE.Vector3().subVectors(points[0], points[1]);
      const v2 = new THREE.Vector3().subVectors(points[2], points[1]);
      angle = v1.angleTo(v2);
      const angleDeg = THREE.MathUtils.radToDeg(angle);
      
      const line1 = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([points[1], points[0]]),
        new THREE.LineBasicMaterial({ color: 0x0000ff })
      );
      const line2 = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([points[1], points[2]]),
        new THREE.LineBasicMaterial({ color: 0x0000ff })
      );
      
      const label = createLabel(`${angleDeg.toFixed(2)}°`, points[1]);
      scene.add(line1);
      scene.add(line2);
      scene.add(label);
      labels.push(label);
      line = line1;
    } 
    else if (mode === 'perpendicular' && points.length === 3) {
      const line3D = new THREE.Line3(points[0], points[1]);
      const closestPoint = new THREE.Vector3();
      line3D.closestPointToPoint(points[2], true, closestPoint);
      distance = points[2].distanceTo(closestPoint);
      
      // Ligne de base
      const baseLineGeometry = new THREE.BufferGeometry().setFromPoints([points[0], points[1]]);
      const baseLineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
      const baseLine = new THREE.Line(baseLineGeometry, baseLineMaterial);
      
      // Ligne perpendiculaire
      const perpLineGeometry = new THREE.BufferGeometry().setFromPoints([points[2], closestPoint]);
      const perpLineMaterial = new THREE.LineDashedMaterial({ 
        color: 0x00ffff, 
        dashSize: 0.1, 
        gapSize: 0.05 
      });
      line = new THREE.Line(perpLineGeometry, perpLineMaterial);
      if (line.computeLineDistances) {
        line.computeLineDistances();
      }
      
      const label = createLabel(`${distance.toFixed(2)} m`, new THREE.Vector3().addVectors(points[2], closestPoint).multiplyScalar(0.5));
      scene.add(baseLine);
      scene.add(line);
      scene.add(label);
      labels.push(label);
    }
    
    const newMeasurement = {
      id: Math.random().toString(),
      points,
      distance,
      angle,
      line,
      labels
    };
    
    setMeasurements(prevMeas => [...prevMeas, newMeasurement]);
    
    if (onMeasurementComplete) {
      onMeasurementComplete(newMeasurement);
    }
  };

  const disableSelection = useCallback(() => {
    if (containerRef.current) {
      originalOnClick.current = containerRef.current.onclick;
      containerRef.current.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
      };
    }
  }, [containerRef]);

  const enableSelection = useCallback(() => {
    if (containerRef.current && originalOnClick.current) {
      containerRef.current.onclick = originalOnClick.current;
    }
  }, [containerRef]);



  useEffect(() => {
    if (!containerRef.current || !viewer) return;
    
    if (active) {
      disableSelection();
      containerRef.current.addEventListener('click', handleMeasureClick, { capture: true });
    } else {
      enableSelection();
      containerRef.current.removeEventListener('click', handleMeasureClick, { capture: true });
      
      // Clean up preview line and snap marker when tool is deactivated
      if (previewLineRef.current) {
        viewer.context.getScene().remove(previewLineRef.current);
        previewLineRef.current = null;
      }
      if (snapMarkerRef.current) {
        viewer.context.getScene().remove(snapMarkerRef.current);
        snapMarkerRef.current = null;
      }
    }
    
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('click', handleMeasureClick, { capture: true });
      }
    };
  }, [active, viewer, measurementMode, disableSelection, enableSelection]);

  useEffect(() => {
    if (!viewer || measurementMode === 'none' || !active || !containerRef.current) {
      return;
    }

    const onMouseMove = (event: MouseEvent) => {
      let point = getIntersectionPoint(event);
      if (!point) return;
      
      // Vérifier s'il y a un point de snap à proximité
      const snapPoint = findSnapPoint(point);
      if (snapPoint) {
        point = snapPoint;
        createSnapMarker(snapPoint);
      } else if (snapMarkerRef.current) {
        viewer.context.getScene().remove(snapMarkerRef.current);
        snapMarkerRef.current = null;
      }

      lastHoverPointRef.current = point;

      // Mise à jour de la ligne de prévisualisation si nous avons des points actuels
      if (currentPoints.length > 0) {
        if (!previewLineRef.current) {
          const lineGeometry = new THREE.BufferGeometry().setFromPoints([currentPoints[0], point]);
          const lineMaterial = new THREE.LineDashedMaterial({ 
            color: 0x00ff00, 
            dashSize: 0.1, 
            gapSize: 0.05 
          });
          previewLineRef.current = new THREE.Line(lineGeometry, lineMaterial);
          if (previewLineRef.current.computeLineDistances) {
            previewLineRef.current.computeLineDistances();
          }
          viewer.context.getScene().add(previewLineRef.current);
        } else {
          const pointsArray = [currentPoints[0], point];
          previewLineRef.current.geometry.setFromPoints(pointsArray);
          previewLineRef.current.geometry.attributes.position.needsUpdate = true;
          if (previewLineRef.current.computeLineDistances) {
            previewLineRef.current.computeLineDistances();
          }
        }
      }
    };

    containerRef.current.addEventListener('mousemove', onMouseMove);
    
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', onMouseMove);
      }
      if (viewer) {
        if (previewLineRef.current) {
          viewer.context.getScene().remove(previewLineRef.current);
          previewLineRef.current = null;
        }
        if (snapMarkerRef.current) {
          viewer.context.getScene().remove(snapMarkerRef.current);
          snapMarkerRef.current = null;
        }
      }
    };
  }, [measurementMode, currentPoints, active, viewer]);

  // Fonction pour supprimer toutes les mesures (appelée seulement par le bouton supprimer)
  const clearAllMeasurements = useCallback(() => {
    const scene = viewer?.context?.getScene?.();
    if (scene) {
      measurements.forEach(m => {
        if (m.line) scene.remove(m.line);
        m.labels.forEach(label => scene.remove(label));
      });
    }
    setMeasurements([]);
    if (onClearMeasurements) {
      onClearMeasurements();
    }
  }, [viewer, measurements, onClearMeasurements]);

  // Exposer la fonction de suppression via la ref
  useEffect(() => {
    if (clearMeasurementsRef) {
      clearMeasurementsRef.current = clearAllMeasurements;
    }
  }, [clearAllMeasurements, clearMeasurementsRef]);

  useEffect(() => {
    return () => {
      enableSelection();
      // NE PAS supprimer les mesures automatiquement au démontage
      // Les mesures restent visibles jusqu'à suppression explicite
    };
  }, [enableSelection]);
  

  return null;
};