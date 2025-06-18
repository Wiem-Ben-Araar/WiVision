"use client"

import { useRef, useEffect } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { IFCLoader } from "web-ifc-three"

const IFCViewer = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const initViewer = async () => {
      const currentContainer = containerRef.current
      if (!currentContainer) return

      // Scene setup
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x888888)

      // Camera setup
      const camera = new THREE.PerspectiveCamera(
        60,
        currentContainer.clientWidth / currentContainer.clientHeight,
        0.1,
        1000,
      )
      camera.position.set(3, 3, 3)

      // Renderer setup
      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(currentContainer.clientWidth, currentContainer.clientHeight)
      currentContainer.appendChild(renderer.domElement)

      // Orbit controls setup
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.target.set(0, 1, 0)
      controls.update()

      // Ambient light
      scene.add(new THREE.AmbientLight(0xffffff, 0.5))

      // Directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
      directionalLight.position.set(1, 1, 1)
      scene.add(directionalLight)

      // IFC Loader setup
      const newIfcLoader = new IFCLoader()
      await newIfcLoader.ifcManager.setWasmPath("/wasm/")

      // Load the IFC model (replace 'path/to/your/ifc-model.ifc' with the actual path)
      newIfcLoader.load("path/to/your/ifc-model.ifc", (ifcModel) => {
        scene.add(ifcModel.model)
      })

      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
      }

      animate()

      // Handle window resize
      const handleResize = () => {
        camera.aspect = currentContainer.clientWidth / currentContainer.clientHeight
        camera.updateProjectionMatrix()
        renderer.setSize(currentContainer.clientWidth, currentContainer.clientHeight)
      }

      window.addEventListener("resize", handleResize)

      // Cleanup function
      return () => {
        window.removeEventListener("resize", handleResize)
        currentContainer.removeChild(renderer.domElement)
        renderer.dispose()
      }
    }

    initViewer()
  }, [])

  return <div ref={containerRef} style={{ width: "100%", height: "500px" }}></div>
}

export default IFCViewer
