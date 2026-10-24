import type { Face } from "./faces";

export interface GameOptions {
  size: number;
  faces: Face[];
  drinkingMode: boolean;
}

export interface GameHooks {
  onScore(score: number): void;
  /** Antal tiles tilbage (inkl. den forbudte) ud af total */
  onProgress(remaining: number, total: number): void;
  /** Kaldes i det øjeblik den forbudte rammes, før animationen */
  onLose(): void;
  onResult(won: boolean, score: number): void;
  onPunishment(done: () => void): void;
}

const randInt = (max: number) => Math.floor(Math.random() * max);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Samme regler som før: én skjult "forbudt" tile, ny trækkes efter hvert korrekt klik.
// Sidste tile tilbage = sejr. Rammer man den forbudte = game over.
export class Game {
  private tiles: HTMLButtonElement[] = [];
  private forbiddenIndex = 0;
  private score = 0;
  private locked = false;
  private timers: number[] = [];

  constructor(
    private board: HTMLElement,
    private fx: HTMLElement,
    private opts: GameOptions,
    private hooks: GameHooks
  ) {
    this.layoutGrid();
    this.pickForbidden();
    this.hooks.onScore(0);
    this.hooks.onProgress(this.tiles.length, this.tiles.length);
  }

  destroy() {
    this.timers.forEach(clearTimeout);
    this.board.replaceChildren();
    this.fx.replaceChildren();
    this.locked = true;
  }

  private later(ms: number, fn: () => void) {
    this.timers.push(window.setTimeout(fn, ms));
  }

  private layoutGrid() {
    const { size, faces } = this.opts;
    this.board.replaceChildren();
    this.board.style.setProperty("--n", String(size));

    // Blandede kopier efter hinanden: alle ansigter bruges før nogen gentages
    const deck: Face[] = [];
    while (deck.length < size * size) deck.push(...shuffle(faces));

    const frag = document.createDocumentFragment();
    for (let i = 0; i < size * size; i++) {
      const tile = document.createElement("button");
      tile.className = "tile";
      tile.type = "button";
      tile.style.setProperty("--i", String(i));
      tile.setAttribute("aria-label", `Ansigt ${i + 1}`);

      const img = document.createElement("img");
      img.src = deck[i].url;
      img.alt = "";
      img.draggable = false;
      img.decoding = "async";
      tile.append(img);

      // pointerdown for hurtig respons på touch; click med detail 0 = tastatur
      tile.addEventListener("pointerdown", () => this.onTileClick(tile));
      tile.addEventListener("click", (e) => {
        if (e.detail === 0) this.onTileClick(tile);
      });

      this.tiles.push(tile);
      frag.append(tile);
    }
    this.board.append(frag);
  }

  private pickForbidden() {
    this.forbiddenIndex = randInt(this.tiles.length);
  }

  private onTileClick(tile: HTMLButtonElement) {
    if (this.locked) return;
    const index = this.tiles.indexOf(tile);
    if (index === -1) return; // allerede fjernet

    if (index === this.forbiddenIndex) {
      this.locked = true;
      this.hooks.onLose();
      this.loseOn(tile);
      return;
    }

    // Fjern fra state med det samme, så hurtige klik ikke forskyder indeks
    this.tiles.splice(index, 1);
    tile.disabled = true;
    this.score += 1;
    this.hooks.onScore(this.score);
    this.hooks.onProgress(this.tiles.length, this.opts.size ** 2);

    if (this.opts.drinkingMode) {
      this.locked = true;
      this.hooks.onPunishment(() => {
        this.locked = false;
        this.removeTileAndContinue(tile);
      });
    } else {
      this.removeTileAndContinue(tile);
    }
  }

  private removeTileAndContinue(tile: HTMLButtonElement) {
    this.ripple(tile);
    tile.classList.add("tile--gone");

    if (this.tiles.length > 1) {
      this.pickForbidden();
    } else {
      // Kun den forbudte er tilbage - spilleren har vundet!
      this.locked = true;
      this.later(260, () => this.hooks.onResult(true, this.score));
    }
  }

  private ripple(tile: HTMLElement) {
    const r = document.createElement("span");
    r.className = "ripple";
    r.style.left = `${tile.offsetLeft + tile.offsetWidth / 2}px`;
    r.style.top = `${tile.offsetTop + tile.offsetHeight / 2}px`;
    r.style.width = r.style.height = `${tile.offsetWidth}px`;
    r.addEventListener("animationend", () => r.remove());
    this.board.append(r);
  }

  private loseOn(tile: HTMLButtonElement) {
    // Rød flash + shake
    const flash = document.createElement("div");
    flash.className = "flash";
    flash.addEventListener("animationend", () => flash.remove());
    this.fx.append(flash);
    this.board.classList.remove("board--shake");
    void this.board.offsetWidth; // genstart animationen
    this.board.classList.add("board--shake");

    // Skjul alle andre tiles
    this.tiles.forEach((t) => t !== tile && t.classList.add("tile--fade"));

    // Flyt en kopi af den forbudte op i fx-laget og zoom den til midten
    const r = tile.getBoundingClientRect();
    const target = Math.min(window.innerWidth, window.innerHeight) * 0.7;
    const doomed = tile.cloneNode(true) as HTMLElement;
    doomed.className = "tile tile--doomed";
    doomed.removeAttribute("style");
    this.fx.append(doomed);
    tile.style.visibility = "hidden";

    // left/top/width/height i stedet for scale, så billedet er skarpt i fuld størrelse
    doomed.animate(
      [
        { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` },
        {
          left: `${(window.innerWidth - target) / 2}px`,
          top: `${(window.innerHeight - target) / 2}px`,
          width: `${target}px`,
          height: `${target}px`,
        },
      ],
      { duration: 600, easing: "cubic-bezier(.45,0,.55,1)", fill: "forwards" }
    );

    this.later(1200, () => this.hooks.onResult(false, this.score));
  }
}
