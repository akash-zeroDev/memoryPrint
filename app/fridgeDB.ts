"use client";

export type CardText = {
  id: number;
  x: number; // % from left
  y: number; // % from top
  text: string;
};

export type FridgeMemory = {
  id: string;
  image: string; // data URL
  date: string; // ISO
  caption?: string;
  x: number; // px from container left
  y: number; // px from container top
  rotate: number; // degrees
  fridge: number; // 0..6 — which paper preset this memory lives on
  texts?: CardText[];
  type?: "photo" | "note";
  note?: string;
  noteColor?: string;
  stickers?: Array<{ emoji: string; x: number; y: number }>;
  noteTexts?: Array<{ id: number; text: string; x: number; y: number; size: number; font: string }>;
};

const DB_NAME = "oh_snap_fridge";
const STORE = "memories";
const VERSION = 1;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listMemories(): Promise<FridgeMemory[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as FridgeMemory[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function putMemory(memory: FridgeMemory): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(memory);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteMemory(id: string): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
