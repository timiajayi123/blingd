import { Product } from '@/app/types/Product';

export type GroupedProduct = {
  name: string;
  variants: Product[];
};

export function groupProductsByName(products: Product[]): GroupedProduct[] {
  const grouped: { [key: string]: Product[] } = {};

  products.forEach(product => {
    const normalizedName = product.name.trim().toUpperCase();
    if (!grouped[normalizedName]) {
      grouped[normalizedName] = [];
    }
    grouped[normalizedName].push(product);
  });

  return Object.keys(grouped).map(name => ({
    name,
    variants: grouped[name],
  }));
}
