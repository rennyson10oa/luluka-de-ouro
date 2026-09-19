import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Float } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const GLB_PATH = '/assets/trophy-3d.glb';

useGLTF.preload(GLB_PATH);

/**
 * ProceduralEnv — environment map gerado em runtime (RoomEnvironment,
 * embutido no three). Substitui o <Environment preset="city" />, que
 * baixa um HDR de MBs de um CDN — desproporcional para um ícone.
 * Custo: zero download.
 */
function ProceduralEnv() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envMap;
    return () => {
      envMap.dispose();
      pmrem.dispose();
      scene.environment = null;
    };
  }, [gl, scene]);
  return null;
}

function TrophyIconModel({ zoom = 1, shiftY = 0, shiftX = 0 }) {
  const { scene } = useGLTF(GLB_PATH);
  const groupRef = useRef();

  /**
   * Clone local por montagem — CORREÇÃO do bug de tamanho alternado.
   *
   * O useGLTF cacheia a cena (mesmo objeto em todo mount) e o <primitive>
   * do R3F MUTA esse objeto (aplica scale/position). Sem o clone, o
   * auto-fit do mount seguinte media o bounding box JÁ transformado,
   * calculava fit=1 e renderizava o troféu no tamanho nativo (gigante).
   * O clone nasce com transform identity → medição determinística e
   * cache intocado. Geometria é compartilhada (clone é raso): custo zero.
   */
  const model = useMemo(() => scene.clone(), [scene]);

  // Material dourado (override se o mesh não tiver textura própria)
  useMemo(() => {
    model.traverse((child) => {
      if (child.isMesh) {
        if (!child.material.map) {
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#d4af37'),
            metalness: 0.85,
            roughness: 0.18,
            envMapIntensity: 1.4,
            emissive: new THREE.Color('#3d2b00'),
            emissiveIntensity: 0.25,
          });
        } else {
          child.material.metalness = 0.75;
          child.material.roughness = 0.2;
          child.material.envMapIntensity = 1.2;
        }
      }
    });
  }, [model]);

  /**
   * Auto-fit: normaliza o bounding box do modelo para ~1.5 unidades e
   * centraliza na origem. Funciona com qualquer escala nativa de GLB —
   * não depende de "chutar" scale/position.
   */
  const { fit, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const fit = 1.5 / maxDim;
    return { fit, offset: center.multiplyScalar(-fit) };
  }, [model]);

  // Rotação delta-based (independente do framerate, diferente de += 0.008)
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 1.5;
    }
  });

  return (
    // Grupo externo: zoom + deslocamento (MobileMenu usa zoom > 1 com
    // shiftY < 0 para a taça ENCHER a tela e shiftX para sair do centro).
    // O giro fica no grupo interno — o eixo de rotação acompanha o centro
    // do próprio modelo, mesmo escalado/deslocado.
    <group scale={zoom} position={[shiftX, shiftY, 0]}>
      <group ref={groupRef} rotation={[0.12, 0, 0]}>
        <primitive object={model} scale={fit} position={[offset.x, offset.y, offset.z]} dispose={null} />
      </group>
    </group>
  );
}

function TrophyIconFallback() {
  return (
    <mesh>
      <octahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} wireframe />
    </mesh>
  );
}

/**
 * Trophy3DIcon — troféu 3D girando para o logo do Header (ou para o
 * menu mobile em tela cheia). Aceita width/height em px ou string CSS.
 * Props opcionais de enquadramento (padrões preservam o uso do Header):
 *   - zoom: multiplicador de escala sobre o auto-fit (1 = modelo inteiro).
 *   - shiftY: deslocamento vertical em unidades do mundo (negativo = desce).
 *   - shiftX: deslocamento horizontal (positivo = vai para a direita).
 */
export default function Trophy3DIcon({ width = 40, height = 40, zoom = 1, shiftY = 0, shiftX = 0 }) {
  return (
    <div style={{ width, height }} className="bg-transparent" aria-label="Troféu 3D Prêmios do Grupo">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 2.4], fov: 40 }}
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        style={{ background: 'transparent' }}
      >
        <ProceduralEnv />

        <ambientLight intensity={0.9} color="#fff4d0" />
        <directionalLight position={[4, 6, 4]} intensity={2.5} color="#ffea9f" />
        <directionalLight position={[-4, -2, -3]} intensity={2.0} color="#d4af37" />

        <Suspense fallback={<TrophyIconFallback />}>
          <Float speed={1.5} rotationIntensity={0} floatIntensity={0.4} floatingRange={[-0.08, 0.08]}>
            <TrophyIconModel zoom={zoom} shiftY={shiftY} shiftX={shiftX} />
          </Float>
        </Suspense>
      </Canvas>
    </div>
  );
}
