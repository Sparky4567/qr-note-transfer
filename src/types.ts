export interface TransferPackage {
  type: "obsidian-note-transfer";
  version: 1;
  createdAt: string;
  source: "obsidian";
  note: { path: string; basename: string; extension: "md"; content: string };
}

export interface ParsedPayload {
  transferId: string;
  partIndex: number;
  totalParts: number;
  sha256: string;
  data: string;
  raw: string;
}

export interface TransferChunk extends ParsedPayload {}

export type QRErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export interface PluginSettings {
  chunkSize: number;
  qrSize: number;
  autoPlayIntervalMs: number;
  preserveOriginalPath: boolean;
  defaultImportFolder: string;
  qrErrorCorrectionLevel: QRErrorCorrectionLevel;
}
