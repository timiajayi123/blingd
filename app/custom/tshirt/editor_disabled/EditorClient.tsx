"use client";

import React from "react";

export default function EditorClient() {
  // Minimal scaffold for a fresh editor rebuild.
  // All previous editor UI has been removed per request.

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-3xl w-full text-center">
        <h2 className="text-2xl font-semibold mb-4">Editor scaffold (clean slate)</h2>
        <p className="text-sm text-gray-600 mb-6">Previous editor UI removed. This is a placeholder for the new builder (masked print area, layers, 3D preview).</p>

        <div className="border border-dashed rounded-md p-8">
          <div className="text-gray-400">Editor canvas placeholder</div>
          <div className="mt-4 text-xs text-gray-400">Start implementing the new tools here.</div>
        </div>

        <div className="mt-6">
          <a href="/custom/tshirt" className="text-sm text-blue-600 hover:underline">Back to Custom T‑shirt</a>
        </div>
      </div>
    </div>
  );
}
