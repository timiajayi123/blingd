"use client";

import { motion } from "framer-motion";

export default function ProductSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-3"
    >
      <div className="w-full aspect-square bg-gray-100 rounded overflow-hidden" />
      <div className="h-4 bg-gray-100 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
      <div className="mt-auto flex gap-2">
        <div className="flex-1 h-10 bg-gray-100 rounded" />
        <div className="w-14 h-10 bg-gray-100 rounded" />
      </div>
    </motion.div>
  );
}
