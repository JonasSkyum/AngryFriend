import Phaser from "phaser";

const qs = (s: string) => document.querySelector(s) as HTMLElement | null;

// Uploadede billeder skaleres ned til et kvadrat (max tile-størrelse ~ 504px)
const MAX_FACE_SIZE = 512;

export default class MenuScene extends Phaser.Scene {
  private selectedDrinkingMode = false;
  private selectedSize = 4;
  private eventsBound = false; // Scenen genbruges, så vi binder kun DOM-events én gang

  constructor() {
    super("menu");
  }

  create() {
    qs("#menu")?.classList.remove("hidden");
    this.bindMenuEvents();
    this.syncMenuUi();
  }

  private bindMenuEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    qs("#btn-classic")?.addEventListener("click", () => {
      this.selectedDrinkingMode = false;
      this.syncMenuUi();
    });
    qs("#btn-drinking")?.addEventListener("click", () => {
      this.selectedDrinkingMode = true;
      this.syncMenuUi();
    });

    // Grid size vælger størrelse; START starter spillet
    document
      .querySelectorAll<HTMLElement>("#grid-segment .btn")
      .forEach((btn) =>
        btn.addEventListener("click", () => {
          this.selectedSize = parseInt(btn.dataset.size || "4");
          this.syncMenuUi();
        })
      );

    qs("#btn-upload")?.addEventListener("click", () =>
      (qs("#file-input") as HTMLInputElement | null)?.click()
    );
    qs("#btn-clear")?.addEventListener("click", () => this.clearFaces());
    qs("#btn-start")?.addEventListener("click", () => this.startGrid());

    qs("#file-input")?.addEventListener("change", this.handleFileUpload);
  }

  private syncMenuUi() {
    qs("#btn-classic")?.classList.toggle("btn--active", !this.selectedDrinkingMode);
    qs("#btn-drinking")?.classList.toggle("btn--active", this.selectedDrinkingMode);
    document
      .querySelectorAll<HTMLElement>("#grid-segment .btn")
      .forEach((btn) =>
        btn.classList.toggle(
          "btn--active",
          btn.dataset.size === String(this.selectedSize)
        )
      );

    const count = this.getHeadKeys().length;
    const uploadBtn = qs("#btn-upload");
    if (uploadBtn)
      uploadBtn.textContent = count > 0 ? `Upload Face (${count})` : "Upload Face";
    qs("#btn-clear")?.classList.toggle("hidden", count === 0);
  }

  private getHeadKeys(): string[] {
    return (this.registry.get("headKeys") as string[] | undefined) ?? [];
  }

  private handleFileUpload = async (event: Event) => {
    const fileInput = event.target as HTMLInputElement;
    const files = Array.from(fileInput.files ?? []);
    if (files.length === 0) return;

    const uploadBtn = qs("#btn-upload");
    if (uploadBtn) uploadBtn.textContent = "Indlæser…";

    // Tilføj til eksisterende billeder i stedet for at erstatte
    const headKeys = [...this.getHeadKeys()];
    const uploadId = Date.now();
    let failed = 0;

    // Indlæs parallelt - hvert billede skaleres ned så store fotos ikke sluger RAM
    const results = await Promise.allSettled(
      files.map((file) => this.loadFaceCanvas(file))
    );
    results.forEach((res, i) => {
      if (res.status === "rejected") {
        failed++;
        return;
      }
      const key = `custom-head-${uploadId}-${i}`;
      this.textures.addCanvas(key, res.value);
      headKeys.push(key);
    });

    this.registry.set("headKeys", headKeys);
    this.syncMenuUi();
    if (failed > 0) alert(`${failed} billede(r) kunne ikke indlæses.`);

    // Nulstil file input så samme fil kan vælges igen
    fileInput.value = "";
  };

  // Indlæs fil og lav et centreret, nedskaleret kvadrat-udsnit
  private async loadFaceCanvas(file: File): Promise<HTMLCanvasElement> {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();

      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const out = Math.min(side, MAX_FACE_SIZE);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = out;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        (img.naturalWidth - side) / 2,
        (img.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        out,
        out
      );
      return canvas;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private clearFaces() {
    const keys = new Set(this.getHeadKeys());
    // Fjern både original-teksturer og deres stylede tile-varianter
    this.textures.getTextureKeys().forEach((key) => {
      if (keys.has(key) || [...keys].some((k) => key.startsWith(`tile-${k}-`)))
        this.textures.remove(key);
    });
    this.registry.set("headKeys", []);
    this.syncMenuUi();
  }

  private startGrid() {
    qs("#menu")?.classList.add("hidden");

    const headKeys = this.getHeadKeys();
    this.scene.start("grid", {
      size: this.selectedSize,
      headKeys: headKeys.length > 0 ? headKeys : ["fallback-head"],
      hideMarker: true,
      drinkingMode: this.selectedDrinkingMode,
    });
  }
}
