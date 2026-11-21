'use client';

import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, Layers3, Loader2, Pencil, Plus, Power, X } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl } from '@/lib/getImageUrl';
import { isDropLive } from '@/lib/dropAvailability';
import AdminPageLoader from '@/components/admin/AdminPageLoader';

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  enabled: false,
  featured: false,
  launchAt: '',
  coverImage: '',
  position: 0,
};

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const getProductName = (product: any) => product.name || product.Name || 'Unnamed product';

const getDropStatus = (drop: any) => {
  if (!drop?.enabled) return 'Disabled';
  return isDropLive(drop) ? 'Live' : 'Scheduled';
};

const getDropStatusClass = (drop: any) => {
  const status = getDropStatus(drop);
  if (status === 'Live') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'Scheduled') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-zinc-200 bg-zinc-50 text-zinc-500';
};

const getProductImage = (product: any) => {
  const rawImages = product.images || product.Images || product.image || product.Image;
  if (!rawImages) return '/placeholder.svg';

  if (Array.isArray(rawImages)) return getImageUrl(String(rawImages[0] || ''));
  if (typeof rawImages !== 'string') return getImageUrl(String(rawImages));

  const value = rawImages.trim();
  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return getImageUrl(String(parsed[0] || ''));
    } catch {
      const firstLegacyValue = value
        .slice(1, -1)
        .split(',')[0]
        ?.trim()
        .replace(/^['"]|['"]$/g, '');
      if (firstLegacyValue) return getImageUrl(firstLegacyValue);
    }
  }
  return getImageUrl(value);
};

async function adminRequest(payload: Record<string, unknown>) {
  const response = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Appwrite request failed');
  return data;
}

