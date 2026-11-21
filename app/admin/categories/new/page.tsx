'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { getImageUrl } from '@/lib/getImageUrl';
import { uploadAdminMedia } from '@/lib/imagekitUpload';

export default function NewCategoryPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sizeGuide: '',
    order: 0,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await uploadAdminMedia({
        file,
        folder: '/storefront/categories',
        tags: ['storefront', 'category', 'size-guide'],
      });
      setFormData(prev => ({ ...prev, sizeGuide: data.url }));
      toast.success('Size guide uploaded to ImageKit!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          collection: 'categories',
          data: formData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create category');
      }

      toast.success('Category created successfully!');
      router.push('/admin/categories');
    } catch (err: any) {
      console.error(err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10">
      <header className="flex items-center gap-4">
        <Link href="/admin/categories" className="p-3 bg-white border border-zinc-100 text-zinc-400 hover:text-black hover:border-zinc-200 transition-all rounded-2xl shadow-sm">
          <ArrowLeft size={18} />
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-black">New Category</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Create a new product category</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="lg:col-span-1 space-y-8">
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Size Guide</h3>
            <div className="aspect-[4/3] relative bg-zinc-50 rounded-[2rem] overflow-hidden border border-zinc-100">
              {formData.sizeGuide ? (
                <div className="relative w-full h-full">
                  <Image src={getImageUrl(formData.sizeGuide)} alt="Size Guide" fill className="object-contain" />
                  <button onClick={() => setFormData(prev => ({ ...prev, sizeGuide: '' }))} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-xl">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-6 text-zinc-200 h-full">
                  <ImageIcon size={64} strokeWidth={1} />
                  <span className="text-[10px] uppercase tracking-widest font-bold">No Size Guide</span>
                </div>
              )}
            </div>
            <label className="flex items-center justify-center gap-2 p-4 bg-zinc-100 text-black rounded-2xl hover:bg-zinc-200 transition-all cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              {uploading ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
              {uploading ? 'Uploading...' : 'Upload Size Guide'}
            </label>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-8">
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Basic Information</h3>
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Category Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white border border-zinc-100 px-6 py-5 rounded-2xl text-sm font-bold outline-none focus:border-black/10 focus:shadow-xl focus:shadow-zinc-100 transition-all text-black"
                  placeholder="Category name..."
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Description</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-white border border-zinc-100 px-6 py-5 rounded-2xl text-sm font-medium outline-none focus:border-black/10 focus:shadow-xl focus:shadow-zinc-100 transition-all text-black resize-none"
                  placeholder="Optional description..."
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Order</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white border border-zinc-100 px-6 py-5 rounded-2xl text-sm font-bold outline-none focus:border-black/10 focus:shadow-xl focus:shadow-zinc-100 transition-all text-black"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-black text-white px-10 py-5 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-xl shadow-black/10"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  );
}
