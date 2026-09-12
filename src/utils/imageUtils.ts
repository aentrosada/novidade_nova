import JSZip from "jszip";
import { CapturedPhoto } from "../types";

/**
 * Resizes an image dataURL if larger than maxDimension, keeping aspect ratio.
 */
export async function optimizeImage(
  dataUrl: string,
  maxDimension = 1600,
  quality = 0.85
): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ dataUrl, mimeType: "image/jpeg" });
        return;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const optimizedUrl = canvas.toDataURL("image/jpeg", quality);
      resolve({ dataUrl: optimizedUrl, mimeType: "image/jpeg" });
    };
    img.onerror = () => {
      resolve({ dataUrl, mimeType: "image/jpeg" });
    };
    img.src = dataUrl;
  });
}

/**
 * Trigger browser download for a single photo.
 */
export function downloadPhoto(photo: CapturedPhoto, filename?: string) {
  const link = document.createElement("a");
  link.href = photo.dataUrl;
  link.download = filename || photo.name || `foto_questao_${photo.timestamp}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Trigger browser download for all captured photos bundled into a ZIP file.
 */
export async function downloadAllPhotosZip(photos: CapturedPhoto[]) {
  if (photos.length === 0) return;

  const zip = new JSZip();
  const folder = zip.folder("fotos_questoes");

  photos.forEach((photo, index) => {
    const base64Data = photo.dataUrl.split(",")[1];
    const ext = photo.mimeType.includes("png") ? "png" : "jpg";
    const name = `questao_foto_${index + 1}.${ext}`;
    if (folder && base64Data) {
      folder.file(name, base64Data, { base64: true });
    }
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `questoes_fotos_${Date.now()}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Trigger browser download for text file.
 */
export function downloadTextFile(text: string, filename = "questoes_digitalizadas.txt") {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Play a subtle shutter click feedback sound via Web Audio API.
 */
export function playShutterSound() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // Audio feedback is purely enhancement
  }
}
