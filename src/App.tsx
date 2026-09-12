import React, { useState, useEffect } from "react";
import {
  Camera,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  FileQuestion,
  HelpCircle,
  Download,
  Info,
} from "lucide-react";
import { CameraView } from "./components/CameraView";
import { PhotoGallery } from "./components/PhotoGallery";
import { ResultView } from "./components/ResultView";
import { CapturedPhoto, DigitizeResult } from "./types";
import { generateSampleQuestionPhotos } from "./utils/sampleGenerator";
import { downloadTextFile } from "./utils/imageUtils";

const MAX_PHOTOS = 20;

export default function App() {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<DigitizeResult | null>(null);
  const [autoCopy, setAutoCopy] = useState<boolean>(true);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  // Copy text to clipboard and trigger notification
  const handleCopyText = async (textToCopy?: string) => {
    const text = textToCopy || result?.text;
    if (!text) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for environments where writeText is restricted
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3000);
    } catch (err) {
      console.warn("Falha ao copiar automaticamente:", err);
    }
  };

  // Process photos with server Gemini API
  const handleDigitize = async () => {
    if (photos.length === 0) {
      setErrorMessage("Tire ao menos uma foto antes de digitalizar.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const payloadImages = photos.map((p) => ({
        data: p.dataUrl,
        mimeType: p.mimeType,
      }));

      const res = await fetch("/api/extract-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ images: payloadImages }),
      });

      const contentType = res.headers.get("content-type") || "";
      let data: any;

      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const rawText = await res.text();
        if (res.status === 404) {
          throw new Error(
            "Rota /api/extract-questions não encontrada (404 na Vercel). Certifique-se de que o arquivo api/extract-questions.ts e vercel.json estão no seu repositório."
          );
        } else if (res.status === 413) {
          throw new Error(
            "Tamanho das imagens excedeu o limite da Vercel (4.5MB). Tente enviar menos fotos de cada vez."
          );
        } else {
          throw new Error(
            `Erro no servidor (${res.status}): ${rawText.slice(0, 150)}...`
          );
        }
      }

      if (!res.ok || !data.success) {
        throw new Error(
          data?.error || "Não foi possível extrair as questões das imagens."
        );
      }

      const newResult: DigitizeResult = {
        text: data.text,
        questionsCount: data.questionsCount,
        timestamp: Date.now(),
      };

      setResult(newResult);

      // If auto-copy is enabled, copy immediately to clipboard as requested!
      if (autoCopy) {
        await handleCopyText(newResult.text);
      }

      // Smooth scroll to result
      setTimeout(() => {
        const resultElement = document.getElementById("digitalized-result-card");
        if (resultElement) {
          resultElement.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } catch (err: any) {
      console.error("Erro na digitalização:", err);
      setErrorMessage(
        err.message ||
          "Ocorreu um erro ao digitalizar as fotos. Verifique a iluminação e tente novamente."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Add captured photo
  const handleCapturePhoto = (photo: CapturedPhoto) => {
    if (photos.length >= MAX_PHOTOS) return;
    setPhotos((prev) => [...prev, photo]);
    setErrorMessage(null);
  };

  // Add multiple photos
  const handleBatchAdd = (newPhotos: CapturedPhoto[]) => {
    setPhotos((prev) => {
      const merged = [...prev, ...newPhotos];
      return merged.slice(0, MAX_PHOTOS);
    });
    setErrorMessage(null);
  };

  // Remove individual photo
  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Clear all photos
  const handleClearAll = () => {
    setPhotos([]);
  };

  // Load sample photos for instant demonstration
  const handleLoadSamples = () => {
    const samples = generateSampleQuestionPhotos();
    setPhotos(samples);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center">
      {/* Toast Notification for Clipboard Copy */}
      {copiedNotification && (
        <div className="fixed top-5 z-50 animate-bounce flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-500 text-neutral-950 font-semibold text-xs shadow-2xl border border-emerald-400">
          <Check className="w-4 h-4" />
          <span>Texto copiado para a área de transferência! Pronto para colar.</span>
        </div>
      )}

      {/* Main Container */}
      <main className="w-full max-w-3xl px-4 py-6 flex flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col gap-1.5 pb-3 border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Digitalizador de Questões
                </h1>
                <p className="text-xs text-neutral-400">
                  Tire fotos de provas ou exercícios e copie as perguntas organizadas
                </p>
              </div>
            </div>

            {/* Quick help button */}
            <button
              id="help-toggle-btn"
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800 transition"
              title="Instruções e formato"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Collapsible Format Instructions */}
          {showInstructions && (
            <div className="mt-2 p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-300 leading-relaxed space-y-2">
              <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                Formato do resultado gerado:
              </div>
              <p>
                O texto sintetizado inicia com a palavra <span className="font-mono text-emerald-300 bg-neutral-950 px-1.5 py-0.5 rounded">responda</span> e lista todas as questões identificadas nas fotos de forma ordenada:
              </p>
              <pre className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 font-mono text-[11px] leading-normal">
{`responda
questão 1 - [texto sintetizado da questão 1]

questão 2 - [texto sintetizado da questão 2]`}
              </pre>
              <p className="text-neutral-400">
                Você pode tirar até 20 fotos seguidas. As fotos e o texto final podem ser salvos no seu celular a qualquer momento.
              </p>
            </div>
          )}
        </header>

        {/* Camera View Section */}
        <section aria-label="Câmera para tirar fotos">
          <CameraView
            onCapture={handleCapturePhoto}
            onBatchAdd={handleBatchAdd}
            currentCount={photos.length}
            maxCount={MAX_PHOTOS}
          />
        </section>

        {/* Gallery Section */}
        <section aria-label="Galeria de fotos capturadas">
          {photos.length > 0 ? (
            <PhotoGallery
              photos={photos}
              onRemovePhoto={handleRemovePhoto}
              onClearAll={handleClearAll}
            />
          ) : (
            <div className="p-6 rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neutral-800/80 flex items-center justify-center text-neutral-400">
                <FileQuestion className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-300">
                  Nenhuma foto adicionada ainda
                </p>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                  Aponte a câmera para as questões e clique em "Tirar foto" (até 20 fotos) ou envie arquivos.
                </p>
              </div>
              <button
                id="load-sample-btn"
                type="button"
                onClick={handleLoadSamples}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 transition active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Carregar fotos de exemplo
              </button>
            </div>
          )}
        </section>

        {/* Error notification */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Synthesis Controls & Action Bar */}
        <section className="bg-neutral-900/80 p-4 rounded-2xl border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center gap-2.5 text-xs text-neutral-300 cursor-pointer select-none">
            <input
              id="auto-copy-checkbox"
              type="checkbox"
              checked={autoCopy}
              onChange={(e) => setAutoCopy(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-neutral-900 bg-neutral-800"
            />
            <span>Copiar automaticamente para colar em outro lugar</span>
          </label>

          <button
            id="digitize-questions-btn"
            type="button"
            onClick={handleDigitize}
            disabled={photos.length === 0 || isProcessing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm shadow-lg shadow-emerald-950/50 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-98"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Digitalizando {photos.length} fotos...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Digitalizar e Sintetizar ({photos.length})</span>
              </>
            )}
          </button>
        </section>

        {/* Processing State Indicator */}
        {isProcessing && (
          <div className="p-8 rounded-2xl border border-neutral-800 bg-neutral-900 flex flex-col items-center justify-center text-center gap-3 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-200">
                Lendo e sintetizando as perguntas...
              </p>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                A IA está eliminando duplicatas, corrigindo textos cortados e formatando a lista ordenada pronta para colar.
              </p>
            </div>
          </div>
        )}

        {/* Digitalized Result Section */}
        {result && !isProcessing && (
          <section aria-label="Resultado da digitalização">
            <ResultView
              resultText={result.text}
              onUpdateText={(newText) =>
                setResult((prev) => (prev ? { ...prev, text: newText } : null))
              }
              questionsCount={result.questionsCount}
              copiedState={copiedNotification}
              onCopyText={() => handleCopyText()}
            />
          </section>
        )}
      </main>
    </div>
  );
}
