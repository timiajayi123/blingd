"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Crop, GripVertical, Image as ImageIcon, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { getImageUrl } from "@/lib/getImageUrl";
import { uploadAdminMedia } from "@/lib/imagekitUpload";
import { removeImageBackground } from "@/lib/removeImageBackground";
import ImageCropEditor, { CroppedImageResult } from "@/components/admin/ImageCropEditor";

type ExistingImage = { id: string; url: string };

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
  backgroundRemoved: boolean;
  edited: boolean;
  replaceExistingId: string | null;
  uploadedUrl?: string;
};

type DisplayImage = {
  id: string;
  src: string;
  existing?: ExistingImage;
  pending?: PendingImage;
};

export type ProductImageUploadHandle = {
  prepareImagesForSave: () => Promise<string[]>;
};

function fileNameFromUrl(value: string, type: string) {
  try {
    const name = decodeURIComponent(new URL(value, window.location.origin).pathname.split("/").pop() || "product-image");
    if (/\.[a-z0-9]+$/i.test(name)) return name;
    return `${name}.${type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg"}`;
  } catch {
    return `product-image.${type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg"}`;
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function SortableThumbnail({
  image,
  index,
  busy,
  onEdit,
  onRemove,
}: {
  image: DisplayImage;
  index: number;
  busy: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id, disabled: busy });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={`group relative w-40 flex-none overflow-hidden rounded-2xl border bg-zinc-50 shadow-sm transition-shadow sm:w-44 ${isDragging ? "z-10 border-black opacity-60 shadow-xl" : "border-zinc-100"}`}>
      <div className="relative h-28 sm:h-32">
        <img src={image.src} alt={`Product image ${index + 1}`} className="h-full w-full object-cover" />
        <span className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-black px-1.5 text-[10px] font-bold text-white shadow">{index + 1}</span>
        <button type="button" aria-label={`Drag product image ${index + 1}`} disabled={busy} {...attributes} {...listeners} className="touch-none absolute right-2 top-2 rounded-full bg-white/95 p-1.5 text-black shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">
          <GripVertical size={14} />
        </button>
        {image.pending && <div className="absolute inset-x-2 bottom-2 flex flex-wrap gap-1">{image.pending.backgroundRemoved && <span className="rounded bg-emerald-600 px-1.5 py-1 text-[7px] font-bold uppercase text-white">No BG</span>}{image.pending.edited && <span className="rounded bg-black px-1.5 py-1 text-[7px] font-bold uppercase text-white">Cropped</span>}{image.pending.uploadedUrl && <span className="rounded bg-blue-600 px-1.5 py-1 text-[7px] font-bold uppercase text-white">Uploaded</span>}</div>}
      </div>
      <div className="space-y-2 bg-white p-2.5">
        <p className="truncate text-[9px] font-bold uppercase tracking-wider text-zinc-400">Image {index + 1}</p>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button type="button" onClick={onEdit} disabled={busy} className="flex items-center justify-center gap-1 rounded-lg bg-zinc-100 px-2 py-2 text-[9px] font-bold uppercase text-black transition hover:bg-zinc-200 disabled:opacity-50"><Crop size={12} /> Edit</button>
          <button type="button" onClick={onRemove} disabled={busy} aria-label={`Remove product image ${index + 1}`} className="rounded-lg bg-black p-2 text-white transition hover:bg-zinc-800 disabled:opacity-50"><X size={13} /></button>
        </div>
      </div>
    </div>
  );
}

