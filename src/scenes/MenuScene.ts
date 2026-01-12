import Phaser from 'phaser'

const qs = (s: string) => document.querySelector(s) as HTMLElement

export default class MenuScene extends Phaser.Scene {
  private selectedDrinkingMode = false;
  
  constructor() {
    super('menu')
  }

  create() {
    // Vis menu
    qs('#menu')?.classList.remove('hidden')
    
    // Reset drinking mode selection
    this.selectedDrinkingMode = false;
    
    // Bind event listeners
    this.bindMenuEvents()
  }

  private bindMenuEvents() {
    // Mode knapper
    const classicBtn = qs('#btn-classic');
    const drinkingBtn = qs('#btn-drinking');
    
    classicBtn?.addEventListener('click', () => {
      this.selectedDrinkingMode = false;
      classicBtn?.classList.add('btn--active');
      drinkingBtn?.classList.remove('btn--active');
    });
    
    drinkingBtn?.addEventListener('click', () => {
      this.selectedDrinkingMode = true;
      drinkingBtn?.classList.add('btn--active');
      classicBtn?.classList.remove('btn--active');
    });

    // Grid size knapper
    const gridButtons = document.querySelectorAll('#grid-segment .btn')
    gridButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const size = parseInt((btn as HTMLElement).dataset.size || '4')
        this.startGrid(size, this.selectedDrinkingMode)
      })
    })

    // Upload knap
    qs('#btn-upload')?.addEventListener('click', () => this.triggerFileUpload())

    // Start knap
    qs('#btn-start')?.addEventListener('click', () => this.startGrid(4, this.selectedDrinkingMode))

    // File input
    const fileInput = document.getElementById('file-input') as HTMLInputElement | null
    if (fileInput) {
      fileInput.multiple = true
      
      // Tilføj ny event listener
      fileInput.addEventListener('change', this.handleFileUpload.bind(this))
    }
  }

  private handleFileUpload = async (event: Event) => {
    const fileInput = event.target as HTMLInputElement
    const files = fileInput.files
    if (!files || files.length === 0) return
    
    // Fjern tidligere billeder
    const existingKeys = this.registry.get('headKeys') as string[] || []
    existingKeys.forEach(key => {
      if (this.textures.exists(key)) this.textures.remove(key)
    })
    
    const headKeys: string[] = []
    
    // Indlæs alle valgte billeder
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const dataUrl = await this.readFileAsDataURL(file)
      const key = `custom-head-${i}`
      
      this.textures.addBase64(key, dataUrl)
      headKeys.push(key)
      console.log('Loaded texture:', key, 'exists:', this.textures.exists(key))
    }
    
    this.registry.set('headKeys', headKeys)
    this.showToast(`${files.length} billede(r) indlæst.`)
    
    // Nulstil file input så samme fil kan vælges igen
    fileInput.value = ''
  }

  private triggerFileUpload() {
    const fileInput = document.getElementById('file-input') as HTMLInputElement | null
    if (fileInput) {
      fileInput.click()
    }
  }

  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  private showToast(text: string) {
    const toast = this.add.text(this.scale.width / 2, 200, text, {
      fontFamily: 'Segoe UI', fontSize: '16px', color: '#ffffff', backgroundColor: 'rgba(0,0,0,.7)', padding: { x: 12, y: 8 }
    }).setOrigin(0.5)

    this.tweens.add({ targets: toast, alpha: 0, delay: 1500, duration: 600, onComplete: () => toast.destroy() })
  }

  private startGrid(size: number, drinkingMode: boolean = false) {
    // Skjul menu
    qs('#menu')?.classList.add('hidden')
    
    const headKeys = this.registry.get('headKeys') as string[] | undefined
    const headKey = headKeys && headKeys.length > 0 ? headKeys[0] : 'fallback-head'
    this.scene.start('grid', { size, headKey, hideMarker: true, drinkingMode })
  }
}