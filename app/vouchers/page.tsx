'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Tag, AlertCircle, CheckCircle, Copy, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function VouchersPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.coupon);
        toast.success('Coupon found!');
      } else {
        setError(data.error || 'Invalid coupon');
        toast.error(data.error || 'Invalid coupon');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to validate coupon');
      toast.error('Failed to validate coupon');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (result?.code) {
      navigator.clipboard.writeText(result.code);
      toast.success('Code copied to clipboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="mx-auto w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-4 shadow-lg rotate-3 hover:rotate-6 transition-transform">
            <Tag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Voucher Lookup</h1>
          <p className="text-gray-500">
            Enter your voucher code below to verify its status and details.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8"
        >
          <form onSubmit={checkCoupon} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Coupon Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SUMMER20"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all outline-none font-mono text-lg uppercase placeholder:normal-case placeholder:text-gray-400"
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-900 focus:ring-4 focus:ring-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Verify Code
                </>
              )}
            </button>
          </form>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6"
              >
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 text-red-700">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm">Verification Failed</h3>
                    <p className="text-sm opacity-90">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6"
              >
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <CheckCircle className="w-24 h-24 text-emerald-600" />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-1 rounded">
                        Active Coupon
                      </span>
                      <button 
                        onClick={copyCode}
                        className="text-emerald-700 hover:bg-emerald-100 p-1.5 rounded-lg transition-colors"
                        title="Copy Code"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-1 font-mono tracking-tight">
                      {result.code}
                    </h3>
                    
                    <div className="text-lg font-medium text-emerald-700 mb-4">
                      {result.discountPercent}% OFF
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      {result.expiresAt && (
                        <div className="flex justify-between">
                          <span>Expires:</span>
                          <span className="font-medium">
                            {new Date(result.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {result.limit > 0 && (
                        <div className="flex justify-between">
                          <span>Remaining Uses:</span>
                          <span className="font-medium">
                            {Math.max(0, result.limit - result.used)} / {result.limit}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <p className="text-center text-xs text-gray-400 mt-4">
                  Copy this code and use it at checkout to claim your discount.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Security Note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
             <ShieldCheck className="w-3 h-3" />
             Secure Verification System
          </p>
        </div>
      </div>
    </div>
  );
}