function SortableDropProduct({ product, index }: { product: any; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.$id });
  const rawPrice = Number(product.Price ?? product.price ?? 0);
  const price = rawPrice > 100000 ? rawPrice / 100 : rawPrice;

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-center gap-4 py-3 ${isDragging ? 'relative z-10 bg-zinc-50 opacity-60' : ''}`}>
      <button type="button" aria-label={`Drag ${getProductName(product)} to reorder`} {...attributes} {...listeners} className="touch-none shrink-0 p-2 text-zinc-400 transition hover:text-black"><GripVertical size={18} /></button>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-black text-white">{index + 1}</span>
      <img src={getProductImage(product)} alt={getProductName(product)} className="h-16 w-14 shrink-0 bg-zinc-100 object-cover" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/placeholder.svg'; }} />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-black">{getProductName(product)}</p><p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">{product.category || product.Category || 'Uncategorised'}</p></div>
      <div className="shrink-0 text-right"><p className="text-xs font-black">NGN {price.toLocaleString()}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">{Number(product.stock ?? product.Stock ?? 0)} in stock</p></div>
    </div>
  );
}

export default function AdminDropsPage() {
  const [drops, setDrops] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [dropProductOrder, setDropProductOrder] = useState<string[]>([]);
  const [savingProductOrder, setSavingProductOrder] = useState(false);
  const [savedProductOrder, setSavedProductOrder] = useState<string[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const counts = useMemo(() => products.reduce((result: Record<string, number>, product) => {
    const dropId = product.dropId || 'project_0';
    result[dropId] = (result[dropId] || 0) + 1;
    return result;
  }, {}), [products]);

  const selectedDrop = useMemo(
    () => drops.find((drop) => drop.$id === editingId) || null,
    [drops, editingId],
  );

  const selectedProducts = useMemo(() => {
    if (!editingId) return [];
    const assigned = products.filter((product) => (product.dropId || 'project_0') === editingId);
    const byId = new Map(assigned.map((product) => [product.$id, product]));
    return dropProductOrder.map((id) => byId.get(id)).filter(Boolean);
  }, [products, editingId, dropProductOrder]);

  const getOrderedDropProducts = (dropId: string) => products
    .filter((product) => (product.dropId || 'project_0') === dropId)
    .sort((a, b) => Number(a.dropOrder ?? Number.MAX_SAFE_INTEGER) - Number(b.dropOrder ?? Number.MAX_SAFE_INTEGER) || String(a.$createdAt || '').localeCompare(String(b.$createdAt || '')));

  useEffect(() => {
    if (editingId) {
      const nextOrder = getOrderedDropProducts(editingId).map((product) => product.$id);
      setDropProductOrder(nextOrder);
      setSavedProductOrder(nextOrder);
    }
  }, [editingId, products]);

  const load = async () => {
    try {
      setLoading(true);
      const [dropResult, productResult] = await Promise.all([
        adminRequest({ action: 'list', collection: 'drops', orderBy: 'position', orderDirection: 'asc' }),
        adminRequest({ action: 'list', collection: 'products' }),
      ]);
      setDrops(dropResult.documents || []);
      setProducts(productResult.documents || []);
    } catch (error: any) {
      toast.error(error.message || 'Could not load drops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, position: drops.length });
    setShowForm(true);
  };

  const openEdit = (drop: any) => {
    setEditingId(drop.$id);
    setForm({
      name: drop.name || '',
      slug: drop.slug || '',
      description: drop.description || '',
      enabled: Boolean(drop.enabled),
      featured: Boolean(drop.featured),
      launchAt: drop.launchAt ? new Date(drop.launchAt).toISOString().slice(0, 16) : '',
      coverImage: drop.coverImage || '',
      position: Number(drop.position || 0),
    });
    setShowForm(true);
  };

  const reorderProducts = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = dropProductOrder.indexOf(String(active.id));
    const newIndex = dropProductOrder.indexOf(String(over.id));
    if (oldIndex >= 0 && newIndex >= 0) setDropProductOrder((current) => arrayMove(current, oldIndex, newIndex));
  };

  const saveProductOrder = async () => {
    if (!editingId || !dropProductOrder.length) return;
    try {
      setSavingProductOrder(true);
      await Promise.all(dropProductOrder.map((productId, index) => adminRequest({ action: 'update', collection: 'products', id: productId, data: { dropOrder: index } })));
      setProducts((current) => current.map((product) => {
        const index = dropProductOrder.indexOf(product.$id);
        return index === -1 ? product : { ...product, dropOrder: index };
      }));
      setSavedProductOrder(dropProductOrder);
      toast.success('Product order saved. The shop now follows this order.');
    } catch (error: any) {
      toast.error(error.message || 'Could not save product order');
    } finally {
      setSavingProductOrder(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error('Drop name is required');
    const data = {
      ...form,
      slug: form.slug || slugify(form.name),
      launchAt: form.launchAt ? new Date(form.launchAt).toISOString() : null,
      position: Number(form.position || 0),
    };
    try {
      setSaving(true);
      await adminRequest({
        action: editingId ? 'update' : 'create',
        collection: 'drops',
        id: editingId || undefined,
        data,
      });
      toast.success(editingId ? 'Drop updated' : 'Drop created');
      setShowForm(false);
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Could not save drop');
    } finally {
      setSaving(false);
    }
  };

  const toggleDrop = async (drop: any) => {
    try {
      await adminRequest({ action: 'update', collection: 'drops', id: drop.$id, data: { enabled: !drop.enabled } });
      toast.success(`${drop.name} ${drop.enabled ? 'disabled' : 'enabled'}`);
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Could not update drop');
    }
  };

  return (
    <div className="space-y-8 pb-24">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-400">Release control</p>
          <h1 className="text-4xl font-black tracking-tight">Drops</h1>
          <p className="mt-3 max-w-xl text-sm text-zinc-500">Disable a drop to hide all of its products from customers without deleting anything.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white">
          <Plus size={16} /> New Drop
        </button>
      </header>

      {loading ? (
        <AdminPageLoader label="Loading drops" className="min-h-72" />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {drops.map((drop) => (
            <article key={drop.$id} className="rounded-[2rem] border border-zinc-100 bg-white p-7 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white"><Layers3 size={20} /></div>
                <span className={`border px-3 py-1 text-[8px] font-black uppercase tracking-widest ${getDropStatusClass(drop)}`}>
                  {getDropStatus(drop)}
                </span>
              </div>
              <h2 className="mt-8 text-center text-3xl font-black text-black sm:text-4xl">{drop.name}</h2>
              <p className="mt-3 min-h-10 text-center text-sm leading-5 text-zinc-500">{drop.description || 'No description added.'}</p>
              <div className="mt-7 flex items-center justify-between border-t border-zinc-100 pt-5">
                <button onClick={() => openEdit(drop)} className="text-left" aria-label={`View products in ${drop.name}`}>
                  <p className="text-xl font-black">{counts[drop.$id] || 0}</p>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-400 underline decoration-zinc-300 underline-offset-4">View products</p>
                </button>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(drop)} aria-label={`Edit ${drop.name}`} className="rounded-xl bg-zinc-50 p-3 text-zinc-500 hover:text-black"><Pencil size={16} /></button>
                  <button onClick={() => toggleDrop(drop)} aria-label={`${drop.enabled ? 'Disable' : 'Enable'} ${drop.name}`} className={`rounded-xl p-3 ${drop.enabled ? 'bg-red-50 text-red-500' : 'bg-black text-white'}`}><Power size={16} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="drop-modal-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 sm:p-9">
            <div className="relative mb-8 min-h-12 px-12 text-center">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{editingId ? 'Drop details' : 'Create drop'}</p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                  <h2 id="drop-modal-title" className="text-3xl font-black text-black sm:text-4xl">
                    {editingId ? selectedDrop?.name || form.name : 'New drop'}
                  </h2>
                  {editingId && (
                    <span className={`border px-2.5 py-1 text-[8px] font-black uppercase tracking-widest ${getDropStatusClass(selectedDrop)}`}>
                      {getDropStatus(selectedDrop)}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setShowForm(false)} aria-label="Close drop modal" className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center border border-zinc-200 text-zinc-500 transition-colors hover:border-black hover:text-black">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editingId ? form.slug : slugify(e.target.value) })} placeholder="Drop name" className="w-full rounded-2xl border border-zinc-200 px-5 py-4 text-sm font-semibold outline-none focus:border-black" />
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="drop-slug" className="w-full rounded-2xl border border-zinc-200 px-5 py-4 text-sm outline-none focus:border-black" />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Drop description" rows={3} className="w-full resize-none rounded-2xl border border-zinc-200 px-5 py-4 text-sm outline-none focus:border-black" />
              <input value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} placeholder="Cover image URL (optional)" className="w-full rounded-2xl border border-zinc-200 px-5 py-4 text-sm outline-none focus:border-black" />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400">Launch time<input type="datetime-local" value={form.launchAt} onChange={(e) => setForm({ ...form, launchAt: e.target.value })} className="w-full rounded-2xl border border-zinc-200 px-4 py-4 text-sm font-normal normal-case tracking-normal text-black outline-none" /></label>
                <label className="space-y-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400">Position<input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} className="w-full rounded-2xl border border-zinc-200 px-4 py-4 text-sm text-black outline-none" /></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center justify-between rounded-2xl border border-zinc-200 p-4 text-sm font-semibold">Enabled<input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="h-5 w-5" /></label>
                <label className="flex items-center justify-between rounded-2xl border border-zinc-200 p-4 text-sm font-semibold">Featured<input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="h-5 w-5" /></label>
              </div>
            </div>

            {editingId && (
              <section className="mt-8 border-t-2 border-black pt-6" aria-labelledby="drop-products-title">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Assigned inventory</p>
                    <h3 id="drop-products-title" className="mt-1 text-xl font-black">Products in {selectedDrop?.name || form.name}</h3>
                  </div>
                  <div className="flex items-center gap-3"><span className="text-sm font-black tabular-nums">{selectedProducts.length}</span><button type="button" onClick={saveProductOrder} disabled={savingProductOrder || JSON.stringify(dropProductOrder) === JSON.stringify(savedProductOrder)} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-white disabled:opacity-40">{savingProductOrder ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save order</button></div>
                </div>

                {selectedProducts.length > 0 ? (
                  <div className="mt-4 divide-y divide-zinc-200 border-y border-zinc-200">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderProducts}>
                      <SortableContext items={dropProductOrder} strategy={verticalListSortingStrategy}>
                        {selectedProducts.map((product, index) => <SortableDropProduct key={product.$id} product={product} index={index} />)}
                      </SortableContext>
                    </DndContext>
                  </div>
                ) : (
                  <div className="mt-4 border border-dashed border-zinc-300 px-5 py-8 text-center text-sm text-zinc-400">
                    No products are assigned to this drop yet.
                  </div>
                )}
              </section>
            )}
            <div className="mt-8 grid grid-cols-2 gap-3">
              <button onClick={() => setShowForm(false)} className="rounded-2xl border border-zinc-200 py-4 text-[10px] font-bold uppercase tracking-widest">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center justify-center gap-2 rounded-2xl bg-black py-4 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-50">{saving && <Loader2 size={14} className="animate-spin" />}{editingId ? 'Save changes' : 'Create drop'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
