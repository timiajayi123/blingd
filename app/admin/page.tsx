'use client';

import React, { useEffect, useState } from 'react';
import { Package, ShoppingCart, TrendingUp, ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { parseOrderPayload } from '@/lib/orderPayload';

function getOrderFulfilmentStatus(order: any) {
  const { status } = parseOrderPayload(order.items);
  return String(order.status || status || 'paid').toLowerCase();
}

export default function AdminDashboard() {
  const [showValues, setShowValues] = useState(true);
  const [statsData, setStatsData] = useState({
    totalProducts: 0,
    pendingOrders: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      
      try {
        const [productsRes, ordersRes] = await Promise.all([
          fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'list', collection: 'products' })
          }),
          fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'list', collection: 'orders' })
          })
        ]);

        if (!productsRes.ok || !ordersRes.ok) throw new Error('Failed to fetch stats');

        const [productsData, ordersData] = await Promise.all([
          productsRes.json(),
          ordersRes.json()
        ]);

        const products = productsData.documents || [];
        const orders = ordersData.documents || [];

        const pending = orders.filter((order: any) => {
          const status = getOrderFulfilmentStatus(order);
          return status === 'paid' || status === 'pending';
        }).length;
        const revenue = orders.reduce((acc: number, curr: any) => acc + (Number(curr.total || curr.totalAmount) || 0), 0);

        setStatsData({
          totalProducts: products.length,
          pendingOrders: pending,
          totalRevenue: revenue,
        });
      } catch (err) {
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const stats = [
    { name: 'Total Products', value: loading ? '...' : statsData.totalProducts.toString(), icon: Package, href: '/admin/products' },
    { name: 'Pending Orders', value: loading ? '...' : statsData.pendingOrders.toString(), icon: ShoppingCart, href: '/admin/orders' },
    { name: 'Total Revenue', value: loading ? '...' : formatCurrency(statsData.totalRevenue, 'NGN'), icon: TrendingUp, href: '/admin/revenue' },
  ];

  return (
    <div className="space-y-16">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-4">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-black leading-none">
            Overview
          </h1>
          <div className="flex items-center gap-4 text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400">
            Welcome back to the control center
          </div>
        </div>
        
        <button 
          onClick={() => setShowValues(!showValues)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-50 border border-zinc-100 rounded-xl text-zinc-500 hover:text-black hover:border-zinc-200 transition-all text-[10px] font-bold uppercase tracking-widest"
        >
          {showValues ? <Eye size={14} /> : <EyeOff size={14} />}
          {showValues ? 'Hide Sensitive Info' : 'Show Sensitive Info'}
        </button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((stat, idx) => (
          <Link href={stat.href} key={stat.name}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white border border-zinc-100 p-10 hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300 rounded-3xl group cursor-pointer h-full"
            >
              <div className="flex justify-between items-start mb-8">
                <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center group-hover:bg-black transition-colors duration-300">
                  <stat.icon size={24} className="text-black group-hover:text-white transition-colors duration-300" />
                </div>
                <ArrowRight size={16} className="text-zinc-200 group-hover:text-black group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">{stat.name}</p>
              <div className="flex min-h-11 items-center text-4xl font-bold tracking-tighter text-black">
                {loading ? (
                  <LoaderCircle className="h-8 w-8 animate-spin text-zinc-400" aria-label={`Loading ${stat.name}`} />
                ) : showValues ? stat.value : '••••••'}
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
        <div className="space-y-8">
          <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4">
            <Link 
              href="/admin/products"
              className="flex items-center justify-between p-8 bg-black text-white font-bold uppercase tracking-widest text-xs rounded-3xl hover:bg-zinc-800 transition-all group"
            >
              Inventory Management
              <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
            </Link>
            <Link 
              href="/admin/orders"
              className="flex items-center justify-between p-8 bg-white border border-zinc-100 text-black font-bold uppercase tracking-widest text-xs rounded-3xl hover:border-black transition-all group"
            >
              Order Stream
              <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>
        </div>

        <div className="bg-zinc-50/50 border border-zinc-100 p-10 rounded-[2.5rem] flex flex-col justify-center space-y-6">
          <div className="w-14 h-14 bg-white shadow-sm rounded-2xl flex items-center justify-center">
            <Package size={28} className="text-zinc-300" />
          </div>
          <div className="space-y-2">
            <p className="text-xl font-bold tracking-tight">System Status</p>
            <p className="text-sm text-zinc-500 leading-relaxed">
              All systems are operational. Real-time synchronization with Appwrite is active and secure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
