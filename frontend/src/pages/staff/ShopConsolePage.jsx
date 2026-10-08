import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Barcode,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit,
  Eye,
  FileText,
  Filter,
  History,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Tag,
  Truck,
  Wrench,
  X,
} from 'lucide-react';
import shopApi from '../../api/shopApi';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';

export const ShopConsolePage = () => {
  const [activeTab, setActiveTab] = useState('inventory'); // inventory, ledger, tickets, purchase_orders, pos
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStockFilter, setSelectedStockFilter] = useState('ALL'); // ALL, LOW_STOCK, OUT_OF_STOCK, IN_STOCK

  // Modals state
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [selectedVariantForRestock, setSelectedVariantForRestock] = useState(null);
  const [restockQty, setRestockQty] = useState(10);
  const [restockCost, setRestockCost] = useState('');
  const [restockReason, setRestockReason] = useState('Counter restock delivery');

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedVariantForAdjust, setSelectedVariantForAdjust] = useState(null);
  const [adjustCount, setAdjustCount] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');

  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [selectedVariantForHistory, setSelectedVariantForHistory] = useState(null);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedPoForReceive, setSelectedPoForReceive] = useState(null);
  const [receiveQtyMap, setReceiveQtyMap] = useState({});

  // Product Form State
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    brand: '',
    categoryId: '',
    basePrice: '',
    taxCategory: 'STANDARD',
    description: '',
    images: ['https://images.unsplash.com/photo-1613918108466-292b78a8ef95?w=600&auto=format&fit=crop&q=80'],
    variants: [
      { sku: '', size: 'Standard', color: 'Default', priceOverride: '', barcode: '', costPrice: '100', reorderLevel: 5, reorderQty: 20, initialStock: 15 },
    ],
  });

  // Ticket Form State
  const [ticketForm, setTicketForm] = useState({
    serviceId: '',
    memberId: '',
    guestName: '',
    guestPhone: '',
    stringType: 'Yonex BG65 (0.70mm)',
    tensionLbs: '25.0',
    turnaroundType: 'STANDARD_3_DAYS',
    loanVariantId: '',
    notes: '',
  });

  // POS State
  const [posBarcode, setPosBarcode] = useState('');
  const [posCart, setPosCart] = useState([]);
  const [posMemberId, setPosMemberId] = useState('');

  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: categories = [] } = useQuery({
    queryKey: ['shopCategories'],
    queryFn: shopApi.getCategories,
  });

  const { data: variantsData = [], isLoading: variantsLoading, refetch: refetchVariants } = useQuery({
    queryKey: ['shopVariants'],
    queryFn: shopApi.getAllVariants,
  });

  const { data: alertsData = [], refetch: refetchAlerts } = useQuery({
    queryKey: ['shopAlerts'],
    queryFn: shopApi.getActiveLowStockAlerts,
  });

  const { data: movementsData = [] } = useQuery({
    queryKey: ['shopMovements'],
    queryFn: () => shopApi.getAllRecentMovements({ size: 50 }),
    enabled: activeTab === 'ledger',
  });

  const { data: ticketsData = [], refetch: refetchTickets } = useQuery({
    queryKey: ['shopTickets'],
    queryFn: () => shopApi.getJobTickets(),
    enabled: activeTab === 'tickets',
  });

  const { data: servicesData = [] } = useQuery({
    queryKey: ['shopServices'],
    queryFn: shopApi.getServices,
  });

  const { data: purchaseOrders = [], refetch: refetchPos } = useQuery({
    queryKey: ['shopPurchaseOrders'],
    queryFn: shopApi.getPurchaseOrders,
    enabled: activeTab === 'purchase_orders',
  });

  const { data: supplierBills = [] } = useQuery({
    queryKey: ['shopSupplierBills'],
    queryFn: shopApi.getSupplierBills,
    enabled: activeTab === 'purchase_orders',
  });

  const { data: variantMovements = [] } = useQuery({
    queryKey: ['variantMovements', selectedVariantForHistory?.id],
    queryFn: () => shopApi.getVariantMovements(selectedVariantForHistory.id),
    enabled: !!selectedVariantForHistory,
  });

  // Mutations
  const restockMutation = useMutation({
    mutationFn: ({ variantId, payload }) => shopApi.restockVariant(variantId, payload),
    onSuccess: (res, vars) => {
      addToast({ type: 'success', title: 'Restock Successful', message: `Added ${vars.payload.qty} units to inventory ledger.` });
      setRestockModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['shopVariants'] });
      queryClient.invalidateQueries({ queryKey: ['shopAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['publicCatalog'] });
    },
    onError: (err) => {
      addToast({ type: 'error', title: 'Restock Failed', message: err.response?.data?.message || err.message });
    },
  });

  const adjustMutation = useMutation({
    mutationFn: ({ variantId, payload }) => shopApi.adjustVariantStock(variantId, payload),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Adjustment Recorded', message: 'Physical stock count updated with movement audit entry.' });
      setAdjustModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['shopVariants'] });
      queryClient.invalidateQueries({ queryKey: ['shopAlerts'] });
    },
    onError: (err) => {
      addToast({ type: 'error', title: 'Adjustment Failed', message: err.response?.data?.message || err.message });
    },
  });

  const createProductMutation = useMutation({
    mutationFn: (payload) => shopApi.createProduct(payload),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Product Created', message: 'Product and variants added to catalog.' });
      setProductModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['shopVariants'] });
      queryClient.invalidateQueries({ queryKey: ['publicCatalog'] });
    },
    onError: (err) => {
      addToast({ type: 'error', title: 'Product Creation Failed', message: err.response?.data?.message || err.message });
    },
  });

  const suggestedReorderMutation = useMutation({
    mutationFn: shopApi.generateSuggestedReorders,
    onSuccess: (data) => {
      addToast({ type: 'success', title: 'Reorders Generated', message: `Draft PO created for ${data.length} vendor batch.` });
      queryClient.invalidateQueries({ queryKey: ['shopPurchaseOrders'] });
      setActiveTab('purchase_orders');
    },
    onError: (err) => {
      addToast({ type: 'error', title: 'Reorder Failed', message: err.response?.data?.message || err.message });
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ ticketId, payload }) => shopApi.updateTicketStatus(ticketId, payload),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Ticket Updated', message: 'Job ticket status updated.' });
      queryClient.invalidateQueries({ queryKey: ['shopTickets'] });
      queryClient.invalidateQueries({ queryKey: ['shopVariants'] });
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: shopApi.createJobTicket,
    onSuccess: () => {
      addToast({ type: 'success', title: 'Job Ticket Created', message: 'Re-stringing ticket logged.' });
      setTicketModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['shopTickets'] });
      queryClient.invalidateQueries({ queryKey: ['shopVariants'] });
    },
    onError: (err) => {
      addToast({ type: 'error', title: 'Failed to Create Ticket', message: err.response?.data?.message || err.message });
    },
  });

  const receivePoMutation = useMutation({
    mutationFn: ({ poId, payload }) => shopApi.receivePurchaseOrder(poId, payload),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Items Received', message: 'Inventory updated, PURCHASE movement written, supplier bill generated.' });
      setReceiveModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['shopPurchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['shopSupplierBills'] });
      queryClient.invalidateQueries({ queryKey: ['shopVariants'] });
      queryClient.invalidateQueries({ queryKey: ['shopAlerts'] });
    },
    onError: (err) => {
      addToast({ type: 'error', title: 'Receiving Failed', message: err.response?.data?.message || err.message });
    },
  });

  const quickSaleMutation = useMutation({
    mutationFn: shopApi.executeQuickSale,
    onSuccess: (data) => {
      addToast({ type: 'success', title: 'Sale Completed', message: `Order #${data.orderNumber} receipt generated for $${data.finalAmount}` });
      setPosCart([]);
      setPosBarcode('');
      queryClient.invalidateQueries({ queryKey: ['shopVariants'] });
      queryClient.invalidateQueries({ queryKey: ['shopAlerts'] });
    },
    onError: (err) => {
      addToast({ type: 'error', title: 'Sale Failed', message: err.response?.data?.message || err.message });
    },
  });

  // Filtered variants
  const filteredVariants = variantsData.filter((v) => {
    const matchesSearch =
      !search ||
      v.sku.toLowerCase().includes(search.toLowerCase()) ||
      (v.barcode && v.barcode.toLowerCase().includes(search.toLowerCase())) ||
      (v.size && v.size.toLowerCase().includes(search.toLowerCase())) ||
      (v.color && v.color.toLowerCase().includes(search.toLowerCase()));

    const matchesStock =
      selectedStockFilter === 'ALL' ||
      (selectedStockFilter === 'LOW_STOCK' && v.stockStatus === 'LOW_STOCK') ||
      (selectedStockFilter === 'OUT_OF_STOCK' && v.stockStatus === 'OUT_OF_STOCK') ||
      (selectedStockFilter === 'IN_STOCK' && v.stockStatus === 'IN_STOCK');

    return matchesSearch && matchesStock;
  });

  // POS Scanner Add
  const handleBarcodeScanSubmit = async (e) => {
    e.preventDefault();
    if (!posBarcode.trim()) return;
    try {
      const result = await shopApi.lookupBarcode(posBarcode.trim(), posMemberId || undefined);
      setPosCart((prev) => {
        const existing = prev.find((item) => item.variantId === result.variantId);
        if (existing) {
          return prev.map((item) =>
            item.variantId === result.variantId ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        return [
          ...prev,
          {
            variantId: result.variantId,
            name: `${result.productName} (${result.size || ''})`,
            sku: result.sku,
            barcode: result.barcode,
            unitPrice: result.priceQuote ? result.priceQuote.unitFinalPrice : result.effectivePrice,
            quantity: 1,
          },
        ];
      });
      setPosBarcode('');
      addToast({ type: 'info', title: 'Item Scanned', message: `${result.productName} added to cart.` });
    } catch (err) {
      addToast({ type: 'error', title: 'Barcode Not Found', message: err.response?.data?.message || 'No variant found.' });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Package className="w-7 h-7 text-cyan-400" />
            Pro Shop & Inventory Console
          </h1>
          <p className="text-sm text-slate-400">
            Atomic ledger-backed stock control, equipment rentals, re-stringing KDS, and POS counter.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            id="refresh-inventory-btn"
            variant="outline"
            size="sm"
            onClick={() => {
              refetchVariants();
              refetchAlerts();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            id="create-product-btn"
            variant="primary"
            size="sm"
            onClick={() => setProductModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Product
          </Button>
        </div>
      </div>

      {/* Active Low Stock Alerts Banner */}
      {alertsData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          id="low-stock-alert-banner"
          data-testid="low-stock-alert-banner"
          className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/40 text-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-amber-100 flex items-center gap-2">
                <span>{alertsData.length} Variants Below Reorder Level</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/30 font-mono font-bold">
                  ACTION REQUIRED
                </span>
              </div>
              <div className="text-xs text-amber-300/80">
                {alertsData.map((a) => `${a.variantSku} (${a.currentAvailable} left / threshold ${a.reorderLevel})`).slice(0, 3).join(', ')}
                {alertsData.length > 3 && ` +${alertsData.length - 3} more`}
              </div>
            </div>
          </div>

          <Button
            id="reorder-suggested-btn"
            data-testid="reorder-suggested-btn"
            variant="warning"
            size="sm"
            loading={suggestedReorderMutation.isPending}
            onClick={() => suggestedReorderMutation.mutate()}
          >
            <Truck className="w-4 h-4 mr-2" />
            1-Click Reorder Suggested ({alertsData.length})
          </Button>
        </motion.div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap border-b border-slate-800 gap-2">
        {[
          { id: 'inventory', label: 'Inventory Table', icon: Package, badge: variantsData.length },
          { id: 'ledger', label: 'Movement Ledger', icon: History },
          { id: 'tickets', label: 'Re-Stringing KDS', icon: Wrench, badge: ticketsData.filter(t => t.status !== 'COMPLETED').length },
          { id: 'purchase_orders', label: 'Purchase Orders & Bills', icon: Truck, badge: purchaseOrders.length },
          { id: 'pos', label: 'Counter POS Terminal', icon: Barcode },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition border-b-2 -mb-px ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 bg-surface-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: INVENTORY TABLE */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                id="inventory-search-input"
                type="text"
                placeholder="Search SKU, barcode, size, color..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <select
                id="inventory-stock-filter"
                value={selectedStockFilter}
                onChange={(e) => setSelectedStockFilter(e.target.value)}
                className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-cyan-500 outline-none"
              >
                <option value="ALL">All Stock Statuses</option>
                <option value="LOW_STOCK">Low Stock Alerts Only</option>
                <option value="OUT_OF_STOCK">Out of Stock Only</option>
                <option value="IN_STOCK">In Stock Only</option>
              </select>
            </div>

            <div className="text-right text-xs text-slate-400 flex items-center justify-end gap-2">
              <span>Showing {filteredVariants.length} variants</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-surface-900/40">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-surface-900/80 uppercase text-[10px] font-bold tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Variant SKU</th>
                  <th className="p-3">Specs (Size / Color)</th>
                  <th className="p-3">Barcode</th>
                  <th className="p-3">Cost / Sell</th>
                  <th className="p-3">On Hand</th>
                  <th className="p-3">Reserved</th>
                  <th className="p-3">Available</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredVariants.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-slate-400">
                      No inventory variants found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredVariants.map((variant) => {
                    const isLow = variant.stockStatus === 'LOW_STOCK';
                    const isOut = variant.stockStatus === 'OUT_OF_STOCK';

                    return (
                      <tr
                        key={variant.id}
                        id={`variant-row-${variant.sku}`}
                        data-testid={`variant-row-${variant.sku}`}
                        className={`hover:bg-slate-800/40 transition ${
                          isLow ? 'bg-amber-950/15' : isOut ? 'bg-rose-950/15' : ''
                        }`}
                      >
                        <td className="p-3 font-mono font-bold text-white">
                          <div>{variant.sku}</div>
                          <div className="text-[10px] text-slate-400 font-sans">
                            Reorder: {variant.reorderLevel} units
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-slate-200">{variant.size || 'Standard'}</span>
                          {variant.color && <span className="text-slate-400 ml-1.5">/ {variant.color}</span>}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-400">
                          {variant.barcode || '—'}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-white">
                            ${Number(variant.effectivePrice || 0).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            WAC: ${Number(variant.costPrice || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="p-3 font-bold text-white text-sm">
                          {variant.onHand}
                        </td>
                        <td className="p-3 font-medium text-amber-400">
                          {variant.reserved}
                        </td>
                        <td className="p-3 font-bold text-sm">
                          <span
                            className={
                              isOut ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                            }
                          >
                            {variant.available}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            data-testid={`stock-badge-${variant.sku}`}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isOut
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : isLow
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {variant.stockStatus?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              id={`restock-btn-${variant.sku}`}
                              data-testid={`inline-restock-btn-${variant.sku}`}
                              variant="outline"
                              size="xs"
                              onClick={() => {
                                setSelectedVariantForRestock(variant);
                                setRestockQty(variant.reorderQty || 10);
                                setRestockCost(variant.costPrice || '');
                                setRestockModalOpen(true);
                              }}
                            >
                              Restock
                            </Button>
                            <Button
                              id={`adjust-btn-${variant.sku}`}
                              variant="ghost"
                              size="xs"
                              onClick={() => {
                                setSelectedVariantForAdjust(variant);
                                setAdjustCount(variant.onHand);
                                setAdjustReason('');
                                setAdjustModalOpen(true);
                              }}
                            >
                              Adjust
                            </Button>
                            <Button
                              id={`history-btn-${variant.sku}`}
                              variant="ghost"
                              size="xs"
                              onClick={() => {
                                setSelectedVariantForHistory(variant);
                                setHistoryDrawerOpen(true);
                              }}
                            >
                              <History className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MOVEMENT LEDGER TIMELINE */}
      {activeTab === 'ledger' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              Append-Only Stock Ledger Timeline
            </h2>
            <span className="text-xs text-slate-400">Immutable audit log</span>
          </div>

          <div className="space-y-3">
            {movementsData?.content?.length === 0 ? (
              <p className="text-sm text-slate-400">No stock movements found.</p>
            ) : (
              movementsData?.content?.map((movement) => (
                <div
                  key={movement.id}
                  className="p-3 rounded-xl bg-surface-900 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        movement.qty > 0
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : movement.qty < 0
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      {movement.qty > 0 ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : movement.qty < 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{movement.type}</span>
                        <span className="font-mono text-cyan-300">{movement.variantSku}</span>
                        <span className="text-slate-400 font-normal">({movement.productName})</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Reason: {movement.reason || 'N/A'} • Ref: {movement.reference || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-sm font-black font-mono ${
                        movement.qty > 0
                          ? 'text-emerald-400'
                          : movement.qty < 0
                          ? 'text-rose-400'
                          : 'text-cyan-400'
                      }`}
                    >
                      {movement.qty > 0 ? `+${movement.qty}` : movement.qty} units
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(movement.createdAt).toLocaleString()} by {movement.createdBy}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* TAB 3: RE-STRINGING & SERVICES KDS */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cyan-400" />
              Racket Re-Stringing & Non-Stock Services Job Tickets
            </h2>
            <Button
              id="new-ticket-btn"
              variant="primary"
              size="sm"
              onClick={() => setTicketModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Restringing Ticket
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['RECEIVED', 'IN_PROGRESS', 'READY', 'COMPLETED'].map((status) => {
              const statusTickets = ticketsData.filter((t) => t.status === status);
              return (
                <div key={status} className="bg-surface-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-black uppercase text-slate-300">{status.replace('_', ' ')}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold">
                      {statusTickets.length}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {statusTickets.length === 0 ? (
                      <div className="text-[11px] text-slate-500 text-center py-6">No tickets</div>
                    ) : (
                      statusTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="p-3 rounded-xl bg-surface-950/80 border border-slate-800 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-cyan-400">{ticket.ticketNumber}</span>
                            <span className="font-bold text-white">${ticket.totalPrice}</span>
                          </div>

                          <div className="font-bold text-white">
                            {ticket.memberName || ticket.guestName || 'Walk-in'}
                          </div>

                          {ticket.stringType && (
                            <div className="text-[11px] text-slate-300">
                              <span className="text-slate-400">String:</span> {ticket.stringType} ({ticket.tensionLbs} lbs)
                            </div>
                          )}

                          {ticket.loanVariantSku && (
                            <div className="p-1.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-[10px] text-indigo-300">
                              Loan Racket: {ticket.loanVariantSku} • {ticket.loanReturned ? 'Returned' : 'Held Out'}
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
                            {status === 'RECEIVED' && (
                              <Button
                                size="xs"
                                variant="outline"
                                className="w-full"
                                onClick={() => updateTicketMutation.mutate({ ticketId: ticket.id, payload: { status: 'IN_PROGRESS' } })}
                              >
                                Start Stringing
                              </Button>
                            )}
                            {status === 'IN_PROGRESS' && (
                              <Button
                                size="xs"
                                variant="warning"
                                className="w-full"
                                onClick={() => updateTicketMutation.mutate({ ticketId: ticket.id, payload: { status: 'READY' } })}
                              >
                                Mark Ready
                              </Button>
                            )}
                            {status === 'READY' && (
                              <Button
                                size="xs"
                                variant="primary"
                                className="w-full"
                                onClick={() => updateTicketMutation.mutate({ ticketId: ticket.id, payload: { status: 'COMPLETED', loanReturned: true } })}
                              >
                                Complete & Pickup
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: PURCHASE ORDERS & SUPPLIER BILLS */}
      {activeTab === 'purchase_orders' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-cyan-400" />
              Purchase Orders Lifecycle & Supplier Accounts Payable
            </h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-surface-900/40">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-surface-900/80 uppercase text-[10px] font-bold tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">PO Number</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Items Ordered</th>
                  <th className="p-3">Total Cost</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">
                      No purchase orders drafted.
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-white">{po.poNumber}</td>
                      <td className="p-3 font-medium text-slate-200">{po.supplierName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-cyan-300">
                          {po.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-300">
                        {po.items?.length || 0} items
                      </td>
                      <td className="p-3 font-bold text-white">${Number(po.totalCost || 0).toFixed(2)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {po.status === 'DRAFT' && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => shopApi.sendPurchaseOrder(po.id).then(() => refetchPos())}
                            >
                              Send PO
                            </Button>
                          )}
                          {(po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED') && (
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={() => {
                                setSelectedPoForReceive(po);
                                const initialMap = {};
                                po.items.forEach((item) => {
                                  initialMap[item.id] = Math.max(0, item.orderedQty - (item.receivedQty || 0));
                                });
                                setReceiveQtyMap(initialMap);
                                setReceiveModalOpen(true);
                              }}
                            >
                              Receive Goods
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Supplier Bills */}
          <Card className="p-6 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Generated Supplier Bills ("What We Owe")
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-surface-900 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2">Bill Ref</th>
                    <th className="p-2">PO Ref</th>
                    <th className="p-2">Vendor</th>
                    <th className="p-2">Amount</th>
                    <th className="p-2">Due Date</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {supplierBills.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-4 text-center text-slate-500">
                        No supplier bills recorded yet.
                      </td>
                    </tr>
                  ) : (
                    supplierBills.map((bill) => (
                      <tr key={bill.id}>
                        <td className="p-2 font-mono font-bold text-white">{bill.billNumber}</td>
                        <td className="p-2 font-mono text-cyan-400">{bill.poNumber || '—'}</td>
                        <td className="p-2">{bill.supplierName}</td>
                        <td className="p-2 font-bold text-emerald-400">${Number(bill.amount).toFixed(2)}</td>
                        <td className="p-2 text-slate-400">{bill.dueDate || 'NET_30'}</td>
                        <td className="p-2 font-bold text-[10px] text-amber-300 uppercase">{bill.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: POS SCANNER TERMINAL */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Barcode className="w-5 h-5 text-cyan-400" />
              Point-of-Sale Counter Scanner
            </h2>

            <form onSubmit={handleBarcodeScanSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <input
                  id="pos-barcode-input"
                  type="text"
                  placeholder="Scan or enter barcode (e.g. 890123456001)..."
                  value={posBarcode}
                  onChange={(e) => setPosBarcode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-surface-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>
              <Button type="submit" variant="primary" size="sm">
                Lookup / Add
              </Button>
            </form>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase">Cart Items ({posCart.length})</div>
              {posCart.length === 0 ? (
                <div className="p-8 text-center text-slate-500 rounded-xl border border-dashed border-slate-800">
                  Cart is empty. Scan barcode or enter SKU.
                </div>
              ) : (
                posCart.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-surface-900 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{item.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {item.sku} • ${item.unitPrice} each
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-cyan-300">x{item.quantity}</div>
                      <div className="font-bold text-white text-sm">
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPosCart((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-rose-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* POS Checkout Summary */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Payment & Receipt</h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono text-white">
                  ${posCart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Due:</span>
                <span className="font-mono text-lg font-bold text-emerald-400">
                  ${posCart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0).toFixed(2)}
                </span>
              </div>
            </div>

            <Button
              id="pos-complete-sale-btn"
              variant="success"
              className="w-full mt-4"
              disabled={posCart.length === 0}
              loading={quickSaleMutation.isPending}
              onClick={() => {
                quickSaleMutation.mutate({
                  items: posCart.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
                  paymentMethod: 'COUNTER_QUICK_SALE',
                });
              }}
            >
              Complete Sale
            </Button>
          </Card>
        </div>
      )}

      {/* RESTOCK MODAL */}
      <Modal
        isOpen={restockModalOpen}
        onClose={() => setRestockModalOpen(false)}
        title={`Restock Variant: ${selectedVariantForRestock?.sku || ''}`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Restock Quantity (Units):</label>
            <input
              id="restock-qty-input"
              data-testid="restock-qty-input"
              type="number"
              min="1"
              value={restockQty}
              onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Unit Cost ($ per item):</label>
            <input
              id="restock-cost-input"
              type="number"
              step="0.01"
              value={restockCost}
              onChange={(e) => setRestockCost(e.target.value)}
              className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Delivery Reference / Reason:</label>
            <input
              type="text"
              value={restockReason}
              onChange={(e) => setRestockReason(e.target.value)}
              className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRestockModalOpen(false)}>
              Cancel
            </Button>
            <Button
              id="confirm-restock-btn"
              data-testid="confirm-restock-btn"
              variant="primary"
              loading={restockMutation.isPending}
              onClick={() => {
                restockMutation.mutate({
                  variantId: selectedVariantForRestock.id,
                  payload: {
                    qty: restockQty,
                    unitCost: restockCost ? parseFloat(restockCost) : undefined,
                    reason: restockReason,
                  },
                });
              }}
            >
              Confirm Restock
            </Button>
          </div>
        </div>
      </Modal>

      {/* ADJUST MODAL */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title={`Audit Adjust Stock: ${selectedVariantForAdjust?.sku || ''}`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-400">
            Physical stock count reconcile. Current on_hand is {selectedVariantForAdjust?.onHand}.
          </p>

          <div>
            <label className="block text-slate-400 mb-1">Actual Physical Count Counted:</label>
            <input
              id="adjust-count-input"
              type="number"
              min="0"
              value={adjustCount}
              onChange={(e) => setAdjustCount(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Mandatory Adjustment Reason:</label>
            <input
              id="adjust-reason-input"
              type="text"
              placeholder="e.g. Damaged in store, monthly cycle count..."
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button
              id="confirm-adjust-btn"
              variant="warning"
              loading={adjustMutation.isPending}
              disabled={!adjustReason.trim()}
              onClick={() => {
                adjustMutation.mutate({
                  variantId: selectedVariantForAdjust.id,
                  payload: {
                    physicalCount: adjustCount,
                    reason: adjustReason,
                  },
                });
              }}
            >
              Confirm Adjustment
            </Button>
          </div>
        </div>
      </Modal>

      {/* PRODUCT CREATION MODAL */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title="Create New Catalog Product"
      >
        <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Product SKU:</label>
              <input
                type="text"
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                placeholder="PRD-NEW-01"
                className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Brand:</label>
              <input
                type="text"
                value={productForm.brand}
                onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                placeholder="Yonex, Wilson, Asics..."
                className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Product Name:</label>
            <input
              type="text"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              placeholder="e.g. Pro Tour Badminton Racket"
              className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Category:</label>
              <select
                value={productForm.categoryId}
                onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Base Price ($):</label>
              <input
                type="number"
                step="0.01"
                value={productForm.basePrice}
                onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
                placeholder="199.99"
                className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Image URL Preview:</label>
            <input
              type="text"
              value={productForm.images[0] || ''}
              onChange={(e) => setProductForm({ ...productForm, images: [e.target.value] })}
              className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
            />
            {productForm.images[0] && (
              <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-slate-800">
                <img
                  src={productForm.images[0]}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800">
            <div className="font-bold text-white mb-2">Variant 1 Details:</div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Variant SKU (e.g. VAR-01)"
                value={productForm.variants[0].sku}
                onChange={(e) => {
                  const vars = [...productForm.variants];
                  vars[0].sku = e.target.value;
                  setProductForm({ ...productForm, variants: vars });
                }}
                className="px-2.5 py-1.5 bg-surface-900 border border-slate-800 rounded-lg text-white"
              />
              <input
                type="text"
                placeholder="Barcode"
                value={productForm.variants[0].barcode}
                onChange={(e) => {
                  const vars = [...productForm.variants];
                  vars[0].barcode = e.target.value;
                  setProductForm({ ...productForm, variants: vars });
                }}
                className="px-2.5 py-1.5 bg-surface-900 border border-slate-800 rounded-lg text-white"
              />
              <input
                type="number"
                placeholder="Initial Stock"
                value={productForm.variants[0].initialStock}
                onChange={(e) => {
                  const vars = [...productForm.variants];
                  vars[0].initialStock = parseInt(e.target.value) || 0;
                  setProductForm({ ...productForm, variants: vars });
                }}
                className="px-2.5 py-1.5 bg-surface-900 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setProductModalOpen(false)}>
              Cancel
            </Button>
            <Button
              id="save-product-btn"
              variant="primary"
              loading={createProductMutation.isPending}
              onClick={() => {
                createProductMutation.mutate({
                  ...productForm,
                  basePrice: parseFloat(productForm.basePrice),
                  variants: productForm.variants.map((v) => ({
                    ...v,
                    costPrice: parseFloat(v.costPrice),
                  })),
                });
              }}
            >
              Create Product
            </Button>
          </div>
        </div>
      </Modal>

      {/* PO RECEIVING MODAL */}
      <Modal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        title={`Receive Goods: ${selectedPoForReceive?.poNumber || ''}`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-400">
            Partial receipts are supported. Enter received units for each line item:
          </p>

          <div className="space-y-2">
            {selectedPoForReceive?.items?.map((item) => (
              <div key={item.id} className="p-3 rounded-xl bg-surface-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">{item.variantSku}</div>
                  <div className="text-[11px] text-slate-400">
                    Ordered: {item.orderedQty} • Already Received: {item.receivedQty || 0}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-slate-400">Receive:</label>
                  <input
                    type="number"
                    min="0"
                    max={item.orderedQty - (item.receivedQty || 0)}
                    value={receiveQtyMap[item.id] || 0}
                    onChange={(e) =>
                      setReceiveQtyMap({
                        ...receiveQtyMap,
                        [item.id]: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-20 px-2 py-1 bg-surface-950 border border-slate-800 rounded-lg text-white text-center"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setReceiveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={receivePoMutation.isPending}
              onClick={() => {
                const itemsToReceive = Object.entries(receiveQtyMap)
                  .filter(([_, qty]) => qty > 0)
                  .map(([itemId, qty]) => ({ poItemId: itemId, receivedQty: qty }));

                if (itemsToReceive.length === 0) {
                  addToast({ type: 'warning', title: 'No Units Specified', message: 'Specify at least 1 unit to receive.' });
                  return;
                }

                receivePoMutation.mutate({
                  poId: selectedPoForReceive.id,
                  payload: { items: itemsToReceive },
                });
              }}
            >
              Confirm Receipts
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ShopConsolePage;
