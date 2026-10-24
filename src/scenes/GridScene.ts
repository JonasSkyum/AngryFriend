import Phaser from "phaser";

interface GridData {
  size: number;
  headKeys?: string[]; // array af forskellige ansigter
  hideMarker?: boolean;
  drinkingMode?: boolean;
}

// Drinking mode punishments - lots of fun scenarios!
const DRINKING_PUNISHMENTS = [
  // Sip-based punishments
  "Drik 2 tår 🍺🍺",
  "Drik 3 tår 🍺🍺🍺",
  "Drik 4 tår 🍺🍺🍺🍺",
  "Drik 5 tår! 🍺🍺🍺🍺🍺",
  "Drik 6 tår!! 🍺🍺🍺🍺🍺🍺",
  "Bund din drink! 🍺⬇️",

  // Time-based drinking
  "Drik i 3 sekunder ⏱️",
  "Drik i 5 sekunder ⏱️🍺",
  "Drik indtil personen til venstre siger stop 🛑",
  "Drik indtil personen til højre siger stop 🛑",

  // Share the punishment
  "Du + personen til venstre: Drik 2 tår hver 👫",
  "Du + personen til højre: Drik 2 tår hver 👫",
  "Alle drikker 3 tår! 🎉",
  "Alle undtagen dig drikker 2 tår! 😈",
  "Vælg en person der skal drikke 3 tår 👆",
  "Den ældste drikker 2 tår 👴",
  "Den yngste drikker 2 tår 👶",

  // Challenge punishments
  "Sig et fuldt navn på en spiller på 3 sekunder eller drik 3 tår 🗣️",
  "Nævn 3 lande på 5 sekunder eller drik! 🌍",
  "Nævn 5 dyr på 10 sekunder eller drik! 🦁",
  "Sig alfabetet baglæns eller drik 4 tår! 🔤",
  "Rim et ord valgt af gruppen eller drik 3 tår! 🎤",

  // Truth or drink
  "Fortæl en hemmelighed eller drik 3 tår 🤫",
  "Fortæl en af dine mest pinlige oplevelser eller drik 3 tår! 😳",
  "Fortæl en joke eller drik 2 tår 😂",
  "Indrøm noget eller drik 4 tår! 🙊",

  // Rule-based
  "Du må kun bruge venstre hånd resten af spillet 🖐️",
  "Du må ikke sige 'ja' resten af runden! ❌",
  "Du må ikke sige 'nej' resten af runden! ❌",
  "Tal kun engelsk næste 2 minutter",
  "Du er blind resten af runden👀",
  "Du er stum resten af runden 🤐",
  "Du er lam fra halsen og ned resten af runden 🦵",
  "Du må ikke smile næste minut - ellers drik! 😐",

  // Social punishments
  "Ring til en tilfældig kontakt eller drik 3 tår 📱",
  "Send en besked til den 5. kontakt i din telefon 📲",
  "Post noget på Instagram story eller drik 3 tår! 📸",
  "Tag et selfie med personen til venstre 🤳",

  // Game-related
  "Du springer en tur over ⏭️",
  "Du spiller næste runde med lukkede øjne 👀",
  "Næste person bestemmer din straf! Ellers drik 3 tår 😱",

  // Lucky/Unlucky
  "Heldig! Du slipper denne gang 🍀",
  "SUPER HELDIG! Ingen straf + du vælger én der skal drikke! 🌟",
  "Uheldigt! Dobbelt straf næste gang! 💀",
  "JACKPOT! Alle andre drikker 2 tår! 🎰",

  // Misc fun
  "Waterfall! Alle begynder at drikke 🌊",
  "Tag et shot! 🥃",
  "Drik med begge hænder! 🙌",
  "Drik uden at bruge hænderne! 🐕",
  "Lav en skål-tale før du drikker! 🎤",
  "Sig 'skål' på 3 sprog før du drikker 🌐",
  "Lav dyre-lyde resten af spillet før du drikker! 🐮",
];

const $ = (id: string) => document.getElementById(id);

