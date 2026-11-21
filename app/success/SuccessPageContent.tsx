"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Config } from "@/lib/appwriteConfig";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Check, Download, ShoppingBag, MapPin, Truck, Package, Home } from "lucide-react";
import Link from "next/link";
import { getImageUrl } from "@/lib/getImageUrl";
import { parseOrderPayload } from "@/lib/orderPayload";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  image?: string;
  imageUrl?: string;
  selectedSize?: string;
  size?: string;
}

interface Order {
  $id: string;
  phone: string;
  address: string;
  total?: number;
  items: OrderItem[] | string;
  deliveryOption?: string;
  status?: string;
}

const SuccessPageContent = () => {
  const params = useSearchParams();
  const orderId = params?.get("orderId") ?? null;
  const collectionId = params?.get("cId") ?? Config.ordersCollectionId;
  const databaseId = params?.get("dbId") ?? Config.databaseId;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // ✅ Fetch order details from Appwrite with retry logic
  useEffect(() => {
    const fetchOrder = async (retries = 5) => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      // 🛠️ MOCK MODE FOR TESTING
      if (orderId === "mock") {
        setOrder({
          $id: "MOCK-ORDER-123",
          phone: "08123456789",
          address: "123 Developer Lane, Lagos, Nigeria",
          total: 45000,
          items: [
            { name: "Premium Cotton T-Shirt", price: 15000, quantity: 2, image: "" },
            { name: "Classic Cap", price: 5000, quantity: 1, image: "" },
            { name: "Running Sneakers", price: 10000, quantity: 1, image: "" },
          ],
          deliveryOption: "Express Delivery",
          status: "pending",
        });
        setLoading(false);
        return;
      }

      try {
        console.log(`[Success] Fetching order ${orderId} via internal proxy (Attempt ${6 - retries})`);
        
        const token = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
        const response = await fetch(`/api/orders?orderId=${encodeURIComponent(orderId)}`, {
          headers: { 'x-order-token': token }, cache: 'no-store',
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const res = await response.json();
        setOrder(res as unknown as Order);
        setLoading(false);
        setError(null);
      } catch (err: any) {
        console.error(`Error fetching order (Attempt ${6 - retries}):`, err);
        
        // If it's a 404, we retry as it might be an indexing delay
        if (retries > 0 && (err.code === 404 || err.status === 404)) {
          console.log(`Order not found yet, retrying in 3 seconds...`);
          setTimeout(() => fetchOrder(retries - 1), 3000);
        } else {
          setError(err.message || "Failed to load order details");
          setLoading(false);
          toast.error(`❌ Failed to load order details: ${err.message || "Unknown error"}`);
        }
      }
    };

    setLoading(true);
    fetchOrder();
  }, [orderId, collectionId, databaseId, retryCount]);

  // ✅ Extract items
  const items: OrderItem[] = parseOrderPayload(order?.items).lineItems;

  const total =
    order?.total ??
    items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // ✅ Generate branded receipt via Puppeteer route
  const downloadReceipt = async () => {
    if (!order) return;

    const toastId = toast.loading("Generating receipt...");

    try {
      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.$id,
          phone: order.phone,
          address: order.address,
          total,
          deliveryOption: order.deliveryOption || "Standard Delivery",
          items,
        }),
      });

      if (!res.ok) throw new Error("Receipt generation failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt_${order.$id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("✅ Receipt downloaded successfully!", { id: toastId });
    } catch (err) {
      console.error("Receipt generation error:", err);
      toast.error("❌ Failed to generate receipt.", { id: toastId });
    }
  };

  // ✅ Loading state
  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <div className="animate-spin h-10 w-10 border-4 border-gray-200 border-t-black rounded-full mb-4"></div>
        <p className="animate-pulse">Loading your order details...</p>
      </div>
    );

  // ✅ Error state
  if (error || !order)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <ShoppingBag size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
        <p className="text-gray-500 max-w-xs mb-2">
          {error ? `Error: ${error}` : "We couldn't find the order details for the provided ID."}
        </p>
        <div className="bg-gray-100 p-3 rounded-lg text-[10px] font-mono text-gray-400 mb-6 max-w-sm overflow-hidden truncate">
          DB: {databaseId} <br />
          Coll: {collectionId} <br />
          ID: {orderId}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setRetryCount(prev => prev + 1)}
            className="px-6 py-2 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-all"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
          >
            Go Home
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        {/* Success Header */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Check className="w-10 h-10 text-green-600" strokeWidth={3} />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Successful!</h1>
          <p className="text-gray-600 max-w-md mx-auto mb-4">
            Thank you for shopping with <span className="font-semibold text-black">BLING’D</span>. 
            Your order <span className="font-mono font-medium text-black">#{order.$id.substring(0, 8)}</span> has been placed.
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 max-w-md mx-auto flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-500 mt-0.5" />
            <p className="text-sm text-blue-700 text-left">
              <span className="font-bold">Check your email:</span> We've sent an order confirmation with full details to your inbox. Please check your spam folder if you don't see it.
            </p>
          </div>
          <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-4 max-w-md mx-auto flex items-start gap-3">
            <Truck className="w-5 h-5 text-amber-600 mt-0.5" />
            <p className="text-sm text-amber-800 text-left">
              <span className="font-bold">Delivery timeline:</span> Once your order is being processed, please allow 10–14 working days for delivery.
            </p>
          </div>
        </div>

        {/* Order Progress */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 overflow-hidden">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 -z-10" />
            <div className="flex flex-col items-center gap-2 bg-white px-2 z-10">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shadow-md">
                <Check size={16} />
              </div>
              <span className="text-xs font-medium text-green-600">Placed</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-white px-2 z-10">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center border border-gray-200">
                <Package size={16} />
              </div>
              <span className="text-xs font-medium text-gray-400">Processing</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-white px-2 z-10">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center border border-gray-200">
                <Truck size={16} />
              </div>
              <span className="text-xs font-medium text-gray-400">Shipped</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Order Details */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ShoppingBag size={18} className="text-gray-400" />
                  Order Items
                </h2>
                <span className="text-sm text-gray-500">{items.length} items</span>
              </div>
              <div className="divide-y divide-gray-50">
                {items.map((item, i) => (
                  <div key={i} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                      <img
                        src={getImageUrl(item.imageUrl || item.image || "/placeholder.svg")}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        {(item.selectedSize || item.size) && (
                          <>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <p className="text-sm font-bold text-black uppercase">Size: {item.selectedSize || item.size}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₦{item.price.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 p-6 border-t border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₦{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">Delivery</span>
                  <span className="font-medium">Free</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-xl text-green-600">₦{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-gray-400" />
                Delivery Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase text-gray-400 font-bold tracking-wider">Address</label>
                  <p className="text-sm text-gray-700 mt-1 leading-relaxed">{order.address}</p>
                </div>
                <div>
                  <label className="text-xs uppercase text-gray-400 font-bold tracking-wider">Contact</label>
                  <p className="text-sm text-gray-700 mt-1">{order.phone}</p>
                </div>
                <div>
                  <label className="text-xs uppercase text-gray-400 font-bold tracking-wider">Method</label>
                  <p className="text-sm text-gray-700 mt-1">{order.deliveryOption || "Standard Delivery"}</p>
                </div>
              </div>
            </div>

            <button
              onClick={downloadReceipt}
              className="w-full bg-black text-white hover:bg-gray-800 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Download size={18} />
              Download Receipt
            </button>

            <Link 
              href="/"
              className="w-full bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Home size={18} />
              Continue Shopping
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SuccessPageContent;
