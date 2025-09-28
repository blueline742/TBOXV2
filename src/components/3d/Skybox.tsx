import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { useEffect } from 'react'

export function Skybox() {
  const texture = useLoader(THREE.TextureLoader, '/fisheye.png')

  useEffect(() => {
    // Configure texture for spherical mapping
    texture.mapping = THREE.EquirectangularReflectionMapping
    texture.colorSpace = THREE.SRGBColorSpace
  }, [texture])

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[500, 64, 64]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        fog={false}
      />
    </mesh>
  )
}