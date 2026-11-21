"use client";

const MAX_IMAGE_EDGE = 4096;
const MAX_IMAGE_PIXELS = 16_000_000;
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export type PreparedImage = {
  file: File;
  optimized: boolean;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
};

export function getImageKitSafeDimensions(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("The selected image has invalid dimensions.");
  }

  const edgeScale = Math.min(MAX_IMAGE_EDGE / width, MAX_IMAGE_EDGE / height, 1);
  const pixelScale = Math.min(Math.sqrt(MAX_IMAGE_PIXELS / (width * height)), 1);
  const scale = Math.min(edgeScale, pixelScale);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("The browser could not optimize this image.")),
      "image/webp",
      quality,
    );
  });
}

function webpFileName(name: string) {
  const base = name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-") || "storefront-background";
  return `${base}.webp`;
}

/**
 * ImageKit cannot transform source images above its megapixel processing
 * limit. Resize very large storefront images before they reach ImageKit and
 * also re-encode unusually large files for faster uploads and delivery.
 */
export async function prepareImageKitImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a JPG, PNG, or WebP image file.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This image could not be opened. Try exporting it as JPG, PNG, or WebP.");
  }

  try {
    const dimensions = getImageKitSafeDimensions(bitmap.width, bitmap.height);
    const needsResize = dimensions.width !== bitmap.width || dimensions.height !== bitmap.height;
    const needsCompression = file.size > MAX_UPLOAD_BYTES;

    if (!needsResize && !needsCompression) {
      return {
        file,
        optimized: false,
        originalWidth: bitmap.width,
        originalHeight: bitmap.height,
        width: bitmap.width,
        height: bitmap.height,
      };
    }

    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("The browser could not prepare this image.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);

    let blob = await canvasToBlob(canvas, 0.88);
    for (const quality of [0.8, 0.72, 0.64]) {
      if (blob.size <= MAX_UPLOAD_BYTES) break;
      blob = await canvasToBlob(canvas, quality);
    }

    return {
      file: new File([blob], webpFileName(file.name), {
        type: "image/webp",
        lastModified: Date.now(),
      }),
      optimized: true,
      originalWidth: bitmap.width,
      originalHeight: bitmap.height,
      width: dimensions.width,
      height: dimensions.height,
    };
  } finally {
    bitmap.close();
  }
}
