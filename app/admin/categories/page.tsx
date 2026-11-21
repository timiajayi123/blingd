'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, ArrowLeft, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl } from '@/lib/getImageUrl';
import Image from 'next/image';
import AdminPageLoader from '@/components/admin/AdminPageLoader';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list',
          collection: 'categories',
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch categories');

      const data = await response.json();
      setCategories(data.documents || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      setDeletingId(id);
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          collection: 'categories',
          id,
        }),
      });

      if (!response.ok) throw new Error('Failed to delete category');

      toast.success('Category deleted');
      fetchCategories();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete category');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <AdminPageLoader label="Loading categories" />;
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-3 bg-white border border-zinc-100 text-zinc-400 hover:text-black hover:border-zinc-200 transition-all rounded-2xl shadow-sm">
            <ArrowLeft size={18} />
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-black">Categories</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Manage product categories and size guides</p>
          </div>
        </div>
        <Link href="/admin/categories/new" className="flex items-center gap-2 px-6 py-4 bg-black text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all shadow-xl shadow-black/10">
          <Plus size={16} />
          New Category
        </Link>
      </header>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">No categories found</p>
          <Link href="/admin/categories/new" className="text-[10px] font-bold uppercase tracking-widest text-black underline decoration-zinc-200 underline-offset-4">
            Create your first category
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {categories.map((category) => (
            <div key={category.$id} className="bg-white border border-zinc-100 p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-black">{category.name}</h3>
                  {category.description && <p className="text-sm text-zinc-500">{category.description}</p>}
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/categories/${category.$id}`} className="p-3 bg-zinc-50 text-zinc-500 rounded-xl hover:bg-zinc-100 hover:text-black transition-all">
                    <Edit size={16} />
                  </Link>
                  <button onClick={() => handleDelete(category.$id)} disabled={deletingId === category.$id} className="p-3 bg-zinc-50 text-zinc-500 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50">
                    {deletingId === category.$id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>

              {category.sizeGuide && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Size Guide</p>
                  <div className="relative aspect-[4/3] bg-zinc-50 rounded-xl overflow-hidden border border-zinc-100">
                    <Image src={getImageUrl(category.sizeGuide)} alt="Size Guide" fill className="object-contain" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
