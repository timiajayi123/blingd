export const INTERNATIONAL_SHIPPING = {
  US: {
    name: "United States",
    tiers: [
      { maxGrams: 500, price: 171810, label: "Up to 0.5 kg" },
      { maxGrams: 1000, price: 185050, label: "Up to 1 kg" },
    ],
  },
  GB: {
    name: "United Kingdom",
    tiers: [
      { maxGrams: 500, price: 24415, label: "Up to 0.5 kg" },
      { maxGrams: 1000, price: 29470, label: "Up to 1 kg" },
    ],
  },
  CA: {
    name: "Canada",
    tiers: [
      { maxGrams: 500, price: 51162, label: "Up to 0.5 kg" },
      { maxGrams: 1000, price: 68050, label: "Up to 1 kg" },
    ],
  },
} as const;

export type InternationalCountryCode = keyof typeof INTERNATIONAL_SHIPPING;

export type ShippingQuote =
  | {
      available: true;
      country: InternationalCountryCode;
      countryName: string;
      totalWeightGrams: number;
      tierMaxGrams: number;
      tierLabel: string;
      price: number;
    }
  | {
      available: false;
      country: string;
      countryName: string;
      totalWeightGrams: number;
      reason: "unsupported_country" | "empty_cart" | "missing_weight";
    };

export function isInternationalCountry(
  country: string,
): country is InternationalCountryCode {
  return country in INTERNATIONAL_SHIPPING;
}

export function getDestinationName(country: string) {
  if (country === "NG") return "Nigeria";
  return isInternationalCountry(country)
    ? INTERNATIONAL_SHIPPING[country].name
    : "International";
}

export function calculateInternationalShipping(
  country: string,
  items: Array<{ shippingWeightGrams?: number; quantity?: number }>,
): ShippingQuote {
  const countryName = getDestinationName(country);
  if (!isInternationalCountry(country)) {
    return {
      available: false,
      country,
      countryName,
      totalWeightGrams: 0,
      reason: "unsupported_country",
    };
  }

  if (!items.length) {
    return {
      available: false,
      country,
      countryName,
      totalWeightGrams: 0,
      reason: "empty_cart",
    };
  }

  const missingWeight = items.some(
    (item) => !Number.isFinite(Number(item.shippingWeightGrams)) || Number(item.shippingWeightGrams) <= 0,
  );
  const totalWeightGrams = items.reduce(
    (total, item) =>
      total +
      Math.max(0, Math.round(Number(item.shippingWeightGrams || 0))) *
        Math.max(1, Math.floor(Number(item.quantity || 1))),
    0,
  );

  if (missingWeight) {
    return {
      available: false,
      country,
      countryName,
      totalWeightGrams,
      reason: "missing_weight",
    };
  }

  const [halfKiloTier, oneKiloTier] = INTERNATIONAL_SHIPPING[country].tiers;
  const completeKilos = Math.floor(totalWeightGrams / 1000);
  const remainingGrams = totalWeightGrams % 1000;
  const halfKiloBlocks = remainingGrams > 0 && remainingGrams <= 500 ? 1 : 0;
  const oneKiloBlocks = completeKilos + (remainingGrams > 500 ? 1 : 0);
  const tierMaxGrams = oneKiloBlocks * 1000 + halfKiloBlocks * 500;
  const price =
    oneKiloBlocks * oneKiloTier.price + halfKiloBlocks * halfKiloTier.price;
  const tierParts = [
    oneKiloBlocks > 0
      ? `${oneKiloBlocks > 1 ? `${oneKiloBlocks} × ` : ""}1 kg`
      : "",
    halfKiloBlocks > 0 ? "0.5 kg" : "",
  ].filter(Boolean);

  return {
    available: true,
    country,
    countryName,
    totalWeightGrams,
    tierMaxGrams,
    tierLabel: tierParts.join(" + "),
    price,
  };
}
