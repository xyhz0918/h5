import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { assets } from "../lib/assets";
import { matrixBinaryTokens, matrixRainPhrases, matrixStoryTokens } from "../lib/content";
import type { TransitionPhase } from "../types";
import { useDesignCanvasScale } from "../hooks/useDesignCanvasScale";

export function IntroMascotMorph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    type MorphPoint = {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      arc: number;
      sway: number;
      size: number;
      alpha: number;
      delay: number;
      token: string;
      seed: number;
    };

    type MorphBox = {
      left: number;
      top: number;
      width: number;
      height: number;
    };

    const tokens = ["0", "1", "\u8c6a", "\u58eb", "\u597d", "\u5403"];
    const playhead = { progress: 0, alpha: 1 };
    let disposed = false;
    let timeline: ReturnType<typeof gsap.timeline> | null = null;
    let setupFrame = 0;
    let imageStarted = false;
    let morphStarted = false;
    let pixelRatio = 1;
    let width = 0;
    let height = 0;
    let points: MorphPoint[] = [];

    const resizeCanvas = () => {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const rectToBox = (rect: DOMRect): MorphBox => ({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    });

    const fallbackBox = (kind: "start" | "end"): MorphBox => {
      const boxWidth = Math.min(width * 0.88, 356);
      const boxHeight = Math.min(height * 0.46, 374);
      return {
        left: (width - boxWidth) / 2,
        top: kind === "start" ? Math.max(0, height * 0.04) : Math.max(0, height * 0.08),
        width: boxWidth,
        height: boxHeight
      };
    };

    const getElementBox = (selector: string, kind: "start" | "end") => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return fallbackBox(kind);

      const rect = element.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return fallbackBox(kind);

      return rectToBox(rect);
    };

    const containImageBox = (box: MorphBox, image: HTMLImageElement): MorphBox => {
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const boxRatio = box.width / box.height;

      if (boxRatio > imageRatio) {
        const drawHeight = box.height;
        const drawWidth = drawHeight * imageRatio;
        return {
          left: box.left + (box.width - drawWidth) / 2,
          top: box.top,
          width: drawWidth,
          height: drawHeight
        };
      }

      const drawWidth = box.width;
      const drawHeight = drawWidth / imageRatio;
      return {
        left: box.left,
        top: box.top + (box.height - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight
      };
    };

    const buildMaskPoints = (image: HTMLImageElement) => {
      const mask = document.createElement("canvas");
      const maskContext = mask.getContext("2d", { willReadFrequently: true });
      if (!maskContext) return [];

      const maskWidth = 96;
      const maskHeight = Math.max(108, Math.round(maskWidth * image.naturalHeight / image.naturalWidth));
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const maskRatio = maskWidth / maskHeight;
      const drawWidth = maskRatio > imageRatio ? maskHeight * imageRatio : maskWidth;
      const drawHeight = drawWidth / imageRatio;
      const offsetX = (maskWidth - drawWidth) / 2;
      const offsetY = (maskHeight - drawHeight) / 2;

      mask.width = maskWidth;
      mask.height = maskHeight;
      maskContext.clearRect(0, 0, maskWidth, maskHeight);
      maskContext.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

      const data = maskContext.getImageData(0, 0, maskWidth, maskHeight).data;
      const candidates: Array<{ x: number; y: number; alpha: number }> = [];
      const step = 4;

      for (let y = Math.floor(offsetY); y < offsetY + drawHeight; y += step) {
        for (let x = Math.floor(offsetX); x < offsetX + drawWidth; x += step) {
          const alpha = data[(y * maskWidth + x) * 4 + 3] / 255;
          if (alpha < 0.2 || Math.random() > Math.min(0.96, alpha + 0.18)) continue;

          candidates.push({
            x: (x - offsetX) / drawWidth,
            y: (y - offsetY) / drawHeight,
            alpha
          });
        }
      }

      return candidates;
    };

    const buildParticles = (image: HTMLImageElement) => {
      const startBox = containImageBox(getElementBox(".matrix-transition-mascot", "start"), image);
      const endBox = containImageBox(getElementBox(".home-mascot", "end"), image);
      const candidates = buildMaskPoints(image).sort(() => Math.random() - 0.5);
      const pointCount = Math.min(540, Math.max(320, Math.round((width * height) / 1600)));

      points = candidates.slice(0, pointCount).map((point, index) => {
        const alignedX = endBox.left + point.x * endBox.width;
        const alignedY = endBox.top + point.y * endBox.height;
        const startX = alignedX + (startBox.left - endBox.left) * 0.18 + (Math.random() - 0.5) * 4;
        const startY = alignedY + (startBox.top - endBox.top) * 0.18 + (Math.random() - 0.5) * 4;
        const endX = endBox.left + point.x * endBox.width;
        const endY = endBox.top + point.y * endBox.height;

        return {
          startX,
          startY,
          endX,
          endY,
          arc: (Math.random() - 0.5) * 10,
          sway: (Math.random() - 0.5) * 12,
          size: 6.5 + Math.random() * 5.8,
          alpha: 0.42 + point.alpha * 0.58,
          delay: Math.min(0.22, (index / pointCount) * 0.2 + Math.random() * 0.04),
          token: tokens[Math.floor(Math.random() * tokens.length)],
          seed: Math.random() * Math.PI * 2
        };
      });
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";
      context.textAlign = "center";
      context.textBaseline = "middle";

      const ease = gsap.parseEase("power3.inOut");
      const clamp = gsap.utils.clamp(0, 1);

      for (const point of points) {
        const local = clamp((playhead.progress - point.delay) / (1 - point.delay));
        if (local <= 0) continue;

        const eased = ease(local);
        const lift = Math.sin(local * Math.PI) * point.arc * 0.28;
        const sway = Math.sin(local * Math.PI) * point.sway * 0.28;
        const shimmer = Math.sin(playhead.progress * 10 + point.seed) * 1.6 * (1 - eased);
        const x = gsap.utils.interpolate(point.startX, point.endX, eased) + sway + shimmer;
        const y = gsap.utils.interpolate(point.startY, point.endY, eased) + lift;
        const born = clamp(local / 0.16);
        const settle = 1 - clamp((local - 0.88) / 0.12) * 0.24;
        const alpha = point.alpha * born * settle * playhead.alpha;
        const redMix = 1 - clamp(local * 1.35);
        const r = Math.round(gsap.utils.interpolate(74, 255, redMix));
        const g = Math.round(gsap.utils.interpolate(255, 86, redMix));
        const b = Math.round(gsap.utils.interpolate(154, 104, redMix));
        const size = point.size * gsap.utils.interpolate(1.15, 0.82, eased);

        context.shadowColor = `rgba(${r}, ${g}, ${b}, ${Math.min(0.88, alpha + 0.2)})`;
        context.shadowBlur = 12 + (1 - eased) * 10;
        context.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

        if (local < 0.72) {
          context.font = `${size}px Consolas, "Microsoft YaHei", monospace`;
          context.fillText(point.token, x, y);
        } else {
          context.beginPath();
          context.arc(x, y, Math.max(1.35, size * 0.24), 0, Math.PI * 2);
          context.fill();
        }
      }

      context.globalCompositeOperation = "source-over";
      context.shadowBlur = 0;
    };

    const startMorph = (image: HTMLImageElement) => {
      if (morphStarted || disposed) return;
      morphStarted = true;
      resizeCanvas();
      buildParticles(image);
      if (!points.length || disposed) return;

      gsap.set(canvas, { autoAlpha: 1 });
      draw();

      timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onUpdate: draw,
        onComplete: () => {
          context.clearRect(0, 0, width, height);
        }
      });

      timeline
        .to(playhead, { progress: 1, duration: 1.36, ease: "power3.inOut" }, 0)
        .to(playhead, { alpha: 0, duration: 0.34, ease: "power1.out" }, 1.22);
    };

    const loadImage = () => {
      if (imageStarted || disposed) return;
      imageStarted = true;

      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => startMorph(image);
      image.src = assets.homeMascot;

      if (image.complete && image.naturalWidth) {
        startMorph(image);
      }
    };

    resizeCanvas();
    setupFrame = window.requestAnimationFrame(() => {
      setupFrame = window.requestAnimationFrame(loadImage);
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(setupFrame);
      timeline?.kill();
      context.clearRect(0, 0, width, height);
    };
  }, []);

  return <canvas ref={canvasRef} className="intro-mascot-morph" aria-hidden="true" />;
}

