"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

function ConfettiBurst() {
  const pieces = useMemo(() => Array.from({ length: 40 }, (_, i) => {
    const colors = ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#FF6FB5", "#C084FC", "#F97316"];
    const angle = Math.random() * Math.PI * 2;
    const velocity = 200 + Math.random() * 300;
    return {
      id: i,
      color: colors[i % colors.length],
      x: Math.cos(angle) * velocity,
      y: Math.sin(angle) * velocity - 200,
      rotate: Math.random() * 720 - 360,
      scale: 0.5 + Math.random() * 0.8,
      shape: i % 3,
    };
  }), []);

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 200, overflow: "hidden" }}>
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: "50vw", y: "40vh", opacity: 1, scale: 0, rotate: 0 }}
          animate={{ x: `calc(50vw + ${p.x}px)`, y: `calc(40vh + ${p.y}px)`, opacity: 0, scale: p.scale, rotate: p.rotate }}
          transition={{ duration: 1.5 + Math.random() * 0.8, ease: "easeOut" }}
          style={{
            position: "absolute",
            width: p.shape === 0 ? 10 : p.shape === 1 ? 8 : 12,
            height: p.shape === 0 ? 10 : p.shape === 1 ? 12 : 4,
            borderRadius: p.shape === 0 ? "50%" : p.shape === 1 ? 2 : 1,
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}
import { useRouter } from "next/navigation";
import FluidGlassButton from "./FluidGlassButton";
import FeedbackModal from "./FeedbackModal";
import { putMemory, listMemories, type FridgeMemory } from "./fridgeDB";

type Stage = "landing" | "camera" | "preview" | "printing" | "result";

const FONT_OPTIONS = [
  { key: "patrick", label: "Handwriting", css: "var(--font-patrick-hand), 'Patrick Hand', cursive", canvas: "Patrick Hand" },
  { key: "caveat", label: "Casual", css: "var(--font-caveat), 'Caveat', cursive", canvas: "Caveat" },
  { key: "marker", label: "Marker", css: "var(--font-permanent-marker), 'Permanent Marker', cursive", canvas: "Permanent Marker" },
  { key: "indie", label: "Sketchy", css: "var(--font-indie-flower), 'Indie Flower', cursive", canvas: "Indie Flower" },
  { key: "shadows", label: "Dreamy", css: "var(--font-shadows), 'Shadows Into Light', cursive", canvas: "Shadows Into Light" },
  { key: "satisfy", label: "Fancy", css: "var(--font-satisfy), 'Satisfy', cursive", canvas: "Satisfy" },
];

const SIZE_OPTIONS = [
  { key: "sm", label: "S", px: 16, canvas: 28 },
  { key: "md", label: "M", px: 22, canvas: 42 },
  { key: "lg", label: "L", px: 28, canvas: 56 },
  { key: "xl", label: "XL", px: 34, canvas: 68 },
];

const FRAME_COLORS = [
  { key: "classic", label: "Classic", color: "#FDFDFB", text: "#333" },
  { key: "black", label: "Dark", color: "#1a1a1a", text: "#eee" },
  { key: "cream", label: "Cream", color: "#F5ECDA", text: "#5a4a3a" },
  { key: "pink", label: "Blush", color: "#FADCE6", text: "#7a3a4a" },
  { key: "mint", label: "Mint", color: "#D4EDDA", text: "#2d5a3a" },
  { key: "sky", label: "Sky", color: "#D6EAF8", text: "#2a4a6a" },
  { key: "lavender", label: "Lavender", color: "#E8DAEF", text: "#5a3a6a" },
  { key: "sunset", label: "Sunset", color: "#FDEBD0", text: "#6a4a2a" },
];

function resolveFrameColor(key: string) {
  const preset = FRAME_COLORS.find(f => f.key === key);
  if (preset) return preset;
  const isLight = (() => {
    const hex = key.replace("#", "");
    if (hex.length !== 6) return true;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 140;
  })();
  return { key, label: "Custom", color: key, text: isLight ? "#333" : "#eee" };
}

const FRAME_SIZES = [
  { key: "auto", label: "Auto", ratio: "auto", bottomPad: "1%", canvasBottom: 0.16 },
  { key: "compact", label: "Compact", ratio: "27 / 22", bottomPad: "1%", canvasBottom: 0.14 },
  { key: "classic", label: "Classic", ratio: "27 / 24", bottomPad: "1%", canvasBottom: 0.18 },
  { key: "wide", label: "Wide", ratio: "30 / 22", bottomPad: "1%", canvasBottom: 0.14 },
  { key: "square", label: "Square", ratio: "1 / 1", bottomPad: "1%", canvasBottom: 0.15 },
];

const SCENE_IMGS = [
  "/Sea_and_sun-removebg-preview.png",
  "/summer-removebg-preview.png",
  "/download__52_-removebg-preview.png",
  "/download__53_-removebg-preview.png",
  "/download__54_-removebg-preview.png",
  "/download__55_-removebg-preview.png",
  "/download__56_-removebg-preview.png",
  "/download__57_-removebg-preview.png",
];

export default function Home() {
  const [stage, setStage] = useState<Stage>("landing");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [developing, setDeveloping] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [flying, setFlying] = useState(false);
  const [ringBright, setRingBright] = useState(50);
  const [lightMode, setLightMode] = useState(false);
  const [ringImages, setRingImages] = useState<string[]>(SCENE_IMGS);
  const [isCustomRing, setIsCustomRing] = useState(false);
  const [boothMode, setBoothMode] = useState(0);
  const [boothPhotos, setBoothPhotos] = useState<string[]>([]);
  const [boothCountdown, setBoothCountdown] = useState(0);
  const [boothCapturing, setBoothCapturing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [caption, setCaption] = useState("");
  const [captionColor, setCaptionColor] = useState("#333");
  const [captionFont, setCaptionFont] = useState("patrick");
  const [captionSize, setCaptionSize] = useState("md");
  const [captionEditing, setCaptionEditing] = useState(false);
  const [frameColor, setFrameColor] = useState("classic");
  const [frameSize, setFrameSize] = useState("auto");
  const [imageAspect, setImageAspect] = useState(5640 / 3760);
  const cardRef = useRef<HTMLDivElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!capturedImage) return;
    const img = new Image();
    img.onload = () => {
      if (img.width > 0 && img.height > 0) {
        setImageAspect(img.width / img.height);
      }
    };
    img.src = capturedImage;
  }, [capturedImage]);

  useEffect(() => {
    try {
      const ids = JSON.parse(localStorage.getItem("ring_showcase_ids") ?? "[]") as string[];
      if (ids.length === 0) return;
      listMemories().then((all) => {
        const selected = ids
          .map((id) => all.find((m) => m.id === id))
          .filter(Boolean) as FridgeMemory[];
        if (selected.length > 0) {
          setRingImages(selected.map((m) => m.image));
          setIsCustomRing(true);
        }
      });
    } catch {}
  }, []);

  const compositeStrip = useCallback((photos: string[]): Promise<string> => {
    return new Promise((resolve, reject) => {
      const pad = 14;
      const gap = 8;
      const imgW = 400;
      const imgH = Math.round(imgW * (3760 / 5640));
      const stripW = imgW + pad * 2;
      const bottomPad = 6;
      const stripH = pad + photos.length * imgH + (photos.length - 1) * gap + bottomPad;
      const cvs = document.createElement("canvas");
      cvs.width = stripW;
      cvs.height = stripH;
      const ctx = cvs.getContext("2d")!;
      ctx.fillStyle = "#FDFDFB";
      ctx.fillRect(0, 0, stripW, stripH);
      let loaded = 0;
      let failed = false;
      const imgs = photos.map((src) => { const im = new Image(); im.src = src; return im; });
      imgs.forEach((img) => {
        img.onload = () => {
          if (failed) return;
          loaded++;
          if (loaded === imgs.length) {
            imgs.forEach((im, j) => {
              const y = pad + j * (imgH + gap);
              ctx.drawImage(im, 0, 0, im.width, im.height, pad, y, imgW, imgH);
            });
            resolve(cvs.toDataURL("image/jpeg", 0.92));
          }
        };
        img.onerror = () => {
          if (failed) return;
          failed = true;
          reject(new Error("Failed to load strip image"));
        };
      });
    });
  }, []);

  const [savingToFridge, setSavingToFridge] = useState(false);
  const handleAddToFridge = useCallback(async () => {
    if (savingToFridge) return;
    setSavingToFridge(true);
    try {
      let imageToSave: string | null = capturedImage;
      if (boothPhotos.length > 0) {
        imageToSave = await compositeStrip(boothPhotos);
      }
      if (!imageToSave) { setSavingToFridge(false); return; }
      setFlying(true);
      const preset =
        typeof window !== "undefined"
          ? parseInt(localStorage.getItem("fridge_preset") ?? "0", 10) || 0
          : 0;
      const memory: FridgeMemory = {
        id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        image: imageToSave,
        date: new Date().toISOString(),
        x: 40 + Math.random() * 600,
        y: 40 + Math.random() * 400,
        rotate: (Math.random() - 0.5) * 14,
        fridge: preset,
        caption: caption.trim() || undefined,
        captionColor: caption.trim() ? captionColor : undefined,
        captionFont: caption.trim() ? captionFont : undefined,
        captionSize: caption.trim() ? captionSize : undefined,
        frameColor: frameColor || undefined,
        frameSize: frameSize || undefined,
      };
      await putMemory(memory);
      await new Promise((r) => setTimeout(r, 900));
      setFlying(false);
      setCapturedImage(null);
      setBoothPhotos([]);
      setBoothMode(0);
      setCaption("");
      setStage("landing");
      router.push("/fridge");
    } catch {
      setFlying(false);
      setSavingToFridge(false);
    }
  }, [capturedImage, boothPhotos, caption, router, compositeStrip, savingToFridge]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera not available. Make sure you're using HTTPS.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError") {
        setCameraError("Camera access denied. Please allow camera permissions in your browser settings.");
      } else if (name === "NotReadableError") {
        setCameraError("Camera is in use by another app. Close it and try again.");
      } else {
        setCameraError("Could not access camera. Please try again.");
      }
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (stage === "camera") startCamera();
    return () => {
      if (stage === "camera") stopCamera();
    };
  }, [stage, startCamera, stopCamera]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const targetAspect = 5640 / 3760;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    let sw: number, sh: number;
    if (vw / vh > targetAspect) {
      sh = vh;
      sw = vh * targetAspect;
    } else {
      sw = vw;
      sh = vw / targetAspect;
    }
    const ox = (vw - sw) / 2;
    const oy = (vh - sh) / 2;
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, ox, oy, sw, sh, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.92));
    stopCamera();
    setStage("preview");
  };

  const grabFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    const targetAspect = 5640 / 3760;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    let sw: number, sh: number;
    if (vw / vh > targetAspect) { sh = vh; sw = vh * targetAspect; }
    else { sw = vw; sh = vw / targetAspect; }
    const ox = (vw - sw) / 2;
    const oy = (vh - sh) / 2;
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    if (facingMode === "user") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, ox, oy, sw, sh, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    return canvas.toDataURL("image/jpeg", 0.92);
  }, [facingMode]);

  const startBoothCapture = useCallback((shotCount: number) => {
    setBoothPhotos([]);
    setBoothCapturing(true);
    let taken = 0;
    const captureNext = () => {
      let count = 3;
      setBoothCountdown(count);
      const interval = setInterval(() => {
        count--;
        if (count > 0) {
          setBoothCountdown(count);
        } else {
          clearInterval(interval);
          setBoothCountdown(0);
          setShowFlash(true);
          setTimeout(() => setShowFlash(false), 300);
          const frame = grabFrame();
          if (frame) {
            taken++;
            setBoothPhotos((prev) => [...prev, frame]);
            if (taken < shotCount) {
              setTimeout(captureNext, 800);
            } else {
              setBoothCapturing(false);
              stopCamera();
              setStage("preview");
            }
          } else {
            setBoothCapturing(false);
            setCameraError("Lost camera feed during capture. Please try again.");
          }
        }
      }, 1000);
    };
    captureNext();
  }, [grabFrame, stopCamera]);

  const handleRetake = () => {
    setCapturedImage(null);
    setBoothPhotos([]);
    setBoothMode(0);
    setStage("camera");
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCapturedImage(dataUrl);
      setBoothPhotos([]);
      setBoothMode(0);
      setCaption("");
      setCaptionColor("#333");
      setCaptionFont("patrick");
      setCaptionSize("md");
      setFrameColor("classic");
      setFrameSize("auto");
      setStage("result");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleContinue = () => {
    if (boothPhotos.length > 0 && !capturedImage) {
      setCapturedImage(boothPhotos[0]);
    }
    setShowFlash(true);
    setStage("printing");
    setTimeout(() => setShowFlash(false), 600);
    setTimeout(() => {
      setDeveloping(true);
      setTimeout(() => {
        setDeveloping(false);
        setShowConfetti(true);
        setStage("result");
        setTimeout(() => setShowConfetti(false), 2500);
      }, 3200);
    }, 2800);
  };

  const handleDownload = () => {
    if (boothPhotos.length > 0) {
      handleStripDownload();
      return;
    }
    if (!capturedImage) return;
    const canvas = document.createElement("canvas");
    const cardW = 1800;
    const sidePad = Math.round(cardW * 0.055);
    const topPad = Math.round(cardW * 0.055);
    const frameSizeCfg = FRAME_SIZES.find(f => f.key === frameSize);
    const bottomPad = Math.round(cardW * (frameSizeCfg?.canvasBottom ?? 0.18));
    const imgW = cardW - sidePad * 2;
    const fColor = resolveFrameColor(frameColor).color;
    const img = new Image();
    img.onload = () => {
      const isAuto = frameSize === "auto";
      const imgH = isAuto
        ? Math.round(imgW / (img.width / img.height))
        : Math.round(imgW * (3760 / 5640));
      const cardH = topPad + imgH + bottomPad;
      canvas.width = cardW;
      canvas.height = cardH;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = fColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const srcAspect = img.width / img.height;
      const targetAspect = imgW / imgH;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (!isAuto && srcAspect > targetAspect) {
        sw = img.height * targetAspect;
        sx = (img.width - sw) / 2;
      } else if (!isAuto) {
        sh = img.width / targetAspect;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, sidePad, topPad, imgW, imgH);
      if (caption.trim()) {
        ctx.save();
        const canvasFont = FONT_OPTIONS.find(f => f.key === captionFont)?.canvas ?? "Patrick Hand";
        const canvasSize = (SIZE_OPTIONS.find(s => s.key === captionSize)?.canvas ?? 42) * 2;
        ctx.font = `${canvasSize}px '${canvasFont}', cursive`;
        ctx.fillStyle = captionColor || resolveFrameColor(frameColor).text;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const captionY = topPad + imgH + bottomPad * 0.45;
        ctx.fillText(caption, cardW / 2, captionY, imgW - 40);
        ctx.restore();
      }
      const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      ctx.save();
      const resolved = resolveFrameColor(frameColor);
      ctx.font = "48px 'Patrick Hand', cursive";
      ctx.fillStyle = resolved.text === "#eee" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const dateY = topPad + imgH + bottomPad * (caption.trim() ? 0.78 : 0.5);
      ctx.fillText(today, cardW / 2, dateY);
      ctx.restore();
      const link = document.createElement("a");
      link.download = `memoryprint-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.onerror = () => {};
    img.src = capturedImage;
  };

  const handleStripDownload = () => {
    if (boothPhotos.length === 0) return;
    compositeStrip(boothPhotos).then((dataUrl) => {
      const link = document.createElement("a");
      link.download = `photo-strip-${Date.now()}.jpg`;
      link.href = dataUrl;
      link.click();
    });
  };

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className={`relative min-h-screen w-full overflow-hidden ${lightMode ? "theme-light" : "bg-black"}`}>
      {/* Top navbar */}
      <nav
        className="navbar-root"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px clamp(12px, 3vw, 28px)",
          backdropFilter: lightMode ? "none" : "blur(10px)",
          WebkitBackdropFilter: lightMode ? "none" : "blur(10px)",
          background: lightMode ? "#f5f0eb" : "rgba(0,0,0,0.35)",
          borderBottom: lightMode ? "none" : "1px solid rgba(255,255,255,0.06)",
          fontFamily: '"GT Walsheim Framer Regular", system-ui, sans-serif',
        }}
      >
        <Link
          href="/"
          className="navbar-brand"
          style={{
            color: lightMode ? "#1a1a1a" : "#fff",
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            textDecoration: "none",
          }}
        >
          MemoryPrint
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setLightMode((p) => !p)}
            aria-label="Toggle theme"
            style={{
              background: lightMode ? "rgba(0,0,0,0.06)" : "transparent",
              border: lightMode ? "1px solid rgba(0,0,0,0.15)" : "1px solid rgba(255,255,255,0.18)",
              borderRadius: 999,
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 300ms",
            }}
          >
            {lightMode ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
          <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowFeedback(true)}
            style={{
              color: lightMode ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.55)",
              fontSize: 13,
              padding: "7px 14px",
              border: lightMode ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.12)",
              borderRadius: 999,
              background: "transparent",
              cursor: "pointer",
              transition: "color 200ms, border-color 200ms",
            }}
          >
            Feedback
          </button>
          <Link
            href="/fridge"
            className="navbar-cta"
            style={{
              color: lightMode ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.78)",
              fontSize: 14,
              padding: "8px 16px",
              border: lightMode ? "1px solid rgba(0,0,0,0.15)" : "1px solid rgba(255,255,255,0.18)",
              borderRadius: 999,
              textDecoration: "none",
              transition: "color 200ms, border-color 200ms",
            }}
          >
            Your Fridge
          </Link>

          {/* Hand-drawn hint pointing at "Your Fridge" — only on landing */}
          {stage === "landing" && (
            <motion.div
              className="navbar-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.2 }}
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 60,
                pointerEvents: "none",
                display: "flex",
                alignItems: "flex-start",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-patrick-hand), 'Patrick Hand', cursive",
                  fontSize: 19,
                  fontWeight: 700,
                  color: "rgba(245, 175, 105, 0.85)",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  transform: "rotate(-6deg)",
                  marginTop: 38,
                }}
              >
                your snaps land here
              </span>
              <svg
                width="96"
                height="100"
                viewBox="0 0 96 100"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
                style={{ overflow: "visible" }}
              >
                <path
                  d="M 6 92 C 14 70, 22 52, 38 32 C 54 14, 70 8, 84 4"
                  fill="none"
                  stroke="rgba(245, 175, 105, 0.85)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* arrowhead */}
                <path
                  d="M 70 0 L 86 4 L 80 18"
                  fill="none"
                  stroke="rgba(245, 175, 105, 0.85)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
          )}
        </div>
        </div>
      </nav>

      {/* Flash overlay */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            className="fixed inset-0 z-[100] bg-white pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </AnimatePresence>

      {showConfetti && <ConfettiBurst />}
      <FeedbackModal open={showFeedback} onClose={() => setShowFeedback(false)} />

      <canvas ref={canvasRef} className="hidden" />

      <AnimatePresence mode="wait">
        {/* ===================== LANDING ===================== */}
        {stage === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="framer-landing"
            style={{ minHeight: "100vh", width: "auto", position: "relative", overflow: "hidden" }}
          >
            {/* Warm amber bottom-corner glows — cinematic mood */}
            <div
              style={{
                position: "absolute",
                left: "-10%",
                bottom: "-10%",
                width: "45%",
                height: "55%",
                background:
                  "radial-gradient(ellipse at 30% 70%, rgba(180, 100, 40, 0.10) 0%, rgba(140, 75, 30, 0.05) 35%, transparent 70%)",
                filter: "blur(20px)",
                zIndex: 1,
                pointerEvents: "none",
                mixBlendMode: "screen",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: "-10%",
                bottom: "-10%",
                width: "45%",
                height: "55%",
                background:
                  "radial-gradient(ellipse at 70% 70%, rgba(180, 105, 50, 0.09) 0%, rgba(140, 80, 35, 0.04) 35%, transparent 70%)",
                filter: "blur(20px)",
                zIndex: 1,
                pointerEvents: "none",
                mixBlendMode: "screen",
              }}
            />


            {/* 3D rotating media ring behind camera */}
            <div className="scene3d-wrap" aria-hidden>
              <div className="framer-3dscene">
                <div className="framer-a3d-wrap">
                  <div
                    className="framer-a3d"
                    style={{
                      ["--n" as never]: 14,
                      ["--w" as never]: "25em",
                    }}
                  >
                    {Array.from({ length: 14 }).map((_, i) => (
                      <div
                        key={i}
                        className="framer-card"
                        style={{ ["--i" as never]: i }}
                      >
                        {isCustomRing ? (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              background: "rgb(252, 251, 248)",
                              borderRadius: "inherit",
                              padding: "5% 5% 15% 5%",
                              boxSizing: "border-box",
                              display: "flex",
                              flexDirection: "column",
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                minHeight: 0,
                                borderRadius: 4,
                                overflow: "hidden",
                                background: "rgb(8,8,10)",
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={ringImages[i % ringImages.length]}
                                alt=""
                                draggable={false}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                  filter: `brightness(${ringBright / 100}) saturate(${0.5 + ringBright / 200}) contrast(0.95)`,
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={ringImages[i % ringImages.length]}
                              alt=""
                              draggable={false}
                              style={{
                                filter: `brightness(${ringBright / 100}) saturate(${0.5 + ringBright / 200}) contrast(0.95)`,
                              }}
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div
                className="scene3d-fade"
                style={{ opacity: Math.max(0, 1 - ringBright / 80) }}
              />
            </div>

            {/* Carousel brightness slider */}
            <div
              style={{
                position: "absolute",
                bottom: 16,
                right: 20,
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(8px)",
                padding: "6px 14px",
                borderRadius: 999,
              }}
            >
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Ring</span>
              <input
                type="range"
                min={0}
                max={150}
                value={ringBright}
                onChange={(e) => setRingBright(Number(e.target.value))}
                style={{ width: 100, accentColor: "#fff", cursor: "pointer" }}
              />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", minWidth: 28 }}>
                {ringBright}%
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "100vh",
                position: "relative",
                padding: "40px 20px",
                gap: "0",
                zIndex: 3,
              }}
            >
              {/* Text section */}
              <div
                className="hero-text"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                  zIndex: 10,
                  marginBottom: "20px",
                }}
              >
                {/* Heading with subtle glow */}
                <div style={{ textAlign: "center", position: "relative" }}>
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "120%",
                      height: "180%",
                      background:
                        "radial-gradient(ellipse at center, rgba(255, 220, 180, 0.18) 0%, rgba(220, 180, 140, 0.08) 35%, transparent 70%)",
                      filter: "blur(24px)",
                      pointerEvents: "none",
                      zIndex: 0,
                    }}
                  />
                  <p
                    className="hero-heading"
                    style={{
                      fontFamily:
                        '"GT Walsheim Framer Regular", "GT Walsheim Framer Regular Placeholder", sans-serif',
                      fontSize: "clamp(32px, 8vw, 51px)",
                      fontWeight: 500,
                      letterSpacing: "-1.5px",
                      lineHeight: 1.1,
                      textAlign: "center",
                      color: lightMode ? "#1a1a1a" : "rgb(255, 255, 255)",
                      margin: 0,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    Keep This One
                  </p>
                </div>

                {/* Subheadline */}
                <div style={{ maxWidth: "460px", textAlign: "center", padding: "0 16px" }}>
                  <p
                    className="hero-subheading"
                    style={{
                      fontSize: "15px",
                      letterSpacing: "-0.01px",
                      lineHeight: "24.3px",
                      textAlign: "center",
                      color: lightMode ? "rgba(0,0,0,0.55)" : "rgba(255, 255, 255, 0.6)",
                      margin: 0,
                    }}
                  >
                    Some moments are too good to scroll past.
                  </p>
                </div>
              </div>

              {/* Surface base — slightly lighter warm-dark tone so the gradient is visible */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: "55%",
                  background:
                    "linear-gradient(to bottom, transparent 0%, rgba(48, 40, 32, 0.55) 40%, rgba(58, 48, 38, 0.7) 100%)",
                  zIndex: 1,
                  pointerEvents: "none",
                }}
              />
              {/* Surface — dark gradient with blur (per reference) */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: "50%",
                  background:
                    "linear-gradient(rgb(0, 0, 0) 37%, rgba(0, 0, 0, 0) 100%)",
                  filter: "blur(9px)",
                  opacity: 1,
                  transform: "scaleY(-1)",
                  zIndex: 1,
                  pointerEvents: "none",
                }}
              />

              {/* Camera assembly with grounding shadows */}
              <div
                style={{
                  position: "relative",
                  width: "min(689px, 90vw)",
                  aspectRatio: "3600 / 2688",
                  transform: "scale(0.75) perspective(1200px) rotateX(6deg) translateY(120px)",
                  transformOrigin: "center center",
                  zIndex: 5,
                  margin: "-40px 0",
                }}
              >
                {/* L1: Deep soft cast shadow — projected forward on the floor */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: "-30%",
                    transform: "translateX(-50%)",
                    width: "200%",
                    height: "75%",
                    background:
                      "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.45) 25%, rgba(0,0,0,0.2) 55%, transparent 85%)",
                    filter: "blur(45px)",
                    zIndex: 1,
                    pointerEvents: "none",
                  }}
                />
                {/* L2: Mid contact shadow — directly under */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: "-8%",
                    transform: "translateX(-50%)",
                    width: "115%",
                    height: "30%",
                    background:
                      "radial-gradient(ellipse 55% 60% at 50% 50%, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.25) 65%, transparent 90%)",
                    filter: "blur(18px)",
                    zIndex: 2,
                    pointerEvents: "none",
                  }}
                />
                {/* L3: Ambient occlusion — tight dark crescent where camera meets floor */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: "2%",
                    transform: "translateX(-50%)",
                    width: "78%",
                    height: "9%",
                    background:
                      "radial-gradient(ellipse 70% 100% at 50% 50%, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, transparent 90%)",
                    filter: "blur(5px)",
                    zIndex: 2,
                    pointerEvents: "none",
                  }}
                />
                {/* Camera image — with multi-stop drop shadows for body depth */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/mycamera.png"
                  alt="Polaroid Camera"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    position: "relative",
                    zIndex: 3,
                    filter:
                      "drop-shadow(0 2px 1px rgba(0,0,0,0.7)) drop-shadow(0 8px 6px rgba(0,0,0,0.55)) drop-shadow(0 28px 18px rgba(0,0,0,0.45)) drop-shadow(0 55px 40px rgba(0,0,0,0.35))",
                  }}
                />
                {/* Surface reflection — flipped camera fading down */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/mycamera.png"
                  alt=""
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "85%",
                    width: "100%",
                    height: "60%",
                    objectFit: "contain",
                    objectPosition: "top",
                    transform: "scaleY(-1)",
                    opacity: 0.7,
                    zIndex: 4,
                    pointerEvents: "none",
                    WebkitMaskImage:
                      "linear-gradient(to top, transparent 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.9) 100%)",
                    maskImage:
                      "linear-gradient(to top, transparent 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.9) 100%)",
                    filter: "blur(1px)",
                  }}
                />
                {/* L4: Bounce light from marquee onto camera underside */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: "8%",
                    transform: "translateX(-50%)",
                    width: "55%",
                    height: "12%",
                    background:
                      "radial-gradient(ellipse at center, rgba(120, 140, 200, 0.12) 0%, transparent 70%)",
                    filter: "blur(10px)",
                    zIndex: 4,
                    pointerEvents: "none",
                    mixBlendMode: "screen",
                  }}
                />
              </div>

              {/* CTA — Fluid Glass Button */}
              <div className="hero-cta" style={{ zIndex: 10, marginTop: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                <FluidGlassButton
                  text="Take a Snapshot"
                  onClick={() => setStage("camera")}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleGalleryUpload}
                  style={{ display: "none" }}
                />
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: 999,
                    padding: "10px 24px",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 14,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all 200ms ease",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"; e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  Upload from Gallery
                </button>
              </div>

            </div>
          </motion.div>
        )}

        {/* ===================== CAMERA ===================== */}
        {stage === "camera" && (
          <motion.div
            key="camera"
            className="flex flex-col items-center justify-center min-h-screen gap-6 px-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <div className="relative w-full max-w-lg aspect-square rounded-xl overflow-hidden bg-[#08080a] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              {cameraError ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
                  <p style={{ fontFamily: "var(--font-patrick-hand)", fontSize: 16, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                    {cameraError}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setCameraError(null); startCamera(); }}
                      style={{ padding: "8px 18px", borderRadius: 999, fontSize: 13, background: "#fff", color: "#0a0a0a", border: "none", cursor: "pointer" }}
                    >
                      Try again
                    </button>
                    <button
                      onClick={() => { setCameraError(null); setStage("landing"); }}
                      style={{ padding: "8px 18px", borderRadius: 999, fontSize: 13, background: "transparent", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer" }}
                    >
                      Go back
                    </button>
                  </div>
                </div>
              ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              )}
              {/* Viewfinder corners */}
              <div className="absolute inset-4 pointer-events-none">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/40 rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/40 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/40 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/40 rounded-br" />
              </div>
            </div>

            {/* Booth countdown overlay */}
            {boothCountdown > 0 && (
              <motion.div
                key={boothCountdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.35 }}
                style={{
                  position: "fixed",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 100,
                  pointerEvents: "none",
                }}
              >
                <span style={{ fontSize: 120, fontWeight: 800, color: "rgba(255,255,255,0.85)", textShadow: "0 4px 30px rgba(0,0,0,0.5)" }}>
                  {boothCountdown}
                </span>
              </motion.div>
            )}

            {/* Booth shot counter */}
            {boothCapturing && boothPhotos.length > 0 && (
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 500 }}>
                {boothPhotos.length} / {boothMode} shots
              </div>
            )}

            {/* Booth mode selector */}
            <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
              {[0, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setBoothMode(n)}
                  disabled={boothCapturing}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    border: boothMode === n ? "1.5px solid rgba(255,255,255,0.6)" : "1px solid rgba(255,255,255,0.15)",
                    background: boothMode === n ? "rgba(255,255,255,0.15)" : "transparent",
                    color: boothMode === n ? "#fff" : "rgba(255,255,255,0.5)",
                    cursor: boothCapturing ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {n === 0 ? "Single" : `${n}-Strip`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() =>
                  setFacingMode((m) => (m === "user" ? "environment" : "user"))
                }
                className="px-4 py-2 rounded-full text-sm text-white/60 border border-white/10 hover:border-white/30 transition cursor-pointer"
                disabled={boothCapturing}
              >
                Flip
              </button>
              <motion.button
                onClick={() => {
                  if (boothCapturing) return;
                  if (boothMode > 0) {
                    startBoothCapture(boothMode);
                  } else {
                    handleCapture();
                  }
                }}
                className="w-16 h-16 rounded-full bg-white border-4 border-white/30 shadow-lg cursor-pointer"
                whileTap={{ scale: 0.85 }}
                style={{ opacity: boothCapturing ? 0.4 : 1 }}
              />
              <button
                onClick={() => {
                  stopCamera();
                  setBoothCapturing(false);
                  setBoothMode(0);
                  setBoothPhotos([]);
                  setStage("landing");
                }}
                className="px-4 py-2 rounded-full text-sm text-white/60 border border-white/10 hover:border-white/30 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* ===================== PREVIEW ===================== */}
        {stage === "preview" && (capturedImage || boothPhotos.length > 0) && (
          <motion.div
            key="preview"
            className="flex flex-col items-center justify-center min-h-screen gap-6 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {boothPhotos.length > 0 ? (
              <div
                style={{
                  background: "#FDFDFB",
                  borderRadius: 10,
                  padding: "10px 10px 32px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  width: "min(72vw, 280px)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                }}
              >
                {boothPhotos.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt={`Strip ${i + 1}`}
                    style={{ width: "100%", borderRadius: 4, display: "block" }}
                  />
                ))}
                <p style={{
                  fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                  textAlign: "center",
                  color: "#888",
                  fontSize: 13,
                  margin: "6px 0 0",
                }}>
                  Photo Booth Strip
                </p>
              </div>
            ) : (
              <div className="w-[85vw] max-w-[420px] rounded-xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedImage!}
                  alt="Captured"
                  className="w-full object-cover"
                  style={{ aspectRatio: "5640 / 3760" }}
                />
              </div>
            )}
            <div className="flex gap-4">
              <button
                onClick={handleRetake}
                className="px-6 py-3 rounded-full text-sm text-white/70 border border-white/15 hover:border-white/30 transition cursor-pointer"
              >
                Retake
              </button>
              <motion.button
                onClick={handleContinue}
                className="cursor-pointer"
                style={{
                  backgroundColor: "rgb(255, 255, 255)",
                  borderRadius: "100px",
                  boxShadow:
                    "rgb(176, 176, 176) 0px 5px 0px 0px, rgba(0, 0, 0, 0.28) 0px 8px 14px 0px",
                  border: "none",
                  padding: "12px 28px",
                  color: "#000",
                  fontSize: "15px",
                  fontWeight: 500,
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                Continue
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ===================== PRINTING ===================== */}
        {stage === "printing" && (capturedImage || boothPhotos.length > 0) && (
          <motion.div
            key="printing"
            className="flex flex-col items-center justify-center min-h-screen px-4 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            onClick={() => setStage("result")}
            style={{ cursor: "pointer" }}
          >
            <div
              style={{
                position: "relative",
                width: "min(689px, 90vw)",
                aspectRatio: "3600 / 2688",
                transform: "scale(0.75)",
                transformOrigin: "center top",
                marginTop: "-20px",
              }}
            >
              {/* Polaroid sliding out from print slot — behind camera front (z-index 1), starts inside, slides down to emerge */}
              <motion.div
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: "5%",
                  width: "42%",
                  zIndex: 1,
                  transformOrigin: "50% 0%",
                }}
                initial={{ x: "-50%", y: "0%", rotateX: 90, opacity: 0 }}
                animate={{ x: "-50%", y: "65%", rotateX: 0, opacity: 1 }}
                transition={{
                  delay: 0.8,
                  duration: 2.5,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                <div
                  style={{
                    backgroundColor: "rgb(253, 253, 251)",
                    borderRadius: "4px",
                    boxShadow:
                      "rgba(0, 0, 0, 0.28) 0px 20px 45px 0px, rgba(0, 0, 0, 0.12) 0px 4px 10px 0px, inset 0 0 0 1px rgba(0, 0, 0, 0.04)",
                    padding: "3% 3% 0 3%",
                    aspectRatio: "27 / 20",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "rgb(8, 8, 10)",
                      borderRadius: "1px",
                      width: "100%",
                      aspectRatio: "5640 / 3760",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={capturedImage || boothPhotos[0]}
                      alt="Developing"
                      className={
                        developing
                          ? "developing"
                          : ""
                      }
                      style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        ...(developing
                          ? {}
                          : {
                              filter: "blur(14px) brightness(2) saturate(0)",
                              opacity: 0.8,
                            }),
                      }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Camera image on top — masks the polaroid */}
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 4,
                }}
                animate={{ x: [0, -3, 3, -2, 0] }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/mycamera.png"
                  alt="Polaroid Camera"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </motion.div>
            </div>

            <motion.p
              style={{
                color: "rgba(255, 255, 255, 0.4)",
                fontSize: "14px",
                marginTop: "-20px",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              Developing your photo...
            </motion.p>
            <motion.p
              style={{
                color: "rgba(255, 255, 255, 0.2)",
                fontSize: "12px",
                marginTop: "4px",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
            >
              tap to skip
            </motion.p>
          </motion.div>
        )}

        {/* ===================== RESULT ===================== */}
        {stage === "result" && (capturedImage || boothPhotos.length > 0) && (
          <motion.div
            key="result"
            className="flex flex-col items-center justify-center min-h-screen gap-8 px-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
          >
            {boothPhotos.length > 0 ? (
              <motion.div
                className="result-polaroid"
                drag={!captionEditing}
                dragMomentum={true}
                dragElastic={0.1}
                whileDrag={{ scale: 1.05, cursor: "grabbing", rotate: 0 }}
                style={{
                  width: "clamp(220px, 32vw, 280px)",
                  backgroundColor: "rgb(253, 253, 251)",
                  borderRadius: "4px",
                  boxShadow:
                    "rgba(0, 0, 0, 0.28) 0px 20px 45px 0px, rgba(0, 0, 0, 0.12) 0px 4px 10px 0px, inset 0 0 0 1px rgba(0, 0, 0, 0.04)",
                  padding: "10px 10px 36px",
                  cursor: captionEditing ? "default" : "grab",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  position: "relative",
                }}
                initial={{ rotate: -2 }}
                animate={{ rotate: captionEditing ? 0 : 1 }}
                transition={captionEditing
                  ? { duration: 0.3 }
                  : { duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
                }
                ref={cardRef}
              >
                {boothPhotos.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt={`Strip ${i + 1}`}
                    style={{ width: "100%", borderRadius: 2, display: "block" }}
                  />
                ))}

                {/* Caption area */}
                <div
                  style={{
                    padding: "6px 8px 2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "text",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCaptionEditing(true);
                  }}
                >
                  {captionEditing ? (
                    <input
                      autoFocus
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      onBlur={() => setCaptionEditing(false)}
                      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                      maxLength={40}
                      placeholder="write a caption..."
                      style={{
                        fontFamily: FONT_OPTIONS.find(f => f.key === captionFont)?.css,
                        fontSize: Math.min(SIZE_OPTIONS.find(s => s.key === captionSize)?.px ?? 18, 22),
                        color: captionColor,
                        background: "transparent",
                        border: "none",
                        borderBottom: "1.5px dashed rgba(0,0,0,0.2)",
                        outline: "none",
                        textAlign: "center",
                        width: "100%",
                        padding: "2px 4px",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontFamily: FONT_OPTIONS.find(f => f.key === captionFont)?.css,
                        fontSize: Math.min(SIZE_OPTIONS.find(s => s.key === captionSize)?.px ?? 18, 22),
                        color: caption ? captionColor : "rgba(0,0,0,0.25)",
                        textAlign: "center",
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
                        minHeight: 24,
                      }}
                    >
                      {!caption && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      )}
                      {caption || "write a caption..."}
                    </span>
                  )}
                </div>
              </motion.div>
            ) : (
            <motion.div
              className="result-polaroid"
              drag={!captionEditing}
              dragMomentum={true}
              dragElastic={0.1}
              whileDrag={{ scale: 1.05, cursor: "grabbing", rotate: 0 }}
              style={{
                width: "clamp(320px, 50vw, 440px)",
                aspectRatio: frameSize === "auto" ? undefined : (FRAME_SIZES.find(f => f.key === frameSize)?.ratio ?? "27 / 24"),
                backgroundColor: resolveFrameColor(frameColor).color,
                borderRadius: "4px",
                boxShadow:
                  "rgba(0, 0, 0, 0.28) 0px 20px 45px 0px, rgba(0, 0, 0, 0.12) 0px 4px 10px 0px, inset 0 0 0 1px rgba(0, 0, 0, 0.04)",
                padding: `1.5% 1.5% ${FRAME_SIZES.find(f => f.key === frameSize)?.bottomPad ?? "1%"} 1.5%`,
                cursor: captionEditing ? "default" : "grab",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
              initial={{ rotate: -2 }}
              animate={{ rotate: captionEditing ? 0 : 1 }}
              transition={captionEditing
                ? { duration: 0.3 }
                : { duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
              }
              ref={cardRef}
            >
              <div
                style={{
                  backgroundColor: "rgb(8, 8, 10)",
                  borderRadius: "1px",
                  width: "100%",
                  aspectRatio: frameSize === "auto" ? undefined : "5640 / 3760",
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedImage!}
                  alt="Your Polaroid"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>

              {/* Caption area — like writing on a real Polaroid */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px 8px",
                  cursor: "text",
                  minHeight: 36,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCaptionEditing(true);
                }}
              >
                {(() => {
                  const isDark = resolveFrameColor(frameColor).text !== "#333";
                  const hintColor = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)";
                  const dashColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
                  return captionEditing ? (
                  <input
                    autoFocus
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    onBlur={() => setCaptionEditing(false)}
                    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                    maxLength={40}
                    placeholder="write a caption..."
                    style={{
                      fontFamily: FONT_OPTIONS.find(f => f.key === captionFont)?.css,
                      fontSize: SIZE_OPTIONS.find(s => s.key === captionSize)?.px ?? 22,
                      color: captionColor,
                      background: "transparent",
                      border: "none",
                      borderBottom: `1.5px dashed ${dashColor}`,
                      outline: "none",
                      textAlign: "center",
                      width: "100%",
                      padding: "2px 4px",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontFamily: FONT_OPTIONS.find(f => f.key === captionFont)?.css,
                      fontSize: SIZE_OPTIONS.find(s => s.key === captionSize)?.px ?? 22,
                      color: caption ? captionColor : hintColor,
                      textAlign: "center",
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      minHeight: 28,
                    }}
                  >
                    {!caption && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                    )}
                    {caption || "write a caption..."}
                  </span>
                );
                })()}
              </div>
            </motion.div>
            )}

            {/* Frame options */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "center",
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              borderRadius: 14,
              padding: "10px 14px",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              {/* Frame colors */}
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                {FRAME_COLORS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFrameColor(f.key)}
                    title={f.label}
                    style={{
                      width: frameColor === f.key ? 28 : 22,
                      height: frameColor === f.key ? 28 : 22,
                      borderRadius: 6,
                      backgroundColor: f.color,
                      border: frameColor === f.key
                        ? "2.5px solid rgba(255,255,255,0.9)"
                        : `1.5px solid ${f.key === "classic" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)"}`,
                      cursor: "pointer",
                      transition: "all 150ms ease",
                      boxShadow: frameColor === f.key ? "0 0 8px rgba(255,255,255,0.3)" : "inset 0 0 0 1px rgba(0,0,0,0.05)",
                    }}
                  />
                ))}
                <label
                  title="Pick any color"
                  style={{
                    width: !FRAME_COLORS.some(f => f.key === frameColor) ? 28 : 22,
                    height: !FRAME_COLORS.some(f => f.key === frameColor) ? 28 : 22,
                    borderRadius: 6,
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                    border: !FRAME_COLORS.some(f => f.key === frameColor)
                      ? "2.5px solid rgba(255,255,255,0.9)"
                      : "1.5px solid rgba(255,255,255,0.25)",
                    background: !FRAME_COLORS.some(f => f.key === frameColor)
                      ? resolveFrameColor(frameColor).color
                      : "conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                    boxShadow: !FRAME_COLORS.some(f => f.key === frameColor) ? "0 0 8px rgba(255,255,255,0.3)" : "none",
                    transition: "all 150ms ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <input
                    type="color"
                    value={resolveFrameColor(frameColor).color}
                    onChange={(e) => setFrameColor(e.target.value)}
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0,
                      width: "100%",
                      height: "100%",
                      cursor: "pointer",
                      border: "none",
                      padding: 0,
                    }}
                  />
                </label>
              </div>

              {/* Frame sizes */}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {FRAME_SIZES.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFrameSize(f.key)}
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 16,
                      border: frameSize === f.key ? "1.5px solid rgba(255,255,255,0.8)" : "1px solid rgba(255,255,255,0.12)",
                      background: frameSize === f.key ? "rgba(255,255,255,0.12)" : "transparent",
                      color: frameSize === f.key ? "#fff" : "rgba(255,255,255,0.45)",
                      cursor: "pointer",
                      transition: "all 150ms ease",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Caption style toolbar — only shows when caption has text */}
            {(caption || captionEditing) && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  alignItems: "center",
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  borderRadius: 16,
                  padding: "12px 16px",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {/* Colors */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {["#333", "#1a6dd4", "#c0392b", "#27ae60", "#8e44ad", "#e67e22"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setCaptionColor(c)}
                      style={{
                        width: captionColor === c ? 24 : 18,
                        height: captionColor === c ? 24 : 18,
                        borderRadius: "50%",
                        backgroundColor: c,
                        border: captionColor === c ? "2.5px solid rgba(255,255,255,0.9)" : "2px solid rgba(255,255,255,0.25)",
                        cursor: "pointer",
                        transition: "all 150ms ease",
                        boxShadow: captionColor === c ? "0 0 6px rgba(255,255,255,0.3)" : "none",
                      }}
                    />
                  ))}
                </div>

                {/* Fonts */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setCaptionFont(f.key)}
                      style={{
                        fontFamily: f.css,
                        fontSize: 13,
                        padding: "4px 10px",
                        borderRadius: 20,
                        border: captionFont === f.key ? "1.5px solid rgba(255,255,255,0.8)" : "1px solid rgba(255,255,255,0.15)",
                        background: captionFont === f.key ? "rgba(255,255,255,0.15)" : "transparent",
                        color: captionFont === f.key ? "#fff" : "rgba(255,255,255,0.5)",
                        cursor: "pointer",
                        transition: "all 150ms ease",
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Sizes */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {SIZE_OPTIONS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setCaptionSize(s.key)}
                      style={{
                        fontSize: s.key === "sm" ? 11 : s.key === "md" ? 13 : s.key === "lg" ? 15 : 17,
                        fontWeight: 600,
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        border: captionSize === s.key ? "1.5px solid rgba(255,255,255,0.8)" : "1px solid rgba(255,255,255,0.15)",
                        background: captionSize === s.key ? "rgba(255,255,255,0.15)" : "transparent",
                        color: captionSize === s.key ? "#fff" : "rgba(255,255,255,0.5)",
                        cursor: "pointer",
                        transition: "all 150ms ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="flex gap-4 flex-wrap justify-center result-actions">
              <motion.button
                onClick={handleAddToFridge}
                disabled={savingToFridge}
                className="cursor-pointer"
                style={{
                  backgroundColor: savingToFridge ? "rgba(255,255,255,0.6)" : "rgb(255, 255, 255)",
                  borderRadius: "100px",
                  boxShadow:
                    "rgb(176, 176, 176) 0px 5px 0px 0px, rgba(0, 0, 0, 0.28) 0px 8px 14px 0px",
                  border: "none",
                  padding: "12px 28px",
                  color: "#000",
                  fontSize: "15px",
                  fontWeight: 500,
                  opacity: savingToFridge ? 0.7 : 1,
                }}
                whileHover={savingToFridge ? {} : { scale: 1.04 }}
                whileTap={savingToFridge ? {} : { scale: 0.97 }}
              >
                {savingToFridge ? "Saving..." : "Add to Fridge"}
              </motion.button>
              <button
                onClick={handleDownload}
                style={{
                  background: "transparent",
                  color: "rgba(255,255,255,0.78)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 999,
                  padding: "10px 20px",
                  fontSize: 14,
                  cursor: "pointer",
                  outline: "none",
                  transition: "border-color 200ms, color 200ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.78)";
                }}
              >
                Download
              </button>
              <button
                onClick={() => {
                  if (caption && !window.confirm("You have a caption — discard and take another?")) return;
                  setCapturedImage(null);
                  setBoothPhotos([]);
                  setBoothMode(0);
                  setCaption("");
                  setStage("landing");
                }}
                style={{
                  background: "transparent",
                  color: "rgba(255,255,255,0.78)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 999,
                  padding: "10px 20px",
                  fontSize: 14,
                  cursor: "pointer",
                  outline: "none",
                  transition: "border-color 200ms, color 200ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.78)";
                }}
              >
                Take Another
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fly-to-fridge overlay — flies the print to the fridge section */}
      <AnimatePresence>
        {flying && capturedImage && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              zIndex: 150,
            }}
          >
            <motion.div
              initial={{ top: "40%", left: "50%", x: "-50%", y: "-50%", rotate: 0, scale: 1 }}
              animate={{
                top: "100%",
                left: "50%",
                x: "-50%",
                y: "-50%",
                rotate: 12,
                scale: 0.25,
              }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute",
                width: "min(360px, 70vw)",
                background: "rgb(252, 251, 248)",
                borderRadius: 6,
                padding: "3% 3% 10% 3%",
                boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "5640 / 3760",
                  background: "rgb(8,8,10)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedImage}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
