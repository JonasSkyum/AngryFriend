import Phaser from "phaser";

interface GridData {
  size: number;
  headKey?: string;
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

export default class GridScene extends Phaser.Scene {
  private size = 4;
  private headKey = "fallback-head";
  private hideMarker = true;
  private drinkingMode = false;

  private forbiddenIndex = 0;
  private tiles: Phaser.GameObjects.Image[] = [];
  private score = 0;

  private uiText!: Phaser.GameObjects.Text;
  private markerKey = "forbidden-marker";

  // cache én "styled" tekstur pr. størrelse og billede
  private styledKeyCache = new Map<string, string>();

  constructor() {
    super("grid");
  }

  preload() {
    // Rød, diskret markerings-tekstur (bruges med hideMarker=false)
    const g = this.add.graphics();
    g.lineStyle(6, 0xff3b30, 1).strokeRoundedRect(3, 3, 94, 94, 10);
    g.lineBetween(12, 12, 88, 88);
    g.lineBetween(88, 12, 12, 88);
    g.generateTexture(this.markerKey, 100, 100);
    g.destroy();
  }

  create(data: GridData) {
    this.size = data.size ?? 4;
    this.hideMarker = data.hideMarker ?? true;
    this.drinkingMode = data.drinkingMode ?? false;
    if (data.headKey && this.textures.exists(data.headKey)) {
      this.headKey = data.headKey;
      console.log("Using custom head:", data.headKey);
    } else {
      console.log(
        "Using fallback head, data.headKey:",
        data.headKey,
        "exists:",
        data.headKey ? this.textures.exists(data.headKey) : false
      );
    }

    // Topbar-UI
    this.uiText = this.add.text(8, 8, "", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#ffffff",
    });
    this.updateTopbar();

    // Hook DOM-overlays (topbar, gameover)
    this.bindDomOverlays();

    // Læg grid og træk første "forbudte"
    this.layoutGrid();
    this.pickForbidden();
  }

  // -------- Ansigter: lav rund avatar-tekstur med skygge/ring/gloss --------
  private ensureStyledTileTexture(tileSize: number): string {
    const baseKey = this.headKey;
    const cacheKey = `${baseKey}-${tileSize}`;
    if (
      this.styledKeyCache.has(cacheKey) &&
      this.textures.exists(this.styledKeyCache.get(cacheKey)!)
    ) {
      return this.styledKeyCache.get(cacheKey)!;
    }

    const baseTexture = this.textures.get(baseKey);
    if (!baseTexture || !baseTexture.source[0]) return baseKey; // fallback

    const src = baseTexture.source[0].image as
      | HTMLImageElement
      | HTMLCanvasElement;

    const texKey = `tile-${baseKey}-${tileSize}`;
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
    const sw = (src as any).width,
      sh = (src as any).height;
    const scale = Math.max(s / sw, s / sh);
    const dx = (s - sw * scale) / 2;
    const dy = (s - sh * scale) / 2;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(src as any, dx, dy, sw * scale, sh * scale);
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
    this.styledKeyCache.set(cacheKey, texKey);
    return texKey;
  }

