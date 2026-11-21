'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Banknote, Boxes, CreditCard, Layers3, PackageCheck, RefreshCcw, ReceiptText, ShoppingBag, TrendingUp, WalletCards } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import AdminPageLoader from '@/components/admin/AdminPageLoader';

type DropProductRevenue = { id: string; name: string; revenue: number; units: number; orders: number };
type DropRevenue = { id: string; name: string; revenue: number; orders: number; units: number; productCount: number; products: DropProductRevenue[] };
type RevenueData = {
  range: string;
  group: 'day' | 'month';
  selectedDropId: string | null;
  selectedDropName: string | null;
  summary: {
    totalRevenue: number; allTimeRevenue: number; orderCount: number; unitCount: number; productCount: number;
    averageOrderValue: number; highestOrder: number; todayRevenue: number; todayOrders: number; revenueChange: number | null;
  };
  series: Array<{ key: string; label: string; revenue: number; orders: number }>;
  composition: Record<'subtotal' | 'delivery' | 'packaging' | 'vat' | 'siteFees' | 'discounts', number>;
  statuses: Array<{ status: string; orders: number; revenue: number }>;
  dropBreakdown: DropRevenue[];
  dropOptions: Array<{ id: string; name: string }>;
  recentOrders: Array<{ id: string; orderNumber: string; customerName: string; customerEmail: string; total: number; status: string; createdAt: string }>;
};

const ranges = [['7d', '7 days'], ['30d', '30 days'], ['90d', '90 days'], ['12m', '12 months'], ['all', 'All time']];
const statusStyle: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700', paid: 'bg-emerald-50 text-emerald-700', processing: 'bg-blue-50 text-blue-700',
  shipped: 'bg-violet-50 text-violet-700', out_for_delivery: 'bg-cyan-50 text-cyan-700', delivered: 'bg-green-50 text-green-700',
};

