// Explicit opt-in integration check. Creates and removes one private fixture
// collection; never touches storefront products, orders or reservations.
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const ts = require("typescript");
const { Client, Databases } = require("node-appwrite");
if (!process.argv.includes("--confirm-isolated-check"))
  throw new Error(
    "Pass --confirm-isolated-check to create private test fixtures.",
  );
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
if (!databaseId || !process.env.APPWRITE_API_KEY)
  throw new Error("Missing backend configuration");
const client = new Client()
  .setEndpoint(
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
      "https://fra.cloud.appwrite.io/v1",
  )
  .setProject(
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT || "unconfigured_source_project",
  )
  .setKey(process.env.APPWRITE_API_KEY);
const database = new Databases(client);
const exportsObject = {};
const source = fs.readFileSync(
  path.join(__dirname, "../lib/appwriteTransaction.ts"),
  "utf8",
);
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  {
    exports: exportsObject,
    URL,
    require: (name) => {
      if (name === "@/lib/serverAppwrite") return { serverClient: client };
      throw new Error("Unexpected dependency");
    },
  },
);
const {
  transactionRequest: request,
  documentPath,
  withInventoryTransaction,
} = exportsObject;
const fixtureId = `launchcheck_${randomBytes(8).toString("hex")}`;
let created = false;
const transactionIds = [];
async function transaction() {
  const tx = await request("post", "/databases/transactions", { ttl: 60 });
  transactionIds.push(tx.$id);
  return tx.$id;
}

(async () => {
  try {
    await database.createCollection(
      databaseId,
      fixtureId,
      "Temporary inventory transaction check",
      [],
      false,
    );
    created = true;
    await database.createIntegerAttribute(
      databaseId,
      fixtureId,
      "stock",
      true,
      0,
      100,
    );
    await database.createStringAttribute(
      databaseId,
      fixtureId,
      "status",
      20,
      true,
    );
    await database.createStringAttribute(
      databaseId,
      fixtureId,
      "reference",
      60,
      true,
    );
    let ready = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      const collection = await database.getCollection(databaseId, fixtureId);
      if (collection.attributes.every((a) => a.status === "available")) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.ok(ready, "Test schema did not become ready");
    await database.createDocument(databaseId, fixtureId, "fixture", {
      stock: 2,
      status: "reserved",
      reference: "fixture",
    });
    const fixturePath = documentPath(databaseId, fixtureId, "fixture");
    const first = await transaction();
    const second = await transaction();
    for (const transactionId of [first, second]) {
      const snapshot = await request("patch", fixturePath, {
        data: { reference: "fixture" },
        transactionId,
      });
      assert.equal(
        snapshot.status,
        "reserved",
        "Staged write must return reservation snapshot",
      );
      await request("patch", fixturePath, {
        data: { status: "released" },
        transactionId,
      });
      await request("patch", fixturePath + "/stock/increment", {
        value: 1,
        transactionId,
      });
    }
    await request("patch", "/databases/transactions/" + first, {
      commit: true,
    });
    await assert.rejects(
      request("patch", "/databases/transactions/" + second, { commit: true }),
      (error) => error.code === 409,
    );
    let doc = await database.getDocument(databaseId, fixtureId, "fixture");
    assert.equal(
      doc.stock,
      3,
      "Concurrent release must restore stock only once",
    );
    assert.equal(doc.status, "released");
    console.log(
      "PASS: concurrent releases conflict and stock increases only once",
    );

    await assert.rejects(
      withInventoryTransaction(async (transactionId) => {
        await request("patch", fixturePath, {
          data: { status: "paid" },
          transactionId,
        });
        await request("patch", fixturePath + "/stock/decrement", {
          value: 99,
          min: 0,
          transactionId,
        });
      }),
    );
    doc = await database.getDocument(databaseId, fixtureId, "fixture");
    assert.equal(doc.stock, 3);
    assert.equal(doc.status, "released");
    console.log(
      "PASS: failed stock operation rolls back status and stock together",
    );

    await withInventoryTransaction(async (transactionId) => {
      await request("patch", fixturePath, {
        data: { reference: "fixture" },
        transactionId,
      });
      await request("patch", fixturePath, {
        data: { status: "paid" },
        transactionId,
      });
    });
    doc = await database.getDocument(databaseId, fixtureId, "fixture");
    assert.equal(doc.status, "paid");
    assert.equal(doc.stock, 3);
    console.log("PASS: transaction helper confirms committed payment state");

    await withInventoryTransaction(async (transactionId) => {
      await request("post", documentPath(databaseId, fixtureId), {
        documentId: "new-reservation",
        data: { stock: 0, status: "reserved", reference: "new-reservation" },
        transactionId,
      });
      await request("patch", fixturePath + "/stock/decrement", {
        value: 1,
        min: 0,
        transactionId,
      });
    });
    assert.equal(
      (await database.getDocument(databaseId, fixtureId, "new-reservation"))
        .status,
      "reserved",
    );
    assert.equal(
      (await database.getDocument(databaseId, fixtureId, "fixture")).stock,
      2,
    );
    console.log(
      "PASS: reservation creation and stock decrement commit together",
    );
    await assert.rejects(
      withInventoryTransaction(async (transactionId) => {
        await request("post", documentPath(databaseId, fixtureId), {
          documentId: "failed-reservation",
          data: {
            stock: 0,
            status: "reserved",
            reference: "failed-reservation",
          },
          transactionId,
        });
        await request("patch", fixturePath + "/stock/decrement", {
          value: 99,
          min: 0,
          transactionId,
        });
      }),
    );
    await assert.rejects(
      database.getDocument(databaseId, fixtureId, "failed-reservation"),
      (error) => error.code === 404,
    );
    assert.equal(
      (await database.getDocument(databaseId, fixtureId, "fixture")).stock,
      2,
    );
    console.log(
      "PASS: failed acquisition leaves no orphan reservation or stock change",
    );
  } finally {
    for (const id of transactionIds)
      await request("patch", "/databases/transactions/" + id, {
        rollback: true,
      }).catch(() => {});
    if (created) {
      assert.match(fixtureId, /^launchcheck_[a-f0-9]{16}$/);
      await request(
        "delete",
        `/tablesdb/${encodeURIComponent(databaseId)}/tables/${fixtureId}`,
      );
      console.log(
        "Temporary private fixture collection removed; storefront data was not modified.",
      );
    }
  }
})().catch((error) => {
  console.error("Inventory integration check failed:", error.message);
  process.exitCode = 1;
});
