"use client";

export async function removeImageBackground(file: File) {
  const { removeBackground } = await import("@imgly/background-removal");
  const blob = await removeBackground(file, {
    model: "isnet_quint8",
    output: { format: "image/png", quality: 0.9 },
  });
  const baseName = file.name.replace(/\.[^.]+$/, "") || "product-image";
  return new File([blob], `${baseName}-no-background.png`, {
    type: "image/png",
    lastModified: Date.now(),
  });
}
