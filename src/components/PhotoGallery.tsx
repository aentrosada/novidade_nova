import React, { useState } from "react";
import { Download, Trash2, Eye, X, Archive } from "lucide-react";
import { CapturedPhoto } from "../types";
import { downloadPhoto, downloadAllPhotosZip } from "../utils/imageUtils";

interface PhotoGalleryProps {
  photos: CapturedPhoto[];
  onRemovePhoto: (id: string) => void;
  onClearAll: () => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  onRemovePhoto,
  onClearAll,
}) => {
  const [previewPhoto, setPreviewPhoto] = useState<CapturedPhoto | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  if (photos.length === 0) {
    return null;
  }

  const handleDownloadAll = async () => {
    try {
      setIsZipping(true);
      await downloadAllPhotosZip(photos);
    } catch (err) {
      console.error("Erro ao gerar zip das fotos:", err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div id="photo-gallery-section" className="w-full bg-neutral-900/60 rounded-2xl p-4 border border-neutral-800">
      {/* Header with actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-neutral-800">
        <div>
          <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
            Fotos capturadas
            <span className="text-xs font-normal text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
              {photos.length} {photos.length === 1 ? "foto" : "fotos"}
            </span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            As fotos serão analisadas em ordem para sintetizar as questões.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Download all photos button */}
          <button
            id="download-all-photos-btn"
            type="button"
            onClick={handleDownloadAll}
            disabled={isZipping}
            title="Baixar todas as fotos em arquivo .ZIP para o celular"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-xs font-medium text-neutral-200 border border-neutral-700 transition"
          >
            <Archive className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isZipping ? "Compactando..." : "Salvar fotos (.zip)"}</span>
          </button>

          {/* Clear all photos */}
          <button
            id="clear-all-photos-btn"
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-950/30 hover:bg-red-900/40 text-red-300 text-xs font-medium border border-red-800/40 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpar</span>
          </button>
        </div>
      </div>

      {/* Grid of thumbnails */}
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            id={`photo-thumb-${index + 1}`}
            className="group relative aspect-square rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition shadow-sm"
          >
            <img
              src={photo.dataUrl}
              alt={`Foto ${index + 1}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />

            {/* Sequence index badge */}
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[11px] font-bold text-white border border-white/20">
              #{index + 1}
            </div>

            {/* Hover/Tap actions overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
              <button
                id={`preview-photo-btn-${index + 1}`}
                type="button"
                onClick={() => setPreviewPhoto(photo)}
                title="Ampliar foto"
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                id={`download-single-photo-btn-${index + 1}`}
                type="button"
                onClick={() => downloadPhoto(photo, `questao_foto_${index + 1}.jpg`)}
                title="Salvar esta foto no celular"
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                id={`remove-photo-btn-${index + 1}`}
                type="button"
                onClick={() => onRemovePhoto(photo.id)}
                title="Remover foto"
                className="p-1.5 rounded-lg bg-red-900/80 hover:bg-red-800 text-white transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Photo Lightbox Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="relative max-w-3xl max-h-[85vh] w-full flex flex-col items-center">
            {/* Modal close button */}
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <span className="text-sm font-medium">Visualização da foto</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadPhoto(previewPhoto)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Salvar foto
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPhoto(null)}
                  className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <img
              src={previewPhoto.dataUrl}
              alt="Foto ampliada"
              className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain border border-neutral-800"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
