import React, { useEffect, useMemo, useRef, useState } from "react";
import { PAGES } from "./data/pages";
import { ALBUM_PHOTOS, ALBUM_INTERVAL_MS } from "./data/album";
import { buildBokeh, buildDecor, buildTwinkles, startSnow } from "./lib/effects";

const PIN_TARGET = "205";

const STEP_MESSAGES = [
  "Zeliş… bu masalın ilk adımı sensin.",
  "Şimdi biraz daha yaklaş… kalbim hep aynı yerde.",
  "Bazı cümleler mühürlenir… en güzeli senin adınla.",
  "Isınan şey kalp değil; benim dünyam.",
  "Kapılar şifreyle açılır… ama sen bakınca zaten açılıyor.",
  "Bu kazı-kazan değil… aslında biziz: üstünü kazıdıkça daha net.",
  "2026’da daha fazlası olacak… ama en güzeli: yine sen."
];

function stepMessageForIndex(i) {
  return STEP_MESSAGES[Math.min(i, STEP_MESSAGES.length - 1)];
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export default function App() {
  const pages = PAGES;

  const [index, setIndex] = useState(0);

  // states
  const [heat, setHeat] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [sparkCount, setSparkCount] = useState(0);

  const [scratchProgress, setScratchProgress] = useState(0);
  const [scratchCanReveal, setScratchCanReveal] = useState(false);

  const [pin, setPin] = useState({ d1: "2", d2: "0", d3: "" });

  // scratch
  const [scratchReady, setScratchReady] = useState(false);

  // overlays
  const [stepOverlay, setStepOverlay] = useState({ show: false, text: "" });
  const [pendingIndex, setPendingIndex] = useState(null);

  const [interOverlay, setInterOverlay] = useState({ show: false, text: "" });
  const [albumOpen, setAlbumOpen] = useState(false);

  // album
  const [albumIndex, setAlbumIndex] = useState(0);
  const albumTimerRef = useRef(null);

  // bgm
  const audioRef = useRef(null);
  const [musicOn, setMusicOn] = useState(false);

  // scratch canvas
  const canvasRef = useRef(null);

  const page = pages[index];

  // background effects
  useEffect(() => {
    buildTwinkles();
    buildDecor();
    buildBokeh();
    startSnow();
  }, []);

  // page enter class
  useEffect(() => {
    document.body.setAttribute("data-page", page?.id || "");
  }, [page?.id]);

  // spark: sayfaya her girişte sıfırla
  useEffect(() => {
    if (page?.type === "spark") setSparkCount(0);
  }, [page?.type]);

  // scratch sayfasına girince hazır false
  useEffect(() => {
    if (page?.type === "scratch") setScratchReady(false);
  }, [page?.type]);

  // album timer
  useEffect(() => {
    if (!albumOpen) {
      if (albumTimerRef.current) clearInterval(albumTimerRef.current);
      albumTimerRef.current = null;
      return;
    }

    setAlbumIndex(0);

    if (albumTimerRef.current) clearInterval(albumTimerRef.current);
    albumTimerRef.current = setInterval(() => {
      setAlbumIndex((prev) => (prev + 1) % ALBUM_PHOTOS.length);
    }, ALBUM_INTERVAL_MS);

    return () => {
      if (albumTimerRef.current) clearInterval(albumTimerRef.current);
      albumTimerRef.current = null;
    };
  }, [albumOpen]);

  const canGoNext = useMemo(() => {
    if (!page) return false;
    if (page.type === "spark") return sparkCount >= 6;
    if (page.type === "note") return noteText.trim().length > 0;
    if (page.type === "heart") return heat >= 100;
    if (page.type === "pin") return `${pin.d1}${pin.d2}${pin.d3}` === PIN_TARGET;
    if (page.type === "scratch") return false;
    return true;
  }, [page, sparkCount, noteText, heat, pin]);

  // step overlay hedef index’i saklar
  function showStepMessage(text, nextIdx) {
    setPendingIndex(nextIdx);
    setStepOverlay({ show: true, text });
  }

  function goToIndexWithMessage(nextIndex) {
    const nextPage = pages[nextIndex];
    if (!nextPage) return;

    // scratch sayfasına girerken step message yok
    if (nextPage.type === "scratch") {
      setIndex(nextIndex);
      return;
    }

    showStepMessage(stepMessageForIndex(nextIndex), nextIndex);
  }

  function goNextWithMessage() {
    const nextIndex = (index + 1) % pages.length;
    goToIndexWithMessage(nextIndex);
  }

  function goBackWithMessage() {
    const nextIndex = Math.max(0, index - 1);
    goToIndexWithMessage(nextIndex);
  }

  async function toggleMusic() {
    const a = audioRef.current;
    if (!a) return;

    try {
      if (a.paused) {
        await a.play();
        setMusicOn(true);
      } else {
        a.pause();
        setMusicOn(false);
      }
    } catch {
      // autoplay bloklanırsa dokunma sonrası tekrar dene
    }
  }

  function onNext() {
    if (!page) return;

    // Intro'da müziği başlat
    if (index === 0 && audioRef.current && audioRef.current.paused) {
      audioRef.current.play().then(() => setMusicOn(true)).catch(() => {});
    }

    // Spark: 6 olunca otomatik akış var
    if (page.type === "spark") return;

    // Note: mühür animasyonu -> step message -> geçiş
    if (page.type === "note") {
      if (!noteText.trim()) return;

      const stamp = document.getElementById("noteStamp");
      const wrap = document.getElementById("noteSealWrap");
      const input = document.getElementById("noteInput");

      input?.setAttribute("disabled", "true");
      wrap?.classList.add("show");
      wrap?.setAttribute("aria-hidden", "false");

      if (stamp) {
        stamp.classList.remove("play");
        void stamp.offsetWidth;
        stamp.classList.add("play");
      }

      setTimeout(() => {
        const nextIndex = (index + 1) % pages.length;
        showStepMessage(stepMessageForIndex(nextIndex), nextIndex);
      }, 820);

      return;
    }

    // Heart gate
    if (page.type === "heart" && heat < 100) return;

    // PIN gate
    if (page.type === "pin" && `${pin.d1}${pin.d2}${pin.d3}` !== PIN_TARGET) return;

    // Scratch'ta klasik next yok
    if (page.type === "scratch") return;

    goNextWithMessage();
  }

  // Spark click: patlama -> step message -> geçiş
  function onSparkClick() {
    setSparkCount((prev) => {
      const next = clamp(prev + 1, 0, 6);

      const orb = document.getElementById("sparkOrb");
      const particleLayer = document.getElementById("sparkParticles");
      const raysLayer = document.getElementById("sparkRays");

      const burstParticles = () => {
        if (!particleLayer) return;
        const n = 18;
        for (let i = 0; i < n; i++) {
          const part = document.createElement("i");
          part.className = "sparkParticle sparkBurst";
          const ang = Math.PI * 2 * (i / n) + Math.random() * 0.35;
          const dist = 40 + Math.random() * 64;
          const x = Math.cos(ang) * dist;
          const y = Math.sin(ang) * dist;
          part.style.setProperty("--x", `${x.toFixed(1)}px`);
          part.style.setProperty("--y", `${y.toFixed(1)}px`);
          part.style.setProperty("--s", `${(0.7 + Math.random() * 1.1).toFixed(2)}`);
          const sz = 7 + Math.random() * 9;
          part.style.width = `${sz}px`;
          part.style.height = `${sz}px`;
          particleLayer.appendChild(part);
          setTimeout(() => part.remove(), 980);
        }
      };

      const burstRays = () => {
        if (!raysLayer) return;
        const rays = 12;
        for (let i = 0; i < rays; i++) {
          const r = document.createElement("i");
          r.className = "sparkRay boom";
          r.style.setProperty("--a", `${(360 / rays) * i + (Math.random() * 12 - 6)}deg`);
          raysLayer.appendChild(r);
          setTimeout(() => r.remove(), 560);
        }
      };

      if (orb) {
        orb.classList.remove("pulse");
        void orb.offsetWidth;
        orb.classList.add("pulse");

        const scale = (1 + next * 0.09).toFixed(2);
        orb.style.setProperty("--sparkScale", scale);
        orb.style.transform = `scale(${scale})`;
      }

      burstRays();
      burstParticles();

      if (next >= 6) {
        const orb2 = document.getElementById("sparkOrb");
        orb2?.classList.add("done");

        setTimeout(() => {
          const nextIndex = (index + 1) % pages.length;
          showStepMessage(stepMessageForIndex(nextIndex), nextIndex);
        }, 950);
      }

      return next;
    });
  }

  // Scratch: mobile-friendly + not too hard
  useEffect(() => {
    if (page?.type !== "scratch") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    setScratchProgress(0);
    setScratchCanReveal(false);

    let ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setupSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const r = parent.getBoundingClientRect();
      const w = Math.max(320, Math.floor(r.width));
      const h = Math.max(220, Math.floor(Math.min(320, r.width * 0.55)));

      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);

      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "rgba(10,10,20,0.92)");
      g.addColorStop(1, "rgba(30,14,48,0.92)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 800; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }

      ctx.globalCompositeOperation = "destination-out";
    };

    setupSize();

    const ro = new ResizeObserver(() => setupSize());
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const getBrushRadius = () => {
      const w = canvas.getBoundingClientRect().width;
      return clamp(Math.round(w / 18), 18, 34);
    };

    let drawing = false;
    let last = null;

    const sampleCanvas = document.createElement("canvas");
    const sampleW = 120;
    const sampleH = 60;
    sampleCanvas.width = sampleW;
    sampleCanvas.height = sampleH;
    const sctx = sampleCanvas.getContext("2d");

    const getPos = (ev) => {
      const r = canvas.getBoundingClientRect();
      const x = ev.clientX - r.left;
      const y = ev.clientY - r.top;
      return { x, y };
    };

    const scratchLine = (a, b, r) => {
      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = r * 2;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    };

    const scratchDot = (p, r) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    let lastMeasureTs = 0;
    const measure = () => {
      if (!sctx) return;

      const now = performance.now();
      if (now - lastMeasureTs < 180) return;
      lastMeasureTs = now;

      const r = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(r.width));
      const h = Math.max(1, Math.floor(r.height));

      sctx.clearRect(0, 0, sampleW, sampleH);
      sctx.drawImage(canvas, 0, 0, w, h, 0, 0, sampleW, sampleH);

      const data = sctx.getImageData(0, 0, sampleW, sampleH).data;

      let cleared = 0;
      const total = sampleW * sampleH;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 30) cleared++;
      }

      const ratio = cleared / total;
      const pct = Math.round(ratio * 100);
      setScratchProgress(pct);

      if (ratio >= 0.38) {
        setScratchCanReveal(true);
        setScratchReady(true);
        const msg = document.getElementById("scratchMsg");
        msg?.classList.add("scratchReveal");
      }
    };

    const onPointerDown = (e) => {
      e.preventDefault();
      canvas.setPointerCapture?.(e.pointerId);

      drawing = true;
      const r = getBrushRadius();
      const p = getPos(e);
      scratchDot(p, r);
      last = p;
      measure();
    };

    const onPointerMove = (e) => {
      if (!drawing) return;
      e.preventDefault();

      const r = getBrushRadius();
      const p = getPos(e);

      if (last) scratchLine(last, p, r);
      else scratchDot(p, r);

      last = p;
      measure();
    };

    const onPointerUp = (e) => {
      e.preventDefault();
      drawing = false;
      last = null;
      try {
        canvas.releasePointerCapture?.(e.pointerId);
      } catch {}
      measure();
    };

    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", onPointerMove, { passive: false });
    canvas.addEventListener("pointerup", onPointerUp, { passive: false });
    canvas.addEventListener("pointercancel", onPointerUp, { passive: false });

    canvas.style.touchAction = "none";

    return () => {
      ro.disconnect();

      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, [page?.type]);

  function onScratchContinue() {
    setInterOverlay({ show: true, text: "2026'da bunlardan daha fazlası olacak." });
  }

  function closeInterThenOpenAlbum() {
    setInterOverlay({ show: false, text: "" });
    setAlbumOpen(true);
  }

  function closeAlbum() {
    setAlbumOpen(false);
  }

  return (
    <>
      {/* Background layers */}
      <div className="bg-favicon" />
      <div className="twinkleLayer" id="twinkleLayer" aria-hidden="true" />
      <div className="aurora" aria-hidden="true" />
      <div className="bokeh" id="bokeh" aria-hidden="true" />
      <div className="decorLayer" id="decorLayer" aria-hidden="true" />

      {/* Top bar */}
      <div className="topBar">
        <div className="brand">Zeliş • 2026</div>
        <div className="progressPill">
          <span id="progress">{index + 1}</span>/<span>{pages.length}</span>
        </div>
      </div>

      {/* App */}
      <main id="app">
        <section className="page page-enter page-enter-active play" data-page={page.id}>
          <div className="hero3d" id="hero3d">
            {/* ✅ split layout: sol içerik / sağ kedi */}
            <div className="heroInner splitLayout">
              {/* SOL TARAF */}
              <div className="contentSide">
                <FlowHead p={page} />

                <div className="chips reveal lift" style={{ "--d": "240ms" }}>
                  <span className="chip">2026</span>
                  <span className="chip">
                    {index + 1}/{pages.length}
                  </span>
                  <span className="chip">Zeliş</span>
                </div>

                {page.text ? (
                  <p className="lead reveal lift" style={{ "--d": "300ms" }}>
                    {page.text.split("\n").map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i !== page.text.split("\n").length - 1 ? <br /> : null}
                      </React.Fragment>
                    ))}
                  </p>
                ) : null}

                {/* SPARK */}
                {page.type === "spark" ? (
                  <div className="sparkWrap reveal lift" style={{ "--d": "420ms" }}>
                    <div className="sparkParticles" id="sparkParticles" aria-hidden="true" />
                    <div
                      className={`sparkOrb ${sparkCount >= 6 ? "done" : ""}`}
                      id="sparkOrb"
                      aria-label="kıvılcım"
                      onClick={onSparkClick}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="sparkRays" id="sparkRays" aria-hidden="true" />
                    </div>

                    <div className="sparkText">
                      Kıvılcımı büyüt: <b>{Math.min(sparkCount, 6)}/6</b>
                      <div className="sparkSub">{sparkCount >= 6 ? "Tamam… açılıyor." : "Dokun."}</div>
                    </div>
                  </div>
                ) : null}

                {/* NOTE */}
                {page.type === "note" ? (
                  <div className="reveal lift" style={{ "--d": "420ms" }}>
                    <div className="hintMini" style={{ marginTop: 10 }}>
                      Tek bir cümle yaz.
                      <div className="hintSub">Örnek: “Yeni yılda en çok senin gülüşün yakışıyor.”</div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <textarea
                        id="noteInput"
                        rows={3}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value.slice(0, 120))}
                        style={{
                          width: "100%",
                          resize: "none",
                          padding: "12px 14px",
                          borderRadius: 16,
                          border: "1px solid rgba(255,255,255,.14)",
                          background: "rgba(0,0,0,.22)",
                          color: "rgba(255,255,255,.92)",
                          outline: "none",
                          fontFamily: "inherit",
                          lineHeight: 1.6
                        }}
                        placeholder="Bir cümle..."
                      />
                    </div>

                    <div className="noteSealWrap" id="noteSealWrap" aria-hidden="true">
                      <div className="noteStamp" id="noteStamp">
                        <span className="sealIcon" aria-hidden="true" />
                        <span className="sealText">Mühürlendi. Bu cümle sadece bu masalda kaldı.</span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* HEART */}
                {page.type === "heart" ? (
                  <div className="heartWrap reveal lift" style={{ "--d": "480ms" }}>
                    <div className="heartRow">
                      <button className="heartBtn" type="button" onClick={() => setHeat((h) => clamp(h + 8, 0, 100))}>
                        ❤
                      </button>
                      <div>
                        <div className="meter">
                          <div className="meterFill" style={{ width: `${heat}%` }} />
                        </div>
                        <div className="small">{heat}% — biraz daha…</div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* PIN */}
                {page.type === "pin" ? (
                  <div className="reveal lift" style={{ "--d": "420ms" }}>
                    <div className="small" style={{ marginTop: 10, opacity: 0.85 }}>
                      {page.pinHint || ""}
                    </div>

                    <div className="pinWrap">
                      <PinInput value={pin.d1} onChange={(v) => setPin((s) => ({ ...s, d1: v }))} />
                      <PinInput value={pin.d2} onChange={(v) => setPin((s) => ({ ...s, d2: v }))} />
                      <PinInput value={pin.d3} onChange={(v) => setPin((s) => ({ ...s, d3: v }))} />
                    </div>

                    <div className="small" style={{ marginTop: 10, opacity: 0.85 }}>
                      {`${pin.d1}${pin.d2}${pin.d3}` === PIN_TARGET ? "Açıldı." : "İpucu: Son haneyi 5 yap (205)"}
                    </div>
                  </div>
                ) : null}

                {/* SCRATCH */}
                {page.type === "scratch" ? (
                  <>
                    <div className="scratchWrap reveal lift" style={{ "--d": "420ms" }}>
                      <div className="scratchMsg" id="scratchMsg">
                        {"Zeliş…\nYeni yılda en sevdiğim şey: biz.\nEn sevdiğim yer: senin yanın.\nMutlu yıllar yavrum."
                          .split("\n")
                          .map((line, i) => (
                            <React.Fragment key={i}>
                              {line}
                              {i !== 3 ? <br /> : null}
                            </React.Fragment>
                          ))}
                      </div>
                      <canvas ref={canvasRef} id="scratchCanvas" width="900" height="280" aria-label="kazı kazan" />
                    </div>

                    <div className="small" style={{ marginTop: 10, opacity: 0.85, textAlign: "center" }}>
                      Kazıma: {scratchProgress}%{!scratchCanReveal ? " — biraz daha" : " — tamam"}
                    </div>

                    <div className="navRow reveal lift" style={{ "--d": "720ms", marginTop: 14 }}>
                      <button
                        className="navBtn"
                        type="button"
                        onClick={() => {
                          setScratchCanReveal(true);
                          setScratchReady(true);
                          const msg = document.getElementById("scratchMsg");
                          msg?.classList.add("scratchReveal");
                        }}
                        style={{ opacity: scratchCanReveal ? 0.0 : 0.9, pointerEvents: scratchCanReveal ? "none" : "auto" }}
                      >
                        Hızlı aç
                      </button>

                      <button
                        className="navBtn primary"
                        type="button"
                        onClick={onScratchContinue}
                        style={{ display: scratchReady ? "inline-flex" : "none" }}
                      >
                        Devam
                      </button>
                    </div>
                  </>
                ) : null}

                {page.signature ? (
                  <p className="sig reveal lift" style={{ "--d": "620ms" }}>
                    {page.signature}
                  </p>
                ) : null}

                {/* NAV */}
                <div className="navRow reveal lift" style={{ "--d": "700ms" }}>
                  {index > 0 ? (
                    <button className="navBtn" type="button" onClick={goBackWithMessage}>
                      Geri
                    </button>
                  ) : (
                    <span />
                  )}

                  <button
                    className="navBtn primary"
                    type="button"
                    onClick={onNext}
                    disabled={!canGoNext && page.type !== "note"}
                    aria-disabled={!canGoNext && page.type !== "note"}
                  >
                    {page.button || "Devam"}
                  </button>
                </div>

                <div className="musicRow reveal lift" style={{ "--d": "820ms" }}>
                  <button className="navBtn" type="button" onClick={toggleMusic}>
                    {!musicOn ? "Müziği aç" : "Müziği kapat"}
                  </button>
                </div>
              </div>

              {/* SAĞ TARAF: KEDİ SABİT */}
              <div className="sideImage">
                <img src="/assets/photos/kedi.jpg" alt="Kedi" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* STEP OVERLAY */}
      <div className={`interOverlay ${stepOverlay.show ? "show" : ""}`} id="interOverlay" aria-hidden={!stepOverlay.show}>
        <div className="interStage isStepMsg">
          <div className="interText stepMsg" id="interText">
            {stepOverlay.text}
          </div>
          <button
            className="interBtn stepMsgBtn"
            id="interBtn"
            type="button"
            onClick={() => {
              const next = pendingIndex;
              setStepOverlay({ show: false, text: "" });
              setPendingIndex(null);
              if (typeof next === "number") setIndex(next);
            }}
          >
            Devam
          </button>
        </div>
      </div>

      {/* SCRATCH INTER OVERLAY */}
      <div className={`interOverlay ${interOverlay.show ? "show" : ""}`} aria-hidden={!interOverlay.show}>
        <div className="interStage">
          <div className="interText">{interOverlay.text}</div>
          <button className="interBtn" type="button" onClick={closeInterThenOpenAlbum}>
            Devam
          </button>
        </div>
      </div>

      {/* ALBUM OVERLAY */}
      <div className={`albumOverlay ${albumOpen ? "show" : ""}`} id="albumOverlay" aria-hidden={!albumOpen}>
        <div className="albumStage">
          <button className="albumClose" id="albumClose" type="button" onClick={closeAlbum}>
            Kapat
          </button>

          <div className="albumTrack" id="albumTrack" aria-live="polite">
            <div className="slideCard slideEnter slideEnterActive">
              <img src={ALBUM_PHOTOS[albumIndex]} alt="Albüm fotoğrafı" />
            </div>
          </div>

          <div className="albumHint" id="albumHint" />
        </div>
      </div>

      {/* AUDIO */}
      <audio ref={audioRef} id="bgm" src="/assets/music.mp3" loop />
    </>
  );
}

