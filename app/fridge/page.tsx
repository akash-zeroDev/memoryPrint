"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import PaperBackground, { PAPER_PRESETS, type PaperType, type TextureStyle } from "../PaperBackground";
import ProfileCard from "../ProfileCard";
import FeedbackModal from "../FeedbackModal";
import {
  listMemories,
  putMemory,
  deleteMemory,
  type FridgeMemory,
} from "../fridgeDB";

const BOARD_HEIGHT = 1100;
const CARD_W = 280;

type CustomFridge = {
  name: string;
  paperType: PaperType;
  textureStyle: TextureStyle;
  background: string;
  lineColor: string;
  textureIntensity: number;
};

const CUSTOM_KEY = "custom_fridges_v1";

const STYLE_TEMPLATES: Array<{ label: string; preset: Omit<CustomFridge, "name"> }> = [
  { label: "Cream", preset: { paperType: "lined", textureStyle: "vintage", background: "#f7efde", lineColor: "#d3c1a3", textureIntensity: 35 } },
  { label: "Grid", preset: { paperType: "grid", textureStyle: "modern", background: "#ffffff", lineColor: "#cfd3d8", textureIntensity: 18 } },
  { label: "Dotted", preset: { paperType: "dotted", textureStyle: "modern", background: "#f3f4f6", lineColor: "#9aa1ab", textureIntensity: 20 } },
  { label: "Kraft", preset: { paperType: "blank", textureStyle: "rough", background: "#d9b88a", lineColor: "#d9b88a", textureIntensity: 55 } },
  { label: "Wavy", preset: { paperType: "wavy", textureStyle: "vintage", background: "#f0e6ce", lineColor: "#b89e74", textureIntensity: 40 } },
  { label: "Slate", preset: { paperType: "grid", textureStyle: "modern", background: "#22262d", lineColor: "#3b4150", textureIntensity: 22 } },
  { label: "Pastel", preset: { paperType: "dotted", textureStyle: "smooth", background: "#e8efff", lineColor: "#a8b3cf", textureIntensity: 18 } },
];

