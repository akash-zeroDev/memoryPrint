"use client";

import { useState, useEffect, useRef } from "react";

const LS_KEY = "memoryprint_profile";

type Profile = {
  name: string;
  bio: string;
  avatar: string | null;
};

const DEFAULT: Profile = { name: "", bio: "", avatar: null };

export default function ProfileCard() {
  const [flipped, setFlipped] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT);
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setProfile(JSON.parse(raw));
    } catch {}
  }, []);

  const save = (next: Profile) => {
    setProfile(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => save({ ...profile, avatar: reader.result as string });
    reader.readAsDataURL(file);
  };

  const flip = () => {
    if (!editing) setFlipped((p) => !p);
  };

  return (
    <div
      style={{
        perspective: 800,
        width: 220,
        height: 290,
        cursor: editing ? "default" : "pointer",
        flexShrink: 0,
      }}
      onClick={flip}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ---- FRONT ---- */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            background: "rgb(252, 251, 248)",
            borderRadius: 6,
            padding: "6% 6% 14% 6%",
            boxShadow:
              "0 8px 28px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.25)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Avatar area */}
          <div
            style={{
              width: "100%",
              aspectRatio: "1",
              background: profile.avatar
                ? `url(${profile.avatar}) center/cover`
                : "linear-gradient(135deg, #e0d5c7 0%, #c4b8a6 100%)",
              borderRadius: 3,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {!profile.avatar && (
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(0,0,0,0.25)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>

          {/* Name */}
          <p
            style={{
              fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
              fontSize: 16,
              color: "#333",
              textAlign: "center",
              marginTop: 10,
              marginBottom: 0,
              lineHeight: 1.2,
            }}
          >
            {profile.name || "Your Name"}
          </p>
          <p
            style={{
              fontSize: 10,
              color: "rgba(0,0,0,0.35)",
              textAlign: "center",
              marginTop: 4,
            }}
          >
            tap to flip
          </p>
        </div>

        {/* ---- BACK ---- */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "rgb(252, 251, 248)",
            borderRadius: 6,
            padding: "16px 14px",
            boxShadow:
              "0 8px 28px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.25)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
          onClick={(e) => {
            if (editing) {
              e.stopPropagation();
            }
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
              fontSize: 15,
              color: "#333",
              margin: "0 0 10px",
              textAlign: "center",
            }}
          >
            About Me
          </p>

          {editing ? (
            <>
              {/* Avatar upload */}
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px dashed rgba(0,0,0,0.2)",
                  background: "transparent",
                  color: "rgba(0,0,0,0.55)",
                  fontSize: 11,
                  cursor: "pointer",
                  marginBottom: 8,
                }}
              >
                {profile.avatar ? "Change photo" : "Upload photo"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleAvatarChange}
              />

              <input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Your name"
                style={{
                  width: "100%",
                  padding: "7px 8px",
                  borderRadius: 6,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "#fff",
                  fontSize: 13,
                  marginBottom: 6,
                  outline: "none",
                  fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                  color: "#333",
                }}
              />

              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Write something about yourself..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "7px 8px",
                  borderRadius: 6,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "#fff",
                  fontSize: 12,
                  resize: "none",
                  outline: "none",
                  flex: 1,
                  fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                  color: "#444",
                  lineHeight: 1.5,
                }}
              />

              <button
                onClick={() => {
                  save(profile);
                  setEditing(false);
                }}
                style={{
                  marginTop: 8,
                  padding: "7px 14px",
                  borderRadius: 999,
                  border: "none",
                  background: "#0a0a0a",
                  color: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Save
              </button>
            </>
          ) : (
            <>
              <p
                style={{
                  fontFamily: "var(--font-patrick-hand), 'Patrick Hand', sans-serif",
                  fontSize: 13,
                  color: "#555",
                  lineHeight: 1.6,
                  flex: 1,
                  overflowY: "auto",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {profile.bio || "No bio yet — tap edit to add one!"}
              </p>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(true);
                }}
                style={{
                  marginTop: 10,
                  padding: "7px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(0,0,0,0.15)",
                  background: "transparent",
                  color: "#333",
                  fontSize: 12,
                  cursor: "pointer",
                  alignSelf: "center",
                }}
              >
                Edit profile
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
