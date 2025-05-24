"use client"
 
 import type React from "react"
 import { useEffect, useRef, useState } from "react"
 import * as THREE from "three"
 
 interface SectionPlane {
   normal: THREE.Vector3
   distance: number
   active: boolean
 }
 
 interface SectionToolProps {
   viewer: any
   containerRef: React.RefObject<HTMLDivElement>
   isActive: boolean
   onSectionCreated?: (plane: THREE.Plane) => void
 }
 
 const SectionTool: React.FC<SectionToolProps> = ({ viewer, containerRef, isActive, onSectionCreated }) => {
   const [currentPlane, setCurrentPlane] = useState<SectionPlane | null>(null)
   const [sectionOffset, setSectionOffset] = useState<number>(0)
   const planeRef = useRef<THREE.Plane | null>(null)
   const isCreatingRef = useRef<boolean>(false)
   const isPlaneCreatedRef = useRef<boolean>(false)
   const lastOffsetRef = useRef<number>(0)
   const currentPlaneRef = useRef<SectionPlane | null>(null)
 
   // Synchroniser la référence avec l'état
   useEffect(() => {
     currentPlaneRef.current = currentPlane
   }, [currentPlane])
 
   // Désactiver toutes les fonctionnalités automatiques de coupe
   useEffect(() => {
    if (!viewer || !viewer.clipper) return; // 🔒 Ajout de sécurité ici
  
    const originalCreatePlane = viewer.clipper.createPlane
    const originalPickPlane = viewer.clipper.pickPlane
    const originalDeleteAllPlanes = viewer.clipper.deleteAllPlanes
  
    viewer.clipper.createPlane = function (plane?: THREE.Plane) {
      if (isCreatingRef.current && plane) {
        return originalCreatePlane.call(this, plane)
      }
      return null
    }
  
    viewer.clipper.pickPlane = () => {
      return null
    }
  
    viewer.clipper.deleteAllPlanes = function () {
      if (isCreatingRef.current) {
        return originalDeleteAllPlanes.call(this)
      }
      return null
    }
  
    return () => {
      if(viewer.clipper){
        viewer.clipper.createPlane = originalCreatePlane
      viewer.clipper.pickPlane = originalPickPlane
      viewer.clipper.deleteAllPlanes = originalDeleteAllPlanes
      }
    
    }
  }, [viewer])
  
 
   // Fonction pour appliquer le plan de coupe de manière sécurisée
   const applyClippingPlane = (plane: THREE.Plane) => {
     if (!viewer) return
 
     isCreatingRef.current = true
     try {
       // Stocker le plan dans la référence
       planeRef.current = plane
 
       // Appliquer le plan au viewer
       viewer.clipper.deleteAllPlanes()
       const createdPlane = viewer.clipper.createPlane(plane)
 
       // Ne pas vérifier le retour de createPlane car certaines implémentations
       // peuvent retourner undefined même si la création a réussi
 
       // Notifier si nécessaire
       if (onSectionCreated) {
         onSectionCreated(plane)
       }
     } catch (error) {
       console.error("Erreur lors de l'application du plan de coupe:", error)
     } finally {
       isCreatingRef.current = false
     }
   }
 
   // Gérer l'activation/désactivation de l'outil
   useEffect(() => {
     if (!viewer) return
 
     if (isActive) {
       // Appliquer le plan si on a un plan existant
       if (currentPlaneRef.current?.active && planeRef.current) {
         applyClippingPlane(planeRef.current)
       }
     } else {
       // Nettoyer quand l'outil est désactivé
       isCreatingRef.current = true
       if(viewer.clipper) {
       viewer.clipper.deleteAllPlanes()
       }
       isCreatingRef.current = false
       isPlaneCreatedRef.current = false
     }
   }, [isActive, viewer])
 
   // Mettre à jour le plan quand l'offset change
   useEffect(() => {
     if (!viewer || !currentPlaneRef.current?.active) return
 
     // Stocker l'offset actuel
     lastOffsetRef.current = sectionOffset
 
     // Créer un nouveau plan avec l'offset
     const plane = new THREE.Plane(
       currentPlaneRef.current.normal.clone(),
       currentPlaneRef.current.distance - sectionOffset,
     )
 
     // Appliquer le plan de manière sécurisée
     applyClippingPlane(plane)
   }, [sectionOffset, viewer])
 
   // Gestionnaire de clic pour créer le plan initial une seule fois
   useEffect(() => {
     if (!viewer || !isActive || !containerRef.current) return
 
     const container = containerRef.current
 
     const handleClick = (event: MouseEvent) => {
       // Ignorer si un plan est déjà créé
       if (isPlaneCreatedRef.current) return
 
       // Ignorer les clics modifiés
       if (event.button !== 0 || event.ctrlKey || event.shiftKey || event.altKey) return
 
       const rect = container.getBoundingClientRect()
       const mouse = new THREE.Vector2(
         ((event.clientX - rect.left) / rect.width) * 2 - 1,
         -((event.clientY - rect.top) / rect.height) * 2 + 1,
       )
 
       const camera = viewer.context.camera || viewer.context.getCamera()
       const raycaster = new THREE.Raycaster()
       raycaster.setFromCamera(mouse, camera)
 
       // Collecter tous les meshes visibles des modèles IFC
       const ifcMeshes: THREE.Object3D[] = []
       viewer.IFC.loader.ifcManager.state.models.forEach((model: any) => {
         if (model.mesh && model.mesh.visible) {
           model.mesh.traverse((child: any) => {
             if (child instanceof THREE.Mesh && child.visible) {
               ifcMeshes.push(child)
             }
           })
         }
       })
 
       // Vérifier les intersections
       const intersects = raycaster.intersectObjects(ifcMeshes, true)
       if (intersects.length === 0 || !intersects[0].face) return
 
       const intersect = intersects[0]
       const face = intersect.face
 
       // Calculer la normale dans l'espace monde
       if (!face) return
       const normal = face.normal.clone()
       normal.transformDirection(intersect.object.matrixWorld)
       normal.normalize()
 
       const point = intersect.point
       const distance = -normal.dot(point)
 
       // Créer le plan
       const newPlane = new THREE.Plane(normal, distance)
 
       // Mettre à jour l'état
       const newSectionPlane = { normal, distance, active: true }
       setCurrentPlane(newSectionPlane)
       currentPlaneRef.current = newSectionPlane
       setSectionOffset(0)
       lastOffsetRef.current = 0
 
       // Appliquer le plan de manière sécurisée
       applyClippingPlane(newPlane)
 
       // Marquer qu'un plan a été créé
       isPlaneCreatedRef.current = true
 
       // Arrêter la propagation
       event.stopPropagation()
     }
 
     container.addEventListener("click", handleClick)
 
     return () => {
       container.removeEventListener("click", handleClick)
     }
   }, [isActive, viewer])
 
   // Bouton pour réinitialiser et permettre la création d'un nouveau plan
   const handleReset = () => {
     // Réinitialiser l'offset
     setSectionOffset(0)
     lastOffsetRef.current = 0
 
     if (currentPlaneRef.current && planeRef.current) {
       // Recréer le plan avec l'offset à 0
       const resetPlane = new THREE.Plane(currentPlaneRef.current.normal.clone(), currentPlaneRef.current.distance)
       applyClippingPlane(resetPlane)
     }
   }

   // Bouton pour créer un nouveau plan
   const handleNewPlane = () => {
     // Permettre la création d'un nouveau plan
     isPlaneCreatedRef.current = false
 
     // Supprimer le plan actuel
     if (viewer) {
       isCreatingRef.current = true
       viewer.clipper.deleteAllPlanes()
       isCreatingRef.current = false
     }
 
     // Réinitialiser l'état
     setCurrentPlane(null)
     currentPlaneRef.current = null
     planeRef.current = null
     setSectionOffset(0)
     lastOffsetRef.current = 0
   }
 
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
   )
 }
 
 export default SectionTool