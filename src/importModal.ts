import { Modal, Notice } from "obsidian";
import type QRNoteTransferPlugin from "./main";
import { parsePayload, reassemblePayloads } from "./chunking";
import { decodePackage, sha256 } from "./encoding";
import type { ParsedPayload } from "./types";
import { WebcamScanner } from "./scanner";

export class ImportModal extends Modal {
  private scanner = new WebcamScanner();
  private chunks = new Map<number, ParsedPayload>();
  private transferId: string | null = null;
  private expectedTotal = 0;
  private expectedHash = "";
  private status!: HTMLElement;
  private received!: HTMLElement;
  private errorEl!: HTMLElement;
  private finalizeButton!: HTMLButtonElement;
  private video!: HTMLVideoElement;
  private textarea!: HTMLTextAreaElement;
  private busy = false;

  constructor(plugin: QRNoteTransferPlugin, private manualOnly = false) { super(plugin.app); this.plugin = plugin; }
  private plugin: QRNoteTransferPlugin;

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("obqr-import-modal");
    contentEl.createEl("h2", { text: this.manualOnly ? "Import QR Pack from pasted payloads" : "Import note from QR Pack" });
    this.status = contentEl.createDiv({ cls: "obqr-status" });
    this.received = contentEl.createDiv({ cls: "obqr-received" });
    this.errorEl = contentEl.createDiv({ cls: "obqr-error" });

    if (!this.manualOnly) {
      this.video = contentEl.createEl("video", { cls: "obqr-video", attr: { playsinline: "", muted: "" } });
      const cameraActions = contentEl.createDiv({ cls: "obqr-buttons" });
      const start = cameraActions.createEl("button", { text: "Start camera scanner", cls: "mod-cta" });
      const stop = cameraActions.createEl("button", { text: "Stop scanner" });
      start.onclick = () => void this.startCamera();
      stop.onclick = () => this.scanner.stop();
    }

    contentEl.createEl("label", { text: "Paste one or more QR payload strings (one per line):" });
    this.textarea = contentEl.createEl("textarea", { cls: "obqr-paste", attr: { placeholder: "OBQR1:..." } });
    const actions = contentEl.createDiv({ cls: "obqr-buttons" });
    const paste = actions.createEl("button", { text: "Import pasted payloads" });
    this.finalizeButton = actions.createEl("button", { text: "Finalize import", cls: "mod-cta" });
    paste.onclick = () => this.importPasted();
    this.finalizeButton.onclick = () => void this.finalize();
    this.updateProgress();
  }

  private async startCamera(): Promise<void> {
    this.clearError();
    try { await this.scanner.start(this.video, text => this.collect(text, true), message => this.setError(message)); }
    catch (error) { this.setError(error instanceof Error ? error.message : String(error)); }
  }

  private importPasted(): void {
    const values = this.textarea.value.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
    if (!values.length) return this.setError("Paste at least one QR payload.");
    let accepted = 0;
    for (const value of values) if (this.collect(value, false)) accepted++;
    if (!accepted && !this.errorEl.textContent) this.setError("No new chunks were found (duplicates were ignored).");
  }

  private collect(raw: string, fromCamera: boolean): boolean {
    if (!raw.startsWith("OBQR1:")) {
      if (!fromCamera) this.setError("Invalid QR payload: expected the OBQR1 protocol marker.");
      return false;
    }
    const part = parsePayload(raw);
    if (!part) { this.setError("Malformed QR payload."); return false; }
    if (this.transferId && part.transferId !== this.transferId) {
      this.setError(`Ignored QR pack ${part.transferId}; currently collecting ${this.transferId}.`);
      return false;
    }
    if (!this.transferId) {
      this.transferId = part.transferId;
      this.expectedTotal = part.totalParts;
      this.expectedHash = part.sha256;
    }
    if (part.totalParts !== this.expectedTotal || part.sha256 !== this.expectedHash) {
      this.setError("Chunk metadata conflicts with the active transfer.");
      return false;
    }
    const existing = this.chunks.get(part.partIndex);
    if (existing) {
      if (existing.data !== part.data) this.setError(`Conflicting duplicate for chunk ${part.partIndex + 1}.`);
      else if (!fromCamera) this.setError(`Duplicate chunk ${part.partIndex + 1} ignored.`);
      return false;
    }
    this.chunks.set(part.partIndex, part);
    this.clearError();
    this.updateProgress();
    return true;
  }

  private updateProgress(): void {
    this.status.setText(this.expectedTotal ? `${this.chunks.size} / ${this.expectedTotal} chunks collected` : "0 chunks collected");
    const indexes = [...this.chunks.keys()].sort((a, b) => a - b).map(i => i + 1);
    this.received.setText(indexes.length ? `Received: ${indexes.join(", ")}` : "Scan or paste the first payload to begin.");
    this.finalizeButton.disabled = !this.expectedTotal || this.chunks.size !== this.expectedTotal || this.busy;
  }

  private async finalize(): Promise<void> {
    if (this.busy) return;
    this.busy = true; this.updateProgress(); this.clearError();
    try {
      const encoded = reassemblePayloads([...this.chunks.values()]);
      if (await sha256(encoded) !== this.expectedHash) throw new Error("SHA-256 hash mismatch. Rescan the QR pack.");
      const pkg = await decodePackage(encoded);
      const path = await this.plugin.getSafeImportPath(pkg.note.path);
      await this.plugin.ensureParentFolder(path);
      const file = await this.app.vault.create(path, pkg.note.content);
      await this.app.workspace.getLeaf(false).openFile(file);
      this.scanner.stop();
      new Notice(`Imported note to ${path}`);
      this.close();
    } catch (error) { this.setError(error instanceof Error ? error.message : `File save failed: ${String(error)}`); }
    finally { this.busy = false; this.updateProgress(); }
  }

  private setError(message: string): void { this.errorEl.setText(message); }
  private clearError(): void { this.errorEl.empty(); }
  onClose(): void { this.scanner.stop(); this.contentEl.empty(); }
}
