import "@fontsource/dela-gothic-one/latin-400.css";
import "./styles.css";
import { Game } from "./game";
import {
  FALLBACK_FACE,
  addFaces,
  clearFaces,
  deleteFace,
  loadSavedFaces,
  type Face,
} from "./faces";
import { BIG_PUNISHMENTS, DRINKING_PUNISHMENTS } from "./punishments";
import { loadSettings, saveSettings } from "./settings";
import { setMuted, sfx, unlockAudio } from "./sound";
import { haptic } from "./haptics";
import { confetti } from "./confetti";

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const MAX_PLAYERS = 12;

const state = { ...loadSettings(), faces: [] as Face[] };
setMuted(state.muted);
let game: Game | null = null;

function persist() {
  const { drinkingMode, size, muted, players, punishments, best } = state;
  saveSettings({ drinkingMode, size, muted, players, punishments, best });
}

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

  const best = state.best[state.size] ?? 0;
  $("grid-best").textContent = best ? `🏆 Rekord ${best}/${state.size ** 2 - 1}` : "";

  renderFaces();
  renderPlayers();
  renderPunishments();
  syncSound();
}

function renderFaces() {
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
    ? plural(state.faces.length, "ansigt", "ansigter")
    : "Standard-ojisan";
  $("btn-edit-faces").hidden = state.faces.length === 0;

  if ($("faces-sheet").hidden) return;
  $("gallery").replaceChildren(
    ...state.faces.map((face) => {
      const item = document.createElement("div");
      item.className = "gallery__item";
      const img = document.createElement("img");
      img.src = face.url;
      img.alt = "";
      img.decoding = "async";
      const del = document.createElement("button");
      del.className = "gallery__del";
      del.textContent = "✕";
      del.setAttribute("aria-label", "Slet ansigt");
      del.addEventListener("click", async () => {
        state.faces = state.faces.filter((f) => f !== face);
        syncMenu();
        await deleteFace(face);
      });
      item.append(img, del);
      return item;
    })
  );
  $("gallery-empty").hidden = state.faces.length > 0;
  $("btn-clear").hidden = state.faces.length === 0;
}

function renderPlayers() {
  const n = state.players.length;
  const list = $("players");
  list.hidden = n === 0;
  list.replaceChildren(
    ...state.players.map((name, i) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "player";
      chip.setAttribute("aria-label", `Fjern ${name}`);
      const x = document.createElement("span");
      x.textContent = "✕";
      x.setAttribute("aria-hidden", "true");
      chip.append(name, x);
      chip.addEventListener("click", () => {
        state.players.splice(i, 1);
        persist();
        syncMenu();
      });
      return chip;
    })
  );
  $("players-hint").textContent =
    n === 0 ? "Valgfrit · send telefonen rundt" : n === 1 ? "Tilføj én mere" : `${n} på tur`;
}

function renderPunishments() {
  const n = state.punishments.length;
  $("punish-hint").textContent = n ? plural(n, "egen straf", "egne straffe") : "Kun de indbyggede";
  if ($("punish-sheet").hidden) return;
  $("punish-list").replaceChildren(
    ...state.punishments.map((text, i) => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = text;
      const del = document.createElement("button");
      del.className = "list__del";
      del.textContent = "✕";
      del.setAttribute("aria-label", "Slet straf");
      del.addEventListener("click", () => {
        state.punishments.splice(i, 1);
        persist();
        syncMenu();
      });
      li.append(span, del);
      return li;
    })
  );
}

function syncSound() {
  document.querySelectorAll<HTMLElement>(".js-sound").forEach((b) => {
    b.textContent = state.muted ? "🔇" : "🔊";
    b.setAttribute("aria-pressed", String(!state.muted));
  });
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
    persist();
    syncMenu();
  })
);
document.querySelectorAll<HTMLElement>("#grid-seg [data-size]").forEach((b) =>
  b.addEventListener("click", () => {
    state.size = Number(b.dataset.size);
    persist();
    syncMenu();
  })
);

document.querySelectorAll<HTMLElement>(".js-sound").forEach((b) =>
  b.addEventListener("click", () => {
    state.muted = !state.muted;
    setMuted(state.muted);
    persist();
    syncSound();
    sfx.pop();
  })
);

$("player-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $<HTMLInputElement>("player-input");
  const name = input.value.trim();
  if (!name) return;
  if (state.players.length >= MAX_PLAYERS) return toast(`Max ${MAX_PLAYERS} spillere`);
  state.players.push(name);
  input.value = "";
  persist();
  syncMenu();
});

