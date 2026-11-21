import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { serverDatabase } from "@/lib/serverAppwrite";
import { parseOrderPayload } from "@/lib/orderPayload";
import { isAdminRequest } from "@/lib/adminAuth";
import { Config } from "@/lib/appwriteConfig";

export const dynamic = "force-dynamic";

const TIME_ZONE = "Africa/Lagos";
const EXCLUDED_STATUSES = new Set(["cancelled", "refunded", "failed", "unpaid", "payment_failed", "declined", "abandoned"]);
const RANGE_DAYS: Record<string, number | null> = { "7d": 7, "30d": 30, "90d": 90, "12m": 365, all: null };

function dateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function periodKey(date: Date, group: "day" | "month") {
  const parts = dateParts(date);
  return group === "month" ? `${parts.year}-${parts.month}` : `${parts.year}-${parts.month}-${parts.day}`;
}

function periodLabel(key: string, group: "day" | "month") {
  const date = new Date(`${group === "month" ? `${key}-01` : key}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-NG", { timeZone: TIME_ZONE, ...(group === "month" ? { month: "short", year: "numeric" } : { day: "numeric", month: "short" }) }).format(date);
}

async function listAll(collectionId: string, newestFirst = false) {
  const documents: any[] = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const queries = [Query.limit(limit), Query.offset(offset)];
    if (newestFirst) queries.unshift(Query.orderDesc("$createdAt"));
    const page = await serverDatabase.listDocuments(Config.databaseId, collectionId, queries);
    documents.push(...page.documents);
    offset += page.documents.length;
    if (!page.documents.length || documents.length >= page.total) break;
  }
  return documents;
}

function storedProductPrice(product: any) {
  const value = Number(product?.price ?? product?.Price ?? 0);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value > 100000 ? value / 100 : value;
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const range = Object.prototype.hasOwnProperty.call(RANGE_DAYS, searchParams.get("range") || "") ? searchParams.get("range")! : "30d";
    const requestedGroup = searchParams.get("group");
    const requestedDrop = searchParams.get("drop") || "all";
    const selectedDropId = requestedDrop === "all" ? null : requestedDrop;
    const group: "day" | "month" = requestedGroup === "month" || (requestedGroup !== "day" && (range === "12m" || range === "all")) ? "month" : "day";
    const now = new Date();
    const days = RANGE_DAYS[range];
    const start = days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : null;
    const previousStart = days && start ? new Date(start.getTime() - days * 24 * 60 * 60 * 1000) : null;

    const [rawOrders, products, drops] = await Promise.all([
      listAll(Config.ordersCollectionId, true),
      listAll(Config.productsCollectionId),
      listAll(Config.dropsCollectionId),
    ]);
    const productMap = new Map(products.map((product: any) => [String(product.$id), product]));
    const dropMap = new Map(drops.map((drop: any) => [String(drop.$id), drop]));

    const orders = rawOrders.map((order: any) => {
      const parsed = parseOrderPayload(order.items);
      const status = String(order.status || parsed.status || "paid").toLowerCase();
      const breakdown = parsed.paymentBreakdown || {};
      const allocations = parsed.lineItems.map((item: any) => {
        const productId = String(item.$id || item.productId || "unknown");
        const currentProduct: any = productMap.get(productId);
        const dropId = String(item.dropId || currentProduct?.dropId || "project_0");
        const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
        const snapshotPrice = Number(item.price);
        const price = Number.isFinite(snapshotPrice) && snapshotPrice >= 0 ? snapshotPrice : storedProductPrice(currentProduct);
        return {
          dropId,
          dropName: dropMap.get(dropId)?.name || (dropId === "project_0" ? "Main collection" : "Legacy / unassigned"),
          productId,
          productName: item.name || currentProduct?.name || currentProduct?.Name || "Unknown product",
          quantity,
          revenue: price * quantity,
        };
      });
      return {
        id: order.$id,
        orderNumber: order.orderNumber || order.$id,
        customerName: order.customerName || order.userName || order.name || "Anonymous",
        customerEmail: order.customerEmail || order.userEmail || order.email || "",
        total: Number(order.total ?? order.totalAmount ?? breakdown.total ?? 0),
        status,
        createdAt: order.$createdAt,
        allocations,
        breakdown: {
          subtotal: Number(breakdown.subtotal || 0), delivery: Number(breakdown.deliveryPrice || 0), packaging: Number(breakdown.packagingPrice || 0),
          vat: Number(breakdown.vatAmount || 0), siteFees: Number(breakdown.siteFee || 0), discount: Number(breakdown.discount || 0),
        },
      };
    }).filter((order) => !EXCLUDED_STATUSES.has(order.status));

    const orderRevenue = (order: any) => selectedDropId
      ? order.allocations.filter((item: any) => item.dropId === selectedDropId).reduce((sum: number, item: any) => sum + item.revenue, 0)
      : order.total;
    const relevant = (items: any[]) => selectedDropId ? items.filter((order) => orderRevenue(order) > 0) : items;
    const inRange = relevant(orders.filter((order) => !start || new Date(order.createdAt) >= start));
    const previousRange = relevant(start && previousStart ? orders.filter((order) => new Date(order.createdAt) >= previousStart && new Date(order.createdAt) < start) : []);
    const allRelevant = relevant(orders);
    const sumRevenue = (items: any[]) => items.reduce((sum, order) => sum + orderRevenue(order), 0);
    const totalRevenue = sumRevenue(inRange);
    const previousRevenue = sumRevenue(previousRange);
    const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : null;

    const seriesMap = new Map<string, { revenue: number; orders: number }>();
    for (const order of inRange) {
      const key = periodKey(new Date(order.createdAt), group);
      const current = seriesMap.get(key) || { revenue: 0, orders: 0 };
      current.revenue += orderRevenue(order);
      current.orders += 1;
      seriesMap.set(key, current);
    }
    const series = [...seriesMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => ({ key, label: periodLabel(key, group), ...value }));

    const statusMap = new Map<string, { orders: number; revenue: number }>();
    for (const order of inRange) {
      const current = statusMap.get(order.status) || { orders: 0, revenue: 0 };
      current.orders += 1;
      current.revenue += orderRevenue(order);
      statusMap.set(order.status, current);
    }
    const overallComposition = inRange.reduce((totals, order) => ({
      subtotal: totals.subtotal + order.breakdown.subtotal, delivery: totals.delivery + order.breakdown.delivery,
      packaging: totals.packaging + order.breakdown.packaging, vat: totals.vat + order.breakdown.vat,
      siteFees: totals.siteFees + order.breakdown.siteFees, discounts: totals.discounts + order.breakdown.discount,
    }), { subtotal: 0, delivery: 0, packaging: 0, vat: 0, siteFees: 0, discounts: 0 });
    const composition = selectedDropId ? { subtotal: totalRevenue, delivery: 0, packaging: 0, vat: 0, siteFees: 0, discounts: 0 } : overallComposition;

    const dropMetrics = new Map<string, any>();
    for (const drop of drops) {
      dropMetrics.set(String(drop.$id), { id: String(drop.$id), name: drop.name || "Unnamed drop", revenue: 0, orders: new Set<string>(), units: 0, productIds: new Set<string>(), products: new Map<string, any>() });
    }
    for (const order of orders.filter((order) => !start || new Date(order.createdAt) >= start)) {
      for (const item of order.allocations) {
        const metric = dropMetrics.get(item.dropId) || { id: item.dropId, name: item.dropName, revenue: 0, orders: new Set<string>(), units: 0, productIds: new Set<string>(), products: new Map<string, any>() };
        metric.revenue += item.revenue;
        metric.orders.add(order.id);
        metric.units += item.quantity;
        metric.productIds.add(item.productId);
        const product = metric.products.get(item.productId) || { id: item.productId, name: item.productName, revenue: 0, units: 0, orders: new Set<string>() };
        product.revenue += item.revenue;
        product.units += item.quantity;
        product.orders.add(order.id);
        metric.products.set(item.productId, product);
        dropMetrics.set(item.dropId, metric);
      }
    }
    const dropBreakdown = [...dropMetrics.values()].map((metric) => ({
      id: metric.id, name: metric.name, revenue: metric.revenue, orders: metric.orders.size, units: metric.units, productCount: metric.productIds.size,
      products: [...metric.products.values()].map((product: any) => ({ ...product, orders: product.orders.size })).sort((a: any, b: any) => b.revenue - a.revenue),
    })).sort((a, b) => b.revenue - a.revenue);

    const selectedAllocations = selectedDropId ? inRange.flatMap((order) => order.allocations.filter((item: any) => item.dropId === selectedDropId)) : [];
    const todayKey = periodKey(now, "day");
    const todayOrders = allRelevant.filter((order) => periodKey(new Date(order.createdAt), "day") === todayKey);
    const highestOrder = inRange.reduce<any | null>((highest, order) => !highest || orderRevenue(order) > orderRevenue(highest) ? order : highest, null);

    return NextResponse.json({
      range, group, selectedDropId,
      selectedDropName: selectedDropId ? dropMap.get(selectedDropId)?.name || dropMetrics.get(selectedDropId)?.name || "Selected drop" : null,
      generatedAt: now.toISOString(),
      summary: {
        totalRevenue, allTimeRevenue: sumRevenue(allRelevant), orderCount: inRange.length,
        unitCount: selectedDropId ? selectedAllocations.reduce((sum: number, item: any) => sum + item.quantity, 0) : inRange.flatMap((order) => order.allocations).reduce((sum: number, item: any) => sum + item.quantity, 0),
        productCount: selectedDropId ? new Set(selectedAllocations.map((item: any) => item.productId)).size : new Set(inRange.flatMap((order) => order.allocations.map((item: any) => item.productId))).size,
        averageOrderValue: inRange.length ? totalRevenue / inRange.length : 0,
        highestOrder: highestOrder ? orderRevenue(highestOrder) : 0,
        todayRevenue: sumRevenue(todayOrders), todayOrders: todayOrders.length, revenueChange,
      },
      series, composition,
      statuses: [...statusMap.entries()].map(([status, values]) => ({ status, ...values })).sort((a, b) => b.revenue - a.revenue),
      dropBreakdown,
      dropOptions: [...dropMetrics.values()].map((drop: any) => ({ id: drop.id, name: drop.name })),
      recentOrders: inRange.slice(0, 30).map((order) => ({
        id: order.id, orderNumber: order.orderNumber, customerName: order.customerName, customerEmail: order.customerEmail,
        total: orderRevenue(order), status: order.status, createdAt: order.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Revenue analytics failed:", error?.message || error);
    return NextResponse.json({ error: "Failed to load revenue analytics" }, { status: 500 });
  }
}
