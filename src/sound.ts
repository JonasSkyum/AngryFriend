// Alle lyde syntetiseres med Web Audio – ingen lydfiler at downloade
let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(value: boolean) {
  muted = value;
  if (muted && "speechSynthesis" in window) speechSynthesis.cancel();
}

// Skal kaldes fra en brugerhandling, ellers blokerer browseren lyden
export function unlockAudio() {
  audio();
}

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
  } catch {
    return null;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface Tone {
  freq: number;
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

function tone(ac: AudioContext, { freq, to, dur, type = "sine", gain = 0.2, delay = 0 }: Tone) {
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(ac: AudioContext, dur: number, gain: number, cutoff: number) {
  const t = ac.currentTime;
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoff, t);
  filter.frequency.exponentialRampToValueAtTime(80, t + dur);
  const env = ac.createGain();
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(env).connect(ac.destination);
  src.start(t);
}

// Vred japansk onkel – kun hvis enheden har en japansk stemme
function shout(text: string) {
  if (muted || !("speechSynthesis" in window)) return;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith("ja"));
  if (!voice) return;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.pitch = 0.4;
  u.rate = 1.15;
  speechSynthesis.speak(u);
}
// Nogle browsere indlæser stemmelisten asynkront
if ("speechSynthesis" in window) speechSynthesis.getVoices();

export const sfx = {
  /** Højere pitch jo mere nervepirrende det bliver */
  pop(tension = 0) {
    const ac = audio();
    if (!ac) return;
    const f = 480 + tension * 520;
    tone(ac, { freq: f, to: f * 2.2, dur: 0.09, gain: 0.25 });
    tone(ac, { freq: f * 3, dur: 0.05, type: "triangle", gain: 0.05 });
  },
  heartbeat() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { freq: 75, to: 42, dur: 0.14, gain: 0.55 });
    tone(ac, { freq: 65, to: 38, dur: 0.16, gain: 0.4, delay: 0.17 });
  },
  lose() {
    const ac = audio();
    if (!ac) return;
    noise(ac, 0.6, 0.35, 2400);
    tone(ac, { freq: 320, to: 55, dur: 0.75, type: "sawtooth", gain: 0.18 });
    tone(ac, { freq: 160, to: 40, dur: 0.9, type: "square", gain: 0.1 });
    shout("コラ！");
  },
  win() {
    const ac = audio();
    if (!ac) return;
    [523, 659, 784, 1047].forEach((freq, i) =>
      tone(ac, { freq, dur: 0.22, type: "triangle", gain: 0.2, delay: i * 0.09 })
    );
    [523, 784, 1319].forEach((freq) =>
      tone(ac, { freq, dur: 0.7, type: "triangle", gain: 0.1, delay: 0.38 })
    );
  },
  punish(big = false) {
    const ac = audio();
    if (!ac) return;
    const base = big ? 196 : 294;
    tone(ac, { freq: base, dur: 0.18, type: "square", gain: 0.12 });
    tone(ac, { freq: base * 0.75, dur: big ? 0.6 : 0.3, type: "square", gain: 0.12, delay: 0.2 });
  },
};
