import Phaser from 'phaser'
import BootScene from './scenes/BootScene'
import MenuScene from './scenes/MenuScene'
import GridScene from './scenes/GridScene'

// Basal skaleringskonfiguration til mobil
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#0b2447',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // 2x opløsning så ansigterne er skarpe på retina-skærme
    width: 720,
    height: 1280
  },
  // Spillet er rent 2D uden fysik/lyd - spar opstartstid
  audio: { noAudio: true },
  scene: [BootScene, MenuScene, GridScene]
}

// Eksporteret for evt. debugging i konsollen
export const game = new Phaser.Game(config)