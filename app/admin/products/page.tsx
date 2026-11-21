'use client';

import React, { useEffect, useState } from 'react';
import { getImageUrl } from '@/lib/getImageUrl';
import { formatCurrency } from '@/lib/utils';
import { Copy, Edit2, Plus, Search, Filter, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import AdminPageLoader from '@/components/admin/AdminPageLoader';

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSensitive, setShowSensitive] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'list',
          collection: 'products',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch products');
      }

      const res = await response.json();
      setProducts(res.documents);
    } catch (err: any) {
      console.error('Failed to fetch inventory:', err);
      toast.error(`Error: ${err.message || "Failed to load products."}`);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = products.filter(p => 
    (p.Name || p.name)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 lg:space-y-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 lg:gap-8">
        <div className="space-y-3 lg:space-y-4">
          <h1 className="text-3xl lg:text-5xl font-bold tracking-tight text-black leading-none">
            Products
          </h1>
          <div className="flex flex-wrap items-center gap-3 lg:gap-4">
            <p className="text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              {showSensitive ? `${products.length} Products Found` : '•••• Products Found'}
            </p>
            <button 
              onClick={() => setShowSensitive(!showSensitive)}
              className="p-1 text-zinc-300 hover:text-black transition-colors"
            >
              {showSensitive ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
        </div>
        <Link 
          href="/admin/products/new"
          className="bg-black text-white px-6 lg:px-8 py-3.5 lg:py-4 rounded-2xl font-bold uppercase tracking-widest text-[9px] lg:text-[10px] flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all shadow-lg shadow-black/5"
        >
          <Plus size={16} /> Add New Product
        </Link>
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 lg:gap-4 items-center">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-black transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-zinc-100 pl-14 pr-6 py-4 lg:py-5 rounded-[2rem] text-sm focus:border-black/10 focus:shadow-xl focus:shadow-zinc-100 transition-all outline-none"
          />
        </div>
        <button className="hidden md:flex p-5 bg-white border border-zinc-100 rounded-2xl text-zinc-400 hover:text-black hover:border-zinc-200 transition-all">
          <Filter size={18} />
        </button>
      </div>

      {/* Products Table/Grid */}
      {loading ? (
        <AdminPageLoader label="Loading products" className="min-h-96" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-8">
          {filteredProducts.map((product, idx) => (
            <motion.div
              key={product.$id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white border border-zinc-100 rounded-3xl lg:rounded-[2.5rem] overflow-hidden group hover:shadow-2xl hover:shadow-zinc-200/50 transition-all duration-500 flex flex-row sm:flex-col"
            >
              {/* Image Section */}
              <div className="w-24 sm:w-auto aspect-square sm:aspect-[4/5] relative bg-zinc-50 overflow-hidden m-2 sm:m-4 rounded-2xl sm:rounded-[2rem] flex-shrink-0">
                <Image 
                  src={getImageUrl(product.images?.[0] || product.Images?.[0] || '/placeholder.svg')}
                  alt={product.name || product.Name}
                  fill
                  className="object-cover group-hover:scale-105 transition-all duration-1000 ease-out"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
                
                {/* Duplicate Product (Hover) */}
                <div className="hidden lg:flex absolute top-4 left-4 flex-col gap-2 -translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                  <Link
                    href={`/admin/products/new?duplicate=${encodeURIComponent(product.$id)}`}
                    aria-label={`Duplicate ${product.name || product.Name || 'product'}`}
                    title="Duplicate product"
                    className="w-12 h-12 bg-white text-black flex items-center justify-center rounded-2xl shadow-2xl hover:scale-110 transition-transform"
                  >
                    <Copy size={18} />
                  </Link>
                </div>

                {/* Desktop Edit Button (Hover) */}
                <div className="hidden lg:flex absolute top-4 right-4 flex-col gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                  <Link 
                    href={`/admin/products/${product.$id}`}
                    className="w-12 h-12 bg-white text-black flex items-center justify-center rounded-2xl shadow-2xl hover:scale-110 transition-transform"
                  >
                    <Edit2 size={18} />
                  </Link>
                </div>

                <div className="hidden sm:block absolute bottom-3 lg:bottom-4 left-3 lg:left-4">
                  <span className="px-3 lg:px-4 py-1.5 lg:py-2 bg-white/90 backdrop-blur-md text-[7px] lg:text-[8px] font-bold uppercase tracking-widest text-black rounded-xl shadow-sm border border-zinc-100">
                    {product.category || 'No Category'}
                  </span>
                </div>
              </div>
              
              {/* Content Section */}
              <div className="p-4 sm:p-8 sm:pt-2 space-y-3 sm:space-y-6 flex-1 flex flex-col justify-between min-w-0">
                <div className="space-y-1 lg:space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-black truncate group-hover:text-zinc-600 transition-colors">
                      {product.name || product.Name}
                    </h3>
                    <div className="flex lg:hidden items-center gap-2 flex-shrink-0">
                      <Link
                        href={`/admin/products/new?duplicate=${encodeURIComponent(product.$id)}`}
                        aria-label={`Duplicate ${product.name || product.Name || 'product'}`}
                        title="Duplicate product"
                        className="w-8 h-8 bg-zinc-50 text-black flex items-center justify-center rounded-lg active:scale-95 transition-transform"
                      >
                        <Copy size={14} />
                      </Link>
                      {/* Mobile Edit Button (Always Visible) */}
                      <Link
                        href={`/admin/products/${product.$id}`}
                        className="w-8 h-8 bg-zinc-50 text-black flex items-center justify-center rounded-lg active:scale-95 transition-transform"
                      >
                        <Edit2 size={14} />
                      </Link>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-zinc-400">
                    {showSensitive ? formatCurrency(product.price || product.Price, 'NGN') : '₦••••••'}
                  </p>
                </div>
                
                <div className="flex justify-between items-center pt-3 sm:pt-6 border-t border-zinc-50">
                  <div className="text-[7px] sm:text-[8px] lg:text-[9px] font-bold text-zinc-300 uppercase tracking-widest truncate max-w-[60px] sm:max-w-none">
                    ID: {product.$id.slice(-8)}
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-3">
                    <div className={`w-1 lg:w-1.5 h-1 lg:h-1.5 rounded-full ${(product.stock || 0) > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />
                    <span className="text-[7px] sm:text-[8px] lg:text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                      {showSensitive 
                        ? ((product.stock || 0) > 0 ? `${product.stock} IN STOCK` : 'OUT OF') 
                        : '••••'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
