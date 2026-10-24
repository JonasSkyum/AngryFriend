import "@fontsource/dela-gothic-one/latin-400.css";
import "./styles.css";
import { Game } from "./game";
import {
  FALLBACK_FACE,
  addFaces,
  clearFaces,
  loadSavedFaces,
  type Face,
} from "./faces";

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const state = {
  drinkingMode: false,
  size: 4,
  faces: [] as Face[],
};
let game: Game | null = null;

// -------- Menu --------
function syncMenu() {
  document.querySelectorAll<HTMLElement>("#mode-seg [data-mode]").forEach((b) => {
    const on = (b.dataset.mode === "drinking") === state.drinkingMode;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-checked", String(on));
  });
  document.querySelectorAll<HTMLElement>("#grid-seg [data-size]").forEach((b) => {
    const on = b.dataset.size === String(state.size);
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-checked", String(on));
  });
  document.body.classList.toggle("is-drinking", state.drinkingMode);

  // Vis op til 5 thumbnails + "+N"
  const stack = $("faces-stack");
  const shown = state.faces.length ? state.faces : [FALLBACK_FACE];
  stack.replaceChildren(
    ...shown.slice(0, 5).map((f) => {
      const img = document.createElement("img");
      img.src = f.url;
      img.alt = "";
      img.decoding = "async";
      return img;
    })
  );
  if (shown.length > 5) {
    const more = document.createElement("span");
    more.className = "faces__more";
    more.textContent = `+${shown.length - 5}`;
    stack.append(more);
  }
  $("faces-hint").textContent = state.faces.length
    ? `${state.faces.length} ansigt${state.faces.length === 1 ? "" : "er"}`
    : "Standard-ojisan";
  $("btn-clear").hidden = state.faces.length === 0;
}

function toast(text: string) {
  const t = $("toast");
  t.textContent = text;
  t.hidden = false;
  t.classList.remove("toast--show");
  void t.offsetWidth;
  t.classList.add("toast--show");
}

document.querySelectorAll<HTMLElement>("#mode-seg [data-mode]").forEach((b) =>
  b.addEventListener("click", () => {
    state.drinkingMode = b.dataset.mode === "drinking";
    syncMenu();
  })
);
document.querySelectorAll<HTMLElement>("#grid-seg [data-size]").forEach((b) =>
  b.addEventListener("click", () => {
    state.size = Number(b.dataset.size);
    syncMenu();
  })
);

const fileInput = $<HTMLInputElement>("file-input");
$("btn-upload").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const files = Array.from(fileInput.files ?? []);
  fileInput.value = ""; // så samme fil kan vælges igen
  if (!files.length) return;

  const btn = $<HTMLButtonElement>("btn-upload");
  btn.disabled = true;
  btn.classList.add("is-loading");
  const { faces, failed } = await addFaces(files);
  btn.disabled = false;
  btn.classList.remove("is-loading");

  state.faces.push(...faces);
  syncMenu();
  if (failed) toast(`${failed} billede(r) kunne ikke indlæses`);
  else toast(`${faces.length} ansigt${faces.length === 1 ? "" : "er"} tilføjet`);
});
$("btn-clear").addEventListener("click", async () => {
  await clearFaces(state.faces);
  state.faces = [];
  syncMenu();
});

$("btn-start").addEventListener("click", startGame);

// -------- Spil --------
function showScreen(screen: "menu" | "game") {
  $("menu").hidden = screen !== "menu";
  $("game").hidden = screen !== "game";
  document.body.dataset.screen = screen;
}

function hideModals() {
  $("result").hidden = true;
  $("punishment-popup").hidden = true;
}

function startGame() {
  game?.destroy();
  hideModals();
  showScreen("game");

  $("hud-mode").textContent = state.drinkingMode ? "🍺 Drinking" : "Classic";
  $("hud-size").textContent = `${state.size}×${state.size}`;

  game = new Game(
    $("board"),
    $("fx"),
    {
      size: state.size,
      faces: state.faces.length ? state.faces : [FALLBACK_FACE],
      drinkingMode: state.drinkingMode,
    },
    {
      onScore(score) {
        const el = $("hud-score");
        el.textContent = String(score);
        if (score === 0) return;
        el.classList.remove("bump");
        void el.offsetWidth;
        el.classList.add("bump");
      },
      onResult(won, score) {
        $("result").classList.toggle("is-win", won);
        $("result-title").textContent = won ? "Du vandt!" : "Game Over";
        $("result-stamp").textContent = won ? "勝" : "怒";
        $("result-score").textContent = String(score);
        $("result").hidden = false;
        $("btn-retry").focus({ preventScroll: true });
      },
      onPunishment(text, done) {
        $("punishment-text").textContent = text;
        $("punishment-popup").hidden = false;
        const ok = $("btn-punishment-ok");
        ok.focus({ preventScroll: true });
        ok.onclick = () => {
          ok.onclick = null;
          $("punishment-popup").hidden = true;
          done();
        };
      },
    }
  );
}

function toMenu() {
  game?.destroy();
  game = null;
  hideModals();
  showScreen("menu");
}

$("btn-back").addEventListener("click", toMenu);
$("btn-menu").addEventListener("click", toMenu);
$("btn-retry").addEventListener("click", startGame);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.body.dataset.screen === "game" && $("punishment-popup").hidden)
    toMenu();
});

// -------- Opstart --------
syncMenu();
loadSavedFaces().then((faces) => {
  state.faces = faces;
  syncMenu();
});
