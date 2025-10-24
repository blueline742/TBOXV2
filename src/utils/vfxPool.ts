/**
 * VFX Pool System - Pre-create and cache geometries, materials, and shaders
 *
 * This prevents first-frame jank by:
 * 1. Pre-compiling all shaders on game load
 * 2. Pooling expensive geometries (TubeGeometry, CatmullRomCurve3)
 * 3. Reusing materials instead of creating new ones
 */

import * as THREE from 'three'

// ============= SHADER POOL =============

export const createEnergyBeamShader = (color: string) => {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      progress: { value: 0 },
      color: { value: new THREE.Color(color) },
      opacity: { value: 1.0 }
    },
    vertexShader: `
      uniform float time;
      uniform float progress;
      varying vec2 vUv;
      varying float vProgress;

      void main() {
        vUv = uv;
        vProgress = uv.x;

        vec3 pos = position;

        // Wave effect along the beam
        float wave = sin(uv.x * 10.0 - time * 5.0) * 0.05;
        pos.y += wave;
        pos.x += cos(uv.x * 8.0 - time * 4.0) * 0.03;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float progress;
      uniform vec3 color;
      uniform float opacity;
      varying vec2 vUv;
      varying float vProgress;

      void main() {
        // Only show the part that has animated
        if (vProgress > progress) {
          discard;
        }

        // Energy flow effect
        float flow = sin(vProgress * 20.0 - time * 10.0) * 0.3 + 0.7;

        // Glow at edges
        float glow = 1.0 - abs(vUv.y - 0.5) * 2.0;
        glow = pow(glow, 2.0);

        // Fade at ends
        float endFade = smoothstep(0.0, 0.1, vProgress) * smoothstep(1.0, 0.9, vProgress);

        vec3 finalColor = color + vec3(0.5) * flow;
        float finalAlpha = opacity * glow * endFade * (0.8 + flow * 0.2);

        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  })
}

// ============= GEOMETRY POOL =============

interface GeometryPoolEntry {
  geometry: THREE.BufferGeometry
  inUse: boolean
  lastUsed: number
}

class VFXGeometryPool {
  private tubeGeometries: Map<string, GeometryPoolEntry[]> = new Map()
  private sphereGeometries: Map<string, GeometryPoolEntry> = new Map()
  private ringGeometries: Map<string, GeometryPoolEntry> = new Map()

  // Pre-create tube geometries for curse strings (8 spiral tubes)
  precreateCurseStringGeometries() {
    const stringCount = 8
    const key = 'curse-strings'

    if (!this.tubeGeometries.has(key)) {
      this.tubeGeometries.set(key, [])
    }

    const pool = this.tubeGeometries.get(key)!

    for (let i = 0; i < stringCount; i++) {
      const angle = (i / stringCount) * Math.PI * 2
      const radius = 0.6
      const height = 2.0
      const segments = 40

      const points = []
      for (let j = 0; j <= segments; j++) {
        const t = j / segments
        const y = t * height - height / 2
        const currentAngle = angle + t * Math.PI * 4
        const currentRadius = radius * (1 - t * 0.3)
        const x = Math.cos(currentAngle) * currentRadius
        const z = Math.sin(currentAngle) * currentRadius
        points.push(new THREE.Vector3(x, y, z))
      }

      const curve = new THREE.CatmullRomCurve3(points)
      const geometry = new THREE.TubeGeometry(curve, 20, 0.02, 8, false)

      pool.push({
        geometry,
        inUse: false,
        lastUsed: 0
      })
    }

    console.log(`[VFX POOL] Pre-created ${stringCount} curse string geometries`)
  }

  // Pre-create tube geometries for curse puppets (5 control strings)
  precreateCursePuppetGeometries() {
    const stringCount = 5
    const key = 'curse-puppets'

    if (!this.tubeGeometries.has(key)) {
      this.tubeGeometries.set(key, [])
    }

    const pool = this.tubeGeometries.get(key)!

    // Create generic curves that will be transformed at runtime
    for (let i = 0; i < stringCount; i++) {
      const t = i / (stringCount - 1)
      const startX = (t - 0.5) * 0.4
      const startY = 1.5
      const startZ = 0

      const endX = (t - 0.5) * 0.3
      const endY = 0.5
      const endZ = -2

      const midX = (startX + endX) / 2
      const midY = Math.min(startY, endY) - 0.3
      const midZ = (startZ + endZ) / 2

      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(startX, startY, startZ),
        new THREE.Vector3(midX, midY, midZ),
        new THREE.Vector3(endX, endY, endZ)
      )

      const geometry = new THREE.TubeGeometry(curve, 20, 0.015, 8, false)

      pool.push({
        geometry,
        inUse: false,
        lastUsed: 0
      })
    }

    console.log(`[VFX POOL] Pre-created ${stringCount} curse puppet geometries`)
  }

  // Get tube geometry from pool
  getTubeGeometry(key: string, index: number): THREE.BufferGeometry | null {
    const pool = this.tubeGeometries.get(key)
    if (!pool || index >= pool.length) return null

    pool[index].inUse = true
    pool[index].lastUsed = Date.now()
    return pool[index].geometry
  }

  // Release geometry back to pool
  releaseGeometry(key: string, index: number) {
    const pool = this.tubeGeometries.get(key)
    if (pool && index < pool.length) {
      pool[index].inUse = false
    }
  }

  // Pre-create common sphere geometries
  precreateSphereGeometries() {
    const sizes = [0.05, 0.08, 0.15, 0.2, 0.3, 0.4, 0.5]

    sizes.forEach(radius => {
      const key = `sphere-${radius}`
      if (!this.sphereGeometries.has(key)) {
        const geometry = new THREE.SphereGeometry(radius, 16, 16)
        this.sphereGeometries.set(key, {
          geometry,
          inUse: false,
          lastUsed: 0
        })
      }
    })

    console.log(`[VFX POOL] Pre-created ${sizes.length} sphere geometries`)
  }

  // Pre-create common ring geometries
  precreateRingGeometries() {
    const configs = [
      { inner: 0.2, outer: 0.4, segments: 32 },
      { inner: 0.3, outer: 0.5, segments: 32 },
      { inner: 0.3, outer: 0.8, segments: 6 },
      { inner: 0.4, outer: 0.6, segments: 32 }
    ]

    configs.forEach(({ inner, outer, segments }) => {
      const key = `ring-${inner}-${outer}-${segments}`
      if (!this.ringGeometries.has(key)) {
        const geometry = new THREE.RingGeometry(inner, outer, segments)
        this.ringGeometries.set(key, {
          geometry,
          inUse: false,
          lastUsed: 0
        })
      }
    })

    console.log(`[VFX POOL] Pre-created ${configs.length} ring geometries`)
  }

  getSphereGeometry(radius: number): THREE.BufferGeometry | null {
    const key = `sphere-${radius}`
    const entry = this.sphereGeometries.get(key)
    if (entry) {
      entry.inUse = true
      entry.lastUsed = Date.now()
      return entry.geometry
    }
    return null
  }

  getRingGeometry(inner: number, outer: number, segments: number): THREE.BufferGeometry | null {
    const key = `ring-${inner}-${outer}-${segments}`
    const entry = this.ringGeometries.get(key)
    if (entry) {
      entry.inUse = true
      entry.lastUsed = Date.now()
      return entry.geometry
    }
    return null
  }

  // Initialize all pools
  initializeAll() {
    this.precreateCurseStringGeometries()
    this.precreateCursePuppetGeometries()
    this.precreateSphereGeometries()
    this.precreateRingGeometries()
    console.log('[VFX POOL] All geometry pools initialized')
  }

  // Cleanup unused geometries (call periodically)
  cleanup(maxAge: number = 60000) {
    const now = Date.now()

    // Don't cleanup pre-created geometries, only dynamic ones
    this.tubeGeometries.forEach((pool, key) => {
      pool.forEach(entry => {
        if (!entry.inUse && now - entry.lastUsed > maxAge) {
          entry.geometry.dispose()
        }
      })
    })
  }
}

// ============= MATERIAL POOL =============

class VFXMaterialPool {
  private shaderMaterials: Map<string, THREE.ShaderMaterial> = new Map()
  private standardMaterials: Map<string, THREE.MeshStandardMaterial> = new Map()
  private basicMaterials: Map<string, THREE.MeshBasicMaterial> = new Map()

  // Pre-create energy beam shaders
  precreateEnergyBeamShaders() {
    const colors = ['#ff0044', '#00ff44', '#ffaa00', '#8b00ff']

    colors.forEach(color => {
      const key = `energy-beam-${color}`
      if (!this.shaderMaterials.has(key)) {
        this.shaderMaterials.set(key, createEnergyBeamShader(color))
      }
    })

    console.log(`[VFX POOL] Pre-created ${colors.length} energy beam shaders`)
  }

  // Pre-create standard materials
  precreateStandardMaterials() {
    const configs = [
      { color: '#4a0080', emissive: '#2a0050', emissiveIntensity: 0.5, opacity: 0.8 },
      { color: '#ffffff', emissive: '#aaaaaa', emissiveIntensity: 0.3, opacity: 0.8 }
    ]

    configs.forEach((config, i) => {
      const key = `standard-${i}`
      if (!this.standardMaterials.has(key)) {
        const material = new THREE.MeshStandardMaterial({
          color: config.color,
          emissive: config.emissive,
          emissiveIntensity: config.emissiveIntensity,
          transparent: true,
          opacity: config.opacity,
          roughness: 0.3,
          metalness: 0.6
        })
        this.standardMaterials.set(key, material)
      }
    })

    console.log(`[VFX POOL] Pre-created ${configs.length} standard materials`)
  }

  getEnergyBeamShader(color: string): THREE.ShaderMaterial | null {
    const key = `energy-beam-${color}`
    let material = this.shaderMaterials.get(key)

    // Clone so each instance can have unique uniforms
    if (material) {
      return material.clone()
    }

    return null
  }

  getStandardMaterial(index: number): THREE.MeshStandardMaterial | null {
    const key = `standard-${index}`
    const material = this.standardMaterials.get(key)
    return material ? material.clone() : null
  }

  initializeAll() {
    this.precreateEnergyBeamShaders()
    this.precreateStandardMaterials()
    console.log('[VFX POOL] All material pools initialized')
  }

  // Cleanup unused materials
  cleanup() {
    this.shaderMaterials.forEach(material => material.dispose())
    this.standardMaterials.forEach(material => material.dispose())
    this.basicMaterials.forEach(material => material.dispose())
  }
}

// ============= SINGLETON INSTANCES =============

export const geometryPool = new VFXGeometryPool()
export const materialPool = new VFXMaterialPool()

// Initialize all pools on first import
export function initializeVFXPools() {
  geometryPool.initializeAll()
  materialPool.initializeAll()
}

// Cleanup function to call on unmount
export function cleanupVFXPools() {
  geometryPool.cleanup()
  materialPool.cleanup()
}
