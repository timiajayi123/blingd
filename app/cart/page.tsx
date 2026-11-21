"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCartStore } from '@/app/Store/CartStore';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, ArrowLeft, ShieldCheck, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/getImageUrl';

const Cart = () => {
  const { cart, updateQuantity, removeFromCart, clearCart, totalPrice, currency, setCart } = useCartStore();
  const hasLoggedRef = useRef(false);
  const [cartIssues, setCartIssues] = useState<any[]>([]);
  const [currentProducts, setCurrentProducts] = useState<any[]>([]);
  const [isRefreshingCart, setIsRefreshingCart] = useState(false);
  const [cartNotice, setCartNotice] = useState('');
  const [cartCheckFailed, setCartCheckFailed] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState('');

  const cartSignature = cart.map((item) => `${item.$id}:${item.quantity}`).join('|');

  useEffect(() => {
    fetch('/api/storefront-media', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((media) => {
        if (typeof media?.cartBackgroundUrl === 'string' && media.cartBackgroundUrl) {
          setBackgroundUrl(media.cartBackgroundUrl);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!cart.length) {
      setCartIssues([]);
      setCurrentProducts([]);
      return;
    }

    let active = true;
    const refreshCart = async () => {
      setIsRefreshingCart(true);
      try {
        const response = await fetch('/api/products/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({
            items: cart.map((item) => ({ $id: item.$id, quantity: item.quantity, price: item.price })),
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Cart refresh failed');
        if (!active) return;
        setCartCheckFailed(false);

        const products = Array.isArray(result.products) ? result.products : [];
        const productMap = new Map(products.map((product: any) => [product.productId, product]));
        const refreshedCart = cart.map((item) => {
          const product: any = productMap.get(item.$id);
          if (!product) return item;
          return {
            ...item,
            name: product.name,
            price: Number(product.price),
            image: getImageUrl(product.image),
            preOrder: Boolean(product.preOrder),
          };
        });
        const changed = refreshedCart.some((item, index) =>
          item.price !== cart[index].price || item.name !== cart[index].name || item.image !== cart[index].image
        );

        setCurrentProducts(products);
        setCartIssues(Array.isArray(result.issues) ? result.issues : []);
        if (changed) {
          setCart(refreshedCart);
          setCartNotice('Your bag was updated with the latest product details and prices.');
        } else if (result.issues?.length) {
          setCartNotice('Some items need attention before checkout.');
        } else {
          setCartNotice('');
        }
      } catch {
        if (active) {
          setCartCheckFailed(true);
          setCartNotice('We could not refresh availability. Checkout is paused until the connection returns.');
        }
      } finally {
        if (active) setIsRefreshingCart(false);
      }
    };

    refreshCart();
    const handleFocus = () => refreshCart();
    window.addEventListener('focus', handleFocus);
    return () => {
      active = false;
      window.removeEventListener('focus', handleFocus);
    };
    // Quantity and product changes should trigger a fresh server check; price updates should not loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartSignature]);

  const issuesByProduct = useMemo(
    () => new Map(cartIssues.map((issue) => [issue.productId, issue])),
    [cartIssues],
  );
  const currentProductsById = useMemo(
    () => new Map(currentProducts.map((product) => [product.productId, product])),
    [currentProducts],
  );

  useEffect(() => {
    if (hasLoggedRef.current) return;
    if (cart.length === 0) return;

    const logCart = async () => {
      try {
        const userId = 'guest';
        await fetch('/api/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'cart_snapshot',
            userId,
            cart: JSON.stringify(cart),
          }),
        });
      } catch {
        // ignore logging errors
      }
    };

    logCart();
    hasLoggedRef.current = true;
  }, [cart]);

  const handleUpdateQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantity(cartItemId, newQuantity);
  };

  const handleRemoveFromCart = (cartItemId: string) => {
    removeFromCart(cartItemId);
  };

  const subtotal = totalPrice();
  const shipping = 0; 
  const total = subtotal + shipping;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-black text-white relative overflow-hidden">
        {/* Background Image with Overlay - Show on ALL devices */}
        <div className="absolute inset-0 z-0">
          {backgroundUrl && (
            <Image
              src={backgroundUrl}
              alt=""
              fill
              className="object-cover opacity-90"
              priority
            />
          )}
          <div className="absolute inset-0 bg-black/30" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center relative z-10"
        >
          <ShoppingBag size={48} className="mx-auto mb-8 text-white/20" strokeWidth={1} />
          <h2 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight uppercase">
            Your bag is empty
          </h2>
          <p className="text-white/40 mb-12 text-sm max-w-xs mx-auto">
            Looks like you haven't added anything to your collection yet.
          </p>
          <Link 
            href="/store" 
            className="inline-block px-10 py-4 bg-white text-black font-bold uppercase tracking-widest text-[10px] hover:bg-zinc-200 transition-all"
          >
            CONTINUE SHOPPING
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-32 pb-40 selection:bg-white selection:text-black relative">
      {/* Background Image with Overlay - Show on ALL devices */}
      <div className="fixed inset-0 z-0">
        {backgroundUrl && (
          <Image
            src={backgroundUrl}
            alt=""
            fill
            className="object-cover opacity-95 transition-all duration-1000"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/50" />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight uppercase mb-2">
              Shopping Bag
            </h1>
            <p className="text-white/40 text-[10px] tracking-[0.2em] uppercase">
              {cart.length} {cart.length === 1 ? 'Item' : 'Items'} in your bag
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <button 
              onClick={clearCart}
              className="text-[10px] font-bold text-red-400/60 hover:text-red-400 transition-all flex items-center gap-2 tracking-[0.2em] uppercase"
            >
              <Trash2 size={14} /> Remove All
            </button>
            <Link href="/" className="text-[10px] font-bold text-white/40 hover:text-white transition-all flex items-center gap-2 tracking-[0.2em] uppercase">
              <ArrowLeft size={14} /> Back to shop
            </Link>
          </div>
        </header>

        {(cartNotice || isRefreshingCart) && (
          <div className={`mb-8 border px-5 py-4 text-xs font-bold uppercase tracking-wider ${cartIssues.length ? 'border-red-400/40 bg-red-950/60 text-red-100' : 'border-white/15 bg-black/60 text-white/70'}`}>
            {isRefreshingCart ? 'Checking current prices and stock...' : cartNotice}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-7">
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="divide-y divide-white/10"
            >
              <AnimatePresence mode='popLayout'>
                {cart.map((item) => {
                  const issue: any = issuesByProduct.get(item.$id);
                  const currentProduct: any = currentProductsById.get(item.$id);
                  const issueText = issue?.reason === 'drop_disabled'
                    ? 'This drop is no longer live.'
                    : issue?.reason === 'out_of_stock'
                    ? 'This product is sold out.'
                    : issue?.reason === 'insufficient_stock'
                    ? `Only ${issue.availableStock} available. Reduce the quantity.`
                    : issue?.reason === 'not_found'
                    ? 'This product is no longer available.'
                    : '';
                  return (
                  <motion.div
                    key={item.cartItemId}
                    layout
                    variants={itemVariants}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    className="py-10 first:pt-0 bg-black/40 backdrop-blur-sm px-6 mb-4 border border-white/5 shadow-lg"
                  >
                    <div className="flex flex-col sm:flex-row gap-8">
                      <Link href={`/product-details/${item.$id}`} className="block relative aspect-square sm:aspect-[3/4] w-32 sm:w-32 md:w-40 bg-white overflow-hidden flex-shrink-0">
                        <Image
                          src={getImageUrl(item.image || '/placeholder.svg')}
                          alt={item.name}
                          fill
                          className="object-contain sm:object-cover transition-opacity duration-500 p-2 sm:p-0"
                        />
                      </Link>

                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1 flex-1 min-w-0">
                            <Link href={`/product-details/${item.$id}`}>
                                <h3 className="text-lg md:text-xl font-bold uppercase tracking-tight truncate">{item.name}</h3>
                            </Link>
                            <div className="flex flex-wrap gap-4 text-[10px] text-white/40 uppercase tracking-widest">
                               {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                               {item.color && <span>Color: {item.color}</span>}
                            </div>
                            {issueText && <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-red-300">{issueText}</p>}
                          </div>
                          
                          <button 
                            onClick={() => handleRemoveFromCart(item.cartItemId)}
                            className="text-white/20 hover:text-white transition-colors p-2 flex-shrink-0"
                          >
                            <Trash2 size={18} strokeWidth={1.5} />
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mt-8 gap-4">
                          <div className="flex items-center border border-white/10">
                            <button 
                              onClick={() => handleUpdateQuantity(item.cartItemId, item.quantity - 1)}
                              className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                              disabled={item.quantity <= 1}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                            <button 
                              onClick={() => handleUpdateQuantity(item.cartItemId, item.quantity + 1)}
                              className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                              disabled={!currentProduct?.preOrder && Number(currentProduct?.stock ?? Infinity) <= item.quantity}
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <p className="text-lg font-bold tracking-tight">
                            {formatCurrency(item.price * item.quantity, currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </div>

          <div className="lg:col-span-5">
            <div className="sticky top-40">
              <div className="bg-zinc-900/60 backdrop-blur-xl p-10 border border-white/10 shadow-2xl">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] mb-10 text-white/40">
                  Order Summary
                </h2>
                
                <div className="space-y-6 mb-10 text-[11px] uppercase tracking-widest">
                  <div className="flex justify-between text-white/40">
                    <span>Subtotal</span>
                    <span className="text-white">{formatCurrency(subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-white/40">
                    <span>Shipping</span>
                    <span className="text-white/20 italic">Calculated at checkout</span>
                  </div>
                  
                  <div className="h-px bg-white/10 my-8"></div>
                  
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-white">Total</span>
                    <span className="text-3xl font-bold tracking-tighter tabular-nums">
                      {formatCurrency(total, currency)}
                    </span>
                  </div>
                </div>

                {cartIssues.length || isRefreshingCart || cartCheckFailed ? (
                  <button disabled className="block w-full cursor-not-allowed bg-zinc-700 py-5 text-center text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                    Resolve bag issues
                  </button>
                ) : (
                  <Link
                    href="/checkout"
                    className="block w-full bg-white text-black py-5 text-center font-bold text-xs uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all"
                  >
                    Checkout
                  </Link>
                )}
                
                <div className="mt-10 flex items-center justify-center gap-2 text-white/20 text-[9px] font-bold uppercase tracking-[0.2em]">
                  <ShieldCheck size={14} />
                  <span>Secure Checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
