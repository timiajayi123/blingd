// Accounting Types

export type PaymentMethod = 'paystack' | 'transfer' | 'cash';

export type FundCategory = 'inventory' | 'taxes' | 'packaging' | 'logistics' | 'marketing';

export interface AccountBalance {
  $id: string;
  totalBalance: number; // Total available balance in kobo
  paystackBalance: number;
  transferBalance: number;
  cashBalance: number;
  lastUpdated: string;
  updatedBy: string;
}

export interface AccountingEntry {
  $id: string;
  date: string;
  productId: string;
  productName: string;
  quantityPurchased: number;
  quantitySold: number;
  paymentMethod: PaymentMethod;
  saleAmount: number; // in kobo
  cogs: number; // Cost of Goods Sold
  taxes: number;
  packagingCost: number;
  otherExpenses: number;
  totalExpenses: number; // calculated: taxes + packaging + otherExpenses
  grossRevenue: number; // calculated from saleAmount
  netProfit: number; // calculated: grossRevenue - totalExpenses - cogs
  balanceAfterTransaction: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FundAllocation {
  $id: string;
  inventory: number;
  taxes: number;
  packaging: number;
  logistics: number;
  marketing: number;
  available: number; // Unallocated cash
  totalAllocated: number; // Sum of all allocated
  lastUpdated: string;
}

export interface AuditTrailEntry {
  $id: string;
  action: 'balance_update' | 'entry_created' | 'entry_updated' | 'entry_deleted' | 'allocation_updated';
  performedBy: string;
  timestamp: string;
  changes: Record<string, any>;
  previousValues?: Record<string, any>;
  entityId: string;
  entityType: 'balance' | 'entry' | 'allocation';
}

export interface AccountingDashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashFlowIn: number;
  cashFlowOut: number;
  currentBalance: number;
  balanceByPaymentMethod: {
    paystack: number;
    transfer: number;
    cash: number;
  };
  entryCount: number;
  allocationStatus: FundAllocation;
}
