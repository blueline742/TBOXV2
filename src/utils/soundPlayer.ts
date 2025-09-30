// Sound player utility for turn change sounds

const yourTurnSounds = [
  '/yourturn.wav',
  '/yourturn1.wav',
  '/yourturn2.wav',
  '/yourturn3.wav'
]

// Preload audio elements for better performance
let audioCache: HTMLAudioElement[] = []

// Preload all sounds
export function preloadTurnSounds() {
  if (typeof window === 'undefined') return

  audioCache = yourTurnSounds.map(src => {
    const audio = new Audio(src)
    audio.preload = 'auto'
    return audio
  })
}

// Play a random "your turn" sound
export function playYourTurnSound() {
  if (typeof window === 'undefined') return

  try {
    const randomIndex = Math.floor(Math.random() * yourTurnSounds.length)
    const audio = audioCache[randomIndex] || new Audio(yourTurnSounds[randomIndex])

    // Reset to beginning if already playing
    audio.currentTime = 0
    audio.volume = 0.5 // 50% volume

    // Play with error handling
    audio.play().catch(err => {
      console.log('Audio play prevented:', err)
      // Browser may block autoplay - user needs to interact first
    })
  } catch (err) {
    console.error('Error playing turn sound:', err)
  }
}