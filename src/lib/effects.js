// ===============================
// EFFECTS.JS — FINAL VERSION (React uyumlu)
// ===============================

export function buildTwinkles() {
  const layer = document.getElementById("twinkleLayer");
  if (!layer) return;

  layer.innerHTML = "";
  const count = 30;

  for (let i = 0; i < count; i++) {
    const d = document.createElement("div");
    d.className = "twinkleDot twinkle";
    d.style.left = `${Math.random() * 100}%`;
    d.style.top = `${Math.random() * 100}%`;
    d.style.opacity = `${0.25 + Math.random() * 0.55}`;
    d.style.transform = `scale(${0.7 + Math.random() * 1.25})`;
    d.style.animationDelay = `${Math.random() * 6}s`;
    d.style.animationDuration = `${4 + Math.random() * 6}s`;
    layer.appendChild(d);
  }
}

export function buildDecor() {
  const layer = document.getElementById("decorLayer");
  if (!layer) return;

  layer.innerHTML = "";

  const stickers = ["✨", "❄️", "🎄", "🖤", "🎁"];
  const count = 14;

  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.className = "sticker";
    s.textContent = stickers[i % stickers.length];
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${Math.random() * 100}%`;
    s.style.animationDelay = `${Math.random() * 4}s`;
    s.style.transform = `translateZ(0) rotate(${Math.random() * 8 - 4}deg)`;
    layer.appendChild(s);
  }
}

export function buildBokeh() {
  const layer = document.getElementById("bokeh");
  if (!layer) return;

  layer.innerHTML = "";
  const count = 14;

  for (let i = 0; i < count; i++) {
    const b = document.createElement("i");
    const size = 60 + Math.random() * 140;
    b.style.width = `${size}px`;
    b.style.height = `${size}px`;
    b.style.left = `${Math.random() * 100}%`;
    b.style.top = `${Math.random() * 100}%`;
    b.style.opacity = `${0.08 + Math.random() * 0.18}`;
    b.style.animationDelay = `${Math.random() * 6}s`;
    b.style.animationDuration = `${8 + Math.random() * 10}s`;
    layer.appendChild(b);
  }
}

let snowTimer = null;

export function startSnow() {
  stopSnow();

  const make = () => {
    const flake = document.createElement("div");
    flake.className = "snowflake";

    const x = Math.random() * 100;
    const dx = (Math.random() * 60 - 30).toFixed(1);
    const dur = (6 + Math.random() * 6).toFixed(1);

    flake.style.left = `${x}%`;
    flake.style.setProperty("--dx", `${dx}px`);
    flake.style.animationDuration = `${dur}s`;
    flake.style.opacity = `${0.35 + Math.random() * 0.55}`;
    flake.style.transform = `translate3d(0,0,0) scale(${0.8 + Math.random() * 1.2})`;

    document.body.appendChild(flake);
    flake.addEventListener(
      "animationend",
      () => {
        flake.remove();
      },
      { once: true }
    );
  };

  snowTimer = setInterval(make, 280);
}

export function stopSnow() {
  if (snowTimer) clearInterval(snowTimer);
  snowTimer = null;
}

// Eski kod uyumluluğu: window.* bağla
if (typeof window !== "undefined") {
  window.buildTwinkles = buildTwinkles;
  window.buildDecor = buildDecor;
  window.buildBokeh = buildBokeh;
  window.startSnow = startSnow;
}
