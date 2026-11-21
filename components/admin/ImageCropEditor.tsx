"use client";

import { useRef, useState } from "react";
import { Cropper, ReactCropperElement } from "react-cropper";
import { Loader2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

const ASPECT_RATIOS = [
  { label: "Free", value: Number.NaN },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
];

function extensionForType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export type CroppedImageResult = {
  file: File;
  previewUrl: string;
};

export default function ImageCropEditor({
  open,
  sourceUrl,
  sourceFile,
  onCancel,
  onApply,
}: {
  open: boolean;
  sourceUrl: string;
  sourceFile: File | null;
  onCancel: () => void;
  onApply: (result: CroppedImageResult) => void;
}) {
  const cropperRef = useRef<ReactCropperElement>(null);
  const [aspectRatio, setAspectRatio] = useState("free");
  const [zoom, setZoom] = useState(1);
  const [applying, setApplying] = useState(false);

  if (!open || !sourceFile) return null;

  const readZoom = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    const canvas = cropper.getCanvasData();
    const image = cropper.getImageData();
    if (image.naturalWidth) setZoom(Number((canvas.width / image.naturalWidth).toFixed(3)));
  };

  const selectAspectRatio = (label: string, value: number) => {
    setAspectRatio(label.toLowerCase());
    cropperRef.current?.cropper.setAspectRatio(value);
  };

  const reset = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    cropper.reset();
    cropper.setAspectRatio(Number.NaN);
    setAspectRatio("free");
    window.requestAnimationFrame(readZoom);
  };

  const apply = async () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    setApplying(true);
    try {
      const supportsAlpha = sourceFile.type === "image/png" || sourceFile.type === "image/webp";
      const outputType = sourceFile.type === "image/png"
        ? "image/png"
        : sourceFile.type === "image/webp"
          ? "image/webp"
          : "image/jpeg";
      const canvas = cropper.getCroppedCanvas({
        maxWidth: 4096,
        maxHeight: 4096,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high",
        ...(supportsAlpha ? {} : { fillColor: "#ffffff" }),
      });
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (value) => value ? resolve(value) : reject(new Error("Could not create cropped image")),
          outputType,
          outputType === "image/png" ? undefined : 0.95,
        );
      });
      const baseName = sourceFile.name.replace(/\.[^.]+$/, "") || "product-image";
      const file = new File([blob], `${baseName}-cropped.${extensionForType(outputType)}`, {
        type: outputType,
        lastModified: Date.now(),
      });
      onApply({ file, previewUrl: URL.createObjectURL(file) });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not apply this crop");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="image-editor-title">
      <div className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
        <header className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 sm:px-7">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">Product image</p>
            <h2 id="image-editor-title" className="mt-1 text-xl font-bold">Edit & crop</h2>
          </div>
          <button type="button" onClick={onCancel} disabled={applying} aria-label="Close image editor" className="rounded-xl border border-zinc-200 p-2.5 text-zinc-500 hover:border-black hover:text-black disabled:opacity-40">
            <X size={18} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto bg-zinc-950 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="min-h-[360px] overflow-hidden rounded-2xl bg-black sm:min-h-[500px]">
            <Cropper
              ref={cropperRef}
              src={sourceUrl}
              alt="Crop selected product image"
              className="h-full w-full"
              style={{ height: "min(60vh, 620px)", width: "100%" }}
              aspectRatio={Number.NaN}
              initialAspectRatio={Number.NaN}
              viewMode={0}
              dragMode="move"
              guides
              center
              background={false}
              responsive
              restore={false}
              movable
              zoomable
              zoomOnTouch
              zoomOnWheel
              cropBoxMovable
              cropBoxResizable
              toggleDragModeOnDblclick={false}
              checkOrientation
              autoCropArea={0.9}
              preview=".product-crop-preview"
              ready={readZoom}
              zoom={readZoom}
            />
          </div>
          <aside className="space-y-3 text-white">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/45">Live preview</p>
            <div className="product-crop-preview aspect-square w-full overflow-hidden rounded-2xl bg-[linear-gradient(45deg,#333_25%,transparent_25%),linear-gradient(-45deg,#333_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#333_75%),linear-gradient(-45deg,transparent_75%,#333_75%)] bg-[length:18px_18px]" />
            <p className="text-[10px] leading-4 text-white/50">Drag the image to reposition it. Drag any crop edge or corner to choose exactly what remains.</p>
          </aside>
        </div>

        <div className="space-y-5 border-t border-zinc-100 bg-white p-5 sm:p-7">
          <div className="flex flex-wrap gap-2">
            {ASPECT_RATIOS.map((ratio) => (
              <button key={ratio.label} type="button" onClick={() => selectAspectRatio(ratio.label, ratio.value)} className={`rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-wider ${aspectRatio === ratio.label.toLowerCase() ? "bg-black text-white" : "bg-zinc-100 text-zinc-500 hover:text-black"}`}>
                {ratio.label}
              </button>
            ))}
          </div>
          <label className="grid gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 sm:grid-cols-[70px_1fr_55px] sm:items-center">
            <span>Zoom</span>
            <input type="range" min="0.05" max="3" step="0.01" value={Math.min(3, Math.max(0.05, zoom))} onChange={(event) => { const value = Number(event.target.value); setZoom(value); cropperRef.current?.cropper.zoomTo(value); }} className="w-full accent-black" />
            <span className="text-right font-mono normal-case tracking-normal">{Math.round(zoom * 100)}%</span>
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button type="button" onClick={reset} disabled={applying} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-5 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-40"><RotateCcw size={14} /> Reset</button>
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <button type="button" onClick={onCancel} disabled={applying} className="rounded-2xl border border-zinc-200 px-7 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-40">Cancel</button>
              <button type="button" onClick={apply} disabled={applying} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-40">
                {applying && <Loader2 size={14} className="animate-spin" />}{applying ? "Applying" : "Apply crop"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
