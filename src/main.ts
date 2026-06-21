import { Notice, Plugin, normalizePath } from "obsidian";
import { createTransferPackage, encodePackage, sha256 } from "./encoding";
import { createPayloads } from "./chunking";
import { ExportModal } from "./exportModal";
import { ImportModal } from "./importModal";
import { DEFAULT_SETTINGS, QRNoteTransferSettingTab } from "./settings";
import type { PluginSettings } from "./types";

export default class QRNoteTransferPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addCommand({ id: "export-active-note-as-qr-pack", name: "Export active note as QR Pack", callback: () => void this.exportActiveNote() });
    this.addCommand({ id: "import-note-from-qr-pack", name: "Import note from QR Pack", callback: () => new ImportModal(this).open() });
    this.addCommand({ id: "import-qr-pack-from-pasted-payloads", name: "Import QR Pack from pasted payloads", callback: () => new ImportModal(this, true).open() });
    this.addSettingTab(new QRNoteTransferSettingTab(this));
  }

  private async exportActiveNote(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file) return void new Notice("No active file.");
    if (file.extension.toLowerCase() !== "md") return void new Notice("The active file is not a Markdown note.");
    try {
      const content = await this.app.vault.read(file);
      if (!content.length) return void new Notice("The active note is empty.");
      const encoded = await encodePackage(createTransferPackage(file.path, content));
      const hash = await sha256(encoded);
      const transferId = crypto.randomUUID();
      new ExportModal(this, file.path, createPayloads(encoded, transferId, hash, this.settings.chunkSize)).open();
    } catch (error) {
      new Notice(`QR export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getSafeImportPath(originalPath: string): Promise<string> {
    const safeOriginal = this.sanitizePath(originalPath);
    const filename = safeOriginal.split("/").pop() ?? "Imported note.md";
    const fallbackFolder = this.sanitizeFolder(this.settings.defaultImportFolder);
    const preferred = this.settings.preserveOriginalPath ? safeOriginal : normalizePath([fallbackFolder, filename].filter(Boolean).join("/"));
    if (!this.app.vault.getAbstractFileByPath(preferred)) return preferred;
    const slash = preferred.lastIndexOf("/");
    const folder = slash >= 0 ? preferred.slice(0, slash + 1) : "";
    const basename = filename.replace(/\.md$/i, "");
    for (let number = 1; ; number++) {
      const suffix = number === 1 ? " QR Import" : ` QR Import ${number}`;
      const candidate = `${folder}${basename}${suffix}.md`;
      if (!this.app.vault.getAbstractFileByPath(candidate)) return candidate;
    }
  }

  async ensureParentFolder(path: string): Promise<void> {
    const segments = path.split("/").slice(0, -1);
    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      if (!this.app.vault.getAbstractFileByPath(current)) await this.app.vault.createFolder(current);
    }
  }

  private sanitizePath(path: string): string {
    const normalized = normalizePath(path.replace(/\\/g, "/").replace(/^\/+/, ""));
    const parts = normalized.split("/").filter(part => part && part !== "." && part !== "..");
    if (!parts.length) return "Imported note.md";
    let filename = parts.pop()!.replace(/[\0:*?"<>|]/g, "_");
    if (!filename.toLowerCase().endsWith(".md")) filename += ".md";
    const folders = parts.map(part => part.replace(/[\0:*?"<>|]/g, "_")).filter(Boolean);
    return normalizePath([...folders, filename].join("/"));
  }

  private sanitizeFolder(path: string): string {
    return path.replace(/\\/g, "/").split("/").filter(part => part && part !== "." && part !== "..")
      .map(part => part.replace(/[\0:*?"<>|]/g, "_")).join("/");
  }

  async loadSettings(): Promise<void> { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<PluginSettings> | null); }
  async saveSettings(): Promise<void> { await this.saveData(this.settings); }
}
