import { Modal, Notice } from "obsidian";
import QRCode from "qrcode";
import type QRNoteTransferPlugin from "./main";

export class ExportModal extends Modal {
  private index = 0;
  private timer: number | null = null;
  private canvas!: HTMLCanvasElement;
  private counter!: HTMLElement;
  private autoplay!: HTMLInputElement;

  constructor(private plugin: QRNoteTransferPlugin, private notePath: string, private payloads: string[]) {
    super(plugin.app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("obqr-export-modal");
    contentEl.createEl("h2", { text: "Export active note as QR Pack" });
    contentEl.createEl("div", { cls: "obqr-meta", text: `Note: ${this.notePath}` });
    contentEl.createEl("div", { cls: "obqr-meta", text: `Total QR codes: ${this.payloads.length}` });
    this.counter = contentEl.createEl("div", { cls: "obqr-counter" });
    const qrWrap = contentEl.createDiv({ cls: "obqr-qr-wrap" });
    this.canvas = qrWrap.createEl("canvas");

    const nav = contentEl.createDiv({ cls: "obqr-buttons" });
    const previous = nav.createEl("button", { text: "Previous" });
    const next = nav.createEl("button", { text: "Next", cls: "mod-cta" });
    previous.onclick = () => { this.index = (this.index - 1 + this.payloads.length) % this.payloads.length; void this.renderQR(); };
    next.onclick = () => { this.index = (this.index + 1) % this.payloads.length; void this.renderQR(); };

    const autoRow = contentEl.createDiv({ cls: "obqr-auto-row" });
    this.autoplay = autoRow.createEl("input", { type: "checkbox" });
    const label = autoRow.createEl("label", { text: "Auto-play" });
    label.prepend(this.autoplay);
    autoRow.createSpan({ text: `Every ${this.plugin.settings.autoPlayIntervalMs} ms` });
    this.autoplay.onchange = () => this.updateTimer();

    const actions = contentEl.createDiv({ cls: "obqr-buttons" });
    const copyCurrent = actions.createEl("button", { text: "Copy current payload" });
    const copyAll = actions.createEl("button", { text: "Copy all payloads" });
    const saveText = actions.createEl("button", { text: "Export payloads as .txt" });
    copyCurrent.onclick = () => void this.copy(this.payloads[this.index], "Current QR payload copied.");
    copyAll.onclick = () => void this.copy(this.payloads.join("\n"), "All QR payloads copied.");
    saveText.onclick = () => this.exportText();
    contentEl.createEl("p", { cls: "obqr-warning", text: "Attachments and embedded files are not included in this transfer." });
    void this.renderQR();
  }

  private async renderQR(): Promise<void> {
    this.counter.setText(`QR ${this.index + 1} of ${this.payloads.length}`);
    try {
      await QRCode.toCanvas(this.canvas, this.payloads[this.index], {
        width: this.plugin.settings.qrSize,
        margin: 2,
        errorCorrectionLevel: this.plugin.settings.qrErrorCorrectionLevel
      });
    } catch (error) {
      new Notice(`QR generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private updateTimer(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = this.autoplay.checked ? window.setInterval(() => {
      this.index = (this.index + 1) % this.payloads.length;
      void this.renderQR();
    }, this.plugin.settings.autoPlayIntervalMs) : null;
  }

  private async copy(text: string, message: string): Promise<void> {
    try { await navigator.clipboard.writeText(text); new Notice(message); }
    catch { new Notice("Clipboard access failed."); }
  }

  private exportText(): void {
    const blob = new Blob([this.payloads.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${this.notePath.split("/").pop()?.replace(/\.md$/i, "") ?? "note"}-qr-pack.txt`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  onClose(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.contentEl.empty();
  }
}
