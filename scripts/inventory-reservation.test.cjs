const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const reference = "storefront-test-00000000-0000-0000-000000000001";
const id = `reserve_${createHash("sha256").update(reference).digest("hex").slice(0, 24)}`;
const documentPath = (_db, collection, document) =>
  `${collection}/documents${document ? "/" + document : ""}`;
const reservationPath = documentPath("", "storefront_inventory_reservations", id);
const productPath = documentPath("", "storefront_products", "product1");

function fixture({
  status = "reserved",
  stock = 0,
  hasReservation = true,
} = {}) {
  let state = { [productPath]: { $id: "product1", stock } };
  if (hasReservation)
    state[reservationPath] = {
      $id: id,
      reference,
      status,
      orderId: "",
      expiresAt: new Date(Date.now() + 720000).toISOString(),
      items: JSON.stringify([
        { productId: "product1", quantity: 1, preOrder: false },
      ]),
    };
  let version = 0;
  const transactions = new Map();
  let sequence = 0;
  const transactionRequest = async (method, route, payload) => {
    const tx = transactions.get(payload.transactionId);
    if (method === "post") {
      const key = `${route}/${payload.documentId}`;
      if (tx[key]) throw Object.assign(new Error("Conflict"), { code: 409 });
      tx[key] = { $id: payload.documentId, ...payload.data };
      return structuredClone(tx[key]);
    }
    const numeric = route.match(/^(.*)\/stock\/(increment|decrement)$/);
    const key = numeric ? numeric[1] : route;
    if (!tx[key]) throw Object.assign(new Error("Missing"), { code: 404 });
    if (numeric) {
      const next =
        tx[key].stock +
        (numeric[2] === "increment" ? payload.value : -payload.value);
      if (next < (payload.min ?? 0)) throw new Error("Not enough stock");
      tx[key].stock = next;
    } else Object.assign(tx[key], payload.data);
    return structuredClone(tx[key]);
  };
  const withInventoryTransaction = async (work) => {
    const txId = String(++sequence);
    const startVersion = version;
    transactions.set(txId, structuredClone(state));
    try {
      const result = await work(txId);
      if (version !== startVersion)
        throw Object.assign(new Error("Conflict"), { code: 409 });
      state = transactions.get(txId);
      version++;
      return result;
    } finally {
      transactions.delete(txId);
    }
  };
  const mocks = {
    "node-appwrite": { Query: { equal() {}, lessThan() {}, limit() {} } },
    "@/lib/serverAppwrite": {
      serverDatabase: {
        listDocuments: async () => ({ documents: [] }),
        getDocument: async (_db, collection, document) => {
          const value = state[documentPath("", collection, document)];
          if (!value) throw Object.assign(new Error("Missing"), { code: 404 });
          return structuredClone(value);
        },
      },
    },
    "@/lib/cartValidation": {
      validateCartAgainstAppwrite: async () => ({
        available: true,
        products: [{ productId: "product1", preOrder: false }],
      }),
    },
    "@/lib/appwriteTransaction": {
      documentPath,
      transactionRequest,
      withInventoryTransaction,
    },
  };
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(
        path.join(__dirname, "../lib/inventoryReservation.ts"),
        "utf8",
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
        },
      },
    ).outputText,
    {
      exports,
      process: { env: {} },
      require: (name) => mocks[name] || require(name),
    },
  );
  return { api: exports, state: () => state };
}

test("two simultaneous releases restore a reserved item only once", async () => {
  const f = fixture();
  const results = await Promise.allSettled([
    f.api.releaseInventoryReservation(reference),
    f.api.releaseInventoryReservation(reference),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(f.state()[productPath].stock, 1);
  assert.equal(f.state()[reservationPath].status, "released");
  await f.api.releaseInventoryReservation(reference);
  assert.equal(f.state()[productPath].stock, 1);
});

test("payment finalization and release cannot both commit", async () => {
  const f = fixture();
  const results = await Promise.allSettled([
    f.api.markReservationPaid(reference, "order1"),
    f.api.releaseInventoryReservation(reference),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const state = f.state();
  assert.equal(
    state[productPath].stock,
    state[reservationPath].status === "paid" ? 0 : 1,
  );
});

test("paid and pending reservations never restore stock", async () => {
  for (const status of ["paid", "pending"]) {
    const f = fixture({ status });
    assert.equal(
      (await f.api.releaseInventoryReservation(reference)).released,
      false,
    );
    assert.equal(f.state()[productPath].stock, 0);
  }
});

test("failed reservation rolls back the reservation document as well as stock", async () => {
  const f = fixture({ hasReservation: false, stock: 0 });
  await assert.rejects(
    f.api.reserveInventory(reference, [{ $id: "product1", quantity: 1 }]),
  );
  assert.equal(f.state()[reservationPath], undefined);
  assert.equal(f.state()[productPath].stock, 0);
});

test("successful reservation is atomic and repeat requests do not decrement twice", async () => {
  const f = fixture({ hasReservation: false, stock: 2 });
  await f.api.reserveInventory(reference, [{ $id: "product1", quantity: 1 }]);
  await f.api.reserveInventory(reference, [{ $id: "product1", quantity: 1 }]);
  assert.equal(f.state()[productPath].stock, 1);
  assert.equal(f.state()[reservationPath].status, "reserved");
});
