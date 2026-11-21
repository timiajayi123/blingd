export function paystackErrorMessage(error: unknown): string {
  const message = typeof error === 'string'
    ? error
    : error && typeof error === 'object' && 'message' in error
      ? (error as { message?: unknown }).message
      : null;

  if (typeof message !== 'string' || !message.trim()) {
    return 'Paystack could not start this payment. Please retry or use another browser.';
  }
  // SDK setup errors can be plain objects, not Error instances. Show their
  // explanation without dumping configuration, keys or customer metadata.
  return message.trim().replace(/\b(?:pk|sk)_(?:live|test)_[A-Za-z0-9_-]+\b/g, '[redacted key]').slice(0, 300);
}