export default class GridScene extends Phaser.Scene {
  private size = 4;
  private headKeys: string[] = ["fallback-head"];
  private hideMarker = true;
  private drinkingMode = false;

  private forbiddenIndex = 0;
  private tiles: Phaser.GameObjects.Image[] = [];
  private score = 0;

  private marker?: Phaser.GameObjects.Image;
  private markerKey = "forbidden-marker";

  // cache én "styled" tekstur pr. størrelse og billede
  private styledKeyCache = new Map<string, string>();

  constructor() {
    super("grid");
  }

  preload() {
    if (this.textures.exists(this.markerKey)) return;
    // Rød, diskret markerings-tekstur (bruges med hideMarker=false)
    const g = this.add.graphics();
    g.lineStyle(6, 0xff3b30, 1).strokeRoundedRect(3, 3, 94, 94, 10);
    g.lineBetween(12, 12, 88, 88);
    g.lineBetween(88, 12, 12, 88);
    g.generateTexture(this.markerKey, 100, 100);
    g.destroy();
  }

  create(data: GridData) {
    // Scenen genbruges ved restart, så al state skal nulstilles her
    this.size = data.size ?? 4;
    this.hideMarker = data.hideMarker ?? true;
    this.drinkingMode = data.drinkingMode ?? false;
    this.score = 0;
    this.tiles = [];
    this.marker = undefined;

    this.headKeys = (data.headKeys ?? []).filter((key) =>
      this.textures.exists(key)
    );
    if (this.headKeys.length === 0) this.headKeys = ["fallback-head"];

    this.bindDomOverlays();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.hideDomOverlays, this);
    this.updateTopbar();