// -------- Sheets --------
function openSheet(id: string) {
  $(id).hidden = false;
  syncMenu();
}
function closeSheets() {
  document.querySelectorAll<HTMLElement>(".modal--sheet").forEach((m) => (m.hidden = true));
}
document.querySelectorAll<HTMLElement>(".modal--sheet").forEach((m) =>
  m.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target === m || target.closest("[data-close]")) m.hidden = true;
  })
);
$("faces-stack").addEventListener("click", () => state.faces.length && openSheet("faces-sheet"));
$("btn-edit-faces").addEventListener("click", () => openSheet("faces-sheet"));
$("btn-edit-punish").addEventListener("click", () => {
  openSheet("punish-sheet");
  $("punish-input").focus();
});

$("punish-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $<HTMLInputElement>("punish-input");
  const text = input.value.trim();
  if (!text) return;
  state.punishments.unshift(text);
  input.value = "";
  persist();
  syncMenu();
});

// -------- Upload --------
const fileInput = $<HTMLInputElement>("file-input");
const uploadButtons = document.querySelectorAll<HTMLButtonElement>(".js-upload");
uploadButtons.forEach((b) => b.addEventListener("click", () => fileInput.click()));
fileInput.addEventListener("change", async () => {
  const files = Array.from(fileInput.files ?? []);
  fileInput.value = ""; // så samme fil kan vælges igen
  if (!files.length) return;

  uploadButtons.forEach((b) => {
    b.disabled = true;
    b.classList.add("is-loading");
  });
  const { faces, failed } = await addFaces(files);
  uploadButtons.forEach((b) => {
    b.disabled = false;
    b.classList.remove("is-loading");
  });

  state.faces.push(...faces);
  syncMenu();
  if (failed) toast(`${failed} billede(r) kunne ikke indlæses`);
  else toast(`${plural(faces.length, "ansigt", "ansigter")} tilføjet`);
});

// Kræver to tryk, så man ikke sletter alle ansigter ved et uheld
const clearBtn = $<HTMLButtonElement>("btn-clear");
let clearTimer: number | undefined;
clearBtn.addEventListener("click", async () => {
  if (!clearBtn.dataset.armed) {
    clearBtn.dataset.armed = "1";
    clearBtn.textContent = "Sikker? Tryk igen";
    clearTimer = window.setTimeout(disarmClear, 3000);
    return;
  }
  disarmClear();
  const faces = state.faces;
  state.faces = [];
  syncMenu();
  await clearFaces(faces);
});
function disarmClear() {
  clearTimeout(clearTimer);
  delete clearBtn.dataset.armed;
  clearBtn.textContent = "Slet alle";
}

$("btn-start").addEventListener("click", startGame);

// -------- Spil --------
let score = 0;
let tension = 0;

const multiplayer = () => state.players.length >= 2;
const playerAt = (turn: number) => state.players[turn % state.players.length];

function showScreen(screen: "menu" | "game") {
  $("menu").hidden = screen !== "menu";
  $("game").hidden = screen !== "game";
  document.body.dataset.screen = screen;
}

function hideModals() {
  $("result").hidden = true;
  $("punishment-popup").hidden = true;
}

function showTurn() {
  if (!multiplayer()) return;
  const el = $("turn");
  $("turn-name").textContent = playerAt(score);
  el.classList.remove("turn--in");
  void el.offsetWidth;
  el.classList.add("turn--in");
}

// 0 ved start, 1 når kun den forbudte er tilbage
function setTension(remaining: number, total: number) {
  tension = total > 1 ? 1 - (remaining - 1) / (total - 1) : 0;
  const body = document.body;
  body.style.setProperty("--tension", tension.toFixed(3));
  body.classList.toggle("is-critical", remaining <= 2 && remaining < total);

  const face = remaining > 8 ? "😎" : remaining > 4 ? "😬" : remaining > 2 ? "😰" : "😱";
  $("hud-odds").textContent = remaining > 1 ? `1 af ${remaining} ${face}` : "🎉";

  if (tension >= 0.5 && remaining > 1) startHeartbeat(1000 - 550 * tension);
  else stopHeartbeat();
}

function resetTension() {
  tension = 0;
  document.body.style.removeProperty("--tension");
  document.body.classList.remove("is-critical");
  stopHeartbeat();
}

