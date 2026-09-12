export interface CapturedPhoto {
  id: string;
  dataUrl: string; // Base64 data URL
  mimeType: string;
  timestamp: number;
  name: string;
  sizeBytes?: number;
}

export interface DigitizeResult {
  text: string;
  questionsCount: number;
  timestamp: number;
}
