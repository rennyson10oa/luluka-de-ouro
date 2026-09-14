import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Trophy3D - Renders a procedural gold trophy using Three.js directly.
 * Will be replaced with the actual GLB model (davy-jones-trofeu.glb) via useGLTF
 * once @react-three/fiber canvas issues with Vite are resolved.
 *
 * NOTE: The GLB file is at src/assets/davy-jones-trofeu.glb
 */
export default function Trophy3D() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || 520

    // Scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 1.2, 5.5)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xfff4d0, 0.9)
    scene.add(ambientLight)

    const dirLight1 = new THREE.DirectionalLight(0xffea9f, 2.5)
    dirLight1.position.set(4, 6, 4)
    scene.add(dirLight1)

    const dirLight2 = new THREE.DirectionalLight(0xd4af37, 2.0)
    dirLight2.position.set(-4, -2, -3)
    scene.add(dirLight2)

    const pointLight = new THREE.PointLight(0xffffff, 2.5, 10)
    pointLight.position.set(0, 2, 2.5)
    scene.add(pointLight)

    // Trophy materials
    const goldMat = new THREE.MeshPhongMaterial({
      color: 0xd4af37, emissive: 0x3d2b00, specular: 0xfff6cf, shininess: 90,
    })
    const darkGoldMat = new THREE.MeshPhongMaterial({
      color: 0x8a6e1a, emissive: 0x1f1600, specular: 0xf3d97e, shininess: 70,
    })
    const pedestalMat = new THREE.MeshPhongMaterial({
      color: 0x141419, specular: 0x444455, shininess: 40,
    })

    const group = new THREE.Group()

    // Helper: create mesh and position it
    function mesh(geo, mat, x = 0, y = 0, z = 0) {
      const m = new THREE.Mesh(geo, mat)
      m.position.set(x, y, z)
      return m
    }

    // Base
    group.add(mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.25, 32), pedestalMat, 0, -1.6, 0))
    group.add(mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.06, 32), goldMat, 0, -1.45, 0))
    group.add(mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.45, 32), pedestalMat, 0, -1.2, 0))

    // Stem
    group.add(mesh(new THREE.CylinderGeometry(0.55, 0.85, 0.25, 32), goldMat, 0, -0.85, 0))
    group.add(mesh(new THREE.CylinderGeometry(0.2, 0.35, 0.8, 32), darkGoldMat, 0, -0.35, 0))
    group.add(mesh(new THREE.SphereGeometry(0.38, 32, 16), goldMat, 0, 0.05, 0))

    // Cup
    group.add(mesh(new THREE.CylinderGeometry(0.7, 0.35, 0.7, 32), goldMat, 0, 0.55, 0))
    const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 16, 64), goldMat)
    rimMesh.rotation.x = Math.PI / 2
    rimMesh.position.set(0, 0.9, 0)
    group.add(rimMesh)

    // Crown
    const wreathMesh = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.04, 16, 64), darkGoldMat)
    wreathMesh.position.set(0, 1.35, 0)
    group.add(wreathMesh)
    const starMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), goldMat)
    starMesh.position.set(0, 1.35, 0)
    starMesh.rotation.y = Math.PI / 4
    group.add(starMesh)

    // Handles
    const hL = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 16, 32, Math.PI * 1.2), goldMat)
    hL.position.set(-0.75, 0.6, 0)
    hL.rotation.z = -Math.PI / 6
    group.add(hL)
    const hR = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 16, 32, Math.PI * 1.2), goldMat)
    hR.position.set(0.75, 0.6, 0)
    hR.rotation.z = Math.PI * 1.15
    group.add(hR)

    group.position.y = 0.1
    scene.add(group)

    // Particles
    const pCount = 120
    const pGeo = new THREE.BufferGeometry()
    const pPos = new Float32Array(pCount * 3)
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 6
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 5 + 0.5
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 4
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const pMat = new THREE.PointsMaterial({ color: 0xf5e7a8, size: 0.06, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending })
    scene.add(new THREE.Points(pGeo, pMat))

    // Mouse
    let mouseX = 0, mouseY = 0
    const onMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', onMouseMove)

    // Animate
    const clock = new THREE.Clock()
    let animId
    let rotY = 0
    function animate() {
      animId = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      rotY += 0.009
      group.rotation.y = rotY + mouseX * 0.4
      group.rotation.x = Math.sin(t * 0.8) * 0.05 + mouseY * 0.15
      group.position.y = Math.sin(t * 1.5) * 0.08 + 0.05
      // animate particles
      const pos = pGeo.attributes.position.array
      for (let i = 0; i < pCount; i++) {
        pos[i * 3 + 1] += Math.sin(t + i) * 0.003
        if (pos[i * 3 + 1] > 3) pos[i * 3 + 1] = -2
      }
      pGeo.attributes.position.needsUpdate = true
      renderer.render(scene, camera)
    }
    animate()

    // Resize
    const onResize = () => {
      const w = container.clientWidth || window.innerWidth
      const h = container.clientHeight || 520
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-[520px] bg-transparent"
      aria-label="Troféu 3D Prêmios do Grupo"
    />
  )
}
