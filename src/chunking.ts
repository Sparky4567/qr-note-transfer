import type { ParsedPayload } from "./types";

export function splitIntoChunks(data: string, chunkSize: number): string[] {
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) throw new Error("Chunk size must be a positive integer.");
  const chunks: string[] = [];
  for (let i = 0; i < data.length; i += chunkSize) chunks.push(data.slice(i, i + chunkSize));
  return chunks.length ? chunks : [""];
}

export function createPayloads(encodedData: string, transferId: string, hash: string, chunkSize: number): string[] {
  const chunks = splitIntoChunks(encodedData, chunkSize);
  return chunks.map((data, index) => `OBQR1:${transferId}:${index}:${chunks.length}:${hash}:${data}`);
}

export function parsePayload(payload: string): ParsedPayload | null {
  const raw = payload.trim();
  const match = /^OBQR1:([^:]+):(\d+):(\d+):([a-fA-F0-9]{64}):([A-Za-z0-9_-]*)$/.exec(raw);
  if (!match) return null;
  const partIndex = Number(match[2]);
  const totalParts = Number(match[3]);
  if (!Number.isSafeInteger(partIndex) || !Number.isSafeInteger(totalParts) || totalParts < 1 || partIndex < 0 || partIndex >= totalParts) return null;
  return { transferId: match[1], partIndex, totalParts, sha256: match[4].toLowerCase(), data: match[5], raw };
}

export function reassemblePayloads(payloads: ParsedPayload[]): string {
  if (!payloads.length) throw new Error("No QR payloads were supplied.");
  const first = payloads[0];
  const parts = new Map<number, ParsedPayload>();
  for (const part of payloads) {
    if (part.transferId !== first.transferId || part.totalParts !== first.totalParts || part.sha256 !== first.sha256) {
      throw new Error("Payloads do not belong to the same transfer.");
    }
    const existing = parts.get(part.partIndex);
    if (existing && existing.data !== part.data) throw new Error(`Conflicting data for chunk ${part.partIndex + 1}.`);
    parts.set(part.partIndex, part);
  }
  if (parts.size !== first.totalParts) throw new Error(`Missing chunks: received ${parts.size} of ${first.totalParts}.`);
  return Array.from({ length: first.totalParts }, (_, i) => parts.get(i)?.data ?? "").join("");
}