function FlowHead({ p }) {
  const lines = Array.isArray(p.marquee) ? p.marquee : [p.title].filter(Boolean);
  const show = lines.slice(0, 3);

  const wrapIcon = (txt) => {
    txt = String(txt || "").trim();
    if (!txt) return null;

    if (!txt.includes(" ")) {
      const looksLikeIcon = txt.length <= 3 && /[^\w\d]/.test(txt);
      if (looksLikeIcon) return (
        <span className="iconEmoji solo" aria-hidden="true">
          {txt}
        </span>
      );
      return txt;
    }

    const m = txt.match(/^(\S+)\s+(.*)$/);
    if (!m) return txt;

    const first = m[1];
    const rest = m[2];
    const looksLikeIcon = first.length <= 3 && /[^\w\d]/.test(first);

    if (!looksLikeIcon) return txt;

    return (
      <>
        <span className="iconEmoji" aria-hidden="true">
          {first}
        </span>
        <span className="iconLabel">{rest}</span>
      </>
    );
  };

  return (
    <div className="flowHead">
      {show.map((t, i) => (
        <div key={i} className="flowLine reveal lift" style={{ "--d": `${120 + i * 140}ms` }}>
          {wrapIcon(t)}
        </div>
      ))}
      {p.sub ? (
        <div className="flowSub reveal lift" style={{ "--d": `${120 + show.length * 140}ms` }}>
          {p.sub}
        </div>
      ) : null}
    </div>
  );
}

function PinInput({ value, onChange }) {
  return (
    <input
      className="pin"
      inputMode="numeric"
      maxLength={1}
      value={value}
      onChange={(e) => onChange((e.target.value || "").replace(/\D/g, "").slice(0, 1))}
      aria-label="pin"
    />
  );
}
