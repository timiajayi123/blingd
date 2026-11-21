import { Loader2 } from "lucide-react";

export default function AdminPageLoader({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`flex min-h-[55vh] flex-col items-center justify-center gap-4 text-zinc-400 ${className}`}>
      <Loader2 className="animate-spin" size={28} />
      <span className="text-[10px] font-bold uppercase tracking-[0.25em]">{label}</span>
    </div>
  );
}
