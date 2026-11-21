"use client";

import { upload } from "@imagekit/next";

const DEFAULT_URL_ENDPOINT = "";

export type ImageKitUploadResult = {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  fileType?: string;
  height?: number;
  width?: number;
  size?: number;
};

export const imageKitUrlEndpoint =
  process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || DEFAULT_URL_ENDPOINT;

export async function uploadAdminMedia({
  file,
  folder,
  tags = [],
  onProgress,
}: {
  file: File;
  folder: string;
  tags?: string[];
  onProgress?: (progress: number) => void;
}) {
  const authResponse = await fetch("/api/imagekit/auth", {
    cache: "no-store",
  });
  const auth = await authResponse.json();

  if (!authResponse.ok) {
    throw new Error(auth.error || "Could not authorize ImageKit upload");
  }

  const result = await upload({
    file,
    fileName: file.name,
    folder,
    tags,
    useUniqueFileName: true,
    publicKey: auth.publicKey,
    signature: auth.signature,
    expire: auth.expire,
    token: auth.token,
    onProgress: (event) => {
      if (!event.total) return;
      onProgress?.(Math.round((event.loaded / event.total) * 100));
    },
  });

  if (!result.url || !result.fileId) {
    throw new Error("ImageKit did not return a usable asset URL");
  }

  return result as ImageKitUploadResult;
}
