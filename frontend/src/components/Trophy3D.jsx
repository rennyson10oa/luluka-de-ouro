import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Float } from '@react-three/drei'
import * as THREE from 'three'
import { isLowPower } from '../utils/isLowPower'
import ProceduralEnv from './ProceduralEnv'

const GLB_PATH = '/assets/davy-jones-lite.glb'

// Pre-load the model so it's ready when the component mounts
useGLTF.preload(GLB_PATH)

/**
 * TrophyModel - loads the GLB and applies golden material overrides + slow rotation.
 */
function TrophyModel() {
  const { scene } = useGLTF(GLB_PATH)
  const groupRef = useRef()

  // Apply gold material to every mesh in the model
  scene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true
      // Only override if the mesh doesn't already have a meaningful texture
      if (!child.material.map) {
        child.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#d4af37'),
          metalness: 0.85,
          roughness: 0.18,
          envMapIntensity: 1.4,
          emissive: new THREE.Color('#3d2b00'),
          emissiveIntensity: 0.25,
        })
      } else {
        // Keep original textures but boost metalness
        child.material.metalness = 0.75
        child.material.roughness = 0.2
        child.material.envMapIntensity = 1.2
      }
    }
  })

  /**
   * Mouse-follow no CANVAS (não mais em window): o handler antigo era
   * atribuído a window.onmousemove a CADA mount (vazava entre instâncias e
   * rodava em toda telemetria de mouse da página). Aqui: listener no container
   * via useThree, com cleanup correto, e PULADO em telas de toque (o mouse
   * não existe no celular — economiza listeners inúteis).
   */
  const mouseRef = useRef({ x: 0, y: 0 })
  const { gl } = useThree()
  useEffect(() => {
    if (isLowPower) return undefined // toque não tem mouse-follow
    function onMove(e) {
      const rect = gl.domElement.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }
    gl.domElement.addEventListener('pointermove', onMove)
    return () => gl.domElement.removeEventListener('pointermove', onMove)
  }, [gl])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    groupRef.current.rotation.y += 0.008
    groupRef.current.rotation.x =
      Math.sin(t * 0.8) * 0.04 + mouseRef.current.y * 0.1
  })

  return (
    <group ref={groupRef} dispose={null}>
      <primitive object={scene} scale={1.8} position={[0, -0.5, 0]} />
    </group>
  )
}

/**
 * Particles - floating golden sparkles around the trophy.
 */
function Particles({ count = 120 }) {
  const ref = useRef()

  // Generate initial positions once
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 6
    positions[i * 3 + 1] = (Math.random() - 0.5) * 5 + 0.5
    positions[i * 3 + 2] = (Math.random() - 0.5) * 4
  }

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    const pos = ref.current.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += Math.sin(t + i) * 0.003
      if (pos[i * 3 + 1] > 3) pos[i * 3 + 1] = -2
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#f5e7a8"
        size={0.06}
        transparent
        opacity={0.75}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

/**
 * Fallback shown while the GLB is loading.
 */
function TrophyFallback() {
  return (
    <mesh>
      <octahedronGeometry args={[0.8, 0]} />
      <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} wireframe />
    </mesh>
  )
}

/**
 * Trophy3D - Main export. Renders the Davy Jones trophy GLB inside a
 * react-three-fiber Canvas with golden ACES lighting and floating particles.
 *
 * Otimização mobile (isLowPower): dpr travado em 1 (celulares nativos de 3x
 * faziam o fullscreen custar 9x de fill-rate), antialias off e partículas
 * cortadas pela metade — o visual do desktop não muda.
 */
export default function Trophy3D() {
  return (
    <div className="w-full h-[520px] bg-transparent" aria-label="Troféu 3D Prêmios do Grupo">
      <Canvas
        dpr={isLowPower ? 1 : [1, 1.5]}
        camera={{ position: [0, 1.2, 5.5], fov: 45 }}
        gl={{
          alpha: true,
          antialias: !isLowPower,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        style={{ background: 'transparent' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.9} color="#fff4d0" />
        <directionalLight position={[4, 6, 4]} intensity={2.5} color="#ffea9f" />
        <directionalLight position={[-4, -2, -3]} intensity={2.0} color="#d4af37" />
        <pointLight position={[0, 2, 2.5]} intensity={2.5} distance={10} color="#ffffff" />

        {/* Reflexos metálicos gerados em runtime (zero download — ver ProceduralEnv) */}
        <ProceduralEnv />

        {/* Trophy model wrapped in Float for subtle hover animation */}
        <Suspense fallback={<TrophyFallback />}>
          <Float speed={1.5} rotationIntensity={0} floatIntensity={0.4} floatingRange={[-0.08, 0.08]}>
            <TrophyModel />
          </Float>
        </Suspense>

        {/* Floating gold particles — menos no celular */}
        <Particles count={isLowPower ? 50 : 120} />
      </Canvas>
    </div>
  )
}
