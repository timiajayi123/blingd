'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingBag, Search, Clock, ChevronRight, User, X, Plus, Trash2, Download, RefreshCw, RotateCcw, Pencil, Printer, CheckSquare, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { FaInstagram, FaSnapchat, FaTiktok, FaWhatsapp, FaXTwitter } from 'react-icons/fa6';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { getAllProducts } from '@/lib/api';
import { parseOrderPayload } from '@/lib/orderPayload';
import AdminPageLoader from '@/components/admin/AdminPageLoader';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
  'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe',
  'Zamfara', 'FCT', 'Abuja',
];

const ORDER_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'out_for_delivery', 'delivered'];

const formatStatusLabel = (status: string) => status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const DATE_FILTERS = [
  ['all', 'All dates'],
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['last7', 'Last 7 days'],
  ['thisMonth', 'This month'],
  ['day', 'Specific day'],
  ['month', 'Specific month'],
] as const;

const SORT_OPTIONS = [
  ['newest', 'Newest first'],
  ['oldest', 'Oldest first'],
  ['highest', 'Highest total'],
  ['lowest', 'Lowest total'],
  ['name', 'Customer A-Z'],
] as const;

const MANUAL_SALES_SOURCES = [
  { id: 'tiktok', label: 'TikTok', icon: FaTiktok },
  { id: 'snapchat', label: 'Snapchat', icon: FaSnapchat },
  { id: 'instagram', label: 'Instagram', icon: FaInstagram },
  { id: 'x', label: 'X', icon: FaXTwitter },
  { id: 'whatsapp', label: 'WhatsApp', icon: FaWhatsapp },
] as const;

const emptyManualItem = {
  productId: '',
  name: '',
  price: '',
  quantity: 1,
  size: '',
  imageUrl: '',
};

const emptyManualOrder = {
  customerName: '',
  customerEmail: '',
  phone: '',
  address: '',
  deliveryOption: '',
  salesSource: 'instagram',
  status: 'paid',
  deliveryLocationId: '',
  items: [{ ...emptyManualItem }],
};

function normalizeOrderStatus(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  return ORDER_STATUSES.includes(normalized) ? normalized : 'paid';
}

