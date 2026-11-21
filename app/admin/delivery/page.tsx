'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, X, Loader2, CheckCircle2, CircleOff } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import AdminPageLoader from '@/components/admin/AdminPageLoader';

type DeliveryLocation = {
  $id: string;
  state: string;
  name: string;
  price: number;
  type: 'state' | 'sub_location';
  active: boolean;
  sortOrder: number;
};

const emptyForm = {
  type: 'sub_location' as 'state' | 'sub_location',
  state: '',
  name: '',
  price: '',
  active: true,
  sortOrder: '0',
};

export default function AdminDeliveryPricing() {
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryLocation | null>(null);
  const [form, setForm] = useState(emptyForm);

  const states = useMemo(
    () => locations.filter((location) => location.type === 'state').sort((a, b) => a.sortOrder - b.sortOrder || a.state.localeCompare(b.state)),
    [locations]
  );

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', collection: 'delivery' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load delivery pricing');
      setLocations((data.documents || []).map((document: any) => ({
        ...document,
        price: Number(document.price || 0),
        sortOrder: Number(document.sortOrder || 0),
        active: document.active !== false,
      })));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load delivery pricing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLocations(); }, []);

  const openCreate = (type: 'state' | 'sub_location', state = '') => {
    setEditing(null);
    setForm({ ...emptyForm, type, state });
    setFormOpen(true);
  };

  const openEdit = (location: DeliveryLocation) => {
    setEditing(location);
    setForm({
      type: location.type,
      state: location.state,
      name: location.type === 'state' ? '' : location.name,
      price: String(location.price),
      active: location.active,
      sortOrder: String(location.sortOrder),
    });
    setFormOpen(true);
  };

  const saveLocation = async (event: React.FormEvent) => {
    event.preventDefault();
    const state = form.state.trim();
    const name = form.type === 'state' ? state : form.name.trim();
    const price = Number(form.price);
    if (!state || !name || !Number.isFinite(price) || price < 0) {
      toast.error('State, location name, and a valid price are required.');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editing ? 'update' : 'create',
          collection: 'delivery',
          id: editing?.$id,
          data: { state, name, price: Math.round(price), type: form.type, active: form.active, sortOrder: Math.max(0, Number(form.sortOrder || 0)) },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save delivery location');
      toast.success(editing ? 'Delivery price updated.' : 'Delivery location added.');
      setFormOpen(false);
      await fetchLocations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save delivery location');
    } finally {
      setSaving(false);
    }
  };

  const deleteLocation = async (location: DeliveryLocation) => {
    const hasChildren = location.type === 'state' && locations.some((item) => item.type === 'sub_location' && item.state === location.state);
    if (hasChildren) {
      toast.error('Remove or move this state’s sub-locations first.');
      return;
    }
    if (!window.confirm(`Delete ${location.name}? This cannot be undone.`)) return;
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', collection: 'delivery', id: location.$id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete delivery location');
      toast.success('Delivery location deleted.');
      await fetchLocations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete delivery location');
    }
  };

  return (
    <div className="space-y-8 pb-28">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">Checkout configuration</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Delivery Pricing</h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-500">Set a base price for every state, then add optional areas or landmarks with their own prices.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => openCreate('state')} className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-xs font-bold">Add state</button>
          <button onClick={() => openCreate('sub_location', states[0]?.state || '')} disabled={!states.length} className="flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-xs font-bold text-white disabled:opacity-40"><Plus size={15} /> Add sub-location</button>
        </div>
      </header>

      {loading ? (
        <AdminPageLoader label="Loading delivery pricing" className="min-h-64" />
      ) : (
        <div className="space-y-5">
          {!states.length && (
            <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-amber-800">
              <p className="font-bold">No delivery states were returned.</p>
              <p className="mt-1 text-sm">Check that this deployment uses the same Appwrite project and database as the migrated delivery collection.</p>
            </div>
          )}
          {states.map((state) => {
            const children = locations.filter((item) => item.type === 'sub_location' && item.state === state.state).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
            return (
              <section key={state.$id} className="overflow-hidden rounded-[2rem] border border-zinc-100 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-4 bg-zinc-50 px-6 py-5 sm:px-8">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-black p-2.5 text-white"><MapPin size={18} /></div>
                    <div><h2 className="font-bold text-black">{state.name || state.state}</h2><p className="text-xs text-zinc-500">Base rate · {formatCurrency(state.price, 'NGN')}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    {state.active ? <CheckCircle2 size={18} className="text-emerald-500" /> : <CircleOff size={18} className="text-zinc-300" />}
                    <button onClick={() => openCreate('sub_location', state.state)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[10px] font-bold uppercase">Add area</button>
                    <button onClick={() => openEdit(state)} className="rounded-xl p-2 hover:bg-white"><Pencil size={16} /></button>
                    <button onClick={() => deleteLocation(state)} className="rounded-xl p-2 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                  </div>
                </div>
                {children.length > 0 ? (
                  <div className="divide-y divide-zinc-100">
                    {children.map((child) => (
                      <div key={child.$id} className="flex items-center justify-between gap-4 px-6 py-4 pl-10 sm:px-8 sm:pl-20">
                        <div><p className="text-sm font-semibold text-black">{child.name}</p><p className="text-xs text-zinc-400">{child.active ? 'Active at checkout' : 'Hidden from checkout'}</p></div>
                        <div className="flex items-center gap-3"><strong className="text-sm">{formatCurrency(child.price, 'NGN')}</strong><button onClick={() => openEdit(child)} className="p-2"><Pencil size={15} /></button><button onClick={() => deleteLocation(child)} className="p-2 text-red-500"><Trash2 size={15} /></button></div>
                      </div>
                    ))}
                  </div>
                ) : <p className="px-8 py-5 text-xs text-zinc-400">No custom areas. Checkout uses the state base rate.</p>}
              </section>
            );
          })}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form onSubmit={saveLocation} className="w-full max-w-lg space-y-5 rounded-[2rem] bg-white p-7 shadow-2xl">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{editing ? 'Edit' : 'New'} pricing rule</p><h2 className="text-2xl font-bold text-black">{form.type === 'state' ? 'State rate' : 'Sub-location rate'}</h2></div><button type="button" onClick={() => setFormOpen(false)} className="p-2"><X /></button></div>
            {!editing && <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1"><button type="button" onClick={() => setForm((old) => ({ ...old, type: 'state', state: '', name: '' }))} className={`rounded-lg py-2 text-xs font-bold ${form.type === 'state' ? 'bg-white shadow-sm' : ''}`}>State</button><button type="button" onClick={() => setForm((old) => ({ ...old, type: 'sub_location', state: states[0]?.state || '' }))} className={`rounded-lg py-2 text-xs font-bold ${form.type === 'sub_location' ? 'bg-white shadow-sm' : ''}`}>Sub-location</button></div>}
            <label className="block text-xs font-bold">State
              {form.type === 'sub_location' ? <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="mt-2 w-full rounded-xl border border-zinc-200 p-3 font-normal">{states.map((state) => <option key={state.$id} value={state.state}>{state.state}</option>)}</select> : <input value={form.state} disabled={Boolean(editing)} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="e.g. Lagos" className="mt-2 w-full rounded-xl border border-zinc-200 p-3 font-normal disabled:bg-zinc-100" />}
            </label>
            {form.type === 'sub_location' && <label className="block text-xs font-bold">Area or landmark name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Lekki Phase 1" className="mt-2 w-full rounded-xl border border-zinc-200 p-3 font-normal" /></label>}
            <div className="grid grid-cols-2 gap-4"><label className="block text-xs font-bold">Price (NGN)<input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-2 w-full rounded-xl border border-zinc-200 p-3 font-normal" /></label><label className="block text-xs font-bold">Sort order<input type="number" min="0" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className="mt-2 w-full rounded-xl border border-zinc-200 p-3 font-normal" /></label></div>
            <label className="flex items-center justify-between rounded-xl border border-zinc-200 p-4 text-sm font-semibold">Available at checkout<input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-5 w-5" /></label>
            <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-4 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50">{saving && <Loader2 size={15} className="animate-spin" />}{editing ? 'Save changes' : 'Create pricing rule'}</button>
          </form>
        </div>
      )}
    </div>
  );
}