const ProductImageUpload = forwardRef<ProductImageUploadHandle, {
  existingImages: string[];
  onExistingImagesChange: (images: string[]) => void;
  folder: string;
  tags: string[];
  disabled?: boolean;
}>(({ existingImages, onExistingImagesChange, folder, tags, disabled = false }, ref) => {
  const [existingItems, setExistingItems] = useState<ExistingImage[]>([]);
  const existingItemsRef = useRef<ExistingImage[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const pendingRef = useRef<PendingImage[]>([]);
  const [imageOrder, setImageOrder] = useState<string[]>([]);
  const imageOrderRef = useRef<string[]>([]);
  const nextId = useRef(0);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [removeBackgroundEnabled, setRemoveBackgroundEnabled] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cancelRemovesEditorImage, setCancelRemovesEditorImage] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const setExisting = (updater: (current: ExistingImage[]) => ExistingImage[]) => {
    setExistingItems((current) => {
      const next = updater(current);
      existingItemsRef.current = next;
      return next;
    });
  };

  const setPending = (updater: (current: PendingImage[]) => PendingImage[]) => {
    setPendingImages((current) => {
      const next = updater(current);
      pendingRef.current = next;
      return next;
    });
  };

  const setOrder = (next: string[]) => {
    imageOrderRef.current = next;
    setImageOrder(next);
  };

  const createExistingImage = (url: string): ExistingImage => ({ id: `existing-image-${Date.now()}-${nextId.current++}`, url });

  useEffect(() => {
    const availableByUrl = new Map<string, ExistingImage[]>();
    existingItemsRef.current.forEach((item) => {
      const items = availableByUrl.get(item.url) || [];
      items.push(item);
      availableByUrl.set(item.url, items);
    });
    const nextExisting = existingImages.map((url) => availableByUrl.get(url)?.shift() || createExistingImage(url));
    existingItemsRef.current = nextExisting;
    setExistingItems(nextExisting);
    const validIds = new Set([...nextExisting.map((item) => item.id), ...pendingRef.current.filter((item) => item.replaceExistingId === null).map((item) => item.id)]);
    const nextOrder = imageOrderRef.current.filter((id) => validIds.has(id));
    [...nextExisting.map((item) => item.id), ...pendingRef.current.filter((item) => item.replaceExistingId === null).map((item) => item.id)].forEach((id) => {
      if (!nextOrder.includes(id)) nextOrder.push(id);
    });
    setOrder(nextOrder);
  }, [existingImages]);

  useEffect(() => () => {
    pendingRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  }, []);

  const replacements = useMemo(() => new Map(
    pendingImages.filter((image) => image.replaceExistingId !== null).map((image) => [image.replaceExistingId as string, image]),
  ), [pendingImages]);

  const displayImages = useMemo<DisplayImage[]>(() => {
    const existingById = new Map(existingItems.map((item) => [item.id, item]));
    const newPendingById = new Map(pendingImages.filter((item) => item.replaceExistingId === null).map((item) => [item.id, item]));
    const orderedImages: DisplayImage[] = [];
    imageOrder.forEach((id) => {
      const existing = existingById.get(id);
      if (existing) {
        const replacement = replacements.get(existing.id);
        orderedImages.push({ id: existing.id, src: replacement?.previewUrl || getImageUrl(existing.url), existing, pending: replacement });
        return;
      }
      const pending = newPendingById.get(id);
      if (pending) orderedImages.push({ id: pending.id, src: pending.previewUrl, pending });
    });
    return orderedImages;
  }, [existingItems, imageOrder, pendingImages, replacements]);

  const editingImage = pendingImages.find((image) => image.id === editingId) || null;
  const busy = disabled || processing || uploading;

  const createPendingImage = (file: File, backgroundRemoved: boolean, replaceExistingId: string | null = null): PendingImage => ({
    id: `pending-image-${Date.now()}-${nextId.current++}`,
    file,
    previewUrl: URL.createObjectURL(file),
    backgroundRemoved,
    edited: false,
    replaceExistingId,
  });

  const orderedExistingUrls = (order = imageOrderRef.current, items = existingItemsRef.current) => {
    const existingById = new Map(items.map((item) => [item.id, item.url]));
    return order.flatMap((id) => existingById.has(id) ? [existingById.get(id) as string] : []);
  };

  const selectFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.currentTarget.value = "";
    if (!files.length) return;

    setProcessing(true);
    const prepared: PendingImage[] = [];
    try {
      for (const originalFile of files) {
        let finalFile = originalFile;
        let backgroundRemoved = false;
        if (removeBackgroundEnabled) {
          try {
            finalFile = await removeImageBackground(originalFile);
            backgroundRemoved = true;
          } catch (error) {
            console.error("Background removal failed:", error);
            toast.warning(`Could not remove the background from ${originalFile.name}; the original is ready to crop.`);
          }
        }
        prepared.push(createPendingImage(finalFile, backgroundRemoved));
      }
      setPending((current) => [...current, ...prepared]);
      setOrder([...imageOrderRef.current, ...prepared.map((image) => image.id)]);
      setCancelRemovesEditorImage(false);
      setEditingId(prepared[0]?.id || null);
      toast.success(`${prepared.length} image${prepared.length === 1 ? " is" : "s are"} ready to edit`);
    } finally {
      setProcessing(false);
    }
  };

  const editExistingImage = async (existing: ExistingImage) => {
    const existingReplacement = replacements.get(existing.id);
    if (existingReplacement) {
      setCancelRemovesEditorImage(false);
      setEditingId(existingReplacement.id);
      return;
    }

    setProcessing(true);
    try {
      const source = getImageUrl(existing.url);
      const response = await fetch(source);
      if (!response.ok) throw new Error("Could not download this image for editing");
      const blob = await response.blob();
      const type = blob.type.startsWith("image/") ? blob.type : "image/jpeg";
      const file = new File([blob], fileNameFromUrl(source, type), { type, lastModified: Date.now() });
      const pending = createPendingImage(file, false, existing.id);
      setPending((current) => [...current, pending]);
      setCancelRemovesEditorImage(true);
      setEditingId(pending.id);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "This image could not be opened in the editor"));
    } finally {
      setProcessing(false);
    }
  };

  const editPendingImage = (id: string) => {
    setCancelRemovesEditorImage(false);
    setEditingId(id);
  };

  const removePendingImage = (id: string) => {
    const image = pendingRef.current.find((item) => item.id === id);
    if (image) URL.revokeObjectURL(image.previewUrl);
    setPending((current) => current.filter((item) => item.id !== id));
    if (image?.replaceExistingId === null) setOrder(imageOrderRef.current.filter((itemId) => itemId !== id));
    if (editingId === id) setEditingId(null);
  };

  const removeExistingImage = (existing: ExistingImage) => {
    const replacement = replacements.get(existing.id);
    if (replacement) URL.revokeObjectURL(replacement.previewUrl);
    setPending((current) => current.filter((image) => image.replaceExistingId !== existing.id));
    const nextExisting = existingItemsRef.current.filter((item) => item.id !== existing.id);
    setExisting(() => nextExisting);
    const nextOrder = imageOrderRef.current.filter((id) => id !== existing.id);
    setOrder(nextOrder);
    onExistingImagesChange(orderedExistingUrls(nextOrder, nextExisting));
  };

  const removeDisplayImage = (display: DisplayImage) => {
    if (display.existing) return removeExistingImage(display.existing);
    if (display.pending) removePendingImage(display.pending.id);
  };

  const cancelEditor = () => {
    if (cancelRemovesEditorImage && editingId) removePendingImage(editingId);
    setCancelRemovesEditorImage(false);
    setEditingId(null);
  };

  const applyCrop = ({ file, previewUrl }: CroppedImageResult) => {
    if (!editingId) return;
    const previous = pendingRef.current.find((image) => image.id === editingId);
    if (previous) URL.revokeObjectURL(previous.previewUrl);
    setPending((current) => current.map((image) => image.id === editingId
      ? { ...image, file, previewUrl, edited: true, uploadedUrl: undefined }
      : image));
    setCancelRemovesEditorImage(false);
    setEditingId(null);
    toast.success("Crop applied");
  };

  const addImageUrl = () => {
    const value = newImageUrl.trim();
    if (!value) return;
    const item = createExistingImage(value);
    const nextExisting = [...existingItemsRef.current, item];
    setExisting(() => nextExisting);
    const nextOrder = [...imageOrderRef.current, item.id];
    setOrder(nextOrder);
    onExistingImagesChange(orderedExistingUrls(nextOrder, nextExisting));
    setNewImageUrl("");
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = imageOrderRef.current.indexOf(String(active.id));
    const newIndex = imageOrderRef.current.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const nextOrder = arrayMove(imageOrderRef.current, oldIndex, newIndex);
    setOrder(nextOrder);
    onExistingImagesChange(orderedExistingUrls(nextOrder));
  };

  useImperativeHandle(ref, () => ({
    prepareImagesForSave: async () => {
      setUploading(true);
      try {
        const resolvedPending = new Map(pendingRef.current.map((image) => [image.id, image]));
        for (const image of pendingRef.current) {
          if (image.uploadedUrl) continue;
          const result = await uploadAdminMedia({ file: image.file, folder, tags });
          const uploaded = { ...image, uploadedUrl: result.url };
          resolvedPending.set(image.id, uploaded);
          setPending((current) => current.map((item) => item.id === image.id ? uploaded : item));
        }
        const completedPending = [...resolvedPending.values()];
        const pendingById = new Map(completedPending.map((image) => [image.id, image]));
        const replacementByExistingId = new Map(completedPending.filter((image) => image.replaceExistingId !== null).map((image) => [image.replaceExistingId as string, image]));
        const existingById = new Map(existingItemsRef.current.map((image) => [image.id, image]));
        return imageOrderRef.current.flatMap((id) => {
          const existing = existingById.get(id);
          if (existing) return [replacementByExistingId.get(existing.id)?.uploadedUrl || existing.url];
          const pending = pendingById.get(id);
          return pending?.uploadedUrl ? [pending.uploadedUrl] : [];
        });
      } catch (error: unknown) {
        toast.error(`Image upload failed: ${getErrorMessage(error, "Please try again")}`);
        throw error;
      } finally {
        setUploading(false);
      }
    },
  }), [folder, tags]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Product Images</h3>
        <span className="text-[10px] font-mono text-zinc-300">{displayImages.length} Files</span>
      </div>

      <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-zinc-100 bg-zinc-50 shadow-inner lg:rounded-[2.5rem]">
        {displayImages[0] ? <img src={displayImages[0].src} alt="Main product" className="h-full w-full object-cover" /> : <div className="flex h-full w-full flex-col items-center justify-center gap-6 text-zinc-200"><ImageIcon size={64} strokeWidth={1} /><span className="text-[10px] font-bold uppercase tracking-widest">No Image Found</span></div>}
      </div>

      <div className="space-y-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={imageOrder} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-3 overflow-x-auto pb-3 pt-1 [scrollbar-width:thin] sm:gap-4">
              {displayImages.map((image, index) => <SortableThumbnail key={image.id} image={image} index={index} busy={busy} onEdit={() => image.existing ? editExistingImage(image.existing) : image.pending && editPendingImage(image.pending.id)} onRemove={() => removeDisplayImage(image)} />)}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex flex-wrap gap-2">
          <input type="text" value={newImageUrl} onChange={(event) => setNewImageUrl(event.target.value)} onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addImageUrl())} placeholder="Enter image URL..." className="min-w-[150px] flex-1 rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm font-bold text-black outline-none transition-all focus:border-black/10 focus:shadow-xl focus:shadow-zinc-100" />
          <button type="button" onClick={addImageUrl} disabled={busy} className="rounded-2xl bg-black p-3 text-white transition-all hover:bg-zinc-800 disabled:opacity-50"><Plus size={20} /></button>
          <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-zinc-100 p-3 text-black transition-all hover:bg-zinc-200"><input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={selectFiles} disabled={busy} />{processing ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}{processing ? "Preparing..." : "Select images"}</label>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm"><span><strong className="block text-xs text-black">Remove image background before editing</strong><span className="text-[10px] text-zinc-400">Applies to the next selected batch, before the crop editor opens.</span></span><input type="checkbox" checked={removeBackgroundEnabled} onChange={(event) => setRemoveBackgroundEnabled(event.target.checked)} disabled={busy} className="h-5 w-5 accent-black" /></label>
        {pendingImages.length > 0 && <p className="rounded-xl bg-zinc-50 px-4 py-3 text-[10px] leading-4 text-zinc-500">New and edited images stay local until you save the product. ImageKit receives only the final version shown here.</p>}
        {uploading && <div className="flex items-center gap-2 rounded-xl bg-black px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white"><Loader2 size={14} className="animate-spin" /> Uploading final images to ImageKit...</div>}
      </div>

      <ImageCropEditor key={editingImage?.id || "closed-image-editor"} open={Boolean(editingImage)} sourceUrl={editingImage?.previewUrl || ""} sourceFile={editingImage?.file || null} onCancel={cancelEditor} onApply={applyCrop} />
    </>
  );
});

ProductImageUpload.displayName = "ProductImageUpload";

export default ProductImageUpload;
