import React, { useState } from "react";
import {
  Copy,
  Check,
  Download,
  Share2,
  Edit3,
  Sparkles,
  FileText,
} from "lucide-react";
import { downloadTextFile } from "../utils/imageUtils";

interface ResultViewProps {
  resultText: string;
  onUpdateText: (newText: string) => void;
  questionsCount?: number;
  copiedState: boolean;
  onCopyText: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  resultText,
  onUpdateText,
  questionsCount,
  copiedState,
  onCopyText,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleDownloadText = () => {
    downloadTextFile(resultText, `questoes_digitalizadas_${Date.now()}.txt`);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Questões Digitalizadas",
          text: resultText,
        });
      } catch (err) {
        // Ignored if cancelled
      }
    } else {
      onCopyText();
    }
  };

  return (
    <div
      id="digitalized-result-card"
      className="w-full bg-neutral-900 rounded-2xl p-5 border border-emerald-500/30 shadow-xl relative overflow-hidden"
    >
      {/* Top decorative accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

      {/* Header with Title and Quick Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
              Questões Digitalizadas
              {questionsCount ? (
                <span className="text-xs font-medium text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                  {questionsCount} {questionsCount === 1 ? "questão" : "questões"}
                </span>
              ) : null}
            </h2>
            <p className="text-xs text-neutral-400">
              Pronto para copiar ou salvar no seu celular
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            id="toggle-edit-mode-btn"
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition active:scale-95"
          >
            <Edit3 className="w-3.5 h-3.5 text-neutral-400" />
            <span>{isEditing ? "Concluir edição" : "Editar texto"}</span>
          </button>

          <button
            id="save-text-file-btn"
            type="button"
            onClick={handleDownloadText}
            title="Baixar arquivo de texto (.txt) no celular"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Salvar (.txt)</span>
          </button>

          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <button
              id="share-text-btn"
              type="button"
              onClick={handleShare}
              title="Compartilhar texto (WhatsApp, etc)"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary prominent Copy Button */}
      <div className="mb-4">
        <button
          id="copy-result-text-btn"
          type="button"
          onClick={onCopyText}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition shadow-lg active:scale-[0.99] ${
            copiedState
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50"
              : "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-950/40"
          }`}
        >
          {copiedState ? (
            <>
              <Check className="w-5 h-5" />
              <span>Copiado com sucesso! Pronto para colar</span>
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              <span>Copiar Texto Completo</span>
            </>
          )}
        </button>
      </div>

      {/* Text Output / Editor Box */}
      <div className="relative rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden">
        {isEditing ? (
          <textarea
            id="result-text-editor"
            value={resultText}
            onChange={(e) => onUpdateText(e.target.value)}
            rows={12}
            className="w-full p-4 font-mono text-sm leading-relaxed text-neutral-200 bg-transparent resize-y focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Digite ou edite o texto das questões..."
          />
        ) : (
          <div className="p-4 overflow-x-auto max-h-[500px] overflow-y-auto">
            <pre className="font-mono text-sm leading-relaxed text-neutral-200 whitespace-pre-wrap select-all">
              {resultText}
            </pre>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-neutral-400" />
          Inicia com "responda" e enumera todas as questões
        </span>
        <span>{resultText.length} caracteres</span>
      </div>
    </div>
  );
};
