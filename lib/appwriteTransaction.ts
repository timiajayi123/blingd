import { serverClient } from "@/lib/serverAppwrite";

// The installed SDK predates transactions. Use its authenticated transport and
// the official Databases REST endpoints without upgrading unrelated SDK code.
export function transactionRequest(
  method: string,
  path: string,
  payload: Record<string, unknown> = {},
) {
  return serverClient.call(
    method,
    new URL(serverClient.config.endpoint + path),
    { "content-type": "application/json" },
    payload,
  );
}

export function documentPath(
  databaseId: string,
  collectionId: string,
  documentId?: string,
) {
  const base = `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(collectionId)}/documents`;
  return documentId ? `${base}/${encodeURIComponent(documentId)}` : base;
}

export async function withInventoryTransaction<T>(
  work: (transactionId: string) => Promise<T>,
): Promise<T> {
  const transaction = await transactionRequest(
    "post",
    "/databases/transactions",
    { ttl: 60 },
  );
  const path = `/databases/transactions/${encodeURIComponent(transaction.$id)}`;
  try {
    const result = await work(transaction.$id);
    try {
      const committed = await transactionRequest("patch", path, {
        commit: true,
      });
      if (committed.status !== "committed")
        throw new Error("Inventory transaction was not committed.");
    } catch (error) {
      // A lost commit response must not trigger compensating stock writes.
      const state = await transactionRequest("get", path).catch(() => null);
      if (state?.status !== "committed") throw error;
    }
    return result;
  } catch (error) {
    await transactionRequest("patch", path, { rollback: true }).catch(
      () => undefined,
    );
    throw error;
  }
}