  private layoutGrid() {
    this.tiles.forEach((t) => t.destroy());
    this.tiles = [];

    const { width, height } = this.scale;
    const top = 72; // plads til topbar
    const bottom = 16;
    const gap = 8;

    const gridW = width - 24;
    const gridH = height - top - bottom;

    const tileSize = Math.floor(
      Math.min(
        (gridW - (this.size - 1) * gap) / this.size,
        (gridH - (this.size - 1) * gap) / this.size
      )
    );
    const texKey = this.ensureStyledTileTexture(tileSize);

    const totalW = tileSize * this.size + gap * (this.size - 1);
    const totalH = tileSize * this.size + gap * (this.size - 1);
    const startX = Math.round((width - totalW) / 2);
    const startY = top + Math.round((gridH - totalH) / 2);

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const x = startX + c * (tileSize + gap) + tileSize / 2;
        const y = startY + r * (tileSize + gap) + tileSize / 2;

        const img = this.add
          .image(x, y, texKey)
          .setDisplaySize(tileSize, tileSize)
          .setInteractive({ useHandCursor: true });

        // mikrointeraktioner
        img.on("pointerover", () =>
          this.tweens.add({
            targets: img,
            scale: 1.04,
            duration: 110,
            ease: "Sine.easeOut",
          })
        );
        img.on("pointerout", () =>
          this.tweens.add({
            targets: img,
            scale: 1.0,
            duration: 110,
            ease: "Sine.easeOut",
          })
        );
        img.on("pointerdown", () =>
          this.tweens.add({
            targets: img,
            scale: 0.94,
            yoyo: true,
            duration: 90,
            ease: "Sine.easeInOut",
          })
        );

        img.on("pointerdown", () => this.onTileClick(img));
        this.tiles.push(img);
      }
    }
  }

  private pickForbidden() {
    this.forbiddenIndex = Phaser.Math.Between(0, this.tiles.length - 1);
    this.applyMarker();
  }

  private applyMarker() {
    // fjern gamle markører
    this.children.getAll().forEach((obj) => {
      if ((obj as any).getData?.("markerOwner")) obj.destroy();
    });

    if (this.hideMarker) return;

    const t = this.tiles[this.forbiddenIndex];
    const m = this.add
      .image(t.x, t.y, this.markerKey)
      .setDisplaySize(t.displayWidth, t.displayHeight)
      .setDepth(5)
      .setAlpha(0.22);
    m.setData("markerOwner", true);
  }

  private onTileClick(clickedTile: Phaser.GameObjects.Image) {
    const index = this.tiles.indexOf(clickedTile);
    if (index === -1) return; // Tile ikke fundet (allerede fjernet)

    const isForbidden = index === this.forbiddenIndex;

    if (isForbidden) {
      this.cameras.main.flash(80, 200, 0, 0);
      this.cameras.main.shake(120, 0.01);
      this.gameOver();
      return;
    }

    // Show drinking punishment if in drinking mode
    if (this.drinkingMode) {
      this.showDrinkingPunishment(() => {
        this.removeTileAndContinue(clickedTile, index);
      });
    } else {
      this.removeTileAndContinue(clickedTile, index);
    }
  }

  private showDrinkingPunishment(onComplete: () => void) {
    // Pause the game while showing punishment
    this.input.enabled = false;

    // Pick a random punishment
    const punishment =
      DRINKING_PUNISHMENTS[
        Phaser.Math.Between(0, DRINKING_PUNISHMENTS.length - 1)
      ];

    // Show the punishment popup
    const punishmentText = document.getElementById("punishment-text");
    if (punishmentText) punishmentText.textContent = punishment;

    const popup = document.getElementById("punishment-popup");
    popup?.classList.remove("hidden");

    // Handle OK button
    const okBtn = document.getElementById("btn-punishment-ok");
    const handleOk = () => {
      popup?.classList.add("hidden");
      okBtn?.removeEventListener("click", handleOk);
      this.input.enabled = true;
      onComplete();
    };
    okBtn?.addEventListener("click", handleOk);
  }

  private removeTileAndContinue(
    clickedTile: Phaser.GameObjects.Image,
    index: number
  ) {
    // Fjern den klikkede avatar med en animation
    this.tweens.add({
      targets: clickedTile,
      scale: 0,
      alpha: 0,
      duration: 200,
      ease: "Back.easeIn",
      onComplete: () => {
        clickedTile.destroy();
        // Fjern fra tiles array
        this.tiles.splice(index, 1);
        // Opdater forbiddenIndex hvis nødvendigt
        if (this.forbiddenIndex > index) {
          this.forbiddenIndex--;
        }
        // Vælg ny forbudt avatar blandt de resterende
        if (this.tiles.length > 1) {
          this.forbiddenIndex = Phaser.Math.Between(0, this.tiles.length - 1);
          this.applyMarker();
        } else if (this.tiles.length === 1) {
          // Kun den forbudte avatar er tilbage - spilleren har vundet!
          this.gameWin();
        }
      },
    });

    this.score += 1;
    this.updateTopbar();
    this.ripple(clickedTile.x, clickedTile.y);
  }

  private ripple(x: number, y: number) {
    const circle = this.add.circle(x, y, 1, 0xffffff, 0.14).setDepth(20);
    this.tweens.add({
      targets: circle,
      radius: 60,
      alpha: 0,
      duration: 320,
      ease: "Sine.easeOut",
      onComplete: () => circle.destroy(),
    });
  }

  // -------- Game Over overlay (DOM) --------
  private bindDomOverlays() {
    // vis topbar (fra CSS/HTML vi lagde i index.html)
    document.getElementById("topbar")?.classList.remove("hidden");

    const backBtn = document.getElementById(
      "btn-back"
    ) as HTMLButtonElement | null;
    backBtn && (backBtn.onclick = () => this.scene.start("menu"));

    const retryBtn = document.getElementById(
      "btn-retry"
    ) as HTMLButtonElement | null;
    const menuBtn = document.getElementById(
      "btn-menu"
    ) as HTMLButtonElement | null;

    retryBtn &&
      (retryBtn.onclick = () => {
        document.getElementById("gameover")?.classList.add("hidden");
        this.scene.restart({
          size: this.size,
          headKey: this.headKey,
          hideMarker: this.hideMarker,
          drinkingMode: this.drinkingMode,
        } as GridData);
      });

    menuBtn &&
      (menuBtn.onclick = () => {
        document.getElementById("gameover")?.classList.add("hidden");
        this.scene.start("menu");
      });
  }

  private gameOver() {
    this.input.enabled = false;

    const scoreline = document.getElementById("scoreline");
    if (scoreline) scoreline.textContent = `Score: ${this.score}`;

    document.getElementById("gameover")?.classList.remove("hidden");
  }

  private gameWin() {
    this.input.enabled = false;

    const scoreline = document.getElementById("scoreline");
    if (scoreline) scoreline.textContent = `Du vandt! Score: ${this.score}`;

    document.getElementById("gameover")?.classList.remove("hidden");
  }

  private updateTopbar() {
    const modeText = this.drinkingMode ? "🍺 Drinking" : "Classic";
    this.uiText.setText(
      `${modeText}   Grid: ${this.size}×${this.size}   Score: ${this.score}`
    );
    // opdater dom-titel hvis den findes
    const domTitle = document.getElementById("topbar-title");
    if (domTitle)
      domTitle.textContent = `${modeText} - ${this.size}×${this.size}`;
  }
}
