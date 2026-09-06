import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, useGLTF, Float, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import './AvatarScene.css';

/**
 * Loads the user-provided .glb model (Meshy.ai / Tripo AI)
 */
function CustomModel({ isSpeaking = false }) {
  const groupRef = useRef();
  
  const { nodes, materials } = useGLTF('/interviewer_model.glb');
  
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    if (isSpeaking) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, Math.sin(t * 2) * 0.1, 0.1);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, Math.sin(t * 4) * 0.05, 0.1);
    } else {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, Math.sin(t * 0.5) * 0.05, 0.05);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.05);
    }
  });

  return (
    <group ref={groupRef} dispose={null} position={[0, -5, 0]} scale={5}>
      <group rotation={[0, -Math.PI / 2, 0]}>
        <mesh 
          geometry={nodes['tripo_node_2cf1d89a-3b9d-4f7b-9770-fa7a2faa4c14'].geometry} 
          material={materials['tripo_material_2cf1d89a-3b9d-4f7b-9770-fa7a2faa4c14']} 
        />
      </group>
    </group>
  );
}

useGLTF.preload('/interviewer_model.glb');

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <meshStandardMaterial color="#38C999" wireframe />
    </mesh>
  );
}

export default function AvatarScene({ isSpeaking = false, className = '' }) {
  return (
    <div className={`avatar-scene ${className}`} style={{ width: '100%', height: '100%', minHeight: '400px' }}>
      <Canvas
        camera={{ position: [0, -5, 8], fov: 35 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        style={{ background: 'transparent' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
        }}
      >
        <ambientLight intensity={0.7} color="#ffffff" />
        
        <directionalLight position={[5, 5, 5]} intensity={1.5} color="#ffffff" castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#ffffff" />
        <directionalLight position={[0, -2, 5]} intensity={0.6} color="#38C999" />

        <Suspense fallback={<LoadingFallback />}>
          <Float speed={1.2} rotationIntensity={0.015} floatIntensity={0.1}>
            <CustomModel isSpeaking={isSpeaking} />
          </Float>
        </Suspense>

        <Environment preset="city" />
        <OrbitControls 
          enableZoom={true} 
          enablePan={false} 
          enableRotate={true}
          target={[0, -5, 0]}
          minDistance={6}
          maxDistance={12}
          maxPolarAngle={Math.PI / 2 + 0.2}
          minPolarAngle={Math.PI / 2 - 0.2}
          minAzimuthAngle={-0.3}
          maxAzimuthAngle={0.3}
        />

        <ContactShadows
          position={[0, -5.0, 0]}
          opacity={0.4}
          scale={50}
          blur={2.5}
        />
      </Canvas>
    </div>
  );
}
