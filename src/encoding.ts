import { gzip, ungzip } from "pako";
import type { TransferPackage } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function createTransferPackage(path: string, content: string): TransferPackage {
  const filename = path.split("/").pop() ?? "Imported note.md";
  return {
    type: "obsidian-note-transfer",
    version: 1,
    createdAt: new Date().toISOString(),
    source: "obsidian",
    note: {
      path,
      basename: filename.replace(/\.md$/i, ""),
      extension: "md",
      content
    }
  };
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  const block = 0x8000;
  for (let i = 0; i < bytes.length; i += block) {
    binary += String.fromCharCode(...bytes.subarray(i, i + block));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlDecode(input: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(input)) throw new Error("Encoded data is not valid Base64URL.");
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - input.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

export async function encodePackage(pkg: TransferPackage): Promise<string> {
  return base64UrlEncode(gzip(encoder.encode(JSON.stringify(pkg))));
}

export async function sha256(input: string | Uint8Array): Promise<string> {
  const bytes = typeof input === "string" ? encoder.encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function decodePackage(encoded: string): Promise<TransferPackage> {
  let value: unknown;
  try {
    value = JSON.parse(decoder.decode(ungzip(base64UrlDecode(encoded))));
  } catch (error) {
    throw new Error(`Decompression or JSON parsing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isTransferPackage(value)) throw new Error("Decoded data is not a valid QR Note Transfer package.");
  return value;
}

function isTransferPackage(value: unknown): value is TransferPackage {
  if (!value || typeof value !== "object") return false;
  const pkg = value as Partial<TransferPackage>;
  return pkg.type === "obsidian-note-transfer" && pkg.version === 1 && pkg.source === "obsidian" &&
    !!pkg.note && typeof pkg.note.content === "string" && typeof pkg.note.path === "string" &&
    pkg.note.path.toLowerCase().endsWith(".md") && pkg.note.extension === "md";
}

// TODO: Add optional password-based authenticated encryption in a future protocol version.