export default function RevenueDashboard() {
  const [range, setRange] = useState('30d');
  const [group, setGroup] = useState<'day' | 'month'>('day');
  const [drop, setDrop] = useState('all');
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRevenue = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/admin/revenue?range=${range}&group=${group}&drop=${encodeURIComponent(drop)}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to load revenue');
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load revenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRevenue(); }, [range, group, drop]);

  const selectRange = (nextRange: string) => {
    setRange(nextRange);
    if (nextRange === '12m' || nextRange === 'all') setGroup('month');
  };

  if (!data && loading) return <AdminPageLoader label="Loading revenue" />;
  if (!data) return <div className="rounded-3xl bg-red-50 p-8 text-red-700"><p className="font-bold">Revenue data unavailable</p><p className="mt-1 text-sm">{error}</p><button onClick={loadRevenue} className="mt-4 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white">Retry</button></div>;

  const selectedDrop = data.selectedDropId ? data.dropBreakdown.find((item) => item.id === data.selectedDropId) : null;
  const summaryCards = [
    { label: data.selectedDropId ? 'Product revenue' : 'Revenue in period', value: formatCurrency(data.summary.totalRevenue, 'NGN'), icon: TrendingUp },
    { label: 'Orders', value: data.summary.orderCount.toLocaleString(), icon: ReceiptText },
    { label: 'Units sold', value: data.summary.unitCount.toLocaleString(), icon: PackageCheck },
    { label: 'Products sold', value: data.summary.productCount.toLocaleString(), icon: Boxes },
    { label: 'Average order', value: formatCurrency(data.summary.averageOrderValue, 'NGN'), icon: CreditCard },
    { label: 'Highest order', value: formatCurrency(data.summary.highestOrder, 'NGN'), icon: Banknote },
  ];
  const composition = [
    ['Product subtotal', data.composition.subtotal], ['Delivery collected', data.composition.delivery],
    ['Packaging collected', data.composition.packaging], ['VAT collected', data.composition.vat],
    ['Site fees', data.composition.siteFees], ['Discounts given', -data.composition.discounts],
  ] as const;

  return (
    <div className="space-y-10 pb-28">
      <header className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">Financial performance</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight lg:text-5xl">Revenue{data.selectedDropName ? ` · ${data.selectedDropName}` : ''}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
            <span>{formatCurrency(data.summary.allTimeRevenue, 'NGN')} all-time{data.selectedDropId ? ' product revenue' : ''}</span>
            {data.summary.revenueChange !== null && <span className={`flex items-center gap-1 font-semibold ${data.summary.revenueChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{data.summary.revenueChange >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}{Math.abs(data.summary.revenueChange).toFixed(1)}% vs previous period</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={drop} onChange={(event) => setDrop(event.target.value)} aria-label="Filter revenue by drop" className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs font-bold outline-none">
            <option value="all">All drops / overall</option>
            {data.dropOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <div className="flex flex-wrap rounded-2xl border border-zinc-100 bg-zinc-50 p-1">
            {ranges.map(([value, label]) => <button key={value} onClick={() => selectRange(value)} className={`rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wide ${range === value ? 'bg-white text-black shadow-sm' : 'text-zinc-400'}`}>{label}</button>)}
          </div>
          <button onClick={loadRevenue} aria-label="Refresh revenue" className="rounded-xl border border-zinc-200 p-3"><RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      {error && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">Showing the last loaded data. Refresh failed: {error}</p>}
      {data.selectedDropId && <p className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">Drop views use product line-item revenue. Delivery, VAT, packaging, fees and discounts remain in the overall view so they are not assigned to the wrong drop.</p>}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => <div key={card.label} className="rounded-[2rem] border border-zinc-100 bg-white p-7 shadow-sm"><div className="mb-7 rounded-2xl bg-zinc-50 p-3 w-fit"><card.icon size={20} /></div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{card.label}</p><p className="mt-2 text-2xl font-bold tracking-tight">{card.value}</p></div>)}
      </div>

      <section className="rounded-[2.5rem] border border-zinc-100 bg-white p-6 shadow-sm sm:p-9">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-bold">Revenue flow</h2><p className="mt-1 text-xs text-zinc-400">How much came in {group === 'day' ? 'each day' : 'each month'}</p></div><div className="flex rounded-xl bg-zinc-100 p-1">{(['day', 'month'] as const).map((value) => <button key={value} onClick={() => setGroup(value)} className={`rounded-lg px-4 py-2 text-[10px] font-bold uppercase ${group === value ? 'bg-white shadow-sm' : 'text-zinc-400'}`}>{value === 'day' ? 'Daily' : 'Monthly'}</button>)}</div></div>
        {data.series.length ? <div className="h-[340px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.series}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#000" stopOpacity={0.14}/><stop offset="95%" stopColor="#000" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5"/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }}/><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickFormatter={(value) => `₦${Number(value / 1000).toFixed(0)}k`}/><Tooltip formatter={(value: any) => [formatCurrency(Number(value), 'NGN'), 'Revenue']} contentStyle={{ borderRadius: 16, border: '1px solid #f4f4f5' }}/><Area type="monotone" dataKey="revenue" stroke="#000" strokeWidth={2.5} fill="url(#revenueFill)"/></AreaChart></ResponsiveContainer></div> : <div className="flex h-[260px] items-center justify-center text-sm text-zinc-400">No revenue in this period.</div>}
      </section>

      <section className="overflow-hidden rounded-[2.5rem] border border-zinc-100 bg-white shadow-sm">
        <div className="border-b border-zinc-100 p-7 sm:px-9"><div className="flex items-center gap-3"><Layers3 size={20}/><div><h2 className="font-bold">Revenue by drop</h2><p className="text-xs text-zinc-400">Compare product sales for this period</p></div></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="bg-zinc-50 text-[9px] font-bold uppercase tracking-widest text-zinc-400"><th className="px-8 py-4">Drop</th><th className="px-5 py-4">Orders</th><th className="px-5 py-4">Units</th><th className="px-5 py-4">Products</th><th className="px-8 py-4 text-right">Revenue</th></tr></thead><tbody className="divide-y divide-zinc-100">{data.dropBreakdown.map((item) => <tr key={item.id} className={`text-sm hover:bg-zinc-50/50 ${drop === item.id ? 'bg-zinc-50' : ''}`}><td className="px-8 py-5"><button onClick={() => setDrop(item.id)} className="font-bold underline decoration-zinc-300 underline-offset-4">{item.name}</button></td><td className="px-5 py-5">{item.orders}</td><td className="px-5 py-5">{item.units}</td><td className="px-5 py-5">{item.productCount}</td><td className="px-8 py-5 text-right font-bold">{formatCurrency(item.revenue, 'NGN')}</td></tr>)}</tbody></table></div>
      </section>

      {selectedDrop && <section className="overflow-hidden rounded-[2.5rem] border border-zinc-100 bg-white shadow-sm"><div className="border-b border-zinc-100 p-7 sm:px-9"><h2 className="font-bold">Products in {selectedDrop.name}</h2><p className="text-xs text-zinc-400">Per-product performance for this period</p></div><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left"><thead><tr className="bg-zinc-50 text-[9px] font-bold uppercase tracking-widest text-zinc-400"><th className="px-8 py-4">Product</th><th className="px-5 py-4">Orders</th><th className="px-5 py-4">Units</th><th className="px-8 py-4 text-right">Revenue</th></tr></thead><tbody className="divide-y divide-zinc-100">{selectedDrop.products.map((product) => <tr key={product.id} className="text-sm"><td className="px-8 py-5 font-semibold">{product.name}</td><td className="px-5 py-5">{product.orders}</td><td className="px-5 py-5">{product.units}</td><td className="px-8 py-5 text-right font-bold">{formatCurrency(product.revenue, 'NGN')}</td></tr>)}</tbody></table></div>{!selectedDrop.products.length && <p className="p-10 text-center text-sm text-zinc-400">No product sales in this period.</p>}</section>}

      <div className="grid gap-7 xl:grid-cols-2">
        <section className="rounded-[2.5rem] border border-zinc-100 bg-white p-7 sm:p-9"><div className="mb-7 flex items-center gap-3"><WalletCards size={20}/><div><h2 className="font-bold">{data.selectedDropId ? 'Product revenue' : 'Revenue composition'}</h2><p className="text-xs text-zinc-400">{data.selectedDropId ? 'Line-item sales for this drop' : 'Where the collected amount came from'}</p></div></div><div className="space-y-4">{composition.filter(([, value]) => !data.selectedDropId || value !== 0).map(([label, value]) => <div key={label} className="flex items-center justify-between border-b border-zinc-50 pb-4 text-sm"><span className="text-zinc-500">{label}</span><strong className={value < 0 ? 'text-red-600' : ''}>{formatCurrency(value, 'NGN')}</strong></div>)}</div></section>
        <section className="rounded-[2.5rem] border border-zinc-100 bg-white p-7 sm:p-9"><div className="mb-7 flex items-center gap-3"><ShoppingBag size={20}/><div><h2 className="font-bold">Order status revenue</h2><p className="text-xs text-zinc-400">Successful revenue at each fulfilment stage</p></div></div><div className="space-y-4">{data.statuses.map((item) => <div key={item.status} className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-[9px] font-bold uppercase ${statusStyle[item.status] || 'bg-zinc-100 text-zinc-600'}`}>{item.status}</span><span className="text-xs text-zinc-400">{item.orders} orders</span></div><strong className="text-sm">{formatCurrency(item.revenue, 'NGN')}</strong></div>)}</div></section>
      </div>

      <section className="overflow-hidden rounded-[2.5rem] border border-zinc-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 p-7 sm:px-9"><div className="flex items-center gap-3"><Banknote size={20}/><div><h2 className="font-bold">Revenue order stream</h2><p className="text-xs text-zinc-400">Latest successful orders included in this view</p></div></div><Link href="/admin/orders" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">All orders <ArrowRight size={14}/></Link></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="bg-zinc-50 text-[9px] font-bold uppercase tracking-widest text-zinc-400"><th className="px-8 py-4">Order</th><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Status</th><th className="px-8 py-4 text-right">Revenue</th></tr></thead><tbody className="divide-y divide-zinc-100">{data.recentOrders.map((order) => <tr key={order.id} className="text-sm hover:bg-zinc-50/50"><td className="px-8 py-5 font-semibold">#{String(order.orderNumber).slice(-10)}</td><td className="px-5 py-5"><p className="font-medium">{order.customerName}</p><p className="text-xs text-zinc-400">{order.customerEmail}</p></td><td className="px-5 py-5 text-xs text-zinc-500">{new Date(order.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</td><td className="px-5 py-5"><span className={`rounded-full px-3 py-1 text-[9px] font-bold uppercase ${statusStyle[order.status] || 'bg-zinc-100 text-zinc-600'}`}>{order.status}</span></td><td className="px-8 py-5 text-right font-bold">{formatCurrency(order.total, 'NGN')}</td></tr>)}</tbody></table></div>
        {!data.recentOrders.length && <p className="p-10 text-center text-sm text-zinc-400">No orders in this period.</p>}
      </section>
    </div>
  );
}
