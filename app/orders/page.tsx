'use client';

import { useEffect, useState } from 'react';
import { account } from '@/lib/appwriteConfig';
import { motion } from 'framer-motion';
import { Package, Clock, CheckCircle, XCircle, ShoppingBag, Truck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getImageUrl } from '@/lib/getImageUrl';
import { parseOrderPayload } from '@/lib/orderPayload';
import { getCustomerOrders } from '@/lib/customerOrders';

interface Order {
  $id: string;
  userId: string;
  items: any[];
  total: number;
  address: string;
  phone: string;
  status: string;
  createdAt: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        await account.get();
        setIsAuthenticated(true);

        const orderRes = await getCustomerOrders();

        const parsedOrders: Order[] = orderRes.documents.map((doc: any) => {
          const parsedPayload = parseOrderPayload(doc.items);
          const parsedItems = parsedPayload.lineItems;

          return {
            $id: doc.$id,
            userId: doc.userId,
            items: parsedItems,
            total: doc.total,
            address: doc.address,
            phone: doc.phone,
            status: doc.status || parsedPayload.status || 'paid',
            createdAt: doc.createdAt || doc.$createdAt,
          };
        });

        setOrders(parsedOrders);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        setError(err instanceof Error ? err.message : 'Could not load your orders.');
        // If error is 401, user is not logged in.
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'processing': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'out_for_delivery': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': 
      case 'delivered': return <CheckCircle size={14} />;
      case 'pending': return <Clock size={14} />;
      case 'processing': return <Loader2 size={14} className="animate-spin" />;
      case 'out_for_delivery': return <Truck size={14} />;
      case 'cancelled': return <XCircle size={14} />;
      default: return <Package size={14} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-black" size={32} />
      </div>
    );
  }

  if (!isAuthenticated && !loading) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm border max-w-md w-full">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="text-gray-400" size={32} />
                </div>
                <h1 className="text-2xl font-bold mb-2">Sign in to view orders</h1>
                <p className="text-gray-500 mb-6">You need to be logged in to view your order history.</p>
                <Link href="/signin?redirect=/orders" className="bg-black text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors inline-block w-full">
                    Sign In
                </Link>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-12 text-center">
             <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
             >
                <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
                <p className="text-gray-500">Track and manage your recent purchases</p>
             </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {error ? <p role="alert" className="rounded-xl bg-amber-50 p-6 text-amber-900">{error}</p> : orders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100"
          >
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Looks like you haven't placed any orders yet. 
              Start shopping to see your orders here.
            </p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-gray-900 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Start Shopping
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {orders.map((order, index) => (
              <motion.div
                key={order.$id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Order Header */}
                <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex flex-wrap gap-4 justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Order ID</span>
                        <span className="font-mono text-sm font-medium text-gray-900">#{order.$id.substring(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Date placed</span>
                        <span className="text-sm font-medium text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex flex-col text-right ml-auto">
                         <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Total Amount</span>
                         <span className="font-bold text-gray-900">₦{order.total?.toLocaleString()}</span>
                    </div>
                </div>

                {/* Items */}
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wide ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            {order.status.replaceAll('_', ' ')}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4 py-2">
                                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 relative">
                                    {item.imageUrl ? (
                                        <img
                                            src={getImageUrl(item.imageUrl)}
                                            alt={item.name || 'Product'}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                                            <Package size={20} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-grow">
                                    <h3 className="font-medium text-gray-900 line-clamp-1">{item.name || 'Unnamed Product'}</h3>
                                    <p className="text-sm text-gray-500">Qty: {item.quantity || 1}</p>
                                </div>
                                <div className="text-right font-medium text-gray-900">
                                    ₦{(item.price * (item.quantity || 1)).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer / Actions */}
                    <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                         <div className="text-sm text-gray-500 flex items-start gap-2">
                            <Truck size={16} className="mt-0.5 text-gray-400" />
                            <div>
                                <p className="font-medium text-gray-700">Delivery Address</p>
                                <p className="max-w-xs">{order.address}</p>
                            </div>
                         </div>
                    </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
