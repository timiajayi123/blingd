import { Suspense } from "react";
import TrackOrderContent from "./TrackOrderContent";

export const dynamic = "force-dynamic";

export default function TrackOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-4 border-gray-200 border-t-black rounded-full"></div>
      </div>
    }>
      <TrackOrderContent />
    </Suspense>
  );
}
