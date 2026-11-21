import { account } from '@/lib/appwriteConfig';

export async function getCustomerOrders(limit = 25) {
  const { jwt } = await account.createJWT();
  const response = await fetch(`/api/orders/mine?limit=${limit}`, {
    headers: { Authorization: `Bearer ${jwt}` }, cache: 'no-store',
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load order history.');
  return result;
}
