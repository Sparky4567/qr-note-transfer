# QR Note Transfer

QR Note Transfer is an Obsidian community plugin for desktop and mobile that transfers the active Markdown note without a server. It gzip-compresses a versioned JSON package, Base64URL-encodes it, splits it into QR-sized chunks, and protects the complete encoded payload with SHA-256.

## Development installation

Requirements for building: Node.js 18 or newer. The built plugin runs in Obsidian on desktop, Android, and iOS.

```bash
npm install
npm run build
```

Copy `manifest.json`, `main.js`, and `styles.css` into:

```text
<vault>/.obsidian/plugins/qr-note-transfer/
```

Restart Obsidian (or reload plugins), then enable **QR Note Transfer** under **Settings → Community plugins**. `npm run dev` starts an incremental build watcher.

## Export a note

1. Open a non-empty Markdown note.
2. Run **QR Note Transfer: Export active note as QR Pack** from the command palette.
3. Show each QR code to the receiving machine using Previous/Next or Auto-play. Payloads can also be copied or exported as a text file.

The warning in the export window is intentional: embedded attachments are not part of the package.

## Import a note

1. Run **QR Note Transfer: Import note from QR Pack**.
2. Start the camera and scan all QR codes. Camera access requires permission from the operating system/WebView.
3. When every numbered chunk is present, select **Finalize import**.

Alternatively, run **QR Note Transfer: Import QR Pack from pasted payloads**, paste one `OBQR1:...` payload per line, collect the chunks, and finalize. The plugin verifies the SHA-256 checksum before decoding. It preserves the source path when configured, creates missing folders, and chooses `Note QR Import.md`, `Note QR Import 2.md`, and so on if a file exists. It never overwrites a note.

## Settings

Settings control chunk size, QR display size, auto-play interval, path preservation, fallback import folder, and QR error-correction level. The default 800-character chunk size is conservative; reducing it can improve scanning reliability at the cost of more QR codes.

## Limitations

- Attachments are not transferred in v1.
- Very large notes may produce many QR codes.
- QR transfer is slower than file sync, Git, USB, or Obsidian Sync.
- QR codes are visible to anyone who can see the screen.
- v1 transfers one Markdown note at a time. Camera scanning depends on camera permission being granted to Obsidian; pasted payload import remains available when camera access is unavailable.

## Security notes

Imported Markdown is saved as plain text; the plugin does not execute it. Paths are normalized, traversal segments and unsafe filename characters are removed, and existing files are never overwritten. The transfer is checksummed for accidental corruption, but it is not signed or encrypted. Only import QR packs from a source you trust, and review imported Markdown before enabling any unrelated plugin that executes code blocks or special content.

## Future roadmap

- Attachment support
- Multi-note export
- Folder export
- Password encryption
- Animated QR transfer mode
- Printable QR sheet export
- Camera scanning reliability improvements
- Conflict resolution UI
