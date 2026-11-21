'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle, Boxes, Check, Edit2, Minus, Plus, RefreshCcw, Save, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/getImageUrl';
import AdminPageLoader from '@/components/admin/AdminPageLoader';

const LOW_STOCK_LIMIT = 5;

function normalizeProduct(doc: any) {
  const price = Number(doc.Price ?? doc.price ?? 0);
  const stock = Number(doc.stock ?? 0);

  return {
    ...doc,
    displayName: doc.name || doc.Name || 'Unnamed Product',
    displayPrice: price,
    displayStock: Number.isFinite(stock) ? stock : 0,
    displayCategory: doc.category || 'No Category',
    displayImage: doc.images?.[0] || doc.Images?.[0] || doc.image || doc.Image || '/placeholder.svg',
    isComingSoon: doc.comingSoon === true || doc.comingSoon === 'true',
  };
}

export default function AdminStockPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [draftStock, setDraftStock] = useState<Record<string, number>>({});
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list',
          collection: 'products',
          queries: ['orderAsc("name")'],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch products');
      }

      const res = await response.json();
      const normalized = (res.documents || []).map(normalizeProduct);
      setProducts(normalized);
      setDraftStock(Object.fromEntries(normalized.map((product: any) => [product.$id, product.displayStock])));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load stock.');
    } finally {
      setLoading(false);
    }
  }

  const stockStats = useMemo(() => {
    const totalUnits = products.reduce((sum, product) => sum + Number(draftStock[product.$id] ?? product.displayStock), 0);
    const outOfStock = products.filter((product) => Number(draftStock[product.$id] ?? product.displayStock) <= 0).length;
    const lowStock = products.filter((product) => {
      const stock = Number(draftStock[product.$id] ?? product.displayStock);
      return stock > 0 && stock <= LOW_STOCK_LIMIT;
    }).length;

    return { totalUnits, outOfStock, lowStock };
  }, [products, draftStock]);

  const filteredProducts = products.filter((product) => {
    const query = searchTerm.trim().toLowerCase();
    const stock = Number(draftStock[product.$id] ?? product.displayStock);
    const matchesSearch = !query ||
      product.displayName.toLowerCase().includes(query) ||
      product.displayCategory.toLowerCase().includes(query) ||
      product.$id.toLowerCase().includes(query);

    const matchesFilter =
      filter === 'all' ||
      (filter === 'low' && stock > 0 && stock <= LOW_STOCK_LIMIT) ||
      (filter === 'out' && stock <= 0);

    return matchesSearch && matchesFilter;
  });

  const updateDraftStock = (productId: string, value: number) => {
    setDraftStock((prev) => ({
      ...prev,
      [productId]: Math.max(0, Number.isFinite(value) ? value : 0),
    }));
  };

  const saveStock = async (product: any) => {
    const nextStock = Math.max(0, Number(draftStock[product.$id] ?? 0));

    try {
      setSavingIds((prev) => ({ ...prev, [product.$id]: true }));
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          collection: 'products',
          id: product.$id,
          data: { stock: nextStock },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update stock');
      }

      setProducts((prev) => prev.map((item) => (
        item.$id === product.$id ? { ...item, stock: nextStock, displayStock: nextStock } : item
      )));
      toast.success(`${product.displayName} stock updated.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update stock.');
    } finally {
      setSavingIds((prev) => ({ ...prev, [product.$id]: false }));
    }
  };

  const hasChanged = (product: any) => Number(draftStock[product.$id] ?? product.displayStock) !== Number(product.displayStock);

  return (
    <div className="space-y-10 pb-24">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            <Boxes size={14} />
            Inventory Control
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-black lg:text-5xl">Stock</h1>
          <p className="max-w-xl text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            Update the Appwrite product stock column directly.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchProducts}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-100 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-black shadow-sm hover:bg-zinc-50"
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Products</p>
          <p className="mt-3 text-3xl font-black text-black">{products.length}</p>
        </div>
        <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Total Units</p>
          <p className="mt-3 text-3xl font-black text-black">{stockStats.totalUnits.toLocaleString()}</p>
        </div>
        <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Low / Out</p>
          <p className="mt-3 text-3xl font-black text-black">{stockStats.lowStock} / {stockStats.outOfStock}</p>
        </div>
      </section>

      <section className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search product, category, or ID..."
            className="w-full rounded-[2rem] border border-zinc-100 bg-white py-4 pl-14 pr-5 text-sm font-semibold text-black outline-none transition-all focus:border-black/10 focus:shadow-xl focus:shadow-zinc-100"
          />
        </div>
        <div className="flex rounded-2xl border border-zinc-100 bg-white p-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'low', label: 'Low' },
            { id: 'out', label: 'Out' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id as any)}
              className={`rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === item.id ? 'bg-black text-white' : 'text-zinc-400 hover:text-black'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <AdminPageLoader label="Loading stock" className="min-h-96" />
      ) : (
        <section className="overflow-hidden rounded-[2rem] border border-zinc-100 bg-white shadow-sm">
          <div className="hidden grid-cols-12 gap-4 border-b border-zinc-100 bg-zinc-50 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 lg:grid">
            <div className="col-span-5">Product</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-2">Stock</div>
            <div className="col-span-1 text-right">Save</div>
          </div>

          <div className="divide-y divide-zinc-50">
            {filteredProducts.map((product, index) => {
              const currentDraft = Number(draftStock[product.$id] ?? product.displayStock);
              const isLow = currentDraft > 0 && currentDraft <= LOW_STOCK_LIMIT;
              const isOut = currentDraft <= 0;

              return (
                <motion.div
                  key={product.$id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="grid grid-cols-1 gap-4 px-5 py-5 lg:grid-cols-12 lg:items-center lg:px-6"
                >
                  <div className="flex min-w-0 items-center gap-4 lg:col-span-5">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl bg-zinc-100">
                      <Image
                        src={getImageUrl(product.displayImage)}
                        alt={product.displayName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-black text-black">{product.displayName}</p>
                        {isOut && <AlertTriangle size={14} className="flex-shrink-0 text-red-500" />}
                        {isLow && <AlertTriangle size={14} className="flex-shrink-0 text-amber-500" />}
                      </div>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">ID: {product.$id}</p>
                    </div>
                  </div>

                  <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 lg:col-span-2">
                    {product.displayCategory}
                  </div>

                  <div className="text-sm font-black text-black lg:col-span-2">
                    {formatCurrency(product.displayPrice, 'NGN')}
                  </div>

                  <div className="flex items-center gap-2 lg:col-span-2">
                    <button
                      type="button"
                      onClick={() => updateDraftStock(product.$id, currentDraft - 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-100 text-zinc-500 hover:text-black"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={currentDraft}
                      onChange={(e) => updateDraftStock(product.$id, Number(e.target.value))}
                      className={`h-10 w-24 rounded-xl border px-3 text-center text-sm font-black outline-none ${
                        isOut
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : isLow
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-zinc-100 bg-white text-black'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => updateDraftStock(product.$id, currentDraft + 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-100 text-zinc-500 hover:text-black"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 lg:col-span-1 lg:justify-end">
                    <Link
                      href={`/admin/products/${product.$id}`}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-50 text-zinc-500 hover:text-black"
                    >
                      <Edit2 size={15} />
                    </Link>
                    <button
                      type="button"
                      disabled={!hasChanged(product) || savingIds[product.$id]}
                      onClick={() => saveStock(product)}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                        hasChanged(product)
                          ? 'bg-black text-white hover:bg-zinc-800'
                          : 'bg-zinc-50 text-zinc-300'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {savingIds[product.$id] ? (
                        <RefreshCcw size={15} className="animate-spin" />
                      ) : hasChanged(product) ? (
                        <Save size={15} />
                      ) : (
                        <Check size={15} />
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