export default function FridgePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [memories, setMemories] = useState<FridgeMemory[]>([]);
  const [open, setOpen] = useState<FridgeMemory | null>(null);
  const [preset, setPreset] = useState(0);
  const [customFridges, setCustomFridges] = useState<CustomFridge[]>([]);
  const [showAddFridge, setShowAddFridge] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStyle, setNewStyle] = useState(0);
  const [fridgesLoaded, setFridgesLoaded] = useState(false);
  const [showShowcase, setShowShowcase] = useState(false);
  const [showcaseIds, setShowcaseIds] = useState<Set<string>>(new Set());
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteColor, setNoteColor] = useState("#fff9c4");
  const [noteStickers, setNoteStickers] = useState<Array<{ emoji: string; x: number; y: number }>>([]);
  const [noteTexts, setNoteTexts] = useState<Array<{ id: number; text: string; x: number; y: number; size: number; font: string; editing: boolean }>>([]);
  const [activeFont, setActiveFont] = useState("'Patrick Hand', cursive");
  const [activeSize, setActiveSize] = useState(18);
  const noteRef = useRef<HTMLDivElement>(null);

  // load custom fridges on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(CUSTOM_KEY);
      if (raw) setCustomFridges(JSON.parse(raw));
    } catch {}
    setFridgesLoaded(true);
    try {
      const saved = JSON.parse(localStorage.getItem("ring_showcase_ids") ?? "[]") as string[];
      if (saved.length) setShowcaseIds(new Set(saved));
    } catch {}
  }, []);

  // persist only after initial load is done
  useEffect(() => {
    if (!fridgesLoaded) return;
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(customFridges));
  }, [customFridges, fridgesLoaded]);

  const ALL_FRIDGES = [
    ...PAPER_PRESETS.map((p) => ({ name: p.name, props: p.props, custom: false as const })),
    ...customFridges.map((c) => ({
      name: c.name,
      custom: true as const,
      props: {
        paperType: c.paperType,
        textureStyle: c.textureStyle,
        background: c.background,
        lineColor: c.lineColor,
        textureIntensity: c.textureIntensity,
      },
    })),
  ];

  const handleAddFridge = () => {
    const trimmed = newName.trim() || `My Fridge ${customFridges.length + 1}`;
    const tpl = STYLE_TEMPLATES[Math.max(0, Math.min(STYLE_TEMPLATES.length - 1, newStyle))];
    const next: CustomFridge = { name: trimmed, ...tpl.preset };
    setCustomFridges((prev) => [...prev, next]);
    setPreset(PAPER_PRESETS.length + customFridges.length); // jump to the newly added one
    setShowAddFridge(false);
    setNewName("");
    setNewStyle(0);
  };

  const handleDeleteCustomFridge = (customIndex: number) => {
    const absoluteIndex = PAPER_PRESETS.length + customIndex;
    // Move any memories on this fridge back to fridge 0
    setMemories((prev) => {
      const next = prev.map((m) =>
        (m.fridge ?? 0) === absoluteIndex ? { ...m, fridge: 0 } : m
      );
      next
        .filter((m, i) => m !== prev[i])
        .forEach((m) => {
          putMemory(m).catch(() => {});
        });
      return next;
    });
    setCustomFridges((prev) => prev.filter((_, i) => i !== customIndex));
    if (preset === absoluteIndex) setPreset(0);
  };

  useEffect(() => {
    listMemories()
      .then(async (all) => {
        // Migrate old memories without `fridge` field — default to 0
        const migrated = await Promise.all(
          all.map(async (m) => {
            if (typeof (m as FridgeMemory).fridge !== "number") {
              const updated = { ...m, fridge: 0 } as FridgeMemory;
              await putMemory(updated);
              return updated;
            }
            return m;
          })
        );
        setMemories(migrated);
      })
      .catch(() => {});
    const saved = typeof window !== "undefined" ? localStorage.getItem("fridge_preset") : null;
    if (saved != null) {
      const n = parseInt(saved, 10);
      if (!Number.isNaN(n) && n >= 0 && n < PAPER_PRESETS.length) setPreset(n);
    }
  }, []);

  const visibleMemories = memories.filter((m) => (m.fridge ?? 0) === preset);

  const handleMoveToFridge = async (m: FridgeMemory, targetFridge: number) => {
    if (m.fridge === targetFridge) return;
    const updated = {
      ...m,
      fridge: targetFridge,
      // give it a fresh natural spot on the new fridge so it doesn't land on top of an existing memory
      x: 40 + Math.random() * 600,
      y: 40 + Math.random() * 400,
      rotate: (Math.random() - 0.5) * 14,
    };
    await putMemory(updated);
    setMemories((prev) => prev.map((p) => (p.id === m.id ? updated : p)));
    setOpen(updated);
  };

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("fridge_preset", String(preset));
  }, [preset]);

  const handleDragEnd = async (m: FridgeMemory, dx: number, dy: number) => {
    const updated = { ...m, x: m.x + dx, y: m.y + dy };
    setMemories((prev) => prev.map((p) => (p.id === m.id ? updated : p)));
    await putMemory(updated);
  };

  const handleDelete = async (id: string) => {
    await deleteMemory(id);
    setMemories((prev) => prev.filter((p) => p.id !== id));
    setOpen(null);
  };

  const shuffleCards = useCallback(() => {
    setMemories((prev) =>
      prev.map((m) => {
        const updated = {
          ...m,
          x: 20 + Math.random() * 900,
          y: 20 + Math.random() * 600,
          rotate: (Math.random() - 0.5) * 24,
        };
        putMemory(updated).catch(() => {});
        return updated;
      })
    );
  }, []);

  useEffect(() => {
    let lastShake = 0;
    const threshold = 25;
    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const total = Math.abs(acc.x ?? 0) + Math.abs(acc.y ?? 0) + Math.abs(acc.z ?? 0);
      if (total > threshold && Date.now() - lastShake > 1000) {
        lastShake = Date.now();
        shuffleCards();
      }
    };
    window.addEventListener("devicemotion", handleMotion);
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [shuffleCards]);

  const handleSaveNote = async () => {
    const validTexts = noteTexts.filter((t) => t.text.trim());
    if (validTexts.length === 0 && noteStickers.length === 0) return;
    const savedTexts = validTexts.map(({ id, text, x, y, size, font }) => ({ id, text, x, y, size, font }));
    const note: FridgeMemory = {
      id: `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      image: "",
      date: new Date().toISOString(),
      x: 40 + Math.random() * 500,
      y: 40 + Math.random() * 350,
      rotate: (Math.random() - 0.5) * 12,
      fridge: preset,
      type: "note",
      noteColor,
      stickers: noteStickers.length > 0 ? noteStickers : undefined,
      noteTexts: savedTexts.length > 0 ? savedTexts : undefined,
    };
    await putMemory(note);
    setMemories((prev) => [...prev, note]);
    setNoteTexts([]);
    setNoteStickers([]);
    setShowAddNote(false);
  };

  const dateLabel = (iso: string) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${date}, ${time}`;
  };

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a" }}>
      {/* Top navbar */}
      <nav
        className="navbar-root"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 28px",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          background: "rgba(0,0,0,0.55)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          fontFamily: '"GT Walsheim Framer Regular", system-ui, sans-serif',
        }}
      >
        <Link
          href="/"
          className="navbar-brand"
          style={{
            color: "#fff",
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            textDecoration: "none",
          }}
        >
          MemoryPrint
        </Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setShowFeedback(true)}
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 13,
              padding: "7px 14px",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 999,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Feedback
          </button>
          <Link
            href="/"
            className="navbar-cta"
            style={{
              color: "rgba(255,255,255,0.78)",
              fontSize: 14,
              padding: "8px 16px",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 999,
              textDecoration: "none",
            }}
          >
            ← Back to camera
          </Link>
        </div>
      </nav>

      <section className="fridge-section" style={{ padding: "60px 24px 32px" }}>
        <div style={{ maxWidth: 1500, margin: "0 auto" }}>
          <div
            className="fridge-hero"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 36,
              marginBottom: 32,
              flexWrap: "wrap",
            }}
          >
            <ProfileCard />
            <div style={{ textAlign: "center", flex: "1 1 auto", minWidth: 200 }}>
              <h1
                className="fridge-heading"
                style={{
                  fontFamily: '"GT Walsheim Framer Regular", system-ui, sans-serif',
                  fontSize: 46,
                  fontWeight: 500,
                  letterSpacing: "-1.8px",
                  color: "#fff",
                  margin: 0,
                }}
              >
                Your Personal Fridge
              </h1>
              <p
                style={{
                  fontSize: 15,
                  color: "rgba(255,255,255,0.55)",
                  margin: "10px 0 0",
                }}
              >
                Moments worth keeping.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
                <button
                  onClick={() => setShowShowcase((p) => !p)}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 999,
                    fontSize: 12,
                    cursor: "pointer",
                    background: showShowcase ? "#fff" : "transparent",
                    color: showShowcase ? "#0a0a0a" : "rgba(255,255,255,0.65)",
                    border: showShowcase ? "1px solid #fff" : "1px solid rgba(255,255,255,0.2)",
                    transition: "all 200ms",
                  }}
                >
                  {showShowcase ? "Done selecting" : "Showcase"}
                </button>
                <button
                  onClick={shuffleCards}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 999,
                    fontSize: 12,
                    cursor: "pointer",
                    background: "transparent",
                    color: "rgba(255,255,255,0.65)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  Shuffle
                </button>
              </div>
            </div>
          </div>

          {/* Fridge style chips — built-in presets + custom user fridges + add button */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
              marginBottom: 28,
            }}
          >
            {ALL_FRIDGES.map((p, i) => {
              const isActive = preset === i;
              const customIndex = p.custom ? i - PAPER_PRESETS.length : -1;
              return (
                <span key={`${p.name}-${i}`} style={{ display: "inline-flex", alignItems: "center" }}>
                  <button
                    onClick={() => setPreset(i)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      fontSize: 13,
                      cursor: "pointer",
                      background: isActive ? "#fff" : "transparent",
                      color: isActive ? "#0a0a0a" : "rgba(255,255,255,0.75)",
                      border: isActive ? "1px solid #fff" : "1px solid rgba(255,255,255,0.18)",
                      transition: "background 200ms, color 200ms, border-color 200ms",
                    }}
                  >
                    {p.name}
                  </button>
                  {p.custom && isActive && (
                    <button
                      onClick={() => handleDeleteCustomFridge(customIndex)}
                      title="Delete this fridge"
                      style={{
                        marginLeft: 4,
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: "transparent",
                        color: "rgba(255,255,255,0.6)",
                        fontSize: 12,
                        lineHeight: 1,
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            })}

            <button
              onClick={() => setShowAddFridge(true)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                fontSize: 13,
                cursor: "pointer",
                background: "transparent",
                color: "rgba(255,255,255,0.85)",
                border: "1px dashed rgba(255,255,255,0.32)",
              }}
            >
              + Add fridge
            </button>
            <button
              onClick={() => setShowAddNote(true)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                fontSize: 13,
                cursor: "pointer",
                background: "transparent",
                color: "rgba(255,255,255,0.85)",
                border: "1px dashed rgba(255,255,255,0.32)",
              }}
            >
              + Add note
            </button>
          </div>

          {/* Memory board */}
          <PaperBackground
            {...(ALL_FRIDGES[preset]?.props ?? PAPER_PRESETS[0].props)}
            shadow
            style={{
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.18)",
              minHeight: BOARD_HEIGHT,
              position: "relative",
            }}
          >
            <div
              ref={containerRef}
              className="fridge-board"
              style={{
                position: "relative",
                width: "100%",
                height: BOARD_HEIGHT,
              }}
            >
              {visibleMemories.length === 0 && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(0,0,0,0.45)",
                    fontSize: 14,
                  }}
                >
                  Nothing on this fridge yet —{" "}
                  <Link href="/" style={{ marginLeft: 6, textDecoration: "underline", color: "rgba(0,0,0,0.65)" }}>
                    take a snapshot
                  </Link>
                  .
                </div>
              )}

              {visibleMemories.map((m) => (
                <motion.div
                  key={m.id}
                  drag
                  dragMomentum={false}
                  dragElastic={0}
                  dragConstraints={containerRef}
                  initial={{ x: m.x, y: m.y, rotate: m.rotate, opacity: 0, scale: 0.6 }}
                  animate={{ x: m.x, y: m.y, rotate: m.rotate, opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 24 }}
                  whileHover={{ zIndex: 50 }}
                  whileDrag={{ scale: 1.05, zIndex: 100, cursor: "grabbing" }}
                  onPointerDown={(e) => {
                    dragStartRef.current = { x: e.clientX, y: e.clientY };
                  }}
                  onDragEnd={(_, info) => handleDragEnd(m, info.offset.x, info.offset.y)}
                  onPointerUp={(e) => {
                    const s = dragStartRef.current;
                    if (s && Math.abs(e.clientX - s.x) < 5 && Math.abs(e.clientY - s.y) < 5) {
                      setOpen(m);
                    }
                    dragStartRef.current = null;
                  }}
                  className="fridge-card"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: CARD_W,
                    cursor: "grab",
                    userSelect: "none",
                  }}
                >
                  {m.type === "note" ? (
                    <div
                      style={{
                        background: m.noteColor || "#fff9c4",
                        borderRadius: 4,
                        boxShadow:
                          "0 8px 20px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.25)",
                        position: "relative",
                        width: CARD_W,
                        height: CARD_W,
                        overflow: "hidden",
                      }}
                    >
                      {m.noteTexts?.map((t) => (
                        <span
                          key={t.id}
                          style={{
                            position: "absolute",
                            left: `${t.x}%`,
                            top: `${t.y}%`,
                            transform: "translate(-50%, -50%)",
                            fontFamily: t.font,
                            fontSize: Math.round(t.size * 0.65),
                            color: "#333",
                            whiteSpace: "nowrap",
                            pointerEvents: "none",
                          }}
                        >
                          {t.text}
                        </span>
                      ))}
                      {m.note && !m.noteTexts && (
                        <p style={{
                          fontFamily: "var(--font-patrick-hand), 'Patrick Hand', cursive",
                          fontSize: 13, color: "#333", lineHeight: 1.5,
                          whiteSpace: "pre-wrap", wordBreak: "break-word",
                          margin: 0, padding: "12px",
                        }}>
                          {m.note}
                        </p>
                      )}
                      {m.stickers?.map((s, i) => (
                        <span
                          key={i}
                          style={{
                            position: "absolute",
                            left: `${s.x}%`,
                            top: `${s.y}%`,
                            fontSize: 18,
                            transform: "translate(-50%, -50%)",
                            pointerEvents: "none",
                          }}
                        >
                          {s.emoji}
                        </span>
                      ))}
                      <p
                        style={{
                          position: "absolute", bottom: 4, right: 6,
                          fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                          fontSize: 8, color: "rgba(0,0,0,0.2)", margin: 0,
                        }}
                      >
                        {dateLabel(m.date)}
                      </p>
                    </div>
                  ) : (
                  <div
                    style={{
                      background: "rgb(252, 251, 248)",
                      borderRadius: 4,
                      padding: "6% 6% 18% 6%",
                      boxShadow:
                        "0 12px 24px rgba(0,0,0,0.45), 0 3px 6px rgba(0,0,0,0.35)",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        background: "rgb(8,8,10)",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.image}
                        alt=""
                        draggable={false}
                        style={{
                          width: "100%",
                          display: "block",
                        }}
                      />
                    </div>
                    {m.texts?.map((t) => (
                      <span
                        key={t.id}
                        style={{
                          position: "absolute",
                          left: `${t.x}%`,
                          top: `${t.y}%`,
                          transform: "translate(-50%, -50%)",
                          fontFamily: "var(--font-patrick-hand), 'Patrick Hand', cursive",
                          fontSize: 10,
                          color: "#fff",
                          textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                          whiteSpace: "nowrap",
                          pointerEvents: "none",
                        }}
                      >
                        {t.text}
                      </span>
                    ))}
                    <p
                      style={{
                        fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                        fontSize: 14,
                        color: "#333",
                        textAlign: "center",
                        marginTop: 8,
                        marginBottom: 0,
                      }}
                    >
                      {dateLabel(m.date)}
                    </p>
                  </div>
                  )}
                </motion.div>
              ))}
            </div>
          </PaperBackground>
          {/* Showcase toggle + Shuffle buttons moved below showcase grid */}

          {/* Showcase selection grid */}
          <AnimatePresence>
            {showShowcase && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: "hidden", marginTop: 16 }}
              >
                <p
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                    textAlign: "center",
                    marginBottom: 12,
                  }}
                >
                  Tap photos to add/remove from camera background ring
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 14,
                    marginBottom: 16,
                  }}
                >
                  {memories.map((m) => {
                    const selected = showcaseIds.has(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setShowcaseIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(m.id)) next.delete(m.id);
                            else next.add(m.id);
                            localStorage.setItem(
                              "ring_showcase_ids",
                              JSON.stringify([...next])
                            );
                            return next;
                          });
                        }}
                        style={{
                          cursor: "pointer",
                          position: "relative",
                          opacity: selected ? 1 : 0.5,
                          transition: "all 200ms",
                          transform: selected ? "scale(1.03)" : "scale(1)",
                        }}
                      >
                        <div
                          style={{
                            background: "rgb(252, 251, 248)",
                            borderRadius: 4,
                            padding: "6% 6% 18% 6%",
                            boxShadow: selected
                              ? "0 0 0 3px #fff, 0 8px 20px rgba(0,0,0,0.4)"
                              : "0 6px 16px rgba(0,0,0,0.3)",
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              background: "rgb(8,8,10)",
                              borderRadius: 2,
                              overflow: "hidden",
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {m.image && <img
                              src={m.image}
                              alt=""
                              style={{
                                width: "100%",
                                display: "block",
                              }}
                            />}
                          </div>
                          <p
                            style={{
                              fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                              fontSize: 11,
                              color: "#333",
                              textAlign: "center",
                              marginTop: 6,
                              marginBottom: 0,
                            }}
                          >
                            {dateLabel(m.date)}
                          </p>
                        </div>
                        {selected && (
                          <div
                            style={{
                              position: "absolute",
                              top: -6,
                              right: -6,
                              width: 24,
                              height: 24,
                              borderRadius: 999,
                              background: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 13,
                              color: "#0a0a0a",
                              fontWeight: 700,
                              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                            }}
                          >
                            ✓
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {memories.length === 0 && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.4)",
                      textAlign: "center",
                      padding: "20px 0",
                    }}
                  >
                    No photos yet — take some snapshots first!
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  {showcaseIds.size > 0 && (
                    <button
                      onClick={() => {
                        setShowcaseIds(new Set());
                        localStorage.removeItem("ring_showcase_ids");
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 999,
                        fontSize: 12,
                        cursor: "pointer",
                        background: "transparent",
                        color: "rgba(255,255,255,0.6)",
                        border: "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      Reset to defaults
                    </button>
                  )}
                  <p
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.4)",
                      alignSelf: "center",
                    }}
                  >
                    {showcaseIds.size} selected
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.78)",
              backdropFilter: "blur(4px)",
              zIndex: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <motion.div
              className="fridge-modal-inner"
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: open.type === "note" ? (open.noteColor || "#fff9c4") : "rgb(252, 251, 248)",
                borderRadius: 6,
                padding: open.type === "note" ? "24px 20px 16px" : "3% 3% 10% 3%",
                width: open.type === "note" ? "min(440px, 90vw)" : "min(380px, 85vw)",
                boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
                position: "relative",
              }}
            >
              {open.type === "note" ? (
                <div style={{ position: "relative", width: "100%", aspectRatio: "1", overflow: "hidden" }}>
                  {open.noteTexts?.map((t) => (
                    <span
                      key={t.id}
                      style={{
                        position: "absolute",
                        left: `${t.x}%`,
                        top: `${t.y}%`,
                        transform: "translate(-50%, -50%)",
                        fontFamily: t.font,
                        fontSize: t.size,
                        color: "#333",
                        whiteSpace: "nowrap",
                        pointerEvents: "none",
                      }}
                    >
                      {t.text}
                    </span>
                  ))}
                  {open.note && !open.noteTexts && (
                    <p style={{
                      fontFamily: "var(--font-patrick-hand), 'Patrick Hand', cursive",
                      fontSize: 22, color: "#333", lineHeight: 1.6,
                      whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0,
                    }}>
                      {open.note}
                    </p>
                  )}
                  {open.stickers?.map((s, i) => (
                    <span
                      key={i}
                      style={{
                        position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
                        fontSize: 32, transform: "translate(-50%, -50%)", pointerEvents: "none",
                      }}
                    >
                      {s.emoji}
                    </span>
                  ))}
                  <p style={{
                    position: "absolute", bottom: 8, right: 10,
                    fontFamily: "var(--font-patrick-hand)", fontSize: 13,
                    color: "rgba(0,0,0,0.25)", margin: 0,
                  }}>
                    {dateLabel(open.date)}
                  </p>
                </div>
              ) : (
                <>
              <div
                style={{
                  width: "100%",
                  background: "rgb(8,8,10)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={open.image}
                  alt=""
                  style={{ width: "100%", maxHeight: "35vh", objectFit: "contain", display: "block", margin: "0 auto" }}
                />
              </div>
              {open.texts?.map((t) => (
                <span
                  key={t.id}
                  style={{
                    position: "absolute",
                    left: `${t.x}%`,
                    top: `${t.y}%`,
                    transform: "translate(-50%, -50%)",
                    fontFamily: "var(--font-patrick-hand), 'Patrick Hand', cursive",
                    fontSize: 18,
                    color: "#fff",
                    textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                  }}
                >
                  {t.text}
                </span>
              ))}
              <p
                style={{
                  fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                  fontSize: 22,
                  color: "#333",
                  textAlign: "center",
                  marginTop: 18,
                  marginBottom: 16,
                }}
              >
                {dateLabel(open.date)}
              </p>
                </>
              )}

              {/* Move to fridge picker */}
              <div style={{ marginBottom: 16, textAlign: "center" }}>
                <p
                  style={{
                    fontSize: 11,
                    color: "rgba(0,0,0,0.55)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}
                >
                  Move to fridge
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    justifyContent: "center",
                  }}
                >
                  {ALL_FRIDGES.map((p, i) => {
                    const isCurrent = (open.fridge ?? 0) === i;
                    return (
                      <button
                        key={`${p.name}-${i}`}
                        onClick={() => handleMoveToFridge(open, i)}
                        disabled={isCurrent}
                        style={{
                          padding: "5px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          cursor: isCurrent ? "default" : "pointer",
                          background: isCurrent ? "#0a0a0a" : "transparent",
                          color: isCurrent ? "#fff" : "rgba(0,0,0,0.7)",
                          border: isCurrent
                            ? "1px solid #0a0a0a"
                            : "1px solid rgba(0,0,0,0.18)",
                          opacity: isCurrent ? 1 : 0.85,
                          transition: "background 150ms, color 150ms, border-color 150ms",
                        }}
                      >
                        {isCurrent ? `✓ ${p.name}` : p.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  onClick={() => handleDelete(open.id)}
                  style={{
                    border: "1px solid rgba(0,0,0,0.15)",
                    background: "transparent",
                    color: "#a33",
                    padding: "8px 16px",
                    borderRadius: 999,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Remove memory
                </button>
                <button
                  onClick={() => setOpen(null)}
                  style={{
                    border: "1px solid rgba(0,0,0,0.15)",
                    background: "#0a0a0a",
                    color: "#fff",
                    padding: "8px 18px",
                    borderRadius: 999,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Add Fridge modal */}
      <AnimatePresence>
        {showAddFridge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowAddFridge(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(6px)",
              zIndex: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <motion.div
              className="fridge-modal-inner"
              initial={{ scale: 0.92, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 10 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(440px, 95vw)",
                background: "#111",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                padding: 24,
                color: "#fff",
                fontFamily: '"GT Walsheim Framer Regular", system-ui, sans-serif',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Add a new fridge</h3>
              <p style={{ margin: "4px 0 18px", fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                Name it, pick a paper style.
              </p>

              <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>
                Name
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`My Fridge ${customFridges.length + 1}`}
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "#0a0a0a",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                  marginBottom: 16,
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddFridge();
                }}
              />

              <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>
                Style
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 22 }}>
                {STYLE_TEMPLATES.map((t, i) => (
                  <button
                    key={t.label}
                    onClick={() => setNewStyle(i)}
                    style={{
                      padding: 0,
                      borderRadius: 10,
                      border: newStyle === i ? "2px solid #fff" : "1px solid rgba(255,255,255,0.14)",
                      cursor: "pointer",
                      overflow: "hidden",
                      height: 56,
                      background: "transparent",
                    }}
                  >
                    <PaperBackground
                      {...t.preset}
                      style={{ width: "100%", height: "100%" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          height: "100%",
                          paddingBottom: 4,
                          fontSize: 10,
                          color: "rgba(0,0,0,0.7)",
                          fontWeight: 600,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {t.label}
                      </div>
                    </PaperBackground>
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowAddFridge(false)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 999,
                    fontSize: 13,
                    background: "transparent",
                    color: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFridge}
                  style={{
                    padding: "9px 20px",
                    borderRadius: 999,
                    fontSize: 13,
                    background: "#fff",
                    color: "#0a0a0a",
                    border: "1px solid #fff",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Create fridge
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <FeedbackModal open={showFeedback} onClose={() => setShowFeedback(false)} />

      {/* Add Note Modal */}
      <AnimatePresence>
        {showAddNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddNote(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 380,
                background: "#141414",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "24px 22px",
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                  fontSize: 22,
                  color: "#fff",
                  textAlign: "center",
                  margin: "0 0 18px",
                }}
              >
                Stick a note 📌
              </h3>

              {/* Color + Font + Size row */}
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
                {[
                  { color: "#fff9c4", label: "Yellow" },
                  { color: "#f8bbd0", label: "Pink" },
                  { color: "#c8e6c9", label: "Green" },
                  { color: "#bbdefb", label: "Blue" },
                  { color: "#ffe0b2", label: "Orange" },
                  { color: "#e1bee7", label: "Purple" },
                  { color: "#ffffff", label: "White" },
                ].map((c) => (
                  <button
                    key={c.color}
                    onClick={() => setNoteColor(c.color)}
                    title={c.label}
                    style={{
                      width: 24, height: 24, borderRadius: "50%", background: c.color,
                      border: noteColor === c.color ? "2.5px solid #fff" : "2px solid rgba(255,255,255,0.15)",
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                  />
                ))}
              </div>

              {/* Font picker */}
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                {[
                  { label: "Hand", value: "'Patrick Hand', cursive" },
                  { label: "Sans", value: "system-ui, sans-serif" },
                  { label: "Serif", value: "Georgia, serif" },
                  { label: "Mono", value: "'Courier New', monospace" },
                  { label: "Comic", value: "'Comic Sans MS', cursive" },
                ].map((f) => (
                  <button
                    key={f.label}
                    onClick={() => setActiveFont(f.value)}
                    style={{
                      padding: "4px 10px", borderRadius: 8, fontSize: 11,
                      fontFamily: f.value, color: activeFont === f.value ? "#fff" : "rgba(255,255,255,0.4)",
                      border: activeFont === f.value ? "1.5px solid rgba(255,255,255,0.5)" : "1px solid rgba(255,255,255,0.1)",
                      background: activeFont === f.value ? "rgba(255,255,255,0.1)" : "transparent",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Size picker */}
              <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-patrick-hand)" }}>Size</span>
                {[12, 16, 20, 26, 34].map((s) => (
                  <button
                    key={s}
                    onClick={() => setActiveSize(s)}
                    style={{
                      padding: "3px 8px", borderRadius: 6, fontSize: 11,
                      color: activeSize === s ? "#fff" : "rgba(255,255,255,0.4)",
                      border: activeSize === s ? "1.5px solid rgba(255,255,255,0.5)" : "1px solid rgba(255,255,255,0.1)",
                      background: activeSize === s ? "rgba(255,255,255,0.1)" : "transparent",
                      cursor: "pointer", transition: "all 0.15s",
                      fontFamily: "var(--font-patrick-hand)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Note canvas — tap to add text */}
              <div
                ref={noteRef}
                style={{
                  background: noteColor,
                  borderRadius: 4,
                  width: "100%",
                  aspectRatio: "1",
                  position: "relative",
                  marginBottom: 14,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  overflow: "hidden",
                }}
                onClick={(e) => {
                  if (noteTexts.some((t) => t.editing)) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  setNoteTexts((prev) => [
                    ...prev,
                    { id: Date.now(), text: "", x, y, size: activeSize, font: activeFont, editing: true },
                  ]);
                }}
              >
                {noteTexts.length === 0 && noteStickers.length === 0 && (
                  <p style={{
                    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-patrick-hand)", fontSize: 14, color: "rgba(0,0,0,0.2)", pointerEvents: "none",
                  }}>
                    Tap anywhere to write
                  </p>
                )}

                {/* Draggable text blocks */}
                {noteTexts.map((t) => (
                  <motion.div
                    key={t.id}
                    drag={!t.editing}
                    dragMomentum={false}
                    dragElastic={0}
                    dragConstraints={noteRef}
                    onDragEnd={(_, info) => {
                      if (!noteRef.current) return;
                      const rect = noteRef.current.getBoundingClientRect();
                      const dx = (info.offset.x / rect.width) * 100;
                      const dy = (info.offset.y / rect.height) * 100;
                      setNoteTexts((prev) =>
                        prev.map((p) => p.id === t.id ? { ...p, x: Math.max(2, Math.min(98, p.x + dx)), y: Math.max(2, Math.min(98, p.y + dy)) } : p)
                      );
                    }}
                    style={{
                      position: "absolute",
                      left: `${t.x}%`,
                      top: `${t.y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 5,
                      cursor: t.editing ? "text" : "grab",
                    }}
                    whileDrag={{ scale: 1.08, cursor: "grabbing" }}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    {t.editing ? (
                      <input
                        autoFocus
                        value={t.text}
                        onChange={(e) =>
                          setNoteTexts((prev) => prev.map((p) => p.id === t.id ? { ...p, text: e.target.value } : p))
                        }
                        onBlur={() => {
                          setTimeout(() => {
                            setNoteTexts((prev) =>
                              prev.map((p) => p.id === t.id ? { ...p, editing: false } : p).filter((p) => p.text.trim() !== "")
                            );
                          }, 100);
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                        placeholder="type..."
                        style={{
                          fontFamily: t.font, fontSize: t.size, color: "#333",
                          background: "rgba(255,255,255,0.5)", border: "none",
                          borderBottom: "1.5px dashed rgba(0,0,0,0.3)", outline: "none",
                          textAlign: "center", minWidth: 60, padding: "2px 6px", borderRadius: 3,
                        }}
                      />
                    ) : (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setNoteTexts((prev) => prev.map((p) => p.id === t.id ? { ...p, editing: true } : p));
                        }}
                        style={{
                          fontFamily: t.font, fontSize: t.size, color: "#333",
                          cursor: "grab", whiteSpace: "nowrap", userSelect: "none",
                        }}
                      >
                        {t.text}
                      </span>
                    )}
                  </motion.div>
                ))}

                {/* Draggable stickers */}
                {noteStickers.map((s, i) => (
                  <motion.span
                    key={`sticker-${i}`}
                    drag
                    dragMomentum={false}
                    dragElastic={0}
                    dragConstraints={noteRef}
                    onDragEnd={(_, info) => {
                      if (!noteRef.current) return;
                      const rect = noteRef.current.getBoundingClientRect();
                      const newX = s.x + (info.offset.x / rect.width) * 100;
                      const newY = s.y + (info.offset.y / rect.height) * 100;
                      setNoteStickers((prev) =>
                        prev.map((st, j) => j === i ? { ...st, x: Math.max(5, Math.min(95, newX)), y: Math.max(5, Math.min(95, newY)) } : st)
                      );
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setNoteStickers((prev) => prev.filter((_, j) => j !== i));
                    }}
                    style={{
                      position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
                      fontSize: 24, transform: "translate(-50%, -50%)",
                      cursor: "grab", zIndex: 4, userSelect: "none",
                    }}
                    whileDrag={{ scale: 1.3, cursor: "grabbing" }}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    {s.emoji}
                  </motion.span>
                ))}
              </div>

              {/* Sticker picker */}
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
                {["❤️", "⭐", "🔥", "✅", "❌", "⚠️", "📌", "💡", "🎯", "🏆", "😊", "👍", "🎉", "💌", "🌈", "☕"].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setNoteStickers((prev) => [
                        ...prev,
                        { emoji, x: 15 + Math.random() * 70, y: 15 + Math.random() * 70 },
                      ]);
                    }}
                    style={{
                      fontSize: 18, background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
                      padding: "3px 5px", cursor: "pointer",
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => {
                    setShowAddNote(false);
                    setNoteTexts([]);
                    setNoteStickers([]);
                  }}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.15)", background: "transparent",
                    color: "rgba(255,255,255,0.6)", fontSize: 14, cursor: "pointer",
                    fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 999,
                    border: "none",
                    background: "#fff",
                    color: "#0a0a0a",
                    fontSize: 14,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                    boxShadow: "rgb(80,80,80) 0px 3px 0px 0px",
                  }}
                >
                  Stick it! 📋
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
