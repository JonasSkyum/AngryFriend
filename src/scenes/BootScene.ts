import Phaser from 'phaser'

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  preload() {
    // Generér en simpel fallback-tekstur (rød cirkel)
    const g = this.add.graphics()
    g.fillStyle(0xff4444, 1).fillCircle(128, 128, 124)
    g.lineStyle(8, 0x111111, 0.9).strokeCircle(128, 128, 124)
    g.generateTexture('fallback-head', 256, 256)
    g.destroy()
  }

  create() {
    this.scene.start('menu')
  }
}