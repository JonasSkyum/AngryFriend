import Phaser from 'phaser'

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  preload() {
    // Generér en simpel fallback-tekstur (rød cirkel)
    const g = this.add.graphics()
    g.fillStyle(0xff4444, 1).fillCircle(30, 30, 30)
    g.lineStyle(3, 0x111111, 0.9).strokeCircle(30, 30, 30)
    g.generateTexture('fallback-head', 60, 60)
    g.destroy()
  }

  create() {
    this.scene.start('menu')
  }
}