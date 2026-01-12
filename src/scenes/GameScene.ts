import Phaser from 'phaser'
import type { GameMode } from './MenuScene'

interface GameData { mode: GameMode, headKey?: string }

export default class GameScene extends Phaser.Scene {
  private mode: GameMode = 'classic'
  private head!: Phaser.GameObjects.Image
  private score = 0
  private lives = 3
  private uiText!: Phaser.GameObjects.Text
  private moveEvent?: Phaser.Time.TimerEvent

  constructor() {
    super('game')
  }

  create(data: GameData) {
    this.mode = data.mode

    const textureKey = data.headKey && this.textures.exists(data.headKey)
      ? data.headKey
      : 'fallback-head'

    this.spawnHead(textureKey)

    // UI
    this.uiText = this.add.text(8, 8, this.formatUI(), { fontFamily: 'Arial', fontSize: '18px', color: '#ffffff' }).setDepth(10)

    // Flyt hovedet periodisk
    this.moveEvent = this.time.addEvent({ delay: 1100, loop: true, callback: this.moveHead, callbackScope: this })

    // Global pointer handler
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const hit = this.head.getBounds().contains(p.x, p.y)
      if (hit) {
        // I begge modes er det en fejl at ramme hovedet (klassisk regel)
        this.onMistake()
      } else {
        this.score += 1
        this.uiText.setText(this.formatUI())
      }
    })

    // Tilbage-til-menu med ESC
    this.input.keyboard?.on('keydown-ESC', () => this.endToMenu())
  }

  private spawnHead(key: string) {
    const { width, height } = this.scale
    this.head = this.add.image(Phaser.Math.Between(40, width - 40), Phaser.Math.Between(100, height - 80), key)
    this.head.setName('head')
  }

  private moveHead = () => {
    const { width, height } = this.scale
    this.tweens.add({
      targets: this.head,
      x: Phaser.Math.Between(40, width - 40),
      y: Phaser.Math.Between(100, height - 80),
      duration: 120,
      ease: 'Sine.easeInOut'
    })

    // I challenge-mode kan en fejl udløse en kort udfordring (ufarlig/for sjov)
    if (this.mode === 'challenge' && Phaser.Math.Between(0, 6) === 0) {
      this.showChallengeHint()
    }
  }

  private onMistake() {
    this.cameras.main.shake(100, 0.01)
    this.lives -= 1
    if (this.mode === 'challenge') this.maybeShowChallenge()

    if (this.lives <= 0) {
      this.gameOver()
      return
    }
    this.uiText.setText(this.formatUI())
  }

  private maybeShowChallenge() {
    // Ufarlige små udfordringer – kan tilpasses
    const challenges = [
      'Sig en tungvrikker hurtigt to gange',
      'Lav 5 sprællemænd',
      'Find et ord på 10 bogstaver',
      'Giv en high‑five til sidemanden',
      'Lav en sjov mine i 3 sekunder'
    ]
    const text = challenges[Phaser.Math.Between(0, challenges.length - 1)]
    this.showFloatingText(text)
  }

  private showChallengeHint() {
    this.showFloatingText('Challenge kan dukke op ved fejl…')
  }

  private showFloatingText(text: string) {
    const t = this.add.text(this.scale.width / 2, 80, text, {
      fontFamily: 'Arial', fontSize: '16px', color: '#ffffff', backgroundColor: 'rgba(0,0,0,.45)', padding: { x: 8, y: 6 }
    }).setOrigin(0.5)

    this.tweens.add({ targets: t, y: 60, alpha: 0, duration: 1200, onComplete: () => t.destroy() })
  }

  private gameOver() {
    this.moveEvent?.remove(false)
    const center = { x: this.scale.width / 2, y: this.scale.height / 2 }
    const t = this.add.text(center.x, center.y, `Game Over\nScore: ${this.score}`, {
      fontFamily: 'Arial', fontSize: '28px', color: '#fff', align: 'center', backgroundColor: 'rgba(0,0,0,.35)', padding: { x: 12, y: 10 }
    }).setOrigin(0.5)

    this.time.delayedCall(1400, () => {
      t.destroy()
      this.endToMenu()
    })
  }

  private endToMenu() {
    this.scene.start('menu')
  }

  private formatUI() {
    return `Mode: ${this.mode.toUpperCase()}   Score: ${this.score}   Liv: ${this.lives}`
  }
}