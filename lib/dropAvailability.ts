export type DropRecord = {
  $id: string;
  name?: string;
  enabled?: boolean | string;
  launchAt?: string | null;
};

export const DEFAULT_DROP_ID = 'project_0';

const asBoolean = (value: unknown) =>
  typeof value === 'string' ? value.toLowerCase() === 'true' : Boolean(value);

export function isDropLive(drop: DropRecord, now = Date.now()) {
  if (!asBoolean(drop.enabled)) return false;
  if (!drop.launchAt) return true;
  const launchTime = new Date(drop.launchAt).getTime();
  return Number.isFinite(launchTime) && launchTime <= now;
}

export function getProductDropId(product: { dropId?: string | null }) {
  return product.dropId || DEFAULT_DROP_ID;
}

export function filterProductsByLiveDrops<T extends { dropId?: string | null }>(products: T[], drops: DropRecord[]) {
  const liveIds = new Set(drops.filter((drop) => isDropLive(drop)).map((drop) => drop.$id));
  return products.filter((product) => liveIds.has(getProductDropId(product)));
}
