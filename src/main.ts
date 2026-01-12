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
    width: 360,
    height: 640
  },
  scene: [BootScene, MenuScene, GridScene]
}

// Eksporteret for evt. debugging i konsollen
export const game = new Phaser.Game(config)