"use client";

import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import {
  envValueForMode,
  isLocalTestEmail,
  PaystackMode,
} from "@/lib/paystackMode";
import { paystackErrorMessage } from "@/lib/paystackError";

const PAYSTACK_SCRIPT_URL = "https://js.paystack.co/v2/inline.js";

type PaystackTransaction = { reference?: string };
type PaystackPopup = {
  newTransaction: (options: Record<string, unknown>) => unknown;
  paymentRequest: (options: Record<string, unknown>) => Promise<unknown>;
};

declare global {
  interface Window {
    PaystackPop?: new () => PaystackPopup;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadPaystackScript() {
  if (window.PaystackPop) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(
      `script[src="${PAYSTACK_SCRIPT_URL}"]`,
    );
    const cleanup = () => {
      window.clearTimeout(timeout);
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
    };
    const handleError = () => {
      cleanup();
      script?.remove();
      reject(new Error("Could not load Paystack checkout. Please try again."));
    };
    const handleLoad = () => {
      if (!window.PaystackPop) return handleError();
      cleanup();
      resolve();
    };
    const timeout = window.setTimeout(handleError, 15000);

    const shouldAppend = !script;
    if (!script) {
      script = document.createElement("script");
      script.src = PAYSTACK_SCRIPT_URL;
      script.async = true;
    }

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    if (shouldAppend) document.body.appendChild(script);
  }).catch((error: unknown) => {
    scriptPromise = null;
    throw error;
  });
  return scriptPromise;
}

type Props = {
  email: string;
  amount: number; // amount in Naira
  metadata?:
    | Record<string, unknown>
    | ((reference: string) => Record<string, unknown>);
  onSuccess?: (ref: string, paymentMode: PaystackMode) => void;
  onClose?: (reference: string) => void;
  disabled?: boolean;
  beforePayment?: (reference: string) => Promise<boolean>;
};

