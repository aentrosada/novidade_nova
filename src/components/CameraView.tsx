import React, { useEffect, useRef, useState, useCallback } from "react";
import { Camera, SwitchCamera, Upload, AlertCircle, RefreshCw } from "lucide-react";
import { optimizeImage, playShutterSound } from "../utils/imageUtils";
import { CapturedPhoto } from "../types";

interface CameraViewProps {
  onCapture: (photo: CapturedPhoto) => void;
  onBatchAdd: (photos: CapturedPhoto[]) => void;
  currentCount: number;
  maxCount: number;
}

export const CameraView: React.FC<CameraViewProps> = ({
  onCapture,
  onBatchAdd,
  currentCount,
  maxCount,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [showFlash, setShowFlash] = useState<boolean>(false);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);

  const isLimitReached = currentCount >= maxCount;

  // Start or switch camera stream
  const startCamera = useCallback(async () => {
    setIsCameraReady(false);
    setCameraError(null);

    // Stop current stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Câmera não suportada neste navegador.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraReady(true);
        };
      }
      setHasCamera(true);
    } catch (err: any) {
      console.warn("Erro ao iniciar câmera:", err);
      setHasCamera(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Permissão de câmera negada. Habilite a câmera ou envie arquivos.");
      } else {
        setCameraError("Não foi possível acessar a câmera do dispositivo.");
      }
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // Flip camera between front and back
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Capture photo from video feed
  const takePhoto = async () => {
    if (!videoRef.current || isLimitReached || isCapturing || !isCameraReady) return;

    try {
      setIsCapturing(true);
      setShowFlash(true);
      playShutterSound();

      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const rawDataUrl = canvas.toDataURL("image/jpeg", 0.92);

        // Optimize photo for fast transmission & crisp OCR
        const { dataUrl, mimeType } = await optimizeImage(rawDataUrl, 1600, 0.88);

        const newPhoto: CapturedPhoto = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          dataUrl,
          mimeType,
          timestamp: Date.now(),
          name: `questao_foto_${currentCount + 1}.jpg`,
        };

        onCapture(newPhoto);
      }
    } catch (err) {
      console.error("Falha ao capturar foto:", err);
    } finally {
      setTimeout(() => setShowFlash(false), 150);
      setIsCapturing(false);
    }
  };

  // Handle file uploads as alternative/additional input
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxCount - currentCount;
    if (remainingSlots <= 0) return;

    const selectedFiles: File[] = Array.from(files).slice(0, remainingSlots) as File[];
    const newPhotos: CapturedPhoto[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const { dataUrl: optimizedUrl, mimeType } = await optimizeImage(dataUrl, 1600, 0.88);
      newPhotos.push({
        id: `upload_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        dataUrl: optimizedUrl,
        mimeType,
        timestamp: Date.now() + i,
        name: file.name || `foto_questao_${currentCount + i + 1}.jpg`,
        sizeBytes: file.size,
      });
    }

    onBatchAdd(newPhotos);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div id="camera-container" className="relative w-full rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-lg">
      {/* Video Viewfinder */}
      <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full bg-black flex items-center justify-center overflow-hidden">
        {hasCamera && !cameraError ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="p-6 text-center text-neutral-400 flex flex-col items-center justify-center max-w-sm">
            <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
            <p className="text-sm font-medium text-neutral-200 mb-2">
              {cameraError || "Câmera não detectada ou indisponível"}
            </p>
            <p className="text-xs text-neutral-400 mb-4">
              Você pode enviar as fotos diretamente da sua galeria ou arquivos do celular.
            </p>
            <button
              id="retry-camera-btn"
              type="button"
              onClick={startCamera}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tentar novamente
            </button>
          </div>
        )}

        {/* Shutter flash animation */}
        {showFlash && (
          <div className="absolute inset-0 bg-white opacity-80 pointer-events-none transition-opacity duration-150" />
        )}

        {/* Framing Guide Overlay */}
        {hasCamera && !cameraError && (
          <div className="absolute inset-4 sm:inset-6 pointer-events-none border border-white/20 rounded-xl flex flex-col justify-between p-3">
            <div className="flex justify-between items-center text-xs text-white/70 font-medium">
              <span className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
                Aponte para a pergunta
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border ${
                isLimitReached
                  ? "bg-red-500/80 text-white border-red-400"
                  : "bg-black/50 text-white border-white/20"
              }`}>
                {currentCount}/{maxCount} fotos
              </span>
            </div>

            {/* Corner brackets */}
            <div className="text-center">
              <span className="text-[11px] text-white/50 bg-black/30 px-2 py-0.5 rounded">
                Mantenha o texto nítido e iluminado
              </span>
            </div>
          </div>
        )}

        {/* Top Controls on Camera */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
          {hasCamera && !cameraError && (
            <button
              id="switch-camera-btn"
              type="button"
              onClick={toggleFacingMode}
              title="Trocar câmera"
              className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition active:scale-95"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Camera Action Bar */}
      <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between gap-4">
        {/* Gallery / File Picker button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handleFilesSelected}
            className="hidden"
            id="file-upload-input"
            disabled={isLimitReached}
          />
          <button
            id="upload-photo-btn"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLimitReached}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-200 text-xs font-medium border border-neutral-700 transition active:scale-95"
          >
            <Upload className="w-4 h-4 text-neutral-400" />
            <span className="hidden xs:inline">Galeria / Enviar</span>
          </button>
        </div>

        {/* Big Shutter Button */}
        <div className="flex flex-col items-center">
          <button
            id="shutter-capture-btn"
            type="button"
            onClick={takePhoto}
            disabled={isLimitReached || isCapturing || !isCameraReady}
            title={isLimitReached ? "Limite de 20 fotos atingido" : "Tirar foto da questão"}
            className="relative flex items-center justify-center w-16 h-16 rounded-full border-4 border-white/30 bg-white text-neutral-900 shadow-xl hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed transition duration-150"
          >
            <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </button>
          <span className="text-[11px] text-neutral-400 mt-1.5 font-medium">
            {isLimitReached ? "Limite atingido (20)" : "Tirar foto"}
          </span>
        </div>

        {/* Counter Badge */}
        <div className="text-right">
          <div className="text-xs text-neutral-400">Total</div>
          <div className="text-sm font-semibold text-neutral-200">
            {currentCount} <span className="text-neutral-500">/ {maxCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
