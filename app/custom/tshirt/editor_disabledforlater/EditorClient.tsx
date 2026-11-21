"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { storage, databases } from "@/lib/appwriteConfig";
import { Query } from "appwrite";

export default function EditorClient() {
  const canvasRef = useRef<any | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const colorSlug = (searchParams?.get("color")?.toLowerCase()) || "black";
  const size = searchParams?.get("size") || "M";

  const [Fabric, setFabric] = useState<any>(null);
  const [shirtFileId, setShirtFileId] = useState<string | null>(null);
  const [textValue, setTextValue] = useState("");

  // Dynamically import Fabric
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("fabric").then((mod) => setFabric((mod as any).fabric || mod.default || mod));
      console.log("Fabric loaded");
    }
  }, []);

  // Fetch product and file ID with pagination
  useEffect(() => {
    async function fetchShirtFile() {
      try {
        const res = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_COLLECTION_ID!,
          [Query.equal("Name", "Plain Custom Tees")]
        );

        if (!res.documents.length) return console.error("Product not found");
        const productDoc = res.documents[0];
        const productSlug = productDoc.Name.toLowerCase().replace(/\s+/g, "");

        const bucketId = (process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "storefront_media");
        let allFiles: any[] = [];
        let offset = 0;
        const limit = 25;
        let hasMore = true;

        while (hasMore) {
          const resFiles = await storage.listFiles(bucketId, [
            Query.limit(limit),
            Query.offset(offset),
          ]);
          allFiles = allFiles.concat(resFiles.files);

          if (resFiles.total <= offset + limit) hasMore = false;
          else offset += limit;
        }

        console.log("Total files fetched:", allFiles.length);

        const file = allFiles.find(
          (f: any) => f.name.toLowerCase() === `${productSlug}_${colorSlug}.png`
        );

        if (!file) return console.error("No matching file found for this color!");
        setShirtFileId(file.$id);
        console.log("Shirt file ID fetched:", file.$id);
      } catch (err) {
        console.error("Error fetching shirt file:", err);
      }
    }

    fetchShirtFile();
  }, [colorSlug]);

  // Initialize Fabric canvas & set shirt image
  useEffect(() => {
    if (!Fabric || !canvasContainerRef.current || !shirtFileId) return;

    console.log("Initializing Fabric canvas...");
    const canvas = new Fabric.Canvas("tshirt-canvas", {
      width: 600,
      height: 600,
      backgroundColor: "#fff",
      selection: true,
    });
    canvasRef.current = canvas;

    const bucketId = (process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "storefront_media");
    const fileUrl = storage.getFileView(bucketId, shirtFileId);

    console.log("Loading shirt image from URL:", fileUrl);

    Fabric.Image.fromURL(
      fileUrl,
      (img: any) => {
        const scaleX = canvas.width / img.width;
        const scaleY = canvas.height / img.height;

        img.set({
          left: 0,
          top: 0,
          selectable: false,
          evented: false,
          scaleX,
          scaleY,
        });

        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        console.log("Shirt image set as background!");
      },
      { crossOrigin: "anonymous" }
    );

    return () => canvas.dispose();
  }, [Fabric, shirtFileId]);

  // Add draggable/resizable text
  const addText = () => {
    if (!canvasRef.current || !Fabric || !textValue) return;

    const text = new Fabric.Textbox(textValue, {
      left: 100,
      top: 100,
      fontSize: 40,
      fill: "#000",
      fontFamily: "Arial",
      editable: true,
      cornerColor: "#000",
      borderColor: "#000",
      cornerStrokeColor: "#000",
      padding: 5,
      transparentCorners: false,
    });

    canvasRef.current.add(text);
    canvasRef.current.setActiveObject(text);
    setTextValue("");
  };

  // Save design as PNG
  const saveDesign = () => {
    if (!canvasRef.current) return;
    const dataURL = canvasRef.current.toDataURL({ format: "png", quality: 1 });
    console.log("Design DataURL:", dataURL);
    alert("Design ready! Check console for DataURL.");
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center p-6">
      <h1 className="text-4xl font-bold mb-6">Design Your T-Shirt ({size}, {colorSlug})</h1>

      <div ref={canvasContainerRef} className="border border-black w-[600px] h-[600px] mb-6">
        <canvas id="tshirt-canvas" className="w-full h-full" />
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Add text"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          className="border border-black px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
        />
        <button
          onClick={addText}
          className="px-5 py-2 border border-black rounded-md hover:bg-black hover:text-white transition"
        >
          Add Text
        </button>
      </div>

      <button
        onClick={saveDesign}
        className="px-6 py-3 border border-black rounded-md hover:bg-black hover:text-white transition"
      >
        Save Design
      </button>
    </div>
  );
}
