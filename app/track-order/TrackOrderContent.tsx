"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Package, MapPin, Truck, CheckCircle2, AlertCircle, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { parseOrderPayload } from "@/lib/orderPayload";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  size?: string;
  selectedSize?: string;
  image?: string;
  imageUrl?: string;
}

interface Order {
  $id: string;
  phone: string;
  address: string;
  total: number;
  items: OrderItem[] | string;
  status: string;
  $createdAt: string;
}

export default function TrackOrderContent() {
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.hash.slice(1)).has('token')) {
      setOrderId(window.location.href);
      void handleSearch(undefined, window.location.href);
    }
  }, []);

  const handleSearch = async (e?: React.FormEvent, privateLink = orderId) => {
    if (e) e.preventDefault();
    if (!privateLink.trim()) return;

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const link = new URL(privateLink.trim());
      const lookupId = link.searchParams.get('orderId');
      const token = new URLSearchParams(link.hash.slice(1)).get('token');
      if (!lookupId || !token) throw new Error('Use the private tracking link from your confirmation email.');
      const response = await fetch(`/api/orders?orderId=${encodeURIComponent(lookupId)}`, {
        headers: { 'x-order-token': token }, cache: 'no-store',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Order not found. Please check your ID.");
      }
      
      const data = await response.json();
      setOrder(data);
    } catch (err: any) {
      console.error("Tracking error:", err);
      setError(err.message || "Failed to fetch order details. Please verify your Order ID.");
    } finally {
      setLoading(false);
    }
  };

  const parseItems = (items: OrderItem[] | string): OrderItem[] => {
    return parseOrderPayload(items).lineItems;
  };

  const getStatusStep = (status?: string) => {
    const s = (status || "paid").toLowerCase();
    if (s.includes("delivered")) return 5;
    if (s.includes("out_for_delivery")) return 4;
    if (s.includes("shipped")) return 3;
    if (s.includes("processing")) return 2;
    return 1;
  };

  const currentStep = order ? getStatusStep(order.status) : 0;

  return (
    <div className="min-h-screen bg-[#fcfcfc] pt-32 pb-20 px-4 sm:px-6 text-zinc-950">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-2xl mb-6 shadow-xl shadow-black/10"
          >
            <Package className="text-white w-8 h-8" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-black italic uppercase tracking-tighter text-black mb-4"
          >
            Track Order
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-500 text-sm font-bold uppercase tracking-[0.2em]"
          >
            Open your private tracking link to view status
          </motion.p>
        </div>

        {/* Search Input */}
        <motion.form 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleSearch}
          className="relative max-w-xl mx-auto mb-16"
        >
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-black transition-colors" size={20} />
            <input 
              type="text"
              placeholder="PASTE YOUR PRIVATE TRACKING LINK"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full bg-white border-2 border-zinc-100 h-16 pl-16 pr-32 rounded-2xl text-sm font-bold uppercase tracking-widest text-zinc-950 placeholder:text-zinc-300 focus:border-black transition-all outline-none shadow-sm"
            />
            <button 
              type="submit"
              disabled={loading || !orderId.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black text-white h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 disabled:bg-zinc-200 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Verify"}
              {!loading && <ArrowRight size={14} />}
            </button>
          </div>
          <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 leading-relaxed">
            Use the private link in your confirmation email. Keep it safe—anyone with the link can view your order. For older orders or an expired link, contact support.
          </p>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 right-0 mt-4 flex items-center justify-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest"
            >
              <AlertCircle size={14} />
              {error}
            </motion.div>
          )}
        </motion.form>

        <AnimatePresence mode="wait">
          {order ? (
            <motion.div
              key="order-results"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              className="space-y-8"
            >
              {/* Order Status Timeline */}
              <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em] mb-2">Order_Reference</p>
                    <h2 className="text-xl font-black font-mono">#{order.$id}</h2>
                  </div>
                  <div className="bg-green-50 text-green-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 size={14} />
                    Payment Paid
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="relative flex justify-between items-center max-w-2xl mx-auto mb-12">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-zinc-50 -z-10" />
                  <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-black transition-all duration-1000 -z-10" 
                    style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
                  />
                  
                  {[
                    { label: "Paid", icon: CheckCircle2, step: 1 },
                    { label: "Processing", icon: Package, step: 2 },
                    { label: "Shipped", icon: Truck, step: 3 },
                    { label: "Out for delivery", icon: Truck, step: 4 },
                    { label: "Delivered", icon: ShoppingBag, step: 5 },
                  ].map((s) => (
                    <div key={s.label} className="flex flex-col items-center gap-4 bg-[#fcfcfc] px-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${
                        currentStep >= s.step ? "bg-black border-black text-white shadow-xl shadow-black/20" : "bg-white border-zinc-100 text-zinc-300"
                      }`}>
                        <s.icon size={20} strokeWidth={2.5} />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        currentStep >= s.step ? "text-black" : "text-zinc-300"
                      }`}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {/* Items */}
                <div className="md:col-span-2 bg-white border border-zinc-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em]">Order_Items</h3>
                    <span className="text-[10px] font-bold text-zinc-400">{parseItems(order.items).length} Units</span>
                  </div>
                  <div className="divide-y divide-zinc-50">
                    {parseItems(order.items).map((item, i) => {
                      const imageSrc = item.imageUrl || item.image;
                      const size = item.size || item.selectedSize;

                      return (
                        <div key={i} className="p-6 flex items-center gap-6 hover:bg-zinc-50 transition-colors">
                          <div className="w-20 h-20 bg-zinc-100 rounded-2xl overflow-hidden flex-shrink-0 border border-zinc-100">
                            {imageSrc ? (
                              <img src={imageSrc} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                <Package size={22} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black uppercase tracking-tight truncate">{item.name}</h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Qty: {item.quantity}</span>
                              {size && (
                                <>
                                  <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Size: {size}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black italic">₦{item.price.toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-8 bg-zinc-50/50 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Total_Value</span>
                    <span className="text-2xl font-black italic">₦{order.total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Delivery Info */}
                <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 shadow-sm h-fit">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-8">Shipping_Info</h3>
                  <div className="space-y-8">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <MapPin size={18} className="text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Destination</p>
                        <p className="text-xs font-bold leading-relaxed">{order.address}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Truck size={18} className="text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Contact</p>
                        <p className="text-xs font-bold leading-relaxed">{order.phone}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : !loading && (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 opacity-20"
            >
              <ShoppingBag className="w-20 h-20 mx-auto mb-6" strokeWidth={1} />
              <p className="text-xs font-black uppercase tracking-[0.5em]">Awaiting_Input</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
