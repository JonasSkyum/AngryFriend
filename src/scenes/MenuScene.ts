import Phaser from "phaser";

const qs = (s: string) => document.querySelector(s) as HTMLElement;

export default class MenuScene extends Phaser.Scene {
  private selectedDrinkingMode = false;
  private static eventsBound = false; // Static flag så vi kun binder events én gang
  private boundFileHandler: ((event: Event) => void) | null = null;

  constructor() {
    super("menu");
  }

  create() {
    // Vis menu
    qs("#menu")?.classList.remove("hidden");

    // Reset drinking mode selection
    this.selectedDrinkingMode = false;

    // Bind event listeners (kun første gang)
    this.bindMenuEvents();
  }

  private bindMenuEvents() {
    // Skip hvis events allerede er bundet
    if (MenuScene.eventsBound) return;
    MenuScene.eventsBound = true;

    // Mode knapper
    const classicBtn = qs("#btn-classic");
    const drinkingBtn = qs("#btn-drinking");

    classicBtn?.addEventListener("click", () => {
      this.selectedDrinkingMode = false;
      classicBtn?.classList.add("btn--active");
      drinkingBtn?.classList.remove("btn--active");
    });

    drinkingBtn?.addEventListener("click", () => {
      this.selectedDrinkingMode = true;
      drinkingBtn?.classList.add("btn--active");
      classicBtn?.classList.remove("btn--active");
    });

    // Grid size knapper
    const gridButtons = document.querySelectorAll("#grid-segment .btn");
    gridButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const size = parseInt((btn as HTMLElement).dataset.size || "4");
        this.startGrid(size, this.selectedDrinkingMode);
      });
    });

    // Upload knap
    qs("#btn-upload")?.addEventListener("click", () =>
      this.triggerFileUpload()
    );

    // Start knap
    qs("#btn-start")?.addEventListener("click", () =>
      this.startGrid(4, this.selectedDrinkingMode)
    );

    // File input - brug bound handler så vi kan fjerne den hvis nødvendigt
    const fileInput = document.getElementById(
      "file-input"
    ) as HTMLInputElement | null;
    if (fileInput) {
      fileInput.multiple = true;
      this.boundFileHandler = this.handleFileUpload.bind(this);
      fileInput.addEventListener("change", this.boundFileHandler);
    }
  }

  private handleFileUpload = async (event: Event) => {
    const fileInput = event.target as HTMLInputElement;
    const files = fileInput.files;
    if (!files || files.length === 0) return;

    console.log("Files selected:", files.length);

    // Hent eksisterende billeder (tilføj til dem i stedet for at erstatte)
    const existingKeys = (this.registry.get("headKeys") as string[]) || [];
    const headKeys: string[] = [...existingKeys]; // Start med eksisterende
    const uploadId = Date.now(); // Ét timestamp for hele uploaden

    // Indlæs alle valgte billeder og vent på at de er helt loaded
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Loading file ${i + 1}/${files.length}: ${file.name}`);
      const dataUrl = await this.readFileAsDataURL(file);
      const key = `custom-head-${uploadId}-${i}`; // Unikt key med upload ID + index

      // Vent på at teksturen er loaded før vi fortsætter
      await this.loadBase64Texture(key, dataUrl);
      headKeys.push(key);
      console.log("Loaded texture:", key, "exists:", this.textures.exists(key));
    }

    console.log("All textures loaded, headKeys:", headKeys);
    this.registry.set("headKeys", headKeys);
    this.showToast(`${headKeys.length} billede(r) i alt.`);

    // Nulstil file input så samme fil kan vælges igen
    fileInput.value = "";
  };

  private loadBase64Texture(key: string, dataUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Fjern eksisterende tekstur hvis den findes
      if (this.textures.exists(key)) {
        this.textures.remove(key);
      }

      // Brug et Image element for at sikre billedet er helt loaded
      const img = new Image();
      img.onload = () => {
        // Billedet er loaded, nu kan vi tilføje det som tekstur
        this.textures.addImage(key, img);
        console.log(
          "Image loaded and added:",
          key,
          "size:",
          img.width,
          "x",
          img.height
        );
        resolve();
      };
      img.onerror = (err) => {
        console.error("Failed to load image:", err);
        reject(err);
      };
      img.src = dataUrl;
    });
  }

  private triggerFileUpload() {
    const fileInput = document.getElementById(
      "file-input"
    ) as HTMLInputElement | null;
    if (fileInput) {
      fileInput.click();
    }
  }

  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private showToast(text: string) {
    const toast = this.add
      .text(this.scale.width / 2, 200, text, {
        fontFamily: "Segoe UI",
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,.7)",
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: toast,
      alpha: 0,
      delay: 1500,
      duration: 600,
      onComplete: () => toast.destroy(),
    });
  }

  private startGrid(size: number, drinkingMode: boolean = false) {
    // Skjul menu
    qs("#menu")?.classList.add("hidden");

    const headKeys = this.registry.get("headKeys") as string[] | undefined;
    // Send alle headKeys til GridScene så vi kan have forskellige ansigter
    this.scene.start("grid", {
      size,
      headKeys: headKeys && headKeys.length > 0 ? headKeys : ["fallback-head"],
      hideMarker: true,
      drinkingMode,
    });
  }
}
