'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Package, ShoppingCart, LayoutDashboard, LogOut, Menu, X, TrendingUp, Settings, Home, Boxes, MapPinned, BadgeDollarSign, Layers3, CreditCard, Send, Users, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { LogoSVG } from '@/components/ui/LogoSVG';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const verifySession = async () => {
      try {
        const session = await fetch('/api/admin/session', { cache: 'no-store' });
        const result = await session.json();
        if (result.authenticated) {
          setIsAuthorized(true);
          localStorage.setItem('admin_auth', '1');
          return;
        }

        const legacyPassword = localStorage.getItem('admin_auth');
        if (legacyPassword && legacyPassword !== '1') {
          const migratedSession = await fetch('/api/admin/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: legacyPassword }),
          });
          if (migratedSession.ok) {
            localStorage.setItem('admin_auth', '1');
            setIsAuthorized(true);
          } else {
            localStorage.removeItem('admin_auth');
          }
        }
      } catch {
        setIsAuthorized(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    verifySession();
  }, []);

  const handleLogin = async (pass: string) => {
    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass }),
      });
      if (response.ok) {
        localStorage.setItem('admin_auth', '1');
        document.cookie = 'admin_auth=; path=/; max-age=0';
        document.cookie = 'admin_auth_timestamp=; path=/; max-age=0';
        setIsAuthorized(true);
        return;
      }
      toast.error("Invalid Access Code");
    } catch {
      toast.error("Could not verify access code");
    }
  };

  if (!isClient || isCheckingAuth) return null;

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-zinc-900/50 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-4">
              <LogoSVG color="black" size={48} />
            </div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">Admin Access</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">System_Authorization_Required</p>
          </div>

          <div className="space-y-4">
            <input 
              type="password"
              placeholder="ENTER ACCESS CODE"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLogin(e.currentTarget.value);
              }}
              className="w-full bg-white/5 border border-white/10 h-14 rounded-2xl px-6 text-center text-xs font-bold uppercase tracking-widest text-white placeholder:text-white/20 focus:outline-none focus:border-white/40 transition-all"
              autoFocus
            />
            <button 
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                handleLogin(input.value);
              }}
              className="w-full bg-white text-black h-14 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all"
            >
              Verify Identity
            </button>
          </div>
          
          <div className="text-center">
            <Link href="/" className="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors">
              Return to storefront
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
    { name: 'Revenue', href: '/admin/revenue', icon: BadgeDollarSign },
    { name: 'Billing', href: '/admin/billing', icon: CreditCard },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Drops', href: '/admin/drops', icon: Layers3 },
    { name: 'Stock', href: '/admin/stock', icon: Boxes },
    { name: 'Categories', href: '/admin/categories', icon: LayoutDashboard },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    { name: 'Broadcasts', href: '/admin/broadcasts', icon: Send },
    { name: 'Waitlist', href: '/admin/waitlist', icon: Users },
    { name: 'Storage', href: '/admin/storage', icon: HardDrive },
    { name: 'Delivery', href: '/admin/delivery', icon: MapPinned },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
    { name: 'View Site', href: '/', icon: Home },
  ];

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-black flex flex-col lg:flex-row font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-zinc-100 flex-col fixed inset-y-0 shadow-sm">
        <div className="p-10">
          <Link href="/" className="flex items-center gap-4">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center p-1">
              <LogoSVG color="white" size={28} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight">Admin Panel</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">Control Center</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-6 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-zinc-50 text-black font-bold' 
                    : 'text-zinc-400 hover:text-black hover:bg-zinc-50/50'
                }`}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-xs font-semibold uppercase tracking-wider">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-8">
          <button 
            onClick={async () => {
              await fetch('/api/admin/session', { method: 'DELETE' }).catch(() => null);
              localStorage.removeItem('admin_auth');
              setIsAuthorized(false);
              router.push('/');
            }}
            className="flex items-center gap-4 px-5 py-4 w-full text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all rounded-2xl text-[10px] uppercase tracking-widest font-bold"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Header - Mobile */}
      <header className="lg:hidden bg-white border-b border-zinc-100 p-6 sticky top-0 z-[100] flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center p-0.5">
            <LogoSVG color="white" size={22} />
          </div>
          <span className="text-sm font-bold tracking-tight">Admin Panel</span>
        </Link>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-zinc-500"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[110] flex flex-col overflow-y-auto overscroll-contain bg-white px-6 pb-6 pt-24 lg:hidden"
          >
            <div className="flex flex-1 flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-5 rounded-xl px-4 py-4 text-xl font-bold uppercase tracking-tight ${
                    pathname === item.href ? 'text-black' : 'text-zinc-300'
                  }`}
                >
                  <item.icon size={24} />
                  {item.name}
                </Link>
              ))}
            </div>
            <button 
              onClick={async () => {
                await fetch('/api/admin/session', { method: 'DELETE' }).catch(() => null);
                localStorage.removeItem('admin_auth');
                router.push('/');
              }}
              className="mt-6 flex items-center gap-4 border-t border-zinc-100 px-4 py-6 text-xs font-bold uppercase tracking-widest text-zinc-400"
            >
              <LogOut size={20} />
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 min-h-screen p-8 lg:p-16">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
