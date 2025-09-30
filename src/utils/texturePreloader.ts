import { useTexture } from '@react-three/drei'
import { TextureLoader } from 'three'
import { useLoader } from '@react-three/fiber'

// All card textures from cardStore
const CARD_TEXTURES = [
  '/wizardnft.webp',
  '/robotnft.webp',
  '/dinonft.webp',
  '/brickdudenft.webp',
  '/duckienft.webp',
  '/archwizardnft.webp',
  '/voodoonft.webp',
  '/winduptoynft.webp'
] as const

// Preload all textures - call this at app initialization
export function preloadCardTextures() {
  try {
    CARD_TEXTURES.forEach(path => {
      useTexture.preload(path)
    })
  } catch (error) {
    console.warn('Texture preload failed:', error)
  }
}

// Hook for components to use cached textures
export function useCardTexture(texturePath: string) {
  try {
    return useTexture(texturePath || '/wizardnft.webp')
  } catch (error) {
    console.warn('Failed to load texture, falling back to TextureLoader:', texturePath)
    return useLoader(TextureLoader, texturePath || '/wizardnft.webp')
  }
}

export { CARD_TEXTURES }