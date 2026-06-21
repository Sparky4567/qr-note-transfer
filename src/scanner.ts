import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";

export class WebcamScanner {
  private reader: BrowserQRCodeReader | null = null;
  private controls: IScannerControls | null = null;

  async start(video: HTMLVideoElement, onResult: (text: string) => void, onError: (message: string) => void): Promise<void> {
    this.stop();
    this.reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150, delayBetweenScanSuccess: 500 });
    try {
      this.controls = await this.reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        video,
        (result, error) => {
          if (result) onResult(result.getText());
          if (error && error.name !== "NotFoundException") onError(`Camera scan error: ${error.message}`);
        }
      );
    } catch (error) {
      this.stop();
      throw new Error(`Could not start camera: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async decodeImage(file: File): Promise<string> {
    const reader = new BrowserQRCodeReader();
    const url = URL.createObjectURL(file);
    try {
      const result = await reader.decodeFromImageUrl(url);
      return result.getText();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  stop(): void {
    this.controls?.stop();
    this.controls = null;
    this.reader = null;
  }
}
