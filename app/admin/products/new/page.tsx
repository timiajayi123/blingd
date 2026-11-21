'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, ArrowLeft, Loader2, X, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import ProductImageUpload, { ProductImageUploadHandle } from '@/components/admin/ProductImageUpload';

export default function NewProduct() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateProductId = searchParams.get('duplicate');
  const imageUploadRef = useRef<ProductImageUploadHandle>(null);
  const [saving, setSaving] = useState(false);
  const [loadingDuplicate, setLoadingDuplicate] = useState(Boolean(duplicateProductId));
  const [newSize, setNewSize] = useState('');
  const [drops, setDrops] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState('');
  const [formData, setFormData] = useState<any>({
    name: '',
    price: 0,
    long_description: '',
    short_description: '',
    category: '',
    stock: 0,
    position: 0,
    images: [],
    sizes: [],
    freeDelivery: false,
    colors: [],
    dropId: 'project_0',
    shippingWeightGrams: 0,
  });
  
  const [newColor, setNewColor] = useState('');

  const ensureArray = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    if (typeof value === 'string' && value.trim()) {
      const trimmed = value.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
        } catch {
          // Legacy comma-separated values are handled below.
        }
      }
      return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [];
  };

  const loadCategories = async () => {
    setCategoriesLoading(true);
    setCategoriesError('');
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', collection: 'categories', orderBy: 'order', orderDirection: 'asc' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load categories');
      setCategories(result.documents || []);
    } catch (error: any) {
      setCategoriesError(error.message || 'Could not load categories');
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', collection: 'drops', orderBy: 'position', orderDirection: 'asc' }),
    })
      .then((response) => response.json())
      .then((result) => setDrops(result.documents || []))
      .catch(() => toast.error('Could not load drops'));
  }, []);

  useEffect(() => {
    if (!duplicateProductId) {
      setLoadingDuplicate(false);
      return;
    }

    let active = true;
    const loadDuplicateTemplate = async () => {
      setLoadingDuplicate(true);
      try {
        const response = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get', collection: 'products', id: duplicateProductId }),
        });
        const product = await response.json();
        if (!response.ok) throw new Error(product.error || 'Could not load product to duplicate');
        if (!active) return;

        setFormData({
          name: product.name || product.Name || '',
          price: product.price || product.Price || 0,
          long_description: product.long_description || product.Long_Description || product.description || '',
          short_description: product.short_description || product.Short_Description || '',
          category: product.category || product.Category || '',
          stock: product.stock || product.Stock || 0,
          position: product.position || 0,
          images: ensureArray(product.images || product.Images),
          sizes: ensureArray(product.sizes || product.Sizes),
          freeDelivery: Boolean(product.freeDelivery || product.FreeDelivery),
          colors: ensureArray(product.colors || product.Colors),
          dropId: product.dropId || 'project_0',
          shippingWeightGrams: Number(product.shippingWeightGrams || 0),
        });
        toast.success('Product details copied. Update the variant details, then create it.');
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Could not load duplicate product details');
      } finally {
        if (active) setLoadingDuplicate(false);
      }
    };

    loadDuplicateTemplate();
    return () => { active = false; };
  }, [duplicateProductId]);
  
  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Product Name is required.");
      return;
    }

    try {
      setSaving(true);
      const finalImages = await imageUploadRef.current?.prepareImagesForSave() || formData.images;
      
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          collection: 'products',
          data: {
            name: formData.name,
            Price: Number(formData.price),
            long_description: formData.long_description,
            short_description: formData.short_description,
            category: formData.category,
            stock: Number(formData.stock),
            images: finalImages,
            sizes: formData.sizes,
            freeDelivery: formData.freeDelivery,
            colors: formData.colors,
            dropId: formData.dropId || 'project_0',
            shippingWeightGrams: Math.max(0, Math.round(Number(formData.shippingWeightGrams) || 0)),
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product');
      }

      toast.success("New Product Created.");
      router.push('/admin/products');
    } catch (err: any) {
      console.error(err);
      toast.error(`Error: ${err.message || "Could not create product."}`);
    } finally {
      setSaving(false);
    }
  };

  const addSize = () => {
    const s = newSize.trim().toUpperCase();
    if (!s || formData.sizes.includes(s)) return;
    setFormData({ ...formData, sizes: [...formData.sizes, s] });
    setNewSize('');
  };

  const removeSize = (size: string) => {
    setFormData({ ...formData, sizes: formData.sizes.filter((s: string) => s !== size) });
  };
  
  const addColor = () => {
    const c = newColor.trim().toLowerCase();
    if (!c || formData.colors.includes(c)) return;
    setFormData({ ...formData, colors: [...formData.colors, c] });
    setNewColor('');
  };

  const removeColor = (color: string) => {
    setFormData({ ...formData, colors: formData.colors.filter((c: string) => c !== color) });
  };

  return (
    <div className="space-y-10 lg:space-y-16 pb-40 lg:pb-32">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 lg:gap-8">
          <div className="flex items-center gap-4 lg:gap-6">
          <Link href="/admin/products" className="p-3 lg:p-4 bg-white border border-zinc-100 text-zinc-400 hover:text-black hover:border-zinc-200 transition-all rounded-2xl shadow-sm">
            <ArrowLeft size={18} />
          </Link>
          <div className="space-y-1 lg:space-y-2">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-black leading-none">
              {duplicateProductId ? 'Duplicate Product' : 'New Product'}
            </h1>
            <p className="text-[9px] lg:text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400">
              {duplicateProductId ? 'Creating Product Variant' : 'Creating New Item'}
            </p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || loadingDuplicate}
          className="hidden sm:flex bg-black text-white px-10 py-5 rounded-2xl font-bold uppercase tracking-widest text-[10px] items-center justify-center gap-3 hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-xl shadow-black/10"
        >
          {saving || loadingDuplicate ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {loadingDuplicate ? 'Loading Template...' : saving ? 'Saving...' : 'Create Product'}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
        {/* Visuals Section */}
        <div className="lg:col-span-1 space-y-8 lg:space-y-10">
          <ProductImageUpload
            ref={imageUploadRef}
            existingImages={formData.images}
            onExistingImagesChange={(images) => setFormData((current: any) => ({ ...current, images }))}
            folder="/storefront/products"
            tags={['storefront', 'product']}
            disabled={saving}
          />
        </div>

        {/* Form Section */}
        <div className="lg:col-span-2 space-y-12 lg:space-y-16">
          <section className="space-y-8 lg:space-y-10">
            <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
              <div className="space-y-3 lg:space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Product Name</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white border border-zinc-100 px-5 lg:px-6 py-4 lg:py-5 rounded-2xl text-sm font-bold outline-none focus:border-black/10 focus:shadow-xl focus:shadow-zinc-100 transition-all text-black"
                  placeholder="Product name..."
                />
              </div>
              <div className="space-y-3 lg:space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Available Colors</label>
                <div className="flex flex-wrap gap-2 lg:gap-3 items-center">
                  {(formData.colors || []).map((color: string) => (
                    <span key={color} className="bg-white border border-zinc-100 text-black px-3 lg:px-4 py-1.5 lg:py-2 text-[10px] font-bold uppercase flex items-center gap-2 rounded-xl shadow-sm">
                      {color}
                      <button onClick={() => removeColor(color)} className="hover:text-red-500 transition-colors"><X size={12} /></button>
                    </span>
                  ))}
                  <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-100 p-1 rounded-2xl focus-within:border-black/10 focus-within:bg-white focus-within:shadow-lg transition-all">
                    <input type="text" value={newColor} onChange={(e) => setNewColor(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())} placeholder="Color" className="bg-transparent border-none outline-none px-3 py-1 text-[10px] font-bold uppercase w-16 lg:w-28 text-black placeholder:text-zinc-300" />
                    <button onClick={addColor} className="p-2 bg-black text-white rounded-xl hover:bg-zinc-800 transition-all shadow-md"><PlusCircle size={14} /></button>
                  </div>
                </div>
              </div>
              <div className="space-y-3 lg:space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Unit Price (NGN)</label>
                <input 
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="w-full bg-white border border-zinc-100 px-5 lg:px-6 py-4 lg:py-5 rounded-2xl text-sm font-bold outline-none focus:border-black/10 focus:shadow-xl focus:shadow-zinc-100 transition-all text-black"
                />
              </div>
              <div className="space-y-3 lg:space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  disabled={categoriesLoading || (!categories.length && !categoriesError)}
                  className="w-full bg-white border border-zinc-100 px-5 lg:px-6 py-4 lg:py-5 rounded-2xl text-sm font-bold outline-none focus:border-black/10 focus:shadow-xl focus:shadow-zinc-100 transition-all text-black"
                >
                  <option value="">{categoriesLoading ? 'Loading categories...' : categories.length ? 'Select a category' : 'No categories available'}</option>
                  {formData.category && !categories.some((category) => category.name === formData.category) && <option value={formData.category}>{formData.category}</option>}
                  {categories.map((category) => <option key={category.$id} value={category.name}>{category.name}</option>)}
                </select>
                {categoriesError && (
                  <div className="flex items-center justify-between gap-3 text-[10px] text-red-600">
                    <span>{categoriesError}</span>
                    <button type="button" onClick={loadCategories} className="font-bold uppercase underline">Retry</button>
                  </div>
                )}
              </div>
              <div className="space-y-3 lg:space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Stock Level</label>
                <input 
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({...formData, stock: e.target.value})}
                  className="w-full bg-white border border-zinc-100 px-5 lg:px-6 py-4 lg:py-5 rounded-2xl text-sm font-bold outline-none focus:border-black/10 focus:shadow-xl focus:shadow-zinc-100 transition-all text-black"
                />
              </div>
              <div className="space-y-3 lg:space-y-4 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Drop</label>
                <select
                  value={formData.dropId}
                  onChange={(e) => setFormData({ ...formData, dropId: e.target.value })}
                  className="w-full bg-white border border-zinc-100 px-5 lg:px-6 py-4 lg:py-5 rounded-2xl text-sm font-bold outline-none focus:border-black/10 text-black"
                >
                  {drops.map((drop) => <option key={drop.$id} value={drop.$id}>{drop.name}{drop.enabled ? '' : ' (Disabled)'}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-8 lg:space-y-10">
            <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400">Product Description</h3>
            <div className="space-y-3 lg:space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Short Description</label>
              <textarea 
                rows={2}
                value={formData.short_description}
                onChange={(e) => setFormData({...formData, short_description: e.target.value})}
                className="w-full bg-white border border-zinc-100 px-5 lg:px-6 py-4 lg:py-5 rounded-2xl text-sm font-medium outline-none focus:border-black/10 focus:shadow-xl focus:shadow-zinc-100 transition-all text-black resize-none"
                placeholder="Short summary..."
              />
            </div>
            <div className="space-y-3 lg:space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Long Description</label>
              <textarea 
                rows={6}
                value={formData.long_description}
                onChange={(e) => setFormData({...formData, long_description: e.target.value})}
                className="w-full bg-white border border-zinc-100 px-6 lg:px-8 py-5 lg:py-6 rounded-[2rem] text-sm font-medium outline-none focus:border-black/10 focus:shadow-xl focus:shadow-zinc-100 transition-all leading-relaxed text-black"
                placeholder="Detailed description..."
              />
            </div>
          </section>

          <section className="space-y-8 lg:space-y-10">
            <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400">Additional Settings</h3>
            <div className="space-y-8">
              <div className="flex items-center justify-between p-6 bg-white border border-zinc-100 rounded-2xl shadow-sm">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-black">Free Delivery</p>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Enable free shipping for this product</p>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, freeDelivery: !formData.freeDelivery })}
                  className={`w-12 h-6 rounded-full transition-all relative ${formData.freeDelivery ? 'bg-black' : 'bg-zinc-100'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.freeDelivery ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-black">Packed Weight</p>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400">Used for international shipping quotes</p>
                </div>
                <div className="mt-5 flex max-w-xs items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={formData.shippingWeightGrams ? Number(formData.shippingWeightGrams) / 1000 : ''}
                    onChange={(e) => setFormData({ ...formData, shippingWeightGrams: Number(e.target.value) * 1000 })}
                    className="w-full rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold text-black outline-none transition-all focus:border-black/10 focus:bg-white"
                    placeholder="e.g. 0.5"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">kg</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-zinc-500">Enter the item&apos;s packed weight, including its normal protective packaging. Leave at 0 only while the item is not ready for international checkout.</p>
              </div>

              <div className="space-y-3 lg:space-y-4 pt-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Available Sizes</label>
                <div className="flex flex-wrap gap-2 lg:gap-3 items-center">
                  {(formData.sizes || []).map((size: string) => (
                    <span key={size} className="bg-white border border-zinc-100 text-black px-3 lg:px-4 py-1.5 lg:py-2 text-[10px] font-bold uppercase flex items-center gap-2 rounded-xl shadow-sm">
                      {size}
                      <button onClick={() => removeSize(size)} className="hover:text-red-500 transition-colors">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-100 p-1 rounded-2xl focus-within:border-black/10 focus-within:bg-white focus-within:shadow-lg transition-all">
                    <input 
                      type="text"
                      value={newSize}
                      onChange={(e) => setNewSize(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())}
                      placeholder="Size"
                      className="bg-transparent border-none outline-none px-3 py-1 text-[10px] font-bold uppercase w-16 lg:w-28 text-black placeholder:text-zinc-300"
                    />
                    <button 
                      onClick={addSize}
                      className="p-2 bg-black text-white rounded-xl hover:bg-zinc-800 transition-all shadow-md"
                    >
                      <PlusCircle size={14} />
                    </button>
                  </div>
                </div>
              </div>
              
            </div>
          </section>
        </div>
      </div>

      {/* Sticky Mobile Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-zinc-100 sm:hidden z-50">
        <button 
          onClick={handleSave}
          disabled={saving || loadingDuplicate}
          className="w-full bg-black text-white py-5 rounded-[2rem] font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-2xl shadow-black/20"
        >
          {saving || loadingDuplicate ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {loadingDuplicate ? 'Loading Template...' : saving ? 'Creating Product...' : 'Create Product'}
        </button>
      </div>
    </div>
  );
}