    // Læg grid og træk første "forbudte"
    this.layoutGrid();
    this.pickForbidden();
  }

  // -------- Ansigter: lav rund avatar-tekstur med skygge/ring/gloss --------
  private ensureStyledTileTexture(tileSize: number, baseKey: string): string {
    const texKey = `tile-${baseKey}-${tileSize}`;
    const cached = this.styledKeyCache.get(texKey);
    if (cached && this.textures.exists(cached)) return cached;

    const baseTexture = this.textures.get(baseKey);
    if (!baseTexture || !baseTexture.source[0]) return baseKey; // fallback

    const src = baseTexture.source[0].image as
      | HTMLImageElement
      | HTMLCanvasElement;

    const canvasTex = this.textures.createCanvas(texKey, tileSize, tileSize);
    if (!canvasTex) return baseKey; // fallback

    const ctx = canvasTex.context;
    const s = tileSize;
    const r = s / 2;

    ctx.clearRect(0, 0, s, s);

    // drop shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = s * 0.08;
    ctx.shadowOffsetY = s * 0.04;
    ctx.beginPath();
    ctx.arc(r, r, r * 0.94, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "#0b2447";
    ctx.fill();
    ctx.restore();

    // cirkel-clip og "cover" billedet
    ctx.save();
    ctx.beginPath();
    ctx.arc(r, r, r * 0.92, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const sw = src.width,
      sh = src.height;
    const scale = Math.max(s / sw, s / sh);
    const dx = (s - sw * scale) / 2;
    const dy = (s - sh * scale) / 2;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, dx, dy, sw * scale, sh * scale);
    ctx.restore();

    // gloss
    ctx.save();
    ctx.beginPath();
    ctx.arc(r, r, r * 0.92, 0, Math.PI * 2);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, "rgba(255,255,255,0.18)");
    g.addColorStop(0.5, "rgba(255,255,255,0.05)");
    g.addColorStop(1, "rgba(255,255,255,0.00)");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();

    // ring
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath();
    ctx.arc(r, r, r * 0.92, 0, Math.PI * 2);
    ctx.stroke();

    canvasTex.refresh();
    this.styledKeyCache.set(texKey, texKey);
    return texKey;
  }

  private layoutGrid() {
    const { width, height } = this.scale;
    const top = 144; // plads til topbar
    const bottom = 32;
    const gap = 16;

    const gridW = width - 48;
    const gridH = height - top - bottom;

    const tileSize = Math.floor(
      Math.min(
        (gridW - (this.size - 1) * gap) / this.size,
        (gridH - (this.size - 1) * gap) / this.size
      )
    );

    // Forbered stylede teksturer for alle headKeys
    const styledTexKeys = this.headKeys.map((key) =>
      this.ensureStyledTileTexture(tileSize, key)
    );

    const totalW = tileSize * this.size + gap * (this.size - 1);
    const totalH = tileSize * this.size + gap * (this.size - 1);
    const startX = Math.round((width - totalW) / 2);
    const startY = top + Math.round((gridH - totalH) / 2);

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const x = startX + c * (tileSize + gap) + tileSize / 2;
        const y = startY + r * (tileSize + gap) + tileSize / 2;

        // Vælg et tilfældigt ansigt til denne tile
        const texKey = Phaser.Utils.Array.GetRandom(styledTexKeys) as string;

        const img = this.add
          .image(x, y, texKey)
          .setDisplaySize(tileSize, tileSize)
          .setInteractive({ useHandCursor: true });
        const baseScale = img.scale;

        // mikrointeraktioner (dræb tidligere tween så de ikke kæmper)
        const scaleTo = (factor: number, duration = 110, yoyo = false) => {
          this.tweens.killTweensOf(img);
          img.setScale(baseScale);
          this.tweens.add({
            targets: img,
            scale: baseScale * factor,
            duration,
            yoyo,
            ease: "Sine.easeOut",
          });
        };
        img.on("pointerover", () => scaleTo(1.04));
        img.on("pointerout", () => scaleTo(1.0));
        img.on("pointerdown", () => {
          scaleTo(0.94, 90, true);
          this.onTileClick(img);
        });

        this.tiles.push(img);
      }
    }
  }

  private pickForbidden() {
    this.forbiddenIndex = Phaser.Math.Between(0, this.tiles.length - 1);
    this.applyMarker();
  }

  private applyMarker() {
    this.marker?.destroy();
    this.marker = undefined;
    if (this.hideMarker) return;

    const t = this.tiles[this.forbiddenIndex];
    this.marker = this.add
      .image(t.x, t.y, this.markerKey)
      .setDisplaySize(t.displayWidth, t.displayHeight)
      .setDepth(5)
      .setAlpha(0.22);
  }

  private onTileClick(clickedTile: Phaser.GameObjects.Image) {
    if (!this.input.enabled) return;
    const index = this.tiles.indexOf(clickedTile);
    if (index === -1) return; // Tile ikke fundet (allerede fjernet)

    if (index === this.forbiddenIndex) {
      // Deaktiver input med det samme
      this.input.enabled = false;

      // Flash og shake effekter
      this.cameras.main.flash(80, 200, 0, 0);
      this.cameras.main.shake(120, 0.01);

      // Zoom ind på det forbudte billede
      this.zoomToForbiddenTile(clickedTile);
      return;
    }

    // Fjern tile fra state med det samme, så hurtige klik ikke forskyder indeks
    this.tiles.splice(index, 1);
    clickedTile.removeAllListeners().disableInteractive();
    this.score += 1;
    this.updateTopbar();

    if (this.drinkingMode) {
      this.showDrinkingPunishment(() => this.removeTileAndContinue(clickedTile));
    } else {
      this.removeTileAndContinue(clickedTile);
    }
  }

  private showDrinkingPunishment(onComplete: () => void) {
    // Pause the game while showing punishment
    this.input.enabled = false;

    const punishmentText = $("punishment-text");
    if (punishmentText)
      punishmentText.textContent = Phaser.Utils.Array.GetRandom(
        DRINKING_PUNISHMENTS
      ) as string;

    const popup = $("punishment-popup");
    popup?.classList.remove("hidden");

    // onclick (ikke addEventListener) så der aldrig hænger gamle handlers
    const okBtn = $("btn-punishment-ok");
    if (okBtn)
      okBtn.onclick = () => {
        okBtn.onclick = null;
        popup?.classList.add("hidden");
        this.input.enabled = true;
        onComplete();
      };
  }

  private removeTileAndContinue(clickedTile: Phaser.GameObjects.Image) {
    this.ripple(clickedTile.x, clickedTile.y);
    this.tweens.killTweensOf(clickedTile);
    this.tweens.add({
      targets: clickedTile,
      scale: 0,
      alpha: 0,
      duration: 200,
      ease: "Back.easeIn",
      onComplete: () => clickedTile.destroy(),
    });

    if (this.tiles.length > 1) {
      // Vælg ny forbudt avatar blandt de resterende
      this.pickForbidden();
    } else {
      // Kun den forbudte avatar er tilbage - spilleren har vundet!
      this.showResult(`Du vandt! Score: ${this.score}`);
    }
  }

  private ripple(x: number, y: number) {
    const circle = this.add.circle(x, y, 1, 0xffffff, 0.14).setDepth(20);
    this.tweens.add({
      targets: circle,
      radius: 120,
      alpha: 0,
      duration: 320,
      ease: "Sine.easeOut",
      onComplete: () => circle.destroy(),
    });
  }

  private zoomToForbiddenTile(tile: Phaser.GameObjects.Image) {
    this.marker?.destroy();

    // Skjul alle andre tiles
    this.tweens.add({
      targets: this.tiles.filter((t) => t !== tile),
      alpha: 0,
      duration: 300,
      ease: "Sine.easeOut",
    });

    const { width, height } = this.scale;
    const targetSize = Math.min(width, height) * 0.7;
    const centerX = width / 2;
    const centerY = height / 2;

    this.tweens.killTweensOf(tile);
    tile.setDepth(10);

    // Tilføj rød glød/ramme omkring den forbudte
    const glowCircle = this.add
      .circle(tile.x, tile.y, tile.displayWidth / 2 + 20, 0xff0000, 0.3)
      .setDepth(9);

    // Animer tile til centrum og forstør den
    this.tweens.add({
      targets: [tile, glowCircle],
      x: centerX,
      y: centerY,
      duration: 600,
      ease: "Sine.easeInOut",
    });

    this.tweens.add({
      targets: tile,
      displayWidth: targetSize,
      displayHeight: targetSize,
      duration: 600,
      ease: "Sine.easeInOut",
    });

    this.tweens.add({
      targets: glowCircle,
      radius: targetSize / 2 + 30,
      alpha: 0.5,
      duration: 600,
      ease: "Sine.easeInOut",
      onComplete: () =>
        // "pulserende" rød ramme
        this.tweens.add({
          targets: glowCircle,
          alpha: 0.2,
          yoyo: true,
          repeat: 2,
          duration: 200,
          ease: "Sine.easeInOut",
        }),
    });

    // Vis game over efter zoom-animationen
    this.time.delayedCall(1200, () =>
      this.showResult(`Score: ${this.score}`)
    );
  }

  // -------- DOM overlays (topbar, game over, straf) --------
  private bindDomOverlays() {
    $("topbar")?.classList.remove("hidden");

    const back = $("btn-back");
    if (back) back.onclick = () => this.scene.start("menu");

    const retry = $("btn-retry");
    if (retry)
      retry.onclick = () =>
        this.scene.restart({
          size: this.size,
          headKeys: this.headKeys,
          hideMarker: this.hideMarker,
          drinkingMode: this.drinkingMode,
        } as GridData);

    const menu = $("btn-menu");
    if (menu) menu.onclick = () => this.scene.start("menu");
  }

  private hideDomOverlays() {
    ["topbar", "gameover", "punishment-popup"].forEach((id) =>
      $(id)?.classList.add("hidden")
    );
    const okBtn = $("btn-punishment-ok");
    if (okBtn) okBtn.onclick = null;
  }

  private showResult(text: string) {
    this.input.enabled = false;
    const scoreline = $("scoreline");
    if (scoreline) scoreline.textContent = text;
    $("gameover")?.classList.remove("hidden");
  }

  private updateTopbar() {
    const modeText = this.drinkingMode ? "🍺" : "Classic";
    const domTitle = $("topbar-title");
    if (domTitle)
      domTitle.textContent = `${modeText} · ${this.size}×${this.size} · Score ${this.score}`;
  }
}
