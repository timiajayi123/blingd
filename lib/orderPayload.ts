export type ParsedOrderPayload = {
  lineItems: any[];
  paymentBreakdown: Record<string, any> | null;
  status: string | null;
};

export function parseOrderPayload(rawItems: any): ParsedOrderPayload {
  let parsed = rawItems;

  if (typeof rawItems === "string") {
    try {
      parsed = JSON.parse(rawItems);
    } catch {
      return { lineItems: [], paymentBreakdown: null, status: null };
    }
  }

  if (Array.isArray(parsed)) {
    const metaItem = parsed.find((item) => item?.__type === "order_meta");
    return {
      lineItems: parsed.filter((item) => item?.__type !== "order_meta"),
      paymentBreakdown: metaItem?.paymentBreakdown || null,
      status: metaItem?.status || metaItem?.orderStatus || null,
    };
  }

  if (parsed && typeof parsed === "object") {
    return {
      lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
      paymentBreakdown: parsed.paymentBreakdown || null,
      status: parsed.status || parsed.orderStatus || parsed.paymentBreakdown?.status || null,
    };
  }

  return { lineItems: [], paymentBreakdown: null, status: null };
}

export function stringifyOrderPayload(
  lineItems: any[],
  paymentBreakdown: Record<string, any> | null,
  status?: string | null
) {
  return JSON.stringify({
    lineItems,
    paymentBreakdown,
    status: status || null,
  });
}
