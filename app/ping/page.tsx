"use client";

import { useState } from "react";
import { account } from "@/lib/appwriteConfig";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Signal, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function PingPage() {
  const [status, setStatus] = useState<"idle" | "pinging" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<any>(null);

  const sendPing = async () => {
    setStatus("pinging");
    setMessage("INITIATING HANDSHAKE...");
    
    try {
      // account.get() is the best way to verify the connection
      // If it returns anything (even 401 Guest), the endpoint and project ID are valid
      const result = await account.get();
      setStatus("success");
      setMessage("CONNECTION ESTABLISHED");
      setDetails(result);
    } catch (err: any) {
      // If it's a 401, it actually means the connection is WORKING (you're just a guest)
      if (err.code === 401) {
        setStatus("success");
        setMessage("CONNECTION ESTABLISHED (GUEST_MODE)");
        setDetails({ status: "Online", mode: "Guest", endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT });
      } else {
        setStatus("error");
        setMessage("CONNECTION REFUSED");
        setDetails({ 
          code: err.code, 
          type: err.type, 
          message: err.message,
          endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT 
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full border-2 border-white/10 bg-zinc-950 p-8 shadow-[20px_20px_0px_0px_rgba(255,255,255,0.05)] relative overflow-hidden">
        {/* Background Decorative Grid */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
            <Terminal className="w-6 h-6" />
            <h1 className="text-xl font-black uppercase tracking-[0.3em]">System_Connectivity_Test</h1>
          </div>

          <div className="mb-12 space-y-4">
            <p className="text-sm text-zinc-400 leading-relaxed">
              Target: <span className="text-white">{process.env.NEXT_PUBLIC_APPWRITE_PROJECT_NAME || "BLING’D"}</span><br />
              Endpoint: <span className="text-zinc-500 text-xs">{process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1"}</span>
            </p>
          </div>

          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/5 bg-black/50 mb-8">
            <AnimatePresence mode="wait">
              {status === "idle" && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-6"
                >
                  <div className="w-20 h-20 rounded-full border-2 border-white/20 flex items-center justify-center">
                    <Signal className="w-10 h-10 text-white/40" />
                  </div>
                  <button
                    onClick={sendPing}
                    className="px-12 py-4 bg-white text-black font-black uppercase italic hover:bg-zinc-200 transition-colors tracking-tighter"
                  >
                    SEND_PING
                  </button>
                </motion.div>
              )}

              {status === "pinging" && (
                <motion.div
                  key="pinging"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-6"
                >
                  <Loader2 className="w-12 h-12 animate-spin text-white" />
                  <p className="text-sm animate-pulse tracking-[0.2em]">{message}</p>
                </motion.div>
              )}

              {status === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-6 text-center"
                >
                  <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-white" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-black uppercase italic tracking-tighter">{message}</p>
                    <pre className="text-[10px] text-zinc-500 bg-zinc-900 p-4 rounded text-left overflow-auto max-h-40 max-w-full">
                      {JSON.stringify(details, null, 2)}
                    </pre>
                  </div>
                  <button
                    onClick={() => setStatus("idle")}
                    className="text-xs uppercase underline decoration-white/20 hover:text-zinc-400"
                  >
                    RETEST_CONNECTION
                  </button>
                </motion.div>
              )}

              {status === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-6 text-center"
                >
                  <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                    <XCircle className="w-12 h-12 text-red-500" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-black uppercase italic tracking-tighter text-red-500">{message}</p>
                    <pre className="text-[10px] text-red-400/60 bg-red-500/5 p-4 rounded text-left overflow-auto max-h-40 max-w-full">
                      {JSON.stringify(details, null, 2)}
                    </pre>
                  </div>
                  <button
                    onClick={() => setStatus("idle")}
                    className="px-8 py-3 border-2 border-white/10 hover:bg-white/5 transition-colors uppercase italic font-black text-sm"
                  >
                    DIAGNOSE_FAILURE
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex justify-between items-center text-[10px] text-zinc-600 uppercase tracking-widest">
            <span>Auth_v2.1</span>
            <Link href="/" className="hover:text-white transition-colors underline">Return_to_Dashboard</Link>
            <span>STOREFRONT_SYSTEMS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
