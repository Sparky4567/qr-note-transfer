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
      const image = await this.loadImage(url);

      // Camera photos on Android are often several thousand pixels wide. Passing
      // them straight to ZXing is both expensive and unreliable in a WebView.
      // Drawing first also makes the browser apply the photo's EXIF orientation.
      for (const maxSide of [1600, 2400]) {
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));

        for (const rotation of [0, 90, 180, 270]) {
          const canvas = this.drawImage(image, width, height, rotation);
          try {
            return reader.decodeFromCanvas(canvas).getText();
          } catch {
            // Try the next size/orientation. The final error is clearer below.
          }
        }
      }
      throw new Error("QR code not found in image");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("The captured image could not be loaded"));
      image.src = url;
    });
  }

  private drawImage(image: HTMLImageElement, width: number, height: number, rotation: number): HTMLCanvasElement {
    const swapSides = rotation === 90 || rotation === 270;
    const canvas = document.createElement("canvas");
    canvas.width = swapSides ? height : width;
    canvas.height = swapSides ? width : height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Image canvas is unavailable");

    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(rotation * Math.PI / 180);
    context.drawImage(image, -width / 2, -height / 2, width, height);
    return canvas;
  }

  stop(): void {
    this.controls?.stop();
    this.controls = null;
    this.reader = null;
  }
}
