import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/**
 * ProceduralEnv — environment map gerado EM RUNTIME (RoomEnvironment,
 * embutido no three). Substitui o <Environment preset="city" /> do drei,
 * que baixa um HDR de MBs de um CDN — pesado no celular e desnecessário:
 * para um material dourado, a RoomEnvironment gera reflexos equivalentes
 * com custo de download ZERO.
 */
export default function ProceduralEnv() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envMap
    return () => {
      envMap.dispose()
      pmrem.dispose()
      scene.environment = null
    }
  }, [gl, scene])
  return null
}
