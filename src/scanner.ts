import QrScanner from "qr-scanner";

export class WebcamScanner {
  private scanner: QrScanner | null = null;

  async start(video: HTMLVideoElement, onResult: (text: string) => void, onError: (message: string) => void): Promise<void> {
    this.stop();
    this.scanner = new QrScanner(video, result => onResult(result.data), {
      preferredCamera: "environment",
      maxScansPerSecond: 7,
      returnDetailedScanResult: true,
      onDecodeError: error => {
        const message = error instanceof Error ? error.message : String(error);
        if (message !== QrScanner.NO_QR_CODE_FOUND) onError(`Camera scan error: ${message}`);
      }
    });

    try {
      await this.scanner.start();
    } catch (error) {
      this.stop();
      throw new Error(`Could not start camera: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async decodeImage(file: File): Promise<string> {
    try {
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      return result.data;
    } catch (error) {
      if (error === QrScanner.NO_QR_CODE_FOUND || (error instanceof Error && error.message === QrScanner.NO_QR_CODE_FOUND)) {
        throw new Error("QR code not found in image");
      }
      throw error;
    }
  }

  stop(): void {
    this.scanner?.destroy();
    this.scanner = null;
  }
}
