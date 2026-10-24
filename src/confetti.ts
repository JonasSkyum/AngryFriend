const COLORS = ["#e5372a", "#f4b23e", "#f5ecdd", "#1f7a4a", "#ff8a3d"];
const DURATION = 3200;

// Konfetti skudt op fra begge nederste hjørner. Lægger sig over modaler og fjerner sig selv.
export function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.className = "confetti";
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  document.body.append(canvas);

  const parts = Array.from({ length: 160 }, (_, i) => {
    const side = i % 2 ? 1 : -1; // 1 = venstre hjørne, skyder mod højre
    const angle = -Math.PI / 2 + side * (0.15 + Math.random() * 0.55);
    const speed = (14 + Math.random() * 12) * Math.min(1, h / 800 + 0.3);
    return {
      x: side === 1 ? w * 0.1 : w * 0.9,
      y: h + 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 6 + Math.random() * 7,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      color: COLORS[i % COLORS.length],
    };
  });

  const start = performance.now();
  const frame = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = Math.min(1, (DURATION - t) / 600);
    for (const p of parts) {
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 0.38;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (t < DURATION) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
