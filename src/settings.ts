import { PluginSettingTab, Setting } from "obsidian";
import type QRNoteTransferPlugin from "./main";
import type { PluginSettings, QRErrorCorrectionLevel } from "./types";

export const DEFAULT_SETTINGS: PluginSettings = {
  chunkSize: 800,
  qrSize: 320,
  autoPlayIntervalMs: 1200,
  preserveOriginalPath: true,
  defaultImportFolder: "",
  qrErrorCorrectionLevel: "M"
};

export class QRNoteTransferSettingTab extends PluginSettingTab {
  constructor(private plugin: QRNoteTransferPlugin) { super(plugin.app, plugin); }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "QR Note Transfer settings" });

    new Setting(containerEl).setName("Chunk size").setDesc("Characters per QR code (300–1800). Smaller chunks scan more reliably but create more codes.")
      .addText(text => text.setValue(String(this.plugin.settings.chunkSize)).onChange(async value => {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) { this.plugin.settings.chunkSize = Math.round(Math.min(1800, Math.max(300, parsed))); await this.plugin.saveSettings(); }
      }));
    new Setting(containerEl).setName("QR display size").setDesc("QR canvas width in pixels (240–800).")
      .addText(text => text.setValue(String(this.plugin.settings.qrSize)).onChange(async value => {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) { this.plugin.settings.qrSize = Math.round(Math.min(800, Math.max(240, parsed))); await this.plugin.saveSettings(); }
      }));
    new Setting(containerEl).setName("Auto-play interval").setDesc("Milliseconds between QR codes (500–10000).")
      .addText(text => text.setValue(String(this.plugin.settings.autoPlayIntervalMs)).onChange(async value => {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) { this.plugin.settings.autoPlayIntervalMs = Math.round(Math.min(10000, Math.max(500, parsed))); await this.plugin.saveSettings(); }
      }));
    new Setting(containerEl).setName("Preserve original path").setDesc("Import into the source folder when it is safe to do so.")
      .addToggle(toggle => toggle.setValue(this.plugin.settings.preserveOriginalPath).onChange(async value => {
        this.plugin.settings.preserveOriginalPath = value; await this.plugin.saveSettings();
      }));
    new Setting(containerEl).setName("Default import folder").setDesc("Fallback vault-relative folder. Leave empty for the vault root.")
      .addText(text => text.setPlaceholder("Imported notes").setValue(this.plugin.settings.defaultImportFolder).onChange(async value => {
        this.plugin.settings.defaultImportFolder = value; await this.plugin.saveSettings();
      }));
    new Setting(containerEl).setName("QR error correction").setDesc("Higher correction improves damage tolerance but increases QR density.")
      .addDropdown(dropdown => dropdown.addOptions({ L: "Low", M: "Medium", Q: "Quartile", H: "High" })
        .setValue(this.plugin.settings.qrErrorCorrectionLevel).onChange(async value => {
          this.plugin.settings.qrErrorCorrectionLevel = value as QRErrorCorrectionLevel; await this.plugin.saveSettings();
        }));
  }
}