export default function PaystackButton({
  email,
  amount,
  metadata,
  onSuccess,
  onClose,
  disabled = false,
  beforePayment,
}: Props) {
  const isOpenedRef = useRef(false);
  const referenceRef = useRef<string>("");
  const walletContainerId = `apple-pay-${useId().replace(/:/g, "")}`;
  const [walletSupported, setWalletSupported] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletReady, setWalletReady] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const walletCloseRef = useRef<(() => void) | null>(null);
  const walletStartedRef = useRef(0);
  const walletAmountRef = useRef(0);

  useEffect(() => {
    void loadPaystackScript().catch(() => null);
    try {
      const session = (
        window as unknown as {
          ApplePaySession?: { canMakePayments: () => boolean };
        }
      ).ApplePaySession;
      setWalletSupported(Boolean(session?.canMakePayments()));
    } catch {
      setWalletSupported(false);
    }
  }, []);

  const generateIdempotentReference = () => {
    if (!referenceRef.current) {
      referenceRef.current = `storefront-${crypto.randomUUID()}`;
    }
    return referenceRef.current;
  };

  const payWithPaystack = async (wallet = false) => {
    if (disabled || isOpenedRef.current) {
      return;
    }
    isOpenedRef.current = true;
    setIsStarting(true);

    let paymentMode: PaystackMode = isLocalTestEmail(email) ? "test" : "live";
    try {
      const modeResponse = await fetch("/api/paystack/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email }),
      });
      const modeResult = await modeResponse.json();
      if (modeResponse.ok && modeResult.mode === "test") {
        paymentMode = "test";
      }
    } catch {
      // Fail closed to live mode if the authorization check is unavailable.
    }
    const publicKey = envValueForMode(
      process.env.NEXT_PUBLIC_PAYSTACK_TEST_PUBLIC_KEY,
      process.env.NEXT_PUBLIC_PAYSTACK_LIVE_PUBLIC_KEY,
      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      paymentMode,
    );

    if (!publicKey) {
      toast.error(
        paymentMode === "test"
          ? "Paystack test public key is not configured"
          : "Paystack live public key is not configured",
      );
      isOpenedRef.current = false;
      setIsStarting(false);
      return;
    }

    try {
      await loadPaystackScript();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load Paystack checkout.",
      );
      isOpenedRef.current = false;
      setIsStarting(false);
      return;
    }

    if (beforePayment) {
      try {
        const canContinue = await beforePayment(generateIdempotentReference());
        if (!canContinue) {
          isOpenedRef.current = false;
          setIsStarting(false);
          return;
        }
      } catch {
        toast.error(
          "Could not confirm product availability. Please try again.",
        );
        isOpenedRef.current = false;
        setIsStarting(false);
        return;
      }
    }

    let settled = false;
    const closePayment = () => {
      if (settled) return;
      settled = true;
      const closedReference = referenceRef.current;
      referenceRef.current = "";
      isOpenedRef.current = false;
      setIsStarting(false);
      setWalletOpen(false);
      setWalletReady(false);
      walletCloseRef.current = null;
      document.getElementById(walletContainerId)?.replaceChildren();
      if (closedReference) onClose?.(closedReference);
    };
    const Popup = window.PaystackPop;
    if (!Popup) {
      toast.error(
        "Paystack checkout is unavailable. Please refresh and try again.",
      );
      closePayment();
      return;
    }

    try {
      const handler = new Popup();
      // Open the standard InlineJS v2 popup. Avoid the checkout() preflight
      // path so normal payments do not depend on wallet initialization.
      const options = {
        key: publicKey,
        email,
        amount: Math.round(amount * 100),
        currency: "NGN",
        reference: generateIdempotentReference(),
        channels: ["card", "bank", "ussd", "qr", "bank_transfer", "apple_pay"],
        metadata: {
          ...(typeof metadata === "function"
            ? metadata(generateIdempotentReference())
            : metadata),
          paystackMode: paymentMode,
        },
        onSuccess: (response: PaystackTransaction) => {
          if (settled) return;
          settled = true;
          setWalletOpen(false);
          walletCloseRef.current = null;
          toast.success("Payment successful");
          if (response.reference && onSuccess)
            onSuccess(response.reference, paymentMode);
          isOpenedRef.current = false;
        },
        onCancel: () => {
          if (settled) return;
          toast.info("Payment window closed");
          closePayment();
        },
        onError: (error: unknown) => {
          if (settled) return;
          closePayment();
          toast.error(paystackErrorMessage(error));
        },
      };
      setIsStarting(false);
      if (wallet) {
        walletStartedRef.current = Date.now();
        walletAmountRef.current = amount;
        setWalletReady(false);
        setWalletOpen(true);
        walletCloseRef.current = closePayment;
        await handler.paymentRequest({
          ...options,
          ref: options.reference,
          channels: ["card", "apple_pay"],
          container: walletContainerId,
          style: {
            theme: "dark",
            applePay: {
              width: "100%",
              height: "52px",
              borderRadius: "12px",
              type: "pay",
              locale: "en",
            },
          },
          onElementsMount: (elements: { applePay?: boolean } | null) => {
            if (settled) return;
            if (!elements?.applePay) {
              closePayment();
              toast.error(
                "Apple Pay is unavailable on this device or card. Please use Pay with Paystack.",
              );
              return;
            }
            setWalletReady(true);
          },
        });
      } else {
        await handler.newTransaction(options);
      }
    } catch (error) {
      if (settled) return;
      closePayment();
      toast.error(paystackErrorMessage(error));
    }
  };

  return (
    <div className="space-y-3">
      {isStarting && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-6 backdrop-blur-sm"
        >
          <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center shadow-2xl">
            <span className="h-11 w-11 animate-spin rounded-full border-4 border-zinc-200 border-t-black" />
            <div>
              <p className="font-bold text-black">Preparing secure checkout</p>
              <p className="mt-1 text-sm text-zinc-500">
                Paystack will open in a moment…
              </p>
            </div>
          </div>
        </div>
      )}
      {walletSupported && (
        <button
          type="button"
          aria-label="Continue with Apple Pay"
          disabled={disabled || isStarting}
          onClick={() => payWithPaystack(true)}
          className="apple-pay-launch w-full h-[52px] rounded-xl disabled:opacity-50"
        />
      )}
      <button
        type="button"
        onClick={() => payWithPaystack()}
        disabled={disabled || isStarting}
        className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
          disabled || isStarting
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-green-600 text-white hover:bg-green-700"
        }`}
      >
        {disabled
          ? "Processing..."
          : isStarting
            ? "Preparing Paystack..."
            : "Pay with Paystack"}
      </button>
      <div
        hidden={!walletOpen}
        className="fixed inset-0 z-[100] bg-black/60 p-4"
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Apple Pay checkout"
          className="mx-auto mt-[20vh] max-w-sm rounded-2xl bg-white p-6 !text-black shadow-xl"
        >
          <h2 className="text-lg font-bold !text-black">
            Confirm Apple Pay checkout
          </h2>
          <p className="my-3 text-sm !text-black">
            NGN {walletAmountRef.current.toLocaleString()} · Tap Apple Pay below
            to continue.
          </p>
          {!walletReady && (
            <p role="status" className="mb-3 text-sm !text-black">
              Preparing Apple Pay…
            </p>
          )}
          <div
            id={walletContainerId}
            onClickCapture={(event) => {
              if (Date.now() - walletStartedRef.current > 10 * 60 * 1000) {
                event.preventDefault();
                event.stopPropagation();
                walletCloseRef.current?.();
                toast.info(
                  "Please prepare Apple Pay again to refresh product availability.",
                );
              }
            }}
          />
          <button
            type="button"
            onClick={() => walletCloseRef.current?.()}
            className="mt-4 w-full py-2 text-sm !text-black underline"
          >
            Use another payment method
          </button>
        </section>
      </div>
      <style jsx>{`
        .apple-pay-launch {
          -webkit-appearance: -apple-pay-button;
          -apple-pay-button-style: black;
          -apple-pay-button-type: continue;
        }
      `}</style>
    </div>
  );
}
