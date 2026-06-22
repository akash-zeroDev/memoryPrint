"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MOOD_OPTIONS = [
  { emoji: "🤩", label: "Love it!", value: "love" },
  { emoji: "😊", label: "Pretty good", value: "good" },
  { emoji: "😐", label: "Meh", value: "meh" },
  { emoji: "😕", label: "Needs work", value: "needs_work" },
];

const CATEGORY_TAGS = [
  "Camera", "Fridge", "Photo Strip", "Design", "Speed",
  "New Feature Idea", "Bug Report", "Other",
];

export default function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mood, setMood] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [shakeBtn, setShakeBtn] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const reset = () => {
    setMood(null);
    setSelectedTags(new Set());
    setMessage("");
    setSubmitted(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (!mood && !message.trim()) {
      setShakeBtn(true);
      setTimeout(() => setShakeBtn(false), 600);
      return;
    }

    const entry = {
      mood: MOOD_OPTIONS.find((m) => m.value === mood)?.label ?? "—",
      tags: [...selectedTags],
      message: message.trim(),
      date: new Date().toISOString(),
    };
    try {
      const prev = JSON.parse(localStorage.getItem("memoryprint_feedback") ?? "[]");
      prev.push(entry);
      localStorage.setItem("memoryprint_feedback", JSON.stringify(prev));
    } catch {}

    setSubmitted(true);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
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
              maxWidth: 420,
              maxHeight: "85vh",
              overflowY: "auto",
              background: "#141414",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "24px 22px",
              position: "relative",
            }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                background: "rgba(255,255,255,0.08)",
                border: "none",
                borderRadius: "50%",
                width: 30,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "rgba(255,255,255,0.5)",
                fontSize: 16,
              }}
            >
              ✕
            </button>

            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="thanks"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", bounce: 0.4 }}
                  style={{ textAlign: "center", padding: "20px 0" }}
                >
                  <div style={{ fontSize: 48, marginBottom: 12 }}>💌</div>
                  <h2
                    style={{
                      fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                      fontSize: 26,
                      color: "#fff",
                      marginBottom: 6,
                    }}
                  >
                    You're the best!
                  </h2>
                  <p
                    style={{
                      fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                      fontSize: 15,
                      color: "rgba(255,255,255,0.45)",
                      lineHeight: 1.6,
                      margin: "0 0 20px",
                    }}
                  >
                    Your words shape what comes next. Thank you!
                  </p>
                  <button
                    onClick={handleClose}
                    style={{
                      padding: "10px 24px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "transparent",
                      color: "rgba(255,255,255,0.7)",
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                    }}
                  >
                    Close
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Header */}
                  <div style={{ textAlign: "center", marginBottom: 22 }}>
                    <motion.div
                      style={{ fontSize: 32, marginBottom: 4 }}
                      animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                    >
                      📮
                    </motion.div>
                    <h2
                      style={{
                        fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                        fontSize: 24,
                        color: "#fff",
                        margin: "0 0 4px",
                      }}
                    >
                      Spill the tea
                    </h2>
                    <p
                      style={{
                        fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                        fontSize: 14,
                        color: "rgba(255,255,255,0.35)",
                        margin: 0,
                      }}
                    >
                      Be brutally honest — we can take it 💪
                    </p>
                  </div>

                  {/* Mood */}
                  <p style={{
                    fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                    fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 8,
                  }}>
                    How's your vibe?
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                    {MOOD_OPTIONS.map((m) => (
                      <motion.button
                        key={m.value}
                        onClick={() => setMood(m.value)}
                        whileTap={{ scale: 0.9 }}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                          padding: "8px 12px", borderRadius: 12,
                          border: mood === m.value ? "1.5px solid rgba(255,255,255,0.45)" : "1px solid rgba(255,255,255,0.1)",
                          background: mood === m.value ? "rgba(255,255,255,0.08)" : "transparent",
                          cursor: "pointer", transition: "all 0.2s",
                        }}
                      >
                        <span style={{ fontSize: 22 }}>{m.emoji}</span>
                        <span style={{
                          fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                          fontSize: 11, color: mood === m.value ? "#fff" : "rgba(255,255,255,0.35)",
                        }}>
                          {m.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>

                  {/* Tags */}
                  <p style={{
                    fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                    fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 8,
                  }}>
                    What's this about?
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
                    {CATEGORY_TAGS.map((tag) => {
                      const active = selectedTags.has(tag);
                      return (
                        <motion.button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          whileTap={{ scale: 0.92 }}
                          style={{
                            padding: "5px 12px", borderRadius: 999, fontSize: 12,
                            fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                            border: active ? "1.5px solid rgba(255,255,255,0.45)" : "1px solid rgba(255,255,255,0.1)",
                            background: active ? "rgba(255,255,255,0.08)" : "transparent",
                            color: active ? "#fff" : "rgba(255,255,255,0.4)",
                            cursor: "pointer", transition: "all 0.2s",
                          }}
                        >
                          {tag}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Message */}
                  <p style={{
                    fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                    fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 8,
                  }}>
                    Drop your thoughts ✍️
                  </p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="I wish... / I love... / Please add..."
                    rows={3}
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 13,
                      fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                      resize: "none", outline: "none", lineHeight: 1.6, boxSizing: "border-box",
                      marginBottom: 18,
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                  />

                  {/* Submit */}
                  <motion.button
                    onClick={handleSubmit}
                    whileTap={{ scale: 0.96 }}
                    animate={shakeBtn ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
                    transition={shakeBtn ? { duration: 0.5 } : {}}
                    style={{
                      width: "100%", padding: "12px", borderRadius: 999,
                      border: "none", background: "#fff", color: "#0a0a0a",
                      fontSize: 15,
                      fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                      fontWeight: 600, cursor: "pointer",
                      boxShadow: "rgb(80,80,80) 0px 3px 0px 0px, rgba(0,0,0,0.3) 0px 4px 10px 0px",
                    }}
                  >
                    Send it! 🚀
                  </motion.button>

                  <p style={{
                    textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 12,
                    fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                  }}>
                    100% anonymous — pinky promise 🤙
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