export function LoadingPage({
  phase,
  isExiting,
  onEnter
}: {
  phase: TransitionPhase;
  isExiting: boolean;
  onEnter: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mascotCodeCanvasRef = useRef<HTMLCanvasElement>(null);
  const isExitingRef = useRef(isExiting);
  const [progress, setProgress] = useState(0);
  const hasCompletedRef = useRef(false);
  const designScale = useDesignCanvasScale();
  const loadingDurationMs = 3000;
  const countdown = Math.max(0, Math.ceil((100 - progress) / 100 * 3));
  const entryStatus =
    progress < 34
      ? "\u65e9\u9910\u5c0f BUG \u63a5\u5165\u4e2d"
      : progress < 68
        ? "\u900f\u660e\u5de5\u5382\u63a5\u5165\u4e2d"
        : "\u8c6a\u5c0f\u58eb\u51c6\u5907\u5c31\u7eea";

  useEffect(() => {
    isExitingRef.current = isExiting;
  }, [isExiting]);

  useEffect(() => {
    const progressValue = { value: 0 };
    let lastProgress = -1;
    const tween = gsap.to(progressValue, {
      value: 100,
      duration: loadingDurationMs / 1000,
      ease: "none",
      onUpdate: () => {
        const nextProgress = Math.min(100, Math.round(progressValue.value));
        if (nextProgress === lastProgress) return;

        lastProgress = nextProgress;
        setProgress(nextProgress);
      },
      onComplete: () => {
        setProgress(100);
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onEnter();
        }
      }
    });

    return () => {
      tween.kill();
    };
  }, [onEnter]);

  useEffect(() => {
    if (progress >= 100 && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onEnter();
    }
  }, [onEnter, progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let columns = 0;
    let drops: number[] = [];
    let speeds: number[] = [];
    let streamLengths: number[] = [];
    let columnOffsets: number[] = [];
    let columnPhrases: string[][] = [];
    let streamTokens: string[][] = [];
    const fontSize = 14;
    const columnWidth = 22;
    const intervalMs = 76;

    const pickMatrixToken = (preferStory = false) => {
      if (Math.random() < (preferStory ? 0.36 : 0.24)) {
        return matrixStoryTokens[Math.floor(Math.random() * matrixStoryTokens.length)];
      }

      return matrixBinaryTokens[Math.floor(Math.random() * matrixBinaryTokens.length)];
    };

    const buildStreamTokens = (length: number, phrase: string[]) => {
      const phraseStart = phrase.length
        ? Math.floor(Math.random() * Math.max(1, length - phrase.length + 1))
        : -1;

      return Array.from({ length }, (_, tailIndex) => {
        if (phraseStart >= 0 && tailIndex >= phraseStart && tailIndex < phraseStart + phrase.length) {
          return phrase[tailIndex - phraseStart];
        }

        return pickMatrixToken(false);
      });
    };

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const canvasWidth = canvas.clientWidth;
      const canvasHeight = canvas.clientHeight;
      canvas.width = Math.floor(canvasWidth * pixelRatio);
      canvas.height = Math.floor(canvasHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const rows = Math.ceil(canvasHeight / fontSize);
      columns = Math.ceil(canvasWidth / columnWidth) + 4;
      drops = Array.from({ length: columns }, () => Math.random() * rows * 1.24);
      speeds = Array.from({ length: columns }, () => 0.24 + Math.random() * 0.22);
      streamLengths = Array.from({ length: columns }, () => 9 + Math.floor(Math.random() * 7));
      columnOffsets = Array.from({ length: columns }, () => Math.random() * 6 - 3);
      columnPhrases = Array.from({ length: columns }, () =>
        Math.random() > 0.18 ? matrixRainPhrases[Math.floor(Math.random() * matrixRainPhrases.length)] : []
      );
      streamTokens = streamLengths.map((length, index) => buildStreamTokens(length, columnPhrases[index]));
    };

    let rainTimer: number | null = null;

    const shouldDraw = () => !isExitingRef.current && document.visibilityState === "visible";

    const stopRain = () => {
      if (rainTimer !== null) {
        window.clearInterval(rainTimer);
        rainTimer = null;
      }
    };

    const draw = () => {
      if (!shouldDraw()) {
        stopRain();
        return;
      }

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      context.fillStyle = "rgba(0, 0, 0, 0.44)";
      context.fillRect(0, 0, width, height);
      context.textBaseline = "top";
      context.textAlign = "center";

      for (let index = 0; index < columns; index += 1) {
        const x = index * columnWidth + columnWidth / 2 + columnOffsets[index];

        for (let tail = 0; tail < streamLengths[index]; tail += 1) {
          const token = streamTokens[index]?.[tail] ?? pickMatrixToken(false);
          const y = (drops[index] - tail) * fontSize;

          if (y < -fontSize || y > height + fontSize) continue;

          const isStoryToken = matrixStoryTokens.includes(token) || /[^\x00-\x7F]/.test(token);
          const alpha = tail === 0 ? 0.94 : Math.max(0.07, 0.5 - tail * 0.052);
          const drawFontSize = isStoryToken ? 16 : fontSize;

          context.shadowColor = isStoryToken
            ? `rgba(137, 255, 183, ${Math.min(0.72, alpha + 0.08)})`
            : `rgba(43, 255, 124, ${Math.min(0.62, alpha + 0.08)})`;
          context.shadowBlur = tail === 0 ? 8 : 3;
          context.font = `${drawFontSize}px Consolas, "Microsoft YaHei", monospace`;
          context.fillStyle =
            tail === 0
              ? isStoryToken
                ? "rgba(197, 255, 216, 0.82)"
                : "rgba(236, 255, 240, 0.88)"
              : isStoryToken
                ? `rgba(168, 255, 202, ${alpha})`
                : `rgba(78, 255, 141, ${alpha})`;
          context.fillText(token, x, y);
        }

        drops[index] += speeds[index];
        if ((drops[index] - streamLengths[index]) * fontSize > height && Math.random() > 0.94) {
          drops[index] = Math.random() * -18;
          speeds[index] = 0.24 + Math.random() * 0.22;
          streamLengths[index] = 9 + Math.floor(Math.random() * 7);
          columnOffsets[index] = Math.random() * 6 - 3;
          columnPhrases[index] =
            Math.random() > 0.18 ? matrixRainPhrases[Math.floor(Math.random() * matrixRainPhrases.length)] : [];
          streamTokens[index] = buildStreamTokens(streamLengths[index], columnPhrases[index]);
        }
      }

      context.shadowBlur = 0;
    };

    const startRain = () => {
      if (rainTimer === null && shouldDraw()) {
        rainTimer = window.setInterval(draw, intervalMs);
      }
    };

    const handleVisibilityChange = () => {
      if (shouldDraw()) {
        draw();
        startRain();
      } else {
        stopRain();
      }
    };

    resize();
    draw();
    startRain();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopRain();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const canvas = mascotCodeCanvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    type CodePoint = {
      x: number;
      y: number;
      token: string;
      delay: number;
      size: number;
      alpha: number;
    };

    const image = new Image();
    image.crossOrigin = "anonymous";

    let disposed = false;
    let points: CodePoint[] = [];
    let rafId = 0;
    let startTime = 0;
    let lastDrawTime = 0;
    let width = 0;
    let height = 0;

    const mascotTokens = [
      "0",
      "1",
      "0",
      "1",
      "0",
      "1",
      "\u8c6a",
      "\u58eb",
      "\u597d",
      "\u5403"
    ];

    const buildPoints = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.floor(canvas.clientWidth));
      height = Math.max(1, Math.floor(canvas.clientHeight));
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const mask = document.createElement("canvas");
      const maskContext = mask.getContext("2d", { willReadFrequently: true });
      if (!maskContext) return;

      mask.width = width;
      mask.height = height;
      const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const offsetX = (width - drawWidth) / 2;
      const offsetY = (height - drawHeight) / 2;

      maskContext.clearRect(0, 0, width, height);
      maskContext.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

      const data = maskContext.getImageData(0, 0, width, height).data;
      const nextPoints: CodePoint[] = [];
      const step = Math.max(9, Math.round(width / 38));

      for (let y = step * 0.7; y < height; y += step) {
        for (let x = step * 0.55; x < width; x += step) {
          const index = (Math.floor(y) * width + Math.floor(x)) * 4 + 3;
          const maskAlpha = data[index] / 255;
          if (maskAlpha < 0.18 || Math.random() > Math.min(0.96, maskAlpha + 0.24)) continue;

          nextPoints.push({
            x: x + (Math.random() - 0.5) * step * 0.72,
            y: y + (Math.random() - 0.5) * step * 0.72,
            token: mascotTokens[Math.floor(Math.random() * mascotTokens.length)],
            delay: Math.random() * 0.18,
            size: 9 + Math.random() * 4,
            alpha: 0.58 + Math.random() * 0.42
          });
        }
      }

      points = nextPoints;
    };

    const shouldDraw = () => !disposed && !isExitingRef.current && document.visibilityState === "visible";

    const draw = (time: number) => {
      if (!shouldDraw()) return;
      if (!startTime) startTime = time;
      if (time - lastDrawTime < 28) {
        rafId = window.requestAnimationFrame(draw);
        return;
      }
      lastDrawTime = time;

      const progressRatio = Math.min(1, (time - startTime) / 3000);
      const fade = 1;

      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "source-over";
      context.textAlign = "center";
      context.textBaseline = "middle";

      for (const point of points) {
        const born = Math.max(0, (progressRatio - point.delay) / 0.22);
        const reveal = Math.min(1, born);
        if (reveal <= 0 || fade <= 0) continue;

        const alpha = point.alpha * reveal * fade;
        const drift = Math.sin(progressRatio * 7 + point.x * 0.02) * 5 * (1 - progressRatio);
        context.font = `${point.size}px Consolas, "Microsoft YaHei", monospace`;
        context.shadowColor = `rgba(73, 255, 149, ${Math.min(0.86, alpha + 0.18)})`;
        context.shadowBlur = 12;
        context.fillStyle = point.token.length > 2
          ? `rgba(188, 255, 212, ${alpha})`
          : `rgba(68, 255, 140, ${alpha})`;
        context.fillText(point.token, point.x + drift, point.y - progressRatio * 10);
      }

      context.shadowBlur = 0;
      if (fade > 0) {
        rafId = window.requestAnimationFrame(draw);
      }
    };

    const setup = () => {
      if (disposed || !image.complete || !image.naturalWidth) return;
      buildPoints();
      context.clearRect(0, 0, width, height);
      startTime = performance.now();
      window.cancelAnimationFrame(rafId);
      if (shouldDraw()) {
        rafId = window.requestAnimationFrame(draw);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setup();
      } else {
        window.cancelAnimationFrame(rafId);
      }
    };

    image.onload = setup;
    image.src = assets.homeMascot;

    if (image.complete) {
      setup();
    }

    window.addEventListener("resize", setup);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", setup);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <main
      className={`matrix-entry phase-${phase} ${isExiting ? "is-exiting" : ""}`}
      aria-label={"\u8c6a\u58eb\u900f\u660e\u5de5\u5382\u63a5\u5165\u52a0\u8f7d\u9875"}
      style={{ "--design-scale": designScale } as CSSProperties}
    >
      <div className="matrix-entry-frame-shell">
        <div className="matrix-entry-frame">
          <canvas ref={canvasRef} className="matrix-rain-canvas" aria-hidden="true" />
          <div className="matrix-vignette" aria-hidden="true" />

          <section className="matrix-system-panel">
            <div className="matrix-transition-mascot" aria-hidden="true">
              <img src={assets.homeMascot} alt="" />
              <canvas ref={mascotCodeCanvasRef} className="matrix-mascot-code-canvas" />
            </div>

            <div className="matrix-entry-copy">
              <span className="matrix-system-kicker">HORSH TRANSPARENT FACTORY</span>
              <h1>{"\u4f60\u6b63\u5728\u8fdb\u5165\u8c6a\u58eb\u900f\u660e\u5de5\u5382"}</h1>
              <p className="matrix-entry-status">{entryStatus}</p>
              <div
                className="matrix-simple-countdown"
                aria-live="polite"
                aria-label={`\u5012\u8ba1\u65f6 ${countdown}`}
                style={{ "--countdown-progress": `${progress}%` } as CSSProperties}
              >
                <span>T-{String(countdown).padStart(2, "0")}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
