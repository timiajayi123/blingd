"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/app/Store/CartStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PaystackButton from "@/components/ui/PaystackButton";
import {
  MapPin,
  Phone,
  FileText,
  Tag,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Check,
  ChevronDown,
  Package,
} from "lucide-react";
import { getFileUrl } from "@/lib/api";
import { getImageUrl } from "@/lib/getImageUrl";
import { PaystackMode } from "@/lib/paystackMode";
import { formatCurrency } from "@/lib/utils";
import {
  getDestinationName,
  type ShippingQuote,
} from "@/lib/internationalShipping";

interface DeliveryOption {
  $id: string;
  state: string;
  name: string;
  price: number;
  type: "state" | "sub_location";
  active: boolean;
  sortOrder: number;
}

interface PackagingOption {
  $id: string;
  name: string;
  price: number;
  type: "required" | "recommended";
  active: boolean;
  imageFileId: string;
}

import { trackEvent } from "@/lib/analytics";

const CheckoutPage: React.FC = () => {
  const { cart, totalPrice, clearCart, setCart, currency, destinationCountry } =
    useCartStore();
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [userId, setUserId] = useState("guest");
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [isClientReady, setIsClientReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutOptionsLoading, setCheckoutOptionsLoading] = useState(true);
  const [shippingQuoteResult, setShippingQuoteResult] = useState<{
    key: string;
    quote: ShippingQuote;
  } | null>(null);
  const [shippingQuoteLoading, setShippingQuoteLoading] = useState(false);
  const [shippingQuoteError, setShippingQuoteError] = useState("");

  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [selectedDelivery, setSelectedDelivery] =
    useState<DeliveryOption | null>(null);

  // Nigeria dynamic delivery states
  const [selectedState, setSelectedState] = useState<DeliveryOption | null>(
    null,
  );
  const [deliveryLoadError, setDeliveryLoadError] = useState("");

  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState("");

  const [packagingOptions, setPackagingOptions] = useState<PackagingOption[]>(
    [],
  );
  const [selectedPackagingIds, setSelectedPackagingIds] = useState<string[]>(
    [],
  );
  const [packagingPreviewUrl, setPackagingPreviewUrl] = useState<string | null>(
    null,
  );
  const [deliveryDropdownOpen, setDeliveryDropdownOpen] = useState(false);
  const [deliverySearch, setDeliverySearch] = useState("");

  // Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [couponPreview, setCouponPreview] = useState<any>(null);
  const debounceRef = useRef<any>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  interface AppliedCoupon {
    code: string;
    discountPercent: number;
    discount: number;
  }

  const router = useRouter();

  const loadCheckoutOptions = async () => {
    try {
      setDeliveryLoadError("");
      const response = await fetch("/api/checkout-options");
      const data = await response.json();
      if (response.ok) {
        setDeliveryOptions(data.deliveryOptions || []);
        setPackagingOptions(data.packagingOptions || []);
        return;
      }

      console.warn(
        "Combined checkout options were unavailable; loading delivery rates separately:",
        data.error,
      );
      const deliveryResponse = await fetch("/api/delivery-locations");
      const deliveryData = await deliveryResponse.json();
      if (!deliveryResponse.ok) {
        throw new Error(
          deliveryData.error || data.error || "Failed to load delivery options",
        );
      }
      setDeliveryOptions(deliveryData.locations || []);
      setPackagingOptions([]);
    } catch (err) {
      console.error("Failed to load checkout options:", err);
      setDeliveryLoadError(
        "Checkout options are unavailable. Please refresh or contact support.",
      );
    } finally {
      setCheckoutOptionsLoading(false);
    }
  };

  // Debounced coupon validation while typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const code = couponCode?.trim();
    if (!code) {
      setCouponPreview(null);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/coupons/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setCouponPreview(null);
          setCouponError(data.error || "Invalid coupon");
        } else {
          setCouponPreview(data.coupon);
          setCouponError(null);

          // Auto-apply validated coupon
          try {
            const discountPercent = Number(data.coupon.discountPercent ?? 0);
            const discount = Math.round((totalPrice() * discountPercent) / 100);
            const newCoupon = { ...data.coupon, discount };

            setAppliedCoupon((prev: AppliedCoupon | null) => {
              if (
                prev &&
                (prev.code || "").toString().toLowerCase() ===
                  (code || "").toLowerCase()
              )
                return prev;
              try {
                toast.success("Coupon applied");
              } catch {}
              return newCoupon;
            });
          } catch (e) {
            console.warn("Failed to auto-apply coupon preview", e);
          }
        }
      } catch (err) {
        setCouponPreview(null);
        setCouponError("Coupon validation failed");
      } finally {
        setIsValidating(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [couponCode]);

  // Recalculate discount when cart items change
  useEffect(() => {
    if (!appliedCoupon) return;
    try {
      const discountPercent = Number(appliedCoupon.discountPercent ?? 0);
      const discount = Math.round((totalPrice() * discountPercent) / 100);
      if (Number(appliedCoupon.discount ?? 0) !== discount) {
        setAppliedCoupon((prev: AppliedCoupon | null) =>
          prev ? { ...prev, discount } : prev,
        );
      }
    } catch (e) {
      console.warn("Failed to recalc coupon discount on cart change", e);
    }
  }, [cart]);

  // ✅ Generate branded receipt
  const generateReceipt = async (order: any) => {
    try {
      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });

      if (!res.ok) throw new Error("Failed to generate receipt");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Receipt generation error:", err);
      toast.error("Failed to generate receipt");
    }
  };

  // ✅ Payment success logic
  const handleSuccess = async (reference: string) => {
    console.log(
      "[Checkout] handleSuccess triggered with reference:",
      reference,
    );
    setIsProcessing(true);
    const toastId = toast.loading("Saving your paid order...");

    try {
      const orderPayload = buildOrderPayload(reference);
      const payable = Number(orderPayload.orderData.totalPrice || 0);

      console.log(
        "[Checkout] Sending order payload to /api/orders:",
        orderPayload,
      );

      const createOrderWithRetry = async (retries = 2) => {
        try {
          const res = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderPayload),
          });

          const rawText = await res.text();
          console.log("[Checkout] Raw server response text:", rawText);

          let data;
          try {
            data = JSON.parse(rawText);
          } catch (parseErr) {
            console.error(
              "[Checkout] Failed to parse server response as JSON:",
              parseErr,
            );
            throw new Error(
              `Server returned invalid response (Status: ${res.status}). Raw: ${rawText.substring(0, 100)}`,
            );
          }

          if (!res.ok) {
            console.error(
              "[Checkout] Server returned error status:",
              res.status,
              data,
            );
            throw { status: res.status, data };
          }
          return data;
        } catch (err: any) {
          if (retries > 0) {
            console.warn(
              `[Checkout] Order creation failed, retrying... (${retries} left)`,
              err,
            );
            await new Promise((r) => setTimeout(r, 2000)); // wait 2s
            return createOrderWithRetry(retries - 1);
          }
          throw err;
        }
      };

      const orderData = await createOrderWithRetry();

      trackEvent("purchase", {
        orderId: orderData.orderId,
        total: payable,
        itemsCount: cart.length,
      });

      toast.success("Order placed successfully!", { id: toastId });

      try {
        console.log(
          "[Checkout] Generating receipt for order:",
          orderData.orderId,
        );
        await generateReceipt({
          orderId: orderData.orderId,
          phone,
          address,
          notes,
          subtotal: totalPrice(),
          vatAmount: Math.round(vatAmount),
          siteFee: siteFee,
          deliveryFee: deliveryFee,
          packagingFee: packagingFee,
          total: payable,
          deliveryOption: deliveryName,
          items: cart.map((item) => ({
            name: item.selectedSize
              ? `${item.name} - ${item.selectedSize}`
              : item.name,
            quantity: Number(item.quantity),
            price: item.price,
          })),
        });
      } catch (receiptErr) {
        console.error(
          "[Checkout] Receipt generation failed but order is safe:",
          receiptErr,
        );
      }

      clearCart();
      // Keep isProcessing(true) during navigation to prevent flickering
      router.push(
        `/success?orderId=${encodeURIComponent(orderData.orderId)}#token=${encodeURIComponent(orderData.trackingToken)}`,
      );
    } catch (err: any) {
      console.error("[Checkout] CRITICAL ERROR in handleSuccess:", {
        message: err.message,
        status: err.status,
        data: err.data,
        fullError: err,
      });
      const errorMsg =
        err.data?.error ||
        err.message ||
        "Something went wrong during order creation. Please contact support.";
      toast.error(`Order failed: ${errorMsg}`, { id: toastId });
      setIsProcessing(false);
    }
  };

  // ✅ Init user + cart
  useEffect(() => {
    const init = async () => {
      // Guest-first model: stop calling account.get() globally
      setUserId("guest");
      setIsClientReady(true);
      void loadCheckoutOptions();
    };

    init();
  }, [router]);

  const shippingQuoteKey = `${destinationCountry}:${cart
    .map((item) => `${item.$id}:${item.quantity}`)
    .sort()
    .join("|")}`;

  useEffect(() => {
    if (!isClientReady || destinationCountry === "NG" || cart.length === 0) {
      setShippingQuoteResult(null);
      setShippingQuoteLoading(false);
      setShippingQuoteError("");
      return;
    }

    const controller = new AbortController();
    setShippingQuoteLoading(true);
    setShippingQuoteError("");

    void fetch("/api/shipping-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        country: destinationCountry,
        items: cart.map((item) => ({
          $id: item.$id,
          quantity: item.quantity,
        })),
      }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Could not calculate shipping.");
        }
        setShippingQuoteResult({
          key: shippingQuoteKey,
          quote: data as ShippingQuote,
        });
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setShippingQuoteError(
            error?.message || "Could not calculate shipping.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setShippingQuoteLoading(false);
      });

    return () => controller.abort();
  }, [isClientReady, destinationCountry, shippingQuoteKey]);

  if (!isClientReady)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
          <p className="text-gray-500 font-medium">Preparing checkout...</p>
        </div>
      </div>
    );

  let deliveryFee = 0;
  let deliveryName = "";
  const activeShippingQuote =
    shippingQuoteResult?.key === shippingQuoteKey
      ? shippingQuoteResult.quote
      : null;

  if (
    destinationCountry !== "NG" &&
    activeShippingQuote?.available
  ) {
    deliveryFee = activeShippingQuote.price;
    deliveryName = `${activeShippingQuote.countryName} shipping (${activeShippingQuote.tierLabel})`;
  } else if (selectedDelivery && destinationCountry === "NG") {
    deliveryFee = selectedDelivery.price;
    deliveryName = `${selectedDelivery.name}, ${selectedDelivery.state}`;
  } else if (selectedState && destinationCountry === "NG") {
    deliveryFee = selectedState.price;
    deliveryName = `${selectedState.state} (Home Delivery)`;
  }

  const requiredPackaging = packagingOptions.filter(
    (p) => p.type === "required",
  );
  const selectedRecommendedPackaging = packagingOptions.filter(
    (p) => p.type === "recommended" && selectedPackagingIds.includes(p.$id),
  );
  const packagingFee = [
    ...requiredPackaging,
    ...selectedRecommendedPackaging,
  ].reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  const stateOptions = deliveryOptions
    .filter((option) => option.type === "state")
    .sort(
      (a, b) => a.sortOrder - b.sortOrder || a.state.localeCompare(b.state),
    );
  const stateSubLocations = deliveryOptions.filter(
    (option) =>
      option.type === "sub_location" && option.state === selectedState?.state,
  );
  const filteredDeliveryOptions = stateSubLocations.filter((opt) => {
    const query = deliverySearch.trim().toLowerCase();
    if (!query) return true;
    return opt.name.toLowerCase().includes(query);
  });

  const vatAmount = Math.round(totalPrice() * 0.015); // Match server-side rounding.
  const siteFee = 200; // Compulsory site fee
  const finalTotal =
    totalPrice() + deliveryFee + packagingFee + vatAmount + siteFee;
  const discountAmount = appliedCoupon
    ? Number(appliedCoupon.discount ?? 0)
    : 0;
  const payableAmount = Math.max(0, finalTotal - discountAmount);
  const internationalDestination = destinationCountry !== "NG";
  const internationalShippingPending =
    internationalDestination && !activeShippingQuote?.available;
  const deliverySelectionReady = internationalDestination
    ? Boolean(activeShippingQuote?.available)
    : Boolean(selectedDelivery || selectedState);
  const checkoutOptionsReady =
    !checkoutOptionsLoading && !deliveryLoadError;
  const destinationName = getDestinationName(destinationCountry);

  const buildOrderPayload = (reference: string) => {
    const discount = appliedCoupon ? Number(appliedCoupon.discount ?? 0) : 0;

    return {
      userId,
      email,
      userName,
      couponCode: appliedCoupon?.code || null,
      orderData: {
        items: cart.map((item) => ({
          $id: item.$id,
          name: item.name,
          price: item.price,
          quantity: Number(item.quantity),
          size: item.selectedSize || "N/A",
          imageUrl: item.image || "/placeholder.svg",
        })),
        subtotal: totalPrice(),
        vatAmount: Math.round(vatAmount),
        siteFee: siteFee,
        totalPrice: Math.max(0, finalTotal - discount),
        address,
        phone,
        notes,
        deliveryOption: deliveryName,
        deliveryCountry: destinationCountry,
        deliveryPrice: deliveryFee,
        deliveryLocationId: selectedDelivery?.$id || selectedState?.$id || "",
        packagingPrice: packagingFee,
        packagingIds: [
          ...requiredPackaging,
          ...selectedRecommendedPackaging,
        ].map((item) => item.$id),
        paystackRef: reference,
        couponDiscount: discount,
      },
    };
  };

  const paystackMetadata = (reference: string) => ({
    source: "storefront_checkout",
    deliveryCountry: destinationCountry,
    orderPayload: buildOrderPayload(reference),
  });

  const validateCartAvailability = async () => {
    const response = await fetch("/api/products/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        items: cart.map((item) => ({
          $id: item.$id,
          quantity: item.quantity,
          price: item.price,
        })),
      }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Availability check failed");

    const currentProducts = new Map(
      (result.products || []).map((product: any) => [
        product.productId,
        product,
      ]),
    );
    const refreshedCart = cart.map((item) => {
      const product: any = currentProducts.get(item.$id);
      if (!product) return item;
      return {
        ...item,
        name: product.name,
        price: Number(product.price),
        image: getImageUrl(product.image),
        preOrder: Boolean(product.preOrder),
      };
    });
    const cartChanged = refreshedCart.some(
      (item, index) =>
        item.price !== cart[index].price ||
        item.name !== cart[index].name ||
        item.image !== cart[index].image,
    );
    if (cartChanged) setCart(refreshedCart);

    if (!result.available) {
      const firstIssue = result.issues?.[0];
      const message =
        firstIssue?.reason === "insufficient_stock"
          ? `${firstIssue.name} only has ${firstIssue.availableStock} left. Update your quantity.`
          : firstIssue?.reason === "drop_disabled"
            ? `${firstIssue.name} belongs to a drop that is no longer live.`
            : `${firstIssue?.name || "One or more products"} is no longer available.`;
      toast.error(message);
      return false;
    }

    if (cartChanged || result.priceChanges?.length) {
      toast.info(
        "Your cart price was updated. Review the new total, then tap Pay again.",
      );
      return false;
    }
    return true;
  };

  const reserveCartInventory = async (reference: string) => {
    const canContinue = await validateCartAvailability();
    if (!canContinue) return false;

    const response = await fetch("/api/inventory/reservation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        action: "reserve",
        reference,
        items: cart.map((item) => ({
          $id: item.$id,
          quantity: item.quantity,
          price: item.price,
        })),
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error || "One or more items are no longer available.");
      return false;
    }
    return true;
  };

  const releaseCartReservation = (reference: string) => {
    if (!reference) return;
    void fetch("/api/inventory/reservation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "release", reference }),
    });
  };

  return (
    <div className="min-h-screen bg-white py-12 relative">
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-xs space-y-8 flex flex-col items-center">
            {/* Logo/Brand Icon */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-gray-100 border-t-black animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                  <Package className="text-white w-6 h-6 animate-pulse" />
                </div>
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black tracking-tighter text-black uppercase">
                Processing Order
              </h2>
              <p className="text-sm text-gray-500 font-medium">
                Please do not close or refresh this page.
              </p>
            </div>

            {/* Progress Bar Container */}
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-black animate-loading-bar" />
            </div>

            <style jsx>{`
              @keyframes loading-bar {
                0% {
                  transform: translateX(-100%);
                }
                50% {
                  transform: translateX(0%);
                }
                100% {
                  transform: translateX(100%);
                }
              }
              .animate-loading-bar {
                animation: loading-bar 2s infinite linear;
                width: 100%;
              }
            `}</style>
          </div>
        </div>
      )}

      {packagingPreviewUrl && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setPackagingPreviewUrl(null)}
        >
          <div
            className="relative max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={packagingPreviewUrl}
              alt="Packaging preview"
              className="w-full rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        {/* Delivery Policy Banner */}
        <div className="mb-8 bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3 text-gray-900">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold mb-2">Important Delivery Policy</p>
            <ul className="list-disc space-y-2 pl-5 font-bold uppercase text-gray-900">
              <li>
                Please confirm your size before ordering. Items ordered in the
                wrong size are not eligible for a free swap; a replacement
                requires a new order and payment.
              </li>
              <li>
                Please be available and reachable on your delivery date. If you
                miss the delivery, you will need to pay another delivery fee
                before we can send it again.
              </li>
              <li>
                Ensure your delivery address and phone number are correct.
                Additional costs caused by incorrect or incomplete details will
                be paid by the customer.
              </li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* LEFT COLUMN - Forms */}
          <div className="lg:col-span-7 space-y-8">
            {userId === "guest" && (
              <section className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                    0
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Contact Details
                  </h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all outline-none text-black bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all outline-none text-black bg-white"
                    />
                  </div>
                </div>
              </section>
            )}

            <section className=" p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Delivery Method
                </h2>
              </div>

              {destinationCountry === "NG" ? (
                <div className="space-y-6">
                  {/* Nigeria State Selection */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black tracking-widest uppercase text-gray-400">
                      Select State
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setStateDropdownOpen((prev) => !prev);
                        setDeliveryDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left hover:border-gray-300 transition-all"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">
                          {selectedState ? selectedState.state : "Select State"}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-500 transition-transform ${stateDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {stateDropdownOpen && (
                      <div className="mt-2 rounded-xl border border-gray-200 bg-white shadow-lg z-30 relative">
                        <div className="px-3 pt-3 pb-2 border-b border-gray-100">
                          <input
                            type="text"
                            placeholder="Search state..."
                            value={stateSearch}
                            onChange={(e) => setStateSearch(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-black bg-white"
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto bg-white">
                          {stateOptions
                            .filter((s) =>
                              s.state
                                .toLowerCase()
                                .includes(stateSearch.toLowerCase()),
                            )
                            .map((s) => (
                              <button
                                key={s.state}
                                type="button"
                                onClick={() => {
                                  setSelectedState(s);
                                  setSelectedDelivery(null);
                                  setDeliverySearch("");
                                  setStateDropdownOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-all group"
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-gray-900 group-hover:text-black">
                                    {s.name || s.state}
                                  </span>
                                  <span className="text-[10px] text-gray-500">
                                    Standard delivery ·{" "}
                                    {formatCurrency(s.price, currency)}
                                  </span>
                                </div>
                                {selectedState?.state === s.state && (
                                  <Check size={16} className="text-black" />
                                )}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedState && stateSubLocations.length > 0 && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black tracking-widest uppercase text-gray-400">
                        Area / Landmark
                      </label>
                      <p className="text-xs leading-relaxed text-gray-500">
                        Check the dropdown to see if your area or landmark is
                        listed. If it isn&apos;t, you can continue with the
                        standard delivery rate.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryDropdownOpen((prev) => !prev);
                          setStateDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm font-semibold text-gray-900">
                          {selectedDelivery
                            ? selectedDelivery.name
                            : `Use ${selectedState.state} standard rate`}
                        </span>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-500 transition-transform ${deliveryDropdownOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {deliveryDropdownOpen && (
                        <div className="mt-2 rounded-xl border border-gray-200 bg-white shadow-lg z-30 relative">
                          <div className="px-3 pt-3 pb-2 border-b border-gray-100">
                            <input
                              type="text"
                              placeholder={`Search locations in ${selectedState.state}...`}
                              value={deliverySearch}
                              onChange={(e) =>
                                setDeliverySearch(e.target.value)
                              }
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-black bg-white"
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto bg-white">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDelivery(null);
                                setDeliveryDropdownOpen(false);
                              }}
                              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                            >
                              <span className="text-sm font-medium">
                                Standard {selectedState.state} rate
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatCurrency(selectedState.price, currency)}
                              </span>
                            </button>
                            {filteredDeliveryOptions.map((opt) => (
                              <button
                                key={opt.$id}
                                type="button"
                                onClick={() => {
                                  setSelectedDelivery(opt);
                                  setDeliveryDropdownOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-all"
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-gray-900">
                                    {opt.name}
                                  </span>
                                  <span className="text-[10px] text-gray-500">
                                    {formatCurrency(opt.price, currency)}
                                  </span>
                                </div>
                                {selectedDelivery?.$id === opt.$id && (
                                  <Check size={16} className="text-black" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {deliveryLoadError && (
                    <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
                      {deliveryLoadError}
                    </p>
                  )}

                  {checkoutOptionsLoading && (
                    <p className="flex items-center gap-2 rounded-xl bg-zinc-50 p-4 text-sm font-medium text-zinc-600">
                      <Loader2 size={16} className="animate-spin" /> Loading
                      delivery and packaging options...
                    </p>
                  )}

                  {/* Show effective delivery price */}
                  {selectedState && (
                    <div className="p-4 border-2 border-black rounded-xl animate-in fade-in slide-in-from-top-2 text-gray-900">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin size={18} className="text-gray-900" />
                        <span className="font-bold text-gray-900">
                          Home Delivery:
                        </span>
                      </div>
                      <p className="font-medium text-gray-900">
                        {deliveryName}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(deliveryFee, currency)}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`rounded-2xl border p-5 ${activeShippingQuote?.available ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"}`}
                >
                  <p className="text-xs font-black uppercase tracking-[0.18em]">
                    {destinationName} shipping
                  </p>
                  {shippingQuoteLoading && (
                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
                      <Loader2 size={16} className="animate-spin" /> Calculating
                      packed weight and delivery rate...
                    </p>
                  )}
                  {!shippingQuoteLoading && shippingQuoteError && (
                    <p className="mt-2 text-sm leading-6">
                      {shippingQuoteError} Refresh the page to try again.
                    </p>
                  )}
                  {!shippingQuoteLoading && activeShippingQuote?.available && (
                    <>
                      <p className="mt-2 text-sm leading-6">
                        Packed weight: {activeShippingQuote.totalWeightGrams} g · {activeShippingQuote.tierLabel}
                      </p>
                      <p className="mt-2 text-2xl font-black">
                        {formatCurrency(activeShippingQuote.price, currency)}
                      </p>
                    </>
                  )}
                  {!shippingQuoteLoading &&
                    activeShippingQuote &&
                    !activeShippingQuote.available && (
                      <p className="mt-2 text-sm leading-6">
                        {activeShippingQuote.reason === "missing_weight"
                          ? "A product in this cart is missing its packed weight. Payment is paused until it is updated."
                          : "Add an item to calculate shipping."}
                      </p>
                    )}
                </div>
              )}
            </section>

            {packagingOptions.length > 0 && (
              <section className=" p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Packaging</h2>
                </div>

                <div className="space-y-4">
                  {requiredPackaging.map((pkg) => (
                    <div
                      key={pkg.$id}
                      className="flex items-center justify-between rounded-xl border-2 border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="flex items-center gap-4">
                        {pkg.imageFileId && (
                          <button
                            type="button"
                            onClick={() =>
                              setPackagingPreviewUrl(
                                getFileUrl(pkg.imageFileId),
                              )
                            }
                            className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 border flex-shrink-0"
                          >
                            <img
                              src={getFileUrl(pkg.imageFileId)}
                              alt={pkg.name}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900 text-sm sm:text-base">
                            {pkg.name}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500 mt-1">
                            Required packaging, automatically added to your
                            order
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(Number(pkg.price || 0), currency)}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1 uppercase tracking-wide">
                          Required
                        </div>
                      </div>
                    </div>
                  ))}

                  {packagingOptions.some((p) => p.type === "recommended") && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-800">
                        Recommended extras
                      </div>
                      {packagingOptions
                        .filter((p) => p.type === "recommended")
                        .map((pkg) => {
                          const isSelected = selectedPackagingIds.includes(
                            pkg.$id,
                          );
                          return (
                            <button
                              key={pkg.$id}
                              type="button"
                              onClick={() => {
                                setSelectedPackagingIds((prev) =>
                                  prev.includes(pkg.$id)
                                    ? prev.filter((id) => id !== pkg.$id)
                                    : [...prev, pkg.$id],
                                );
                              }}
                              className={`w-full flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${
                                isSelected
                                  ? "border-black bg-gray-50 ring-1 ring-black"
                                  : "border-gray-100 bg-white hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                {pkg.imageFileId && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPackagingPreviewUrl(
                                        getFileUrl(pkg.imageFileId),
                                      );
                                    }}
                                    className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 border flex-shrink-0"
                                  >
                                    <img
                                      src={getFileUrl(pkg.imageFileId)}
                                      alt={pkg.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                )}
                                <div>
                                  <div className="font-semibold text-gray-900 text-sm sm:text-base">
                                    {pkg.name}
                                  </div>
                                  <div className="text-xs sm:text-sm text-gray-500 mt-1">
                                    Optional packaging with extra benefits
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-gray-900">
                                  {formatCurrency(
                                    Number(pkg.price || 0),
                                    currency,
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-500 mt-1">
                                  {isSelected ? "Selected" : "Tap to add"}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 2. Shipping Details */}
            <section className=" p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Shipping Details
                </h2>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Your full name"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all outline-none text-black bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all outline-none text-black bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Enter your full delivery address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all outline-none text-black bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                    <input
                      type="tel"
                      placeholder="e.g. 08012345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all outline-none text-black bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Instructions (Optional)
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                    <textarea
                      placeholder="Any special instructions for the courier..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all outline-none resize-none text-black bg-white"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN - Summary */}
          <div className="lg:col-span-5">
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Your Order
              </h2>

              <div className="max-h-64 overflow-y-auto pr-2 space-y-4 mb-6 custom-scrollbar">
                {cart.map((item) => (
                  <div key={item.$id} className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {item.name}{" "}
                        {item.selectedSize && `- ${item.selectedSize}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(
                        item.price * Number(item.quantity),
                        currency,
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 my-6"></div>

              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                  <Tag size={16} /> Have a coupon?
                </label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all uppercase"
                    placeholder="Enter code"
                    value={couponCode}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCouponCode(v);
                      setCouponError(null);
                      setCouponPreview(null);
                      if (
                        appliedCoupon &&
                        v.trim().toLowerCase() !==
                          (appliedCoupon.code || "").toString().toLowerCase()
                      ) {
                        setAppliedCoupon(null);
                      }
                    }}
                  />
                  <button
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      appliedCoupon
                        ? "bg-gray-100 text-gray-900 hover:bg-gray-200"
                        : "bg-black text-white hover:bg-gray-800"
                    }`}
                    disabled={isValidating}
                    onClick={() => {
                      if (appliedCoupon) {
                        setAppliedCoupon(null);
                        setCouponCode("");
                        setCouponPreview(null);
                      } else {
                        // Trigger logic handled by useEffect, but manual click ensures immediate feedback if needed
                        // Ideally we rely on the button state to reflect the applied status
                      }
                    }}
                  >
                    {isValidating ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : appliedCoupon ? (
                      "Remove"
                    ) : (
                      "Apply"
                    )}
                  </button>
                </div>

                <div className="mt-2 min-h-[20px]">
                  {couponError && (
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <AlertCircle size={14} /> {couponError}
                    </p>
                  )}
                  {!couponError && !isValidating && couponPreview && (
                    <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                      <Check size={14} /> Valid code!{" "}
                      {couponPreview.discountPercent}% off
                    </p>
                  )}
                  {appliedCoupon && (
                    <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                      <Tag size={14} /> Coupon applied: {appliedCoupon.code}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(totalPrice(), currency)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>VAT (1.5%)</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(Math.round(vatAmount), currency)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Site Fee</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(siteFee, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span
                    className={`font-medium ${internationalShippingPending ? "text-amber-600" : deliveryFee === 0 ? "text-green-600" : "text-gray-900"}`}
                  >
                    {internationalShippingPending
                      ? shippingQuoteLoading
                        ? "CALCULATING"
                        : "UNAVAILABLE"
                      : deliveryFee === 0
                        ? "FREE"
                        : formatCurrency(deliveryFee, currency)}
                  </span>
                </div>
                {packagingOptions.length > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Packaging</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(packagingFee, currency)}
                    </span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Discount ({appliedCoupon.discountPercent}%)</span>
                    <span>-{formatCurrency(discountAmount, currency)}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100 mt-4">
                  <div className="flex justify-between items-end">
                    <span className="text-lg font-bold text-gray-900">
                      Total
                    </span>
                    <span className="text-3xl font-bold text-gray-900">
                      {formatCurrency(payableAmount, currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                {!internationalShippingPending &&
                userName &&
                email &&
                phone &&
                cart.length > 0 &&
                checkoutOptionsReady &&
                deliverySelectionReady ? (
                  <PaystackButton
                    email={email}
                    amount={payableAmount}
                    metadata={paystackMetadata}
                    beforePayment={reserveCartInventory}
                    disabled={isProcessing}
                    onSuccess={(res: any, _paymentMode: PaystackMode) => {
                      const reference =
                        typeof res === "string"
                          ? res
                          : res.reference || res.data?.reference;
                      if (!reference) {
                        toast.error("No reference returned from Paystack");
                        return;
                      }
                      handleSuccess(reference);
                    }}
                    onClose={(reference) => {
                      releaseCartReservation(reference);
                      toast.info("Payment window closed");
                    }}
                  />
                ) : (
                  <button
                    disabled
                    className="w-full py-4 bg-gray-200 text-gray-400 font-bold rounded-xl cursor-not-allowed flex flex-col items-center justify-center gap-1"
                  >
                    <span>Proceed to Payment</span>
                    <span className="text-xs font-normal">
                      {internationalShippingPending
                        ? shippingQuoteLoading
                          ? `Calculating ${destinationName} shipping`
                          : `${destinationName} shipping is unavailable for this cart`
                        : checkoutOptionsLoading
                          ? "Loading checkout options"
                          : deliveryLoadError
                            ? "Checkout options are temporarily unavailable"
                        : "Complete delivery details to continue"}
                    </span>
                  </button>
                )}

                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
                  <ShieldCheck size={14} />
                  <span>
                    Secure Paystack payment · Apple Pay appears on eligible
                    Apple devices · charged in NGN
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
