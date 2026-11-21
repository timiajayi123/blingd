import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function formatCurrency(amount: number, currency: string = "NGN"): string {
  // First, make sure we're working with a number (in case it's a string)
  const numericAmount = Number(amount);
  
  // Exchange rates relative to NGN (base currency)
  // Approximate display rates only. Checkout charges the exact NGN total.
  const rates: { [key: string]: number } = {
    "NGN": 1,
    "GBP": 1 / 2000,
    "USD": 1 / 1600,
    "CAD": 1 / 1150,
  };

  const convertedAmount = numericAmount * (rates[currency] || 1);
  const locale = currency === "NGN" ? "en-NG" : currency === "GBP" ? "en-GB" : currency === "CAD" ? "en-CA" : "en-US";
  
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: currency === "NGN" ? 0 : 2,
    maximumFractionDigits: currency === "NGN" ? 0 : 2,
  }).format(convertedAmount);
}