// Hjerteslag der bliver hurtigere jo færre tiles der er tilbage
let beatTimer: number | undefined;
let beatPeriod = 0;
function beat() {
  sfx.heartbeat();
  if (document.body.classList.contains("is-critical")) haptic.beat();
  const bg = $("bg");
  bg.classList.remove("beat");
  void bg.offsetWidth;
  bg.classList.add("beat");
  beatTimer = window.setTimeout(beat, beatPeriod);
}
function startHeartbeat(period: number) {
  beatPeriod = period;
  beatTimer ??= window.setTimeout(beat, 0);
}
function stopHeartbeat() {
  clearTimeout(beatTimer);
  beatTimer = undefined;
}

function pickPunishment() {
  // Egne straffe fylder halvdelen, ellers drukner de i de indbyggede
  return state.punishments.length && Math.random() < 0.5
    ? pick(state.punishments)
    : pick(DRINKING_PUNISHMENTS);
}

function showPunishment(who: string, text: string, big: boolean, done: () => void) {
  const popup = $("punishment-popup");
  popup.classList.toggle("is-big", big);
  $("punishment-emoji").textContent = big ? "💀" : "🍺";
  $("punishment-title").textContent = big ? "Stor straf!" : "Straf!";
  $("punishment-who").textContent = who;
  $("punishment-who").hidden = !who;
  $("punishment-text").textContent = text;
  popup.hidden = false;
  sfx.punish(big);
  haptic.warn();

  const ok = $("btn-punishment-ok");
  ok.focus({ preventScroll: true });
  ok.onclick = () => {
    ok.onclick = null;
    popup.hidden = true;
    done();
  };
}

function finish(won: boolean) {
  stopHeartbeat();
  const key = String(state.size);
  const prevBest = state.best[key] ?? 0;
  const isRecord = score > prevBest;
  if (isRecord) {
    state.best[key] = score;
    persist();
  }
  const loser = !won && multiplayer() ? playerAt(score) : "";
  if (won) {
    sfx.win();
    haptic.win();
  }

  const showResult = () => {
    $("result").classList.toggle("is-win", won);
    $("result-title").textContent = won
      ? multiplayer()
        ? "Alle overlevede!"
        : "Du vandt!"
      : loser
      ? `${loser} tabte!`
      : "Game Over";
    $("result-stamp").textContent = won ? "勝" : "怒";
    $("result-score").textContent = String(score);
    $("result-record").hidden = !isRecord;
    $("result-sub").textContent = isRecord
      ? ""
      : `Rekord på ${state.size}×${state.size}: ${prevBest}`;
    $("result").hidden = false;
    if (won || isRecord) confetti();
    $("btn-retry").focus({ preventScroll: true });
  };

  if (!won && state.drinkingMode) showPunishment(loser, pick(BIG_PUNISHMENTS), true, showResult);
  else showResult();
}

function startGame() {
  unlockAudio();
  game?.destroy();
  resetTension();
  hideModals();
  closeSheets();
  showScreen("game");

  $("hud-mode").textContent = `${state.drinkingMode ? "🍺" : "👴"} ${state.size}×${state.size}`;
  $("turn").hidden = !multiplayer();

  game = new Game(
    $("board"),
    $("fx"),
    {
      size: state.size,
      faces: state.faces.length ? state.faces : [FALLBACK_FACE],
      drinkingMode: state.drinkingMode,
    },
    {
      onScore(s) {
        score = s;
        const el = $("hud-score");
        el.textContent = String(s);
        showTurn();
        if (s === 0) return;
        sfx.pop(tension);
        haptic.tap();
        el.classList.remove("bump");
        void el.offsetWidth;
        el.classList.add("bump");
      },
      onProgress: setTension,
      onLose() {
        stopHeartbeat();
        sfx.lose();
        haptic.lose();
      },
      onResult: finish,
      onPunishment(done) {
        // score er allerede talt op, så det var forrige spiller der trykkede
        showPunishment(multiplayer() ? playerAt(score - 1) : "", pickPunishment(), false, done);
      },
    }
  );
}

function toMenu() {
  game?.destroy();
  game = null;
  resetTension();
  hideModals();
  showScreen("menu");
  syncMenu();
}

$("btn-back").addEventListener("click", toMenu);
$("btn-menu").addEventListener("click", toMenu);
$("btn-retry").addEventListener("click", startGame);
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (document.querySelector(".modal--sheet:not([hidden])")) closeSheets();
  else if (document.body.dataset.screen === "game" && $("punishment-popup").hidden) toMenu();
});

// -------- Opstart --------
syncMenu();
loadSavedFaces().then((faces) => {
  state.faces = faces;
  syncMenu();
});
