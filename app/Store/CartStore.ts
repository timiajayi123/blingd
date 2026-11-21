"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type CartItem = {
  $id: string;
  cartItemId: string; // ✅ unique identifier for each entry
  name: string;
  price: number;
  quantity: number;
  image?: string;
  selectedSize?: string | null;
  color?: string | null; // ✅ Added color support
  freeDelivery?: boolean;
  preOrder?: boolean;
  preOrderTier?: string | null;
};

type CartState = {
  cart: CartItem[];
  currency: string;
  destinationCountry: string;
  addToCart: (item: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  totalPrice: () => number;
  setCart: (items: CartItem[]) => void;
  setCurrency: (code: string) => void;
  setDestinationCountry: (code: string) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      currency: "NGN",
      destinationCountry: "NG",

      // ✅ Add to Cart (now generates unique ID)
      addToCart: (item) => {
        console.log("🛒 addToCart called with:", item);

        const fullItem: CartItem = {
          ...item,
          cartItemId: `${item.$id}-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 8)}`, // ✅ unique per addition
          name: item.name,
          price: item.price || 0,
          quantity: item.quantity || 1,
          image: item.image || "/placeholder.svg",
          selectedSize: item.selectedSize || undefined,
          freeDelivery: item.freeDelivery ?? false,
          preOrder: item.preOrder ?? false,
          preOrderTier: item.preOrderTier ?? undefined,
        };

        set({ cart: [...get().cart, fullItem] });

        console.log("✅ Added to cart:", fullItem);
      },

      // ✅ Remove from Cart using unique ID
      removeFromCart: (cartItemId) =>
        set({
          cart: get().cart.filter((item) => item.cartItemId !== cartItemId),
        }),

      // ✅ Clear Cart
      clearCart: () => set({ cart: [] }),

      // ✅ Update Quantity by unique ID
      updateQuantity: (cartItemId, quantity) =>
        set({
          cart: get().cart.map((item) =>
            item.cartItemId === cartItemId ? { ...item, quantity } : item,
          ),
        }),

      // ✅ Calculate Total Price
      totalPrice: () =>
        get().cart.reduce(
          (total, item) => total + item.price * item.quantity,
          0,
        ),

      // ✅ Restore Cart from localStorage
      setCart: (items) => {
        const sanitized = items.map((item) => ({
          ...item,
          cartItemId:
            item.cartItemId ||
            `${item.$id}-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 8)}`, // regenerate if missing
          price: item.price || 0,
          quantity: item.quantity || 1,
          image: item.image || "/placeholder.svg",
          selectedSize: item.selectedSize || undefined,
          freeDelivery: item.freeDelivery ?? false,
          preOrder: item.preOrder ?? false,
          preOrderTier: item.preOrderTier ?? undefined,
        }));
        set({ cart: sanitized });
      },

      setCurrency: (code) => set({ currency: code }),
      setDestinationCountry: (code) => set({ destinationCountry: code }),
    }),
    {
      name: "storefront-cart-storage",
      storage:
        typeof window !== "undefined"
          ? createJSONStorage(() => localStorage)
          : undefined,
    },
  ),
);