function inferStateFromAddress(address: string) {
  const matchedState = [...NIGERIAN_STATES].sort((a, b) => b.length - a.length).find((state) => {
    const pattern = state.split(/\s+/).join('\\s+');
    return new RegExp(`\\b${pattern}\\b`, 'i').test(address);
  }) || '';
  return matchedState === 'Abuja' ? 'FCT' : matchedState;
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLocalMonthKey(date: Date) {
  return getLocalDateKey(date).slice(0, 7);
}

function escapeCsv(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [drops, setDrops] = useState<any[]>([]);
  const [deliveryLocations, setDeliveryLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dropFilter, setDropFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deliveryEditOpen, setDeliveryEditOpen] = useState(false);
  const [deliveryAddressDraft, setDeliveryAddressDraft] = useState('');
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualStep, setManualStep] = useState(0);
  const [manualOrder, setManualOrder] = useState<any>(emptyManualOrder);
  const [creatingManualOrder, setCreatingManualOrder] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(() => new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('processing');
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [retryingOrderEmails, setRetryingOrderEmails] = useState(false);

  const pendingOrderEmailCount = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.paymentBreakdown?.confirmationEmail?.status === 'pending',
      ).length,
    [orders],
  );

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to get product image
  const getProductImage = (item: any) => {
    // First, try to find the product by ID
    const product = products.find(p => p.$id === item.$id);
    if (product && product.images && product.images.length > 0) {
      return product.images[0];
    }
    // If not found, fall back to existing item's image or imageUrl
    if (item.imageUrl || item.image) {
      const img = item.imageUrl || item.image;
      // If it's a placeholder, try to use getImageUrl just in case
      if (img && img !== '/placeholder.svg') {
        return img;
      }
    }
    return null;
  };

  async function fetchData() {
    try {
      setLoading(true);
      
      // Fetch both orders and products in parallel
      const [ordersResponse, productsList, dropsResponse, deliveryResponse] = await Promise.all([
        fetch('/api/admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'list',
            collection: 'orders',
            queries: ["orderDesc(\"$createdAt\")"]
          }),
        }),
        getAllProducts({ includeInactiveDrops: true }),
        fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'list', collection: 'drops', orderBy: 'position', orderDirection: 'asc' }),
        }),
        fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'list', collection: 'delivery', orderBy: 'sortOrder', orderDirection: 'asc' }),
        }),
      ]);

      if (!ordersResponse.ok) {
        const errorData = await ordersResponse.json();
        throw new Error(errorData.error || 'Failed to fetch orders');
      }

      const res = await ordersResponse.json();
      setProducts(productsList);
      if (dropsResponse.ok) {
        const dropData = await dropsResponse.json();
        setDrops(dropData.documents || []);
      }
      if (deliveryResponse.ok) {
        const deliveryData = await deliveryResponse.json();
        setDeliveryLocations((deliveryData.documents || []).filter((location: any) => location.active !== false));
      }
      console.log("Orders fetched!", res);
      console.log("Products fetched!", productsList);
      
      // Parse items if they are JSON strings and log full order objects
      const parsedOrders = res.documents.map((order: any) => {
        console.log("🔍 Order object keys:", Object.keys(order));
        console.log("🔍 Order data:", order);
        const { lineItems: items, paymentBreakdown, status: embeddedStatus } = parseOrderPayload(order.items);
        console.log("🔍 Parsed order items:", items);
        // Check for all possible customer name variations
        const customerName = order.customerName || order.CustomerName || order.userName || order.UserName || order.name || order.Name || 'Anonymous';
        const customerEmail = order.customerEmail || order.CustomerEmail || order.userEmail || order.UserEmail || order.email || order.Email || 'No email provided';
        const phone = order.phone || order.Phone || order.customerPhone || order.CustomerPhone || 'No phone provided';
        const rawAddress = String(order.address || order.Address || order.customerAddress || order.CustomerAddress || 'No address provided');
        const deliveryOptionMatch = rawAddress.match(/\n?Delivery Option:\s*(.+)$/i);
        const inferredState = inferStateFromAddress(rawAddress);
        const deliveryOption = order.deliveryOption || order.DeliveryOption || paymentBreakdown?.deliveryOption || deliveryOptionMatch?.[1] || (inferredState ? `${inferredState} (inferred from address)` : '');
        const deliveryState = inferStateFromAddress([
          order.deliveryState,
          order.DeliveryState,
          order.state,
          order.State,
          paymentBreakdown?.deliveryState,
          paymentBreakdown?.state,
          deliveryOption,
          rawAddress,
        ].filter(Boolean).join(' '));
        const inferredSubtotal = items.reduce((sum: number, item: any) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
        const normalizedBreakdown = paymentBreakdown || {
          subtotal: inferredSubtotal,
          deliveryPrice: null,
          packagingPrice: null,
          vatAmount: null,
          siteFee: null,
          discount: null,
          total: Number(order.total || 0),
        };
        const address = deliveryOptionMatch
          ? rawAddress.replace(/\n?Delivery Option:\s*.+$/i, '').trim()
          : rawAddress;
        return { 
          ...order, 
          items, 
          customerName, 
          customerEmail, 
          phone, 
          address,
          deliveryOption,
          deliveryState,
          paymentBreakdown: normalizedBreakdown,
          status: normalizeOrderStatus(order.status || embeddedStatus),
        };
      });
      setOrders(parsedOrders);
    } catch (err: any) {
      console.error(err);
      toast.error(`Error: ${err.message || "Failed to load orders."}`);
    } finally {
      setLoading(false);
    }
  }

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          collection: 'orders',
          id: orderId,
          data: { status: newStatus }
        }),
      });

      const result = await response.json();
      if (!response.ok && response.status !== 207) throw new Error(result.error || 'Failed to update order status');

      if (result.notification?.sent) {
        const customerSent = result.notification?.recipients?.customerSent;
        toast.success(`Order ${orderId.slice(-6)} updated to ${newStatus}.${customerSent ? ' Customer email sent.' : ''}`);
      }
      else if (result.notification?.reason === 'status_unchanged') toast.info(`Order ${orderId.slice(-6)} is already ${newStatus}.`);
      else toast.warning(`Status updated, but email failed: ${result.notification?.error || 'unknown email error'}`);
      fetchData();
      if (selectedOrder?.$id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Error: ${err.message || "Failed to update status."}`);
    }
  };

  const retryPendingOrderEmails = async () => {
    if (!pendingOrderEmailCount) {
      toast.info('There are no pending order confirmation emails.');
      return;
    }
    const approved = window.confirm(
      `Send ${pendingOrderEmailCount} pending order confirmation email${pendingOrderEmailCount === 1 ? '' : 's'} now?`,
    );
    if (!approved) return;

    try {
      setRetryingOrderEmails(true);
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'retry-pending-order-emails',
          collection: 'orders',
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Could not send pending order emails.');
      }

      await fetchData();
      if (Number(result.pending || 0) > 0) {
        toast.warning(
          `${result.sent || 0} sent. ${result.pending} still pending. Check your Resend quota and try again later.`,
        );
      } else {
        toast.success(
          `${result.sent || 0} order confirmation email${Number(result.sent || 0) === 1 ? '' : 's'} sent successfully.`,
        );
      }
    } catch (error: any) {
      toast.error(error.message || 'Could not send pending order emails.');
    } finally {
      setRetryingOrderEmails(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'text-amber-700 bg-amber-50';
      case 'processing': return 'text-blue-700 bg-blue-50';
      case 'shipped': return 'text-purple-700 bg-purple-50';
      case 'out_for_delivery': return 'text-cyan-700 bg-cyan-50';
      case 'delivered': return 'text-emerald-700 bg-emerald-50';
      case 'paid':
      default: return 'text-emerald-700 bg-emerald-50';
    }
  };

  const updateSelectedOrderStatuses = async () => {
    const ordersToUpdate = selectedExportOrders.filter((order) => normalizeOrderStatus(order.status) !== bulkStatus);
    if (!ordersToUpdate.length) {
      toast.info(`All selected orders are already ${formatStatusLabel(bulkStatus)}.`);
      return;
    }

    const approved = window.confirm(
      `Update ${ordersToUpdate.length} selected order${ordersToUpdate.length === 1 ? '' : 's'} to ${formatStatusLabel(bulkStatus)}? Customers will receive their normal status-update email, while admin will receive one summary email for this batch.`
    );
    if (!approved) return;

    try {
      setBulkUpdating(true);
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk-update-status',
          collection: 'orders',
          ids: ordersToUpdate.map((order) => order.$id),
          data: { status: bulkStatus },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Bulk status update failed');

      const failedIds = new Set<string>((result.failed || []).map((failure: { id: string }) => failure.id));
      const changed = Number(result.updated?.length || 0);
      const customerEmails = Number(result.notification?.customerEmails || 0);

      setSelectedOrderIds(failedIds);
      await fetchData();
      if (failedIds.size) {
        toast.warning(`${changed} updated to ${formatStatusLabel(bulkStatus)}. ${failedIds.size} could not be updated and remain selected.`);
      } else {
        toast.success(`${changed} order${changed === 1 ? '' : 's'} updated to ${formatStatusLabel(bulkStatus)}.${customerEmails ? ` ${customerEmails} customer email${customerEmails === 1 ? '' : 's'} sent.` : ''}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Bulk status update failed.');
    } finally {
      setBulkUpdating(false);
    }
  };

  const openDeliveryEditor = (order: any) => {
    setDeliveryAddressDraft(String(order.address || '').trim());
    setDeliveryEditOpen(true);
  };

  const saveDeliveryAddress = async () => {
    if (!selectedOrder) return;
    const address = deliveryAddressDraft.trim();
    if (!address) {
      toast.error('Enter the customer’s delivery address.');
      return;
    }

    const storedAddress = selectedOrder.deliveryOption
      ? `${address}\nDelivery Option: ${selectedOrder.deliveryOption}`
      : address;

    try {
      setSavingDelivery(true);
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          collection: 'orders',
          id: selectedOrder.$id,
          data: { address: storedAddress },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update delivery location');

      const updatedOrder = { ...selectedOrder, address };
      setSelectedOrder(updatedOrder);
      setOrders((currentOrders) => currentOrders.map((order) =>
        order.$id === selectedOrder.$id ? { ...order, address } : order
      ));
      setDeliveryEditOpen(false);
      toast.success('Delivery location updated.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update delivery location.');
    } finally {
      setSavingDelivery(false);
    }
  };
  
  const statusColors: Record<string, string> = {
    pending: 'text-amber-700 bg-amber-50',
    paid: 'text-emerald-700 bg-emerald-50',
    processing: 'text-blue-700 bg-blue-50',
    shipped: 'text-purple-700 bg-purple-50',
    out_for_delivery: 'text-cyan-700 bg-cyan-50',
    delivered: 'text-emerald-700 bg-emerald-50',
  };
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const manualSubtotal = manualOrder.items.reduce((sum: number, item: any) => {
    return sum + Number(item.price || 0) * Number(item.quantity || 0);
  }, 0);
  const selectedManualDelivery = deliveryLocations.find((location) => location.$id === manualOrder.deliveryLocationId);
  const manualDeliveryPrice = Number(selectedManualDelivery?.price || 0);
  const manualTotal = manualSubtotal + manualDeliveryPrice;

  const updateManualField = (field: string, value: any) => {
    setManualOrder((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateManualItem = (index: number, field: string, value: any) => {
    setManualOrder((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any, i: number) => (
        i === index ? { ...item, [field]: value } : item
      )),
    }));
  };

  const addManualItem = () => {
    setManualOrder((prev: any) => ({
      ...prev,
      items: [...prev.items, { ...emptyManualItem }],
    }));
  };

  const removeManualItem = (index: number) => {
    setManualOrder((prev: any) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_: any, i: number) => i !== index) : prev.items,
    }));
  };

  const selectManualProduct = (index: number, productId: string) => {
    const product = products.find((p: any) => p.$id === productId);
    if (!product) {
      updateManualItem(index, 'productId', productId);
      return;
    }

    setManualOrder((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any, i: number) => (
        i === index
          ? {
              ...item,
              productId,
              name: product.name || '',
              price: Number(product.price ?? product.Price ?? 0),
              imageUrl: product.images?.[0] || product.image || product.imageUrl || '',
              size: item.size || product.sizes?.[0] || '',
            }
          : item
      )),
    }));
  };

  const selectManualDeliveryLocation = (deliveryLocationId: string) => {
    const location = deliveryLocations.find((item) => item.$id === deliveryLocationId);
    updateManualField('deliveryLocationId', deliveryLocationId);
    updateManualField('deliveryOption', location
      ? (location.type === 'sub_location' ? `${location.name}, ${location.state}` : `${location.state} (Home Delivery)`)
      : '');
  };

  const resetManualOrder = () => {
    setManualOrder({
      ...emptyManualOrder,
      items: [{ ...emptyManualItem }],
    });
  };

  const handleManualOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = manualOrder.items
      .map((item: any) => ({
        $id: item.productId || undefined,
        name: String(item.name || '').trim(),
        price: Number(item.price || 0),
        quantity: Math.max(1, Number(item.quantity || 1)),
        selectedSize: item.size || 'N/A',
        size: item.size || 'N/A',
        imageUrl: item.imageUrl || '/placeholder.svg',
      }))
      .filter((item: any) => item.name && item.price > 0 && item.quantity > 0);

    if (!manualOrder.customerName.trim() || !manualOrder.customerEmail.trim() || !manualOrder.phone.trim()) {
      toast.error('Customer name, email, and phone number are required.');
      return;
    }

    if (!manualOrder.address.trim() || !manualOrder.deliveryLocationId) {
      toast.error('Choose a delivery location and enter the delivery address.');
      return;
    }

    if (!validItems.length) {
      toast.error('Add at least one valid item.');
      return;
    }

    try {
      setCreatingManualOrder(true);
      const manualRef = `manual_${Date.now()}`;
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'guest',
          email: manualOrder.customerEmail.trim(),
          userName: manualOrder.customerName.trim(),
          orderData: {
            items: validItems,
            address: manualOrder.address.trim(),
            phone: manualOrder.phone.trim(),
            deliveryOption: manualOrder.deliveryOption.trim(),
            salesSource: manualOrder.salesSource,
            deliveryLocationId: manualOrder.deliveryLocationId,
            deliveryPrice: manualDeliveryPrice,
            packagingPrice: 0,
            vatAmount: 0,
            siteFee: 0,
            manualDiscount: 0,
            totalPrice: manualTotal,
            paystackRef: manualRef,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to create manual order');
      }

      toast.success('Manual order created.');
      resetManualOrder();
      setManualStep(0);
      setManualModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create manual order.');
    } finally {
      setCreatingManualOrder(false);
    }
  };

  const advanceManualOrder = () => {
    if (manualStep === 1) {
      if (!manualOrder.customerName.trim() || !manualOrder.customerEmail.trim() || !manualOrder.phone.trim()) {
        toast.error('Customer name, email, and phone number are required.');
        return;
      }
    }
    if (manualStep === 2) {
      const hasIncompleteItem = manualOrder.items.some((item: any) => !item.productId || Number(item.quantity || 0) < 1);
      if (hasIncompleteItem) {
        toast.error('Select an available product and quantity for every item.');
        return;
      }
    }
    setManualStep((step) => Math.min(3, step + 1));
  };

  const availableStates = useMemo(() => {
    const orderStates = orders.map((order) => order.deliveryState).filter(Boolean);
    return Array.from(new Set([...NIGERIAN_STATES.map((state) => state === 'Abuja' ? 'FCT' : state), ...orderStates]))
      .sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const productDropIds = useMemo(() => new Map(
    products.map((product) => [String(product.$id), String(product.dropId || 'project_0')])
  ), [products]);

  const availableDrops = useMemo(() => {
    const referencedIds = new Set<string>();
    orders.forEach((order) => {
      (Array.isArray(order.items) ? order.items : []).forEach((item: any) => {
        const productId = item?.$id || item?.productId || item?.id;
        const dropId = productId ? productDropIds.get(String(productId)) : undefined;
        if (dropId && dropId !== 'project_0') referencedIds.add(dropId);
      });
    });

    return drops
      .filter((drop) => referencedIds.has(String(drop.$id)))
      .sort((a, b) => Number(a.position || 0) - Number(b.position || 0) || String(a.name || '').localeCompare(String(b.name || '')));
  }, [drops, orders, productDropIds]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const now = new Date();
    const todayKey = getLocalDateKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const last7Start = new Date(now);
    last7Start.setHours(0, 0, 0, 0);
    last7Start.setDate(now.getDate() - 6);

    return orders
      .filter((order) => {
        const searchableText = [
          order.$id,
          order.orderNumber,
          order.customerName,
          order.customerEmail,
          order.phone,
          order.address,
          order.deliveryOption,
          order.deliveryState,
          ...(Array.isArray(order.items) ? order.items.map((item: any) => item?.name) : []),
        ].filter(Boolean).join(' ').toLowerCase();

        if (normalizedSearch && !searchableText.includes(normalizedSearch)) return false;
        if (dropFilter !== 'all') {
          const orderDropIds = (Array.isArray(order.items) ? order.items : [])
            .map((item: any) => item?.$id || item?.productId || item?.id)
            .map((productId: unknown) => productDropIds.get(String(productId)))
            .filter(Boolean);
          if (!orderDropIds.includes(dropFilter)) return false;
        }
        if (statusFilter !== 'all' && order.status !== statusFilter) return false;
        if (stateFilter !== 'all' && order.deliveryState !== stateFilter) return false;

        const createdAt = new Date(order.$createdAt);
        if (Number.isNaN(createdAt.getTime())) return dateFilter === 'all';
        const orderDay = getLocalDateKey(createdAt);
        const orderMonth = getLocalMonthKey(createdAt);

        if (dateFilter === 'today' && orderDay !== todayKey) return false;
        if (dateFilter === 'yesterday' && orderDay !== getLocalDateKey(yesterday)) return false;
        if (dateFilter === 'last7' && createdAt < last7Start) return false;
        if (dateFilter === 'thisMonth' && orderMonth !== getLocalMonthKey(now)) return false;
        if (dateFilter === 'day' && dayFilter && orderDay !== dayFilter) return false;
        if (dateFilter === 'month' && monthFilter && orderMonth !== monthFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') return new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime();
        if (sortBy === 'highest') return Number(b.total || 0) - Number(a.total || 0);
        if (sortBy === 'lowest') return Number(a.total || 0) - Number(b.total || 0);
        if (sortBy === 'name') return String(a.customerName || '').localeCompare(String(b.customerName || ''));
        return new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime();
      });
  }, [orders, searchTerm, dropFilter, productDropIds, statusFilter, stateFilter, dateFilter, dayFilter, monthFilter, sortBy]);

  const activeFilterCount = [
    Boolean(searchTerm.trim()),
    dropFilter !== 'all',
    statusFilter !== 'all',
    stateFilter !== 'all',
    dateFilter !== 'all',
    sortBy !== 'newest',
  ].filter(Boolean).length;

  useEffect(() => {
    if (selectedOrder && !filteredOrders.some((order) => order.$id === selectedOrder.$id)) {
      setSelectedOrder(null);
      setModalOpen(false);
    }
  }, [filteredOrders, selectedOrder]);

  const clearFilters = () => {
    setSearchTerm('');
    setDropFilter('all');
    setStatusFilter('all');
    setStateFilter('all');
    setDateFilter('all');
    setDayFilter('');
    setMonthFilter('');
    setSortBy('newest');
  };

  const selectedExportOrders = useMemo(() => (
    orders.filter((order) => selectedOrderIds.has(order.$id))
  ), [orders, selectedOrderIds]);

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((current) => {
      const next = new Set(current);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const selectFilteredOrders = () => {
    setSelectedOrderIds((current) => new Set([...current, ...filteredOrders.map((order) => order.$id)]));
  };

  const orderItemsForExport = (order: any) => (
    (Array.isArray(order.items) ? order.items : []).map((item: any) => {
      const size = item.selectedSize || item.size;
      return `${item.name || 'Item'}${size && size !== 'N/A' ? ` (${size})` : ''} × ${Number(item.quantity || 1)}`;
    }).join('; ')
  );

  const exportSelectedOrders = () => {
    if (!selectedExportOrders.length) return;
    const headings = [
      'Order ID', 'Order Number', 'Order Date', 'Customer Name', 'Email', 'Phone',
      'Delivery Address', 'Delivery Location', 'Delivery State', 'Delivery Status',
      'Products / Order Details', 'Subtotal', 'Delivery Charge', 'Amount Paid', 'Sales Source',
    ];
    const rows = selectedExportOrders.map((order) => [
      order.$id,
      order.orderNumber || '',
      formatDate(order.$createdAt),
      order.customerName,
      order.customerEmail,
      order.phone,
      order.address || '',
      order.deliveryOption || '',
      order.deliveryState || '',
      formatStatusLabel(order.status || 'paid'),
      orderItemsForExport(order),
      Number(order.paymentBreakdown?.subtotal || 0),
      Number(order.paymentBreakdown?.deliveryPrice || 0),
      Number(order.total || 0),
      order.salesSource || '',
    ]);
    const csv = [headings, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `storefront-selected-orders-${getLocalDateKey(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printSelectedOrders = () => {
    if (!selectedExportOrders.length) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Allow pop-ups to open the printable order list.');
      return;
    }

    const rows = selectedExportOrders.map((order, index) => `
      <article class="order">
        <div class="order-head">
          <div><span class="label">Order</span><strong>${escapeHtml(order.orderNumber || `#${String(order.$id).slice(-6).toUpperCase()}`)}</strong></div>
          <div class="align-right"><span class="label">Status</span><strong>${escapeHtml(formatStatusLabel(order.status || 'paid'))}</strong></div>
        </div>
        <div class="details">
          <div><span class="label">Customer</span><strong>${escapeHtml(order.customerName)}</strong><span>${escapeHtml(order.customerEmail)}</span><span>${escapeHtml(order.phone)}</span></div>
          <div><span class="label">Delivery</span><strong>${escapeHtml(order.deliveryOption || order.deliveryState || 'Not specified')}</strong><span>${escapeHtml(order.address || '')}</span></div>
          <div class="align-right"><span class="label">Amount paid</span><strong>₦${Number(order.total || 0).toLocaleString('en-NG')}</strong><span>${escapeHtml(formatDate(order.$createdAt))}</span></div>
        </div>
        <div class="items"><span class="label">Order details</span><p>${escapeHtml(orderItemsForExport(order))}</p></div>
      </article>${index < selectedExportOrders.length - 1 ? '<div class="break"></div>' : ''}`
    ).join('');

    printWindow.document.write(`<!doctype html><html><head><title>BLING’D Order List</title><style>
      @page { size: A4; margin: 16mm; } * { box-sizing: border-box; } body { color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 11px; margin: 0; } .brand { margin: 0 auto 22px; text-align: center; } .brand img { display: block; height: 42px; margin: 0 auto 10px; max-width: 180px; object-fit: contain; } h1 { font-size: 18px; letter-spacing: .18em; margin: 0; } .meta { color: #666; font-size: 10px; margin-top: 6px; } .order { break-inside: avoid; padding: 15px 0; } .order-head, .details { display: grid; gap: 14px; grid-template-columns: 1fr 1fr; } .details { grid-template-columns: 1.15fr 1.55fr .8fr; margin-top: 14px; } .label { color: #777; display: block; font-size: 8px; font-weight: 700; letter-spacing: .12em; margin-bottom: 4px; text-transform: uppercase; } strong, span { display: block; } strong { font-size: 12px; } .align-right { text-align: right; } .items { background: #f7f7f7; margin-top: 14px; padding: 11px 12px; } .items p { line-height: 1.55; margin: 0; } .break { border-bottom: 1px solid #ddd; } @media print { .break { border-color: #ddd; } }
    </style></head><body><header class="brand"><img src="${escapeHtml(`${window.location.origin}/placeholder.svg`)}" alt="BLING’D" /><h1>ORDER LIST</h1><p class="meta">${selectedExportOrders.length} selected order${selectedExportOrders.length === 1 ? '' : 's'} · Generated ${escapeHtml(formatDate(new Date().toISOString()))}</p></header>${rows}<script>window.onload = () => window.print();</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="space-y-12 pb-32">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-4">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-black leading-none">
            Orders
          </h1>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400">
            {filteredOrders.length} of {orders.length} orders
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={retryPendingOrderEmails}
            disabled={!pendingOrderEmailCount || retryingOrderEmails}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-black transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Mail size={15} className={retryingOrderEmails ? 'animate-pulse' : ''} />
            {retryingOrderEmails
              ? 'Sending pending emails…'
              : `Send pending emails (${pendingOrderEmailCount})`}
          </button>
          {selectionMode && (
            <>
              <button
                type="button"
                onClick={exportSelectedOrders}
                disabled={!selectedExportOrders.length}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-black transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={15} />
                Export CSV {selectedExportOrders.length ? `(${selectedExportOrders.length})` : ''}
              </button>
              <button
                type="button"
                onClick={printSelectedOrders}
                disabled={!selectedExportOrders.length}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-black transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Printer size={15} />
                Print List
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              if (selectionMode) setSelectedOrderIds(new Set());
              setSelectionMode((enabled) => !enabled);
            }}
            disabled={bulkUpdating}
            aria-pressed={selectionMode}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-4 text-[10px] font-black uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${selectionMode ? 'border-black bg-black text-white hover:bg-zinc-800' : 'border-zinc-200 bg-white text-black hover:border-black'}`}
          >
            <CheckSquare size={15} />
            {selectionMode ? 'Done' : 'Select'}
          </button>
          <button
            type="button"
            onClick={() => { resetManualOrder(); setManualStep(0); setManualModalOpen(true); }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-black px-5 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-zinc-800"
          >
            <Plus size={16} />
            Manual Order
          </button>
        </div>
      </header>

      <div>
        {/* Orders List */}
        <div className="space-y-6 lg:space-y-8">
          <section aria-label="Order filters" className="space-y-4 border-y border-zinc-200 py-5">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 transition-colors group-focus-within:text-black" size={18} />
              <input
                type="search"
                placeholder="Search name, email, phone, order ID or product"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 w-full rounded-md border border-zinc-200 bg-white pl-12 pr-4 text-sm outline-none transition-colors focus:border-black"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              <label className="space-y-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400 sm:col-span-2 md:col-span-3">
                Drop
                <select value={dropFilter} onChange={(e) => setDropFilter(e.target.value)} className="h-14 w-full rounded-md border-2 border-black bg-zinc-50 px-4 text-sm font-bold normal-case tracking-normal text-black outline-none focus:bg-white">
                  <option value="all">All drops</option>
                  {availableDrops.map((drop) => <option key={drop.$id} value={drop.$id}>{drop.name || 'Unnamed drop'}{drop.enabled ? '' : ' (Disabled)'}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                Status
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold normal-case tracking-normal text-black outline-none focus:border-black">
                  <option value="all">All statuses</option>
                  {ORDER_STATUSES.map((status) => <option key={status} value={status}>{formatStatusLabel(status)}</option>)}
                </select>
              </label>

              <label className="space-y-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                Delivery state
                <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold normal-case tracking-normal text-black outline-none focus:border-black">
                  <option value="all">All states</option>
                  {availableStates.map((state) => <option key={state} value={state}>{state === 'FCT' ? 'FCT / Abuja' : state}</option>)}
                </select>
              </label>

              <label className="space-y-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                Date
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDateFilter(value);
                    if (value === 'day' && !dayFilter) setDayFilter(getLocalDateKey(new Date()));
                    if (value === 'month' && !monthFilter) setMonthFilter(getLocalMonthKey(new Date()));
                  }}
                  className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold normal-case tracking-normal text-black outline-none focus:border-black"
                >
                  {DATE_FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>

              {dateFilter === 'day' && (
                <label className="space-y-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                  Select day
                  <input type="date" value={dayFilter} max={getLocalDateKey(new Date())} onChange={(e) => setDayFilter(e.target.value)} className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold normal-case tracking-normal text-black outline-none focus:border-black" />
                </label>
              )}

              {dateFilter === 'month' && (
                <label className="space-y-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                  Select month
                  <input type="month" value={monthFilter} max={getLocalMonthKey(new Date())} onChange={(e) => setMonthFilter(e.target.value)} className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold normal-case tracking-normal text-black outline-none focus:border-black" />
                </label>
              )}

              <label className="space-y-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                Sort
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold normal-case tracking-normal text-black outline-none focus:border-black">
                  {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Showing <span className="text-black">{filteredOrders.length}</span> results
                {activeFilterCount > 0 && ` | ${activeFilterCount} active ${activeFilterCount === 1 ? 'filter' : 'filters'}`}
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={clearFilters} disabled={!activeFilterCount} className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-[9px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-black disabled:cursor-not-allowed disabled:opacity-30">
                  <RotateCcw size={14} />
                  Clear
                </button>
                <button type="button" onClick={fetchData} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-3 text-[9px] font-black uppercase tracking-widest text-black transition-colors hover:border-black disabled:cursor-wait disabled:opacity-40">
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {selectionMode && <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-zinc-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <span className="text-black">{selectedExportOrders.length}</span> selected
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="bulk-order-status">New status for selected orders</label>
                <select
                  id="bulk-order-status"
                  value={bulkStatus}
                  onChange={(event) => setBulkStatus(event.target.value)}
                  disabled={!selectedExportOrders.length || bulkUpdating}
                  className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-[10px] font-black uppercase tracking-widest text-black outline-none focus:border-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {ORDER_STATUSES.map((status) => <option key={status} value={status}>{formatStatusLabel(status)}</option>)}
                </select>
                <button
                  type="button"
                  onClick={updateSelectedOrderStatuses}
                  disabled={!selectedExportOrders.length || bulkUpdating}
                  className="h-9 rounded-md bg-black px-3 text-[9px] font-black uppercase tracking-widest text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {bulkUpdating ? 'Updating…' : 'Update selected'}
                </button>
                <button type="button" onClick={selectFilteredOrders} disabled={!filteredOrders.length || bulkUpdating} className="text-[9px] font-black uppercase tracking-widest text-black underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-30">Select shown</button>
                <button type="button" onClick={() => setSelectedOrderIds(new Set())} disabled={!selectedOrderIds.size || bulkUpdating} className="text-[9px] font-black uppercase tracking-widest text-zinc-500 underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-30">Clear selection</button>
              </div>
            </div>}
          </section>

          {loading ? (
            <AdminPageLoader label="Loading orders" className="min-h-96" />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
              {filteredOrders.length === 0 && (
                <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-zinc-200 px-6 text-center">
                  <ShoppingBag className="h-8 w-8 text-zinc-200" />
                  <p className="mt-5 text-sm font-bold text-black">No matching orders</p>
                  <p className="mt-2 max-w-xs text-xs leading-5 text-zinc-400">Change or clear the filters to see more orders.</p>
                  <button type="button" onClick={clearFilters} className="mt-5 text-[9px] font-black uppercase tracking-widest text-black underline underline-offset-4">Clear filters</button>
                </div>
              )}
              {filteredOrders.map((order) => (
                <motion.div
                  key={order.$id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    let items = order.items;
                    if (typeof items === 'string') {
                      try {
                        items = JSON.parse(items);
                      } catch (e) {
                        console.error("Failed to parse order items:", e);
                        items = [];
                      }
                    }
                    if (!Array.isArray(items)) {
                      items = [];
                    }
                    // Use normalized fields
                    const customerName = order.customerName || order.CustomerName || order.userName || order.UserName || order.name || order.Name || 'Anonymous';
                    const customerEmail = order.customerEmail || order.CustomerEmail || order.userEmail || order.UserEmail || order.email || order.Email || 'No email provided';
                    const phone = order.phone || order.Phone || order.customerPhone || order.CustomerPhone || 'No phone provided';
                    const address = order.address || order.Address || order.customerAddress || order.CustomerAddress || 'No address provided';
                    setSelectedOrder({ 
                      ...order, 
                      items, 
                      customerName, 
                      customerEmail, 
                      phone, 
                      address 
                    });
                    setModalOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
                    event.preventDefault();
                    (event.currentTarget as HTMLDivElement).click();
                  }}
                  className={`relative w-full cursor-pointer text-left p-6 lg:p-8 rounded-[2rem] border transition-all flex items-center justify-between group ${
                    selectedOrder?.$id === order.$id 
                      ? 'bg-black text-white border-black shadow-2xl shadow-black/20' 
                      : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-100'
                  }`}
                >
                  {selectionMode && (
                    <label
                      className={`absolute right-5 top-5 flex cursor-pointer items-center gap-2 rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-widest ${selectedOrder?.$id === order.$id ? 'bg-white/10 text-white/80' : 'bg-zinc-100 text-zinc-500'}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.has(order.$id)}
                        onChange={() => toggleOrderSelection(order.$id)}
                        disabled={bulkUpdating}
                        className="h-3.5 w-3.5 accent-black"
                      />
                      Select
                    </label>
                  )}
                  <div className="space-y-1 lg:space-y-2">
                    <div className="flex items-center gap-3 lg:gap-4">
                      <span className="text-xs font-bold tracking-tight">#{order.$id.slice(-6).toUpperCase()}</span>
                      <span className={`px-2 lg:px-3 py-0.5 lg:py-1 rounded-xl text-[7px] lg:text-[8px] font-bold uppercase tracking-widest ${getStatusColor(order.status)}`}>
                        {order.status || 'PAID'}
                      </span>
                    </div>
                    <p className={`text-[9px] lg:text-[10px] font-bold tracking-widest uppercase truncate max-w-[150px] lg:max-w-none ${selectedOrder?.$id === order.$id ? 'text-white/60' : 'text-zinc-400'}`}>
                      {new Date(order.$createdAt).toLocaleDateString()} • {order.customerName || 'Anonymous'}
                    </p>
                    <p className={`text-[8px] font-bold uppercase tracking-widest ${selectedOrder?.$id === order.$id ? 'text-white/40' : 'text-zinc-300'}`}>
                      {order.deliveryState ? (order.deliveryState === 'FCT' ? 'FCT / Abuja' : order.deliveryState) : 'State unavailable'}
                    </p>
                  </div>
                  <div className="text-right space-y-1 lg:space-y-2">
                    <p className="font-bold tracking-tight text-lg lg:text-xl leading-none">
                      {formatCurrency(order.total || 0, 'NGN')}
                    </p>
                    <ChevronRight size={16} className={`ml-auto transition-transform ${selectedOrder?.$id === order.$id ? 'rotate-90 text-white/40' : 'group-hover:translate-x-1 text-zinc-300'}`} />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Panel (optional, for large screens) */}
        <div className="hidden">
          {selectedOrder ? (
            <div className="bg-white border border-zinc-100 rounded-[3rem] p-10 space-y-12 shadow-2xl shadow-zinc-200/50">
              <header className="space-y-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight text-black uppercase">Order #{selectedOrder.$id.slice(-6).toUpperCase()}</h2>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      {formatDate(selectedOrder.$createdAt)}
                    </p>
                  </div>
                  <button onClick={() => { setSelectedOrder(null); setModalOpen(false); }} className="p-3 text-zinc-600 hover:text-black transition-colors bg-zinc-100 rounded-full">
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {ORDER_STATUSES.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusUpdate(selectedOrder.$id, status)}
                      className={`py-3 text-[8px] font-bold uppercase tracking-widest rounded-xl border transition-all ${
                        selectedOrder.status?.toLowerCase() === status 
                          ? 'bg-black text-white border-black shadow-lg shadow-black/10' 
                          : 'bg-white border-zinc-100 text-zinc-400 hover:border-zinc-300'
                      }`}
                    >
                      {formatStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </header>

              <div className="space-y-10">
                <section className="space-y-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-300 flex items-center gap-3">
                    <User size={14} /> Customer Information
                  </h3>
                  <div className="space-y-2">
                    <p className="font-bold text-black tracking-tight">{selectedOrder.customerName || 'Anonymous'}</p>
                    <p className="text-zinc-500 text-sm truncate">{selectedOrder.customerEmail || 'No email provided'}</p>
                    <div className="pt-4 border-t border-zinc-50">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">Shipping Address</p>
                        <button
                          onClick={() => openDeliveryEditor(selectedOrder)}
                          className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-black"
                        >
                          <Pencil size={11} /> Edit delivery
                        </button>
                      </div>
                      <p className="text-zinc-500 text-xs leading-relaxed font-medium">
                        {selectedOrder.address || 'No address provided'}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-300 flex items-center gap-3">
                    <ShoppingBag size={14} /> Order Items
                  </h3>
                  <div className="space-y-4">
                    {Array.isArray(selectedOrder.items) ? selectedOrder.items.map((item: any, i: number) => {
                      const productImage = getProductImage(item);
                      return (
                        <div key={i} className="flex items-start gap-4 text-sm">
                          {productImage && (
                            <img
                              src={productImage}
                              className="w-20 h-20 object-cover rounded-xl border border-zinc-100 shadow-sm flex-shrink-0"
                              alt={item.name}
                            />
                          )}
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="font-bold text-black tracking-tight">{item.name}</p>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Qty: {item.quantity} • Size: {item.selectedSize || 'N/A'}</p>
                          </div>
                          <p className="font-bold text-black tracking-tight flex-shrink-0">{formatCurrency(item.price * item.quantity, 'NGN')}</p>
                        </div>
                      );
                    }) : (
                      <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-300">No items found</p>
                    )}
                  </div>
                </section>

                <section className="pt-10 border-t border-zinc-100 flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Total Price</p>
                    <p className="text-4xl font-bold tracking-tighter text-black leading-none">
                      {formatCurrency(selectedOrder.total || 0, 'NGN')}
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-2xl">
                    <ShoppingBag size={24} className="text-zinc-200" />
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="flex h-full bg-zinc-50/50 rounded-[3rem] border border-zinc-100 border-dashed flex-col items-center justify-center p-16 text-center space-y-8">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm">
                <Clock size={40} strokeWidth={1.5} className="text-zinc-200" />
              </div>
              <div className="space-y-4">
                <p className="text-xl font-bold tracking-tight text-black">No Selection</p>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed uppercase tracking-widest font-bold">
                  Select an order to view details and update its status.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {manualModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!creatingManualOrder) setManualModalOpen(false);
            }}
          />
          <form
            onSubmit={(event) => {
              if (manualStep === 3) void handleManualOrderSubmit(event);
              else event.preventDefault();
            }}
            className="relative z-[100] flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 p-5 md:p-6">
              <div>
                <h3 className="text-xl font-black tracking-tight text-black">Manual Order</h3>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  Create an order from admin
                </p>
              </div>
              <button
                type="button"
                disabled={creatingManualOrder}
                onClick={() => setManualModalOpen(false)}
                className="rounded-full bg-zinc-100 p-2 text-zinc-600 transition-colors hover:text-black disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto p-5 md:p-6">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {['Source', 'Customer', 'Products', 'Delivery'].map((label, index) => (
                  <React.Fragment key={label}>
                    {index > 0 && <span className="h-px flex-1 bg-zinc-200" />}
                    <span className={manualStep === index ? 'text-black' : manualStep > index ? 'text-emerald-600' : ''}>{label}</span>
                  </React.Fragment>
                ))}
              </div>

              {manualStep === 0 && (
                <section className="mx-auto max-w-xl py-6">
                  <h4 className="text-center text-lg font-black tracking-tight text-black">Where did this order come from?</h4>
                  <p className="mt-2 text-center text-sm text-zinc-500">Choose the social channel used for this sale.</p>
                  <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {MANUAL_SALES_SOURCES.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => { updateManualField('salesSource', id); setManualStep(1); }}
                        className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white text-zinc-600 transition hover:border-black hover:text-black"
                      >
                        <Icon size={26} />
                        <span className="text-xs font-black">{label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {manualStep === 1 && <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Customer Name</label>
                  <input
                    value={manualOrder.customerName}
                    onChange={(e) => updateManualField('customerName', e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-black outline-none focus:border-black"
                    placeholder="Customer full name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Email</label>
                  <input
                    type="email"
                    value={manualOrder.customerEmail}
                    onChange={(e) => updateManualField('customerEmail', e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-black outline-none focus:border-black"
                    placeholder="customer@email.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Phone</label>
                  <input
                    value={manualOrder.phone}
                    onChange={(e) => updateManualField('phone', e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-black outline-none focus:border-black"
                    placeholder="080..."
                  />
                </div>
              </section>}

              {manualStep === 2 && <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-black">Items</h4>
                  <button
                    type="button"
                    onClick={addManualItem}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black hover:bg-zinc-50"
                  >
                    <Plus size={14} />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {manualOrder.items.map((item: any, index: number) => (
                    <div key={index} className="rounded-2xl border border-zinc-100 p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Item {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeManualItem(index)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                        <div className="md:col-span-5">
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Product</label>
                          <select
                            value={item.productId}
                            onChange={(e) => selectManualProduct(index, e.target.value)}
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-xs font-bold text-black outline-none focus:border-black"
                          >
                            <option value="">Select a product</option>
                            {products.filter((product: any) => Number(product.stock ?? product.Stock ?? 0) > 0 || Boolean(product.preOrder)).map((product: any) => (
                              <option key={product.$id} value={product.$id}>
                                {product.name} - {formatCurrency(Number(product.price ?? product.Price ?? 0), 'NGN')}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="hidden md:col-span-7">
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Item Name</label>
                          <input
                            value={item.name}
                            onChange={(e) => updateManualItem(index, 'name', e.target.value)}
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-xs font-semibold text-black outline-none focus:border-black"
                            placeholder="Product name"
                          />
                        </div>
                        <div className="hidden md:col-span-3">
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Price</label>
                          <input
                            type="number"
                            min="0"
                            value={item.price}
                            onChange={(e) => updateManualItem(index, 'price', e.target.value)}
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-xs font-semibold text-black outline-none focus:border-black"
                            placeholder="0"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateManualItem(index, 'quantity', e.target.value)}
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-xs font-semibold text-black outline-none focus:border-black"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Size</label>
                          <input
                            value={item.size}
                            onChange={(e) => updateManualItem(index, 'size', e.target.value)}
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-xs font-semibold text-black outline-none focus:border-black"
                            placeholder="M, L, N/A"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Line Total</label>
                          <div className="rounded-xl bg-zinc-50 px-3 py-3 text-xs font-black text-black">
                            {formatCurrency(Number(item.price || 0) * Number(item.quantity || 0), 'NGN')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>}

              {manualStep === 3 && (
                <section className="mx-auto max-w-2xl space-y-5">
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-400">Delivery Location</label>
                    <select
                      value={manualOrder.deliveryLocationId}
                      onChange={(event) => selectManualDeliveryLocation(event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-black outline-none focus:border-black"
                    >
                      <option value="">Select a delivery location</option>
                      {deliveryLocations.map((location) => (
                        <option key={location.$id} value={location.$id}>
                          {location.type === 'sub_location' ? `${location.name}, ${location.state}` : `${location.state} (Home Delivery)`} — {formatCurrency(Number(location.price || 0), 'NGN')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-400">Delivery Address</label>
                    <textarea
                      value={manualOrder.address}
                      onChange={(event) => updateManualField('address', event.target.value)}
                      rows={4}
                      className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-black outline-none focus:border-black"
                      placeholder="Full delivery address and landmark"
                    />
                  </div>
                  <div className="rounded-2xl bg-zinc-950 p-5 text-white">
                    <div className="flex justify-between text-sm text-zinc-300"><span>Products</span><span>{formatCurrency(manualSubtotal, 'NGN')}</span></div>
                    <div className="mt-3 flex justify-between text-sm text-zinc-300"><span>Delivery</span><span>{formatCurrency(manualDeliveryPrice, 'NGN')}</span></div>
                    <div className="mt-4 flex justify-between border-t border-white/15 pt-4 text-base font-black"><span>Total received</span><span>{formatCurrency(manualTotal, 'NGN')}</span></div>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">No VAT, site fee, packaging fee, or checkout discount is added to manual orders.</p>
                  </div>
                </section>
              )}

            </div>

            <div className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={creatingManualOrder}
                onClick={() => manualStep === 0 ? resetManualOrder() : setManualStep((step) => step - 1)}
                className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-black disabled:opacity-50"
              >
                {manualStep === 0 ? 'Reset' : 'Back'}
              </button>
              {manualStep < 3 ? (
                <button
                  type="button"
                  onClick={advanceManualOrder}
                  className="rounded-xl bg-black px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-black/10 hover:bg-zinc-800"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={creatingManualOrder}
                  className="rounded-xl bg-black px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-black/10 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingManualOrder ? 'Creating...' : 'Create Paid Order'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Order Details Modal (for all screens) */}
      {modalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setModalOpen(false); setSelectedOrder(null); }} />
          <div className="relative z-[80] w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Order #{selectedOrder.$id.slice(-6).toUpperCase()}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{formatDate(selectedOrder.$createdAt)}</p>
              </div>
              <button
                onClick={() => { setModalOpen(false); setSelectedOrder(null); }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {/* Status & Actions */}
              <div className="bg-gray-50 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Update Status</label>
                  <select
                    value={normalizeOrderStatus(selectedOrder.status)}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      try {
                        await handleStatusUpdate(selectedOrder.$id, newStatus);
                      } catch (err) {
                        toast.error('Failed to update status');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-tight border-none outline-none ring-1 ring-black/5 shadow-sm ${statusColors[selectedOrder.status] || 'text-gray-600 bg-white'}`}
                  >
                    <option value="paid">Paid</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="out_for_delivery">Out for delivery</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openDeliveryEditor(selectedOrder)}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    Edit Delivery
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedOrder.$id);
                      toast.success('Order ID copied');
                    }}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    Copy Order #
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/orders?orderId=${encodeURIComponent(selectedOrder.$id)}`, { cache: 'no-store' });
                        const result = await response.json();
                        if (!response.ok || !result.trackingUrl) throw new Error('Could not create a private tracking link.');
                        await navigator.clipboard.writeText(result.trackingUrl);
                        toast.success('Private tracking link copied. Share only with this customer.');
                      } catch {
                        toast.error('Could not copy the private link. Check your admin session and clipboard permission.');
                      }
                    }}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    Copy Private Link
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Items List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order Items</h4>
                  <div className="space-y-3">
                    {Array.isArray(selectedOrder.items) ? selectedOrder.items.map((it: any, i: number) => {
                      const productImage = getProductImage(it);
                      return (
                        <div key={i} className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-lg border border-gray-50">
                          {productImage && (
                            <img
                              src={productImage}
                              className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded-xl shadow-md flex-shrink-0"
                              alt={it.name}
                            />
                          )}
                          <div className="flex-1 min-w-0 w-full sm:w-auto">
                            <div className="text-base font-bold text-gray-900">{it.name}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {it.selectedSize ? `Size: ${it.selectedSize} • ` : ''}
                              Qty: {it.quantity} × {formatCurrency(it.price, 'NGN')}
                            </div>
                            <div className="text-lg font-bold text-gray-900 mt-2">
                              {formatCurrency(it.price * it.quantity, 'NGN')}
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-300">No items found</p>
                    )}
                  </div>
                </div>

                {/* Customer Details */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Customer Info</h4>
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg shrink-0">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Customer Name</p>
                          <p className="text-sm font-semibold text-gray-900">{selectedOrder.customerName || 'Guest'}</p>
                        </div>
                      </div>
                      {selectedOrder.customerEmail && (
                        <div className="flex gap-3">
                          <div className="p-2 bg-green-50 text-green-600 rounded-lg shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Email Address</p>
                            <p className="text-sm font-semibold text-gray-900">{selectedOrder.customerEmail}</p>
                          </div>
                        </div>
                      )}
                      {selectedOrder.phone && (
                        <div className="flex gap-3">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Phone Number</p>
                            <p className="text-sm font-semibold text-gray-900">{selectedOrder.phone}</p>
                          </div>
                        </div>
                      )}
                      {selectedOrder.salesSource && (
                        <div className="flex gap-3">
                          <div className="p-2 bg-zinc-100 text-zinc-600 rounded-lg shrink-0">
                            <ShoppingBag size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Sale Source</p>
                            <p className="text-sm font-semibold capitalize text-gray-900">{selectedOrder.salesSource === 'x' ? 'X' : selectedOrder.salesSource}</p>
                          </div>
                        </div>
                      )}
                      {selectedOrder.deliveryOption && (
                        <div className="flex gap-3">
                          <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Delivery State / Option</p>
                            <p className="text-sm font-semibold text-gray-900">{selectedOrder.deliveryOption}</p>
                          </div>
                        </div>
                      )}
                      {selectedOrder.address && (
                        <div className="flex gap-3">
                          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Delivery Address</p>
                            <p className="text-sm font-semibold text-gray-900 leading-snug">{selectedOrder.address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Details</h4>
                    <div className="bg-gray-900 rounded-xl p-4 text-white">
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">Subtotal</span>
                          <span className="font-bold">{formatCurrency(selectedOrder.paymentBreakdown?.subtotal || 0, 'NGN')}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">VAT</span>
                          <span className="font-bold">
                            {selectedOrder.paymentBreakdown?.vatAmount === null ? 'Not stored' : formatCurrency(selectedOrder.paymentBreakdown?.vatAmount || 0, 'NGN')}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">Site Fee</span>
                          <span className="font-bold">
                            {selectedOrder.paymentBreakdown?.siteFee === null ? 'Not stored' : formatCurrency(selectedOrder.paymentBreakdown?.siteFee || 0, 'NGN')}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">Delivery Fee</span>
                          <span className="font-bold">
                            {selectedOrder.paymentBreakdown?.deliveryPrice === null ? 'Not stored' : formatCurrency(selectedOrder.paymentBreakdown?.deliveryPrice || 0, 'NGN')}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">Packaging</span>
                          <span className="font-bold">
                            {selectedOrder.paymentBreakdown?.packagingPrice === null ? 'Not stored' : formatCurrency(selectedOrder.paymentBreakdown?.packagingPrice || 0, 'NGN')}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">Discount</span>
                          <span className="font-bold">
                            {selectedOrder.paymentBreakdown?.discount === null ? 'Not stored' : `-${formatCurrency(selectedOrder.paymentBreakdown?.discount || 0, 'NGN')}`}
                          </span>
                        </div>
                        {selectedOrder.paymentBreakdown?.couponCode && (
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Coupon</span>
                            <span className="font-bold uppercase">{selectedOrder.paymentBreakdown.couponCode}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
                        <span className="text-xs text-gray-400">Total Amount</span>
                        <span className="text-lg font-black">{formatCurrency(selectedOrder.paymentBreakdown?.total || selectedOrder.total || 0, 'NGN')}</span>
                      </div>
                      <div className="pt-3 mt-3 border-t border-white/10">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Payment Reference</p>
                        <p className="text-xs font-mono text-gray-300 break-all">{selectedOrder.paystackRef || 'MANUAL_ENTRY'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 flex justify-end">
              <button
                onClick={() => { setModalOpen(false); setSelectedOrder(null); }}
                className="px-6 py-2 bg-black text-white rounded-xl text-sm font-bold shadow-lg shadow-black/10 hover:opacity-90 transition-all active:scale-95"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {deliveryEditOpen && selectedOrder && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            aria-label="Close delivery editor"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !savingDelivery && setDeliveryEditOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit delivery location</h3>
                <p className="mt-1 text-sm text-gray-500">Update where this order should be delivered. The paid delivery charge stays unchanged.</p>
              </div>
              <button
                onClick={() => setDeliveryEditOpen(false)}
                disabled={savingDelivery}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-black disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
            <label className="mt-6 block text-xs font-bold uppercase tracking-wider text-gray-400">Delivery address</label>
            <textarea
              value={deliveryAddressDraft}
              onChange={(event) => setDeliveryAddressDraft(event.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Full delivery address, area, landmark and state"
              className="mt-2 w-full resize-y rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
              disabled={savingDelivery}
            />
            {selectedOrder.deliveryOption && (
              <p className="mt-3 text-xs text-gray-500">Delivery option kept: <span className="font-semibold text-gray-700">{selectedOrder.deliveryOption}</span></p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeliveryEditOpen(false)}
                disabled={savingDelivery}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveDeliveryAddress}
                disabled={savingDelivery}
                className="rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingDelivery ? 'Saving…' : 'Save location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
