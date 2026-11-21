import { serverDatabase } from '@/lib/serverAppwrite';
import { getProductDropId, isDropLive } from '@/lib/dropAvailability';

export type CartValidationInput = {
  $id?: string;
  productId?: string;
  quantity?: number;
  price?: number;
};

export type CanonicalCartProduct = {
  productId: string;
  name: string;
  price: number;
  stock: number;
  preOrder: boolean;
  image: string;
  dropId: string;
  shippingWeightGrams: number;
};

export type CartIssue = {
  productId: string;
  name: string;
  reason: 'not_found' | 'drop_disabled' | 'out_of_stock' | 'insufficient_stock';
  requestedQuantity: number;
  availableStock: number;
};

type CartValidationOptions = {
  checkStock?: boolean;
  checkDrop?: boolean;
};

const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'unconfigured_source_database';
const productsCollectionId = process.env.APPWRITE_PRODUCT_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_COLLECTION_ID || 'storefront_products';
const dropsCollectionId = process.env.APPWRITE_DROPS_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_DROPS_COLLECTION_ID || 'storefront_drops';

const parseBoolean = (value: unknown) =>
  typeof value === 'string' ? value.toLowerCase() === 'true' : Boolean(value);

export function normalizeStoredProductPrice(product: any) {
  const rawPrice = Number(product?.price ?? product?.Price ?? 0);
  if (!Number.isFinite(rawPrice) || rawPrice < 0) return 0;
  return rawPrice > 100000 ? rawPrice / 100 : rawPrice;
}

function firstProductImage(product: any) {
  const raw = product?.images || product?.Images || product?.image || product?.Image;
  if (Array.isArray(raw)) return String(raw[0] || '/placeholder.svg');
  if (typeof raw !== 'string') return raw ? String(raw) : '/placeholder.svg';

  const value = raw.trim();
  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return String(parsed[0] || '/placeholder.svg');
    } catch {
      // Older products can contain a single unwrapped file ID.
    }
  }
  return value || '/placeholder.svg';
}

export async function validateCartAgainstAppwrite(
  inputItems: CartValidationInput[],
  { checkStock = true, checkDrop = true }: CartValidationOptions = {}
) {
  const requestedItems = (Array.isArray(inputItems) ? inputItems : [])
    .map((item) => ({
      productId: String(item?.$id || item?.productId || '').trim(),
      quantity: Math.max(1, Math.floor(Number(item?.quantity || 1))),
      price: Number(item?.price || 0),
    }))
    .filter((item) => item.productId);

  const requestedByProduct = requestedItems.reduce((totals, item) => {
    totals.set(item.productId, (totals.get(item.productId) || 0) + item.quantity);
    return totals;
  }, new Map<string, number>());

  const uniqueProductIds = [...requestedByProduct.keys()];
  const productResults = await Promise.all(uniqueProductIds.map(async (productId) => {
    try {
      const product: any = await serverDatabase.getDocument(databaseId, productsCollectionId, productId);
      return { productId, product };
    } catch {
      return { productId, product: null };
    }
  }));

  const productMap = new Map(productResults.map((result) => [result.productId, result.product]));
  const dropIds = [...new Set(productResults
    .filter((result) => result.product)
    .map((result) => getProductDropId(result.product)))];

  const dropResults = await Promise.all(dropIds.map(async (dropId) => {
    try {
      const drop = await serverDatabase.getDocument(databaseId, dropsCollectionId, dropId);
      return { dropId, drop };
    } catch {
      return { dropId, drop: null };
    }
  }));
  const dropMap = new Map(dropResults.map((result) => [result.dropId, result.drop]));

  const products: CanonicalCartProduct[] = [];
  const issues: CartIssue[] = [];

  for (const productId of uniqueProductIds) {
    const product: any = productMap.get(productId);
    const requestedQuantity = requestedByProduct.get(productId) || 1;

    if (!product) {
      issues.push({ productId, name: 'Product', reason: 'not_found', requestedQuantity, availableStock: 0 });
      continue;
    }

    const name = product.name || product.Name || 'Product';
    const stock = Math.max(0, Number(product.stock ?? product.Stock ?? 0));
    const preOrder = parseBoolean(product.preOrder ?? product.preorder ?? product.PreOrder);
    const dropId = getProductDropId(product);
    const drop: any = dropMap.get(dropId);

    products.push({
      productId,
      name,
      price: normalizeStoredProductPrice(product),
      stock,
      preOrder,
      image: firstProductImage(product),
      dropId,
      shippingWeightGrams: Math.max(
        0,
        Math.round(Number(product.shippingWeightGrams || 0)),
      ),
    });

    if (checkDrop && (!drop || !isDropLive(drop))) {
      issues.push({ productId, name, reason: 'drop_disabled', requestedQuantity, availableStock: stock });
    } else if (checkStock && !preOrder && stock <= 0) {
      issues.push({ productId, name, reason: 'out_of_stock', requestedQuantity, availableStock: 0 });
    } else if (checkStock && !preOrder && requestedQuantity > stock) {
      issues.push({ productId, name, reason: 'insufficient_stock', requestedQuantity, availableStock: stock });
    }
  }

  const priceChanges = requestedItems
    .map((item) => {
      const current = products.find((product) => product.productId === item.productId);
      if (!current || Math.abs(current.price - item.price) < 0.001) return null;
      return { productId: item.productId, name: current.name, oldPrice: item.price, newPrice: current.price };
    })
    .filter(Boolean);

  return {
    available: issues.length === 0,
    products,
    issues,
    unavailable: issues,
    priceChanges,
  };
}
