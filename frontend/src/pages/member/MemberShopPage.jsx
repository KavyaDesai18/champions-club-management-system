import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Award,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  Filter,
  History,
  Info,
  MapPin,
  Package,
  Plus,
  Minus,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import shopApi from '../../api/shopApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';

export const MemberShopPage = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProductForDetails, setSelectedProductForDetails] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  // Cart & Checkout state
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [activeOrderForTracking, setActiveOrderForTracking] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const [checkoutForm, setCheckoutForm] = useState({
    fulfilmentType: 'PICKUP', // PICKUP, DELIVERY
    deliveryAddress: '',
    deliveryCity: '',
    deliveryPincode: '',
    deliveryNotes: '',
    paymentMethod: 'WALLET',
  });
  const [checkoutError, setCheckoutError] = useState('');

  // Re-stringing modal
  const [restringingModalOpen, setRestringingModalOpen] = useState(false);
  const [restringForm, setRestringForm] = useState({
    stringType: 'Yonex BG65 Ti (0.70mm)',
    tensionLbs: '25.5',
    turnaroundType: 'STANDARD_3_DAYS',
    loanVariantId: '',
    notes: '',
  });

  // Queries
  const { data: catalogPage, isLoading: catalogLoading } = useQuery({
    queryKey: ['publicCatalog', selectedCategory, search],
    queryFn: () =>
      shopApi.getPublicCatalog({
        categoryId: selectedCategory || undefined,
        search: search || undefined,
        size: 50,
      }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['shopCategories'],
    queryFn: shopApi.getCategories,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['shopServices'],
    queryFn: shopApi.getServices,
  });

  const { data: cartData, refetch: refetchCart } = useQuery({
    queryKey: ['memberCart'],
    queryFn: () => shopApi.getCart(),
  });

  const { data: myOrders = [], refetch: refetchOrders } = useQuery({
    queryKey: ['myOrders'],
    queryFn: () => shopApi.getMyOrders(),
    enabled: historyModalOpen,
  });

  // Price quote query when variant selected in detail modal
  const { data: quoteData } = useQuery({
    queryKey: ['priceQuote', selectedVariantId],
    queryFn: () =>
      shopApi.getPriceQuote({
        variantId: selectedVariantId,
        quantity: 1,
      }),
    enabled: !!selectedVariantId,
  });

  // Mutations
  const addToCartMutation = useMutation({
    mutationFn: (payload) => shopApi.addToCart(payload),
    onSuccess: (data) => {
      addToast({ type: 'success', title: 'Item Added to Cart', message: 'Cart updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['memberCart'] });
    },
    onError: (err) => {
      addToast({ type: 'error', title: 'Add to Cart Failed', message: err.response?.data?.message || err.message });
    },
  });

  const updateQtyMutation = useMutation({
    mutationFn: ({ itemId, qty }) => shopApi.updateCartItemQty(itemId, qty),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memberCart'] }),
    onError: (err) => addToast({ type: 'error', title: 'Update Failed', message: err.response?.data?.message || err.message }),
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId) => shopApi.removeCartItem(itemId),
    onSuccess: () => {
      addToast({ type: 'info', title: 'Item Removed', message: 'Item deleted from cart.' });
      queryClient.invalidateQueries({ queryKey: ['memberCart'] });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (payload) => shopApi.checkout(payload),
    onSuccess: async (order) => {
      // Auto pay order
      try {
        const paidOrder = await shopApi.payOrder(order.id, {
          paymentMethod: checkoutForm.paymentMethod,
          paymentReference: 'PAY-' + Date.now(),
        });
        addToast({
          type: 'success',
          title: 'Order Confirmed & Paid!',
          message: `Order #${paidOrder.orderNo} placed successfully!`,
        });
        setActiveOrderForTracking(paidOrder);
      } catch (e) {
        addToast({
          type: 'warning',
          title: 'Order Placed (Payment Pending)',
          message: `Order #${order.orderNo} placed with 15-min stock hold.`,
        });
        setActiveOrderForTracking(order);
      }
      setCheckoutModalOpen(false);
      setCartOpen(false);
      setTrackingModalOpen(true);
      queryClient.invalidateQueries({ queryKey: ['memberCart'] });
      queryClient.invalidateQueries({ queryKey: ['publicCatalog'] });
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Checkout Failed',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  const restringingMutation = useMutation({
    mutationFn: (payload) => shopApi.createJobTicket(payload),
    onSuccess: (data) => {
      addToast({
        type: 'success',
        title: 'Re-Stringing Ticket Created',
        message: `Your ticket #${data.ticketNumber} is confirmed. Drop off your racquet at the pro shop.`,
      });
      setRestringingModalOpen(false);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Booking Failed',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  const products = catalogPage?.content || [];
  const totalCartCount = cartData?.totalItemCount ?? cartData?.items?.reduce((acc, i) => acc + (i.quantity || 0), 0) ?? 0;

  return (
    <div className="space-y-6 pb-16">
      {/* Hero / Member Discount Callout Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-surface-900 to-teal-950/80 border border-emerald-500/30 relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black tracking-wider uppercase border border-emerald-500/30">
              <Award className="w-3.5 h-3.5" />
              <span>Automatic Tier Shop Discount Applied</span>
            </div>
            <h1 id="shop-page-title" className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Champions Pro Shop & Equipment Services
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Gold VIP members receive <span className="text-emerald-400 font-bold">20% off</span> equipment and apparel. Silver members save <span className="text-cyan-400 font-bold">10%</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              id="my-orders-btn"
              variant="outline"
              size="sm"
              onClick={() => {
                setHistoryModalOpen(true);
                refetchOrders();
              }}
            >
              <History className="w-4 h-4 mr-2" />
              Order History
            </Button>
            <Button
              id="restringing-cta-btn"
              variant="outline"
              size="sm"
              className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
              onClick={() => setRestringingModalOpen(true)}
            >
              <Wrench className="w-4 h-4 mr-2" />
              Re-Stringing
            </Button>
            <Button
              id="open-cart-btn"
              data-testid="open-cart-btn"
              variant="primary"
              size="sm"
              onClick={() => setCartOpen(true)}
              className="relative shadow-lg shadow-emerald-500/20"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Cart
              {totalCartCount > 0 && (
                <span
                  id="cart-badge-count"
                  data-testid="cart-badge-count"
                  className="ml-2 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black"
                >
                  {totalCartCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            id="category-all-btn"
            type="button"
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              !selectedCategory
                ? 'bg-emerald-500 text-surface-950 shadow-md shadow-emerald-500/20'
                : 'bg-surface-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              id={`category-${cat.code.toLowerCase()}-btn`}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-surface-950 shadow-md shadow-emerald-500/20'
                  : 'bg-surface-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="shop-search-input"
            type="text"
            placeholder="Search rackets, shoes, balls..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Product Grid */}
      {catalogLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-surface-900/60 animate-pulse border border-slate-800/60" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-surface-900/40 rounded-3xl border border-slate-800 space-y-3">
          <Package className="w-12 h-12 mx-auto text-slate-600" />
          <h3 className="text-base font-bold text-white">No Catalog Products Found</h3>
          <p className="text-xs text-slate-400">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => {
            const primaryVariant = product.variants?.[0];
            const isOutOfStock = product.variants?.every((v) => v.stockStatus === 'OUT_OF_STOCK');
            const isLowStock = !isOutOfStock && product.variants?.some((v) => v.stockStatus === 'LOW_STOCK');

            return (
              <motion.div
                key={product.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="bg-surface-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-emerald-500/40 transition group shadow-sm hover:shadow-xl hover:shadow-emerald-950/20"
              >
                <div>
                  <div className="relative aspect-[4/3] bg-surface-950 overflow-hidden">
                    <img
                      src={
                        product.images?.[0] ||
                        'https://images.unsplash.com/photo-1617083934555-ac7d4efe0f46?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-950/80 backdrop-blur-md text-slate-300 border border-slate-700">
                        {product.brand}
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      <span
                        data-testid={`member-stock-badge-${product.sku}`}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                          isOutOfStock
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-600/40'
                            : isLowStock
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-600/40'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/40'
                        }`}
                      >
                        {isOutOfStock ? 'Out of stock' : isLowStock ? 'Low stock' : 'In stock'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-emerald-300 transition">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {product.description || 'Authentic pro club sports equipment and apparel.'}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-slate-800/60 mt-2 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Member Rate</span>
                    <span className="text-base font-black text-emerald-400">
                      ${Number(primaryVariant?.effectivePrice || product.basePrice || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      id={`view-product-btn-${product.id}`}
                      data-testid={`view-details-${product.sku}`}
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setSelectedProductForDetails(product);
                        if (product.variants?.length > 0) {
                          setSelectedVariantId(product.variants[0].id);
                        }
                      }}
                    >
                      Details
                    </Button>
                    <Button
                      id={`add-to-cart-btn-${primaryVariant?.sku || product.id}`}
                      data-testid={`add-to-cart-btn-${primaryVariant?.sku || product.id}`}
                      variant="primary"
                      size="xs"
                      disabled={isOutOfStock}
                      onClick={() => {
                        if (primaryVariant) {
                          addToCartMutation.mutate({ variantId: primaryVariant.id, qty: 1 });
                        }
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MEMBER CART SLIDE-OVER DRAWER */}
      <AnimatePresence>
        {cartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCartOpen(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-surface-900 border-l border-slate-800 h-full flex flex-col justify-between shadow-2xl z-10"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-black text-white">Your Shopping Cart</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                    {totalCartCount} items
                  </span>
                </div>
                <button
                  id="close-cart-btn"
                  onClick={() => setCartOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cartData?.hasStockWarnings && (
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Some items have limited stock. Quantities have been noted below.</span>
                  </div>
                )}

                {cartData?.hasPriceDiffs && (
                  <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-600/40 text-cyan-200 text-xs flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Catalog prices were refreshed to match current member rates.</span>
                  </div>
                )}

                {(!cartData?.items || cartData.items.length === 0) ? (
                  <div className="text-center py-16 text-slate-500 space-y-2">
                    <ShoppingCart className="w-12 h-12 mx-auto text-slate-700" />
                    <p className="text-sm">Your cart is currently empty.</p>
                    <p className="text-xs text-slate-600">Add products from the catalog to get started.</p>
                  </div>
                ) : (
                  cartData.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-surface-950 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="font-bold text-white truncate">{item.itemName || item.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.sku || item.variantSku || 'SKU-NONE'} • ${Number(item.unitPrice || item.unitFinalPrice || 0).toFixed(2)} each
                        </div>

                        {item.availableStock < item.qty && (
                          <div className="flex items-center gap-2 pt-1 text-[10px] text-amber-400">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Only {item.availableStock} in stock!</span>
                            <button
                              type="button"
                              onClick={() => updateQtyMutation.mutate({ itemId: item.id, qty: item.availableStock })}
                              className="underline font-bold hover:text-amber-200"
                            >
                              Fix
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQtyMutation.mutate({ itemId: item.id, qty: item.qty - 1 })}
                          className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold text-white">{item.qty || item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQtyMutation.mutate({ itemId: item.id, qty: (item.qty || item.quantity) + 1 })}
                          className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItemMutation.mutate(item.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 ml-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Drawer Footer / Order Summary */}
              {cartData?.items?.length > 0 && (
                <div className="p-4 border-t border-slate-800 bg-surface-950/60 space-y-3">
                  <div className="space-y-1.5 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="text-white">${Number(cartData.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {cartData.discount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Tier Plan Savings:</span>
                        <span>-${Number(cartData.discount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Taxes:</span>
                      <span className="text-white">+${Number(cartData.tax || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-white font-black text-sm pt-2 border-t border-slate-800">
                      <span>Estimated Total:</span>
                      <span className="text-emerald-400">${Number(cartData.estimatedTotal || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    id="proceed-checkout-btn"
                    data-testid="proceed-to-checkout-btn"
                    variant="primary"
                    size="md"
                    className="w-full justify-center"
                    onClick={() => {
                      setCartOpen(false);
                      setCheckoutModalOpen(true);
                    }}
                  >
                    Proceed to Checkout
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CHECKOUT MODAL (PICKUP / DELIVERY) */}
      <Modal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        title="Order Checkout & Fulfillment"
      >
        <div className="space-y-4 text-xs">
          {/* Fulfillment Toggle */}
          <div>
            <label className="text-slate-300 font-bold block mb-1.5">Fulfillment Preference:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="pickup-tab-btn"
                onClick={() => setCheckoutForm({ ...checkoutForm, fulfilmentType: 'PICKUP' })}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  checkoutForm.fulfilmentType === 'PICKUP'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-slate-800 bg-surface-900 text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Store Pickup</div>
                  <div className="text-[10px] text-slate-400">Free • Ready in 30 mins</div>
                </div>
              </button>

              <button
                type="button"
                id="delivery-tab-btn"
                onClick={() => setCheckoutForm({ ...checkoutForm, fulfilmentType: 'DELIVERY' })}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  checkoutForm.fulfilmentType === 'DELIVERY'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-slate-800 bg-surface-900 text-slate-400 hover:text-white'
                }`}
              >
                <Truck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Home Delivery</div>
                  <div className="text-[10px] text-slate-400">$5.00 • Free over $50</div>
                </div>
              </button>
            </div>
          </div>

          {/* Delivery Fields if Delivery Selected */}
          {checkoutForm.fulfilmentType === 'DELIVERY' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-surface-950 border border-slate-800">
              <div>
                <label className="text-slate-400 block mb-1">Street Address:</label>
                <input
                  id="delivery-address-input"
                  data-testid="delivery-address-input"
                  type="text"
                  placeholder="e.g. 42 Champions Way, Apt 3B"
                  value={checkoutForm.deliveryAddress}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, deliveryAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">City:</label>
                  <input
                    id="delivery-city-input"
                    data-testid="delivery-city-input"
                    type="text"
                    placeholder="Bangalore"
                    value={checkoutForm.deliveryCity}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, deliveryCity: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Postal Code (5-6 digits):</label>
                  <input
                    id="delivery-pincode-input"
                    data-testid="delivery-pincode-input"
                    type="text"
                    placeholder="560001"
                    value={checkoutForm.deliveryPincode}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, deliveryPincode: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Gate / Delivery Instructions:</label>
                <input
                  type="text"
                  placeholder="e.g. Leave with security guard"
                  value={checkoutForm.deliveryNotes}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, deliveryNotes: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="text-slate-300 font-bold block mb-1.5">Payment Method:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'WALLET', label: 'Club Wallet', icon: Wallet },
                { id: 'CARD', label: 'Credit Card', icon: CreditCard },
                { id: 'UPI', label: 'UPI / QR', icon: Sparkles },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = checkoutForm.paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setCheckoutForm({ ...checkoutForm, paymentMethod: m.id })}
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 text-white'
                        : 'border-slate-800 bg-surface-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] font-bold">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Total Breakdown in Checkout */}
          <div className="p-3 rounded-2xl bg-surface-950 border border-slate-800 space-y-1 text-slate-400">
            <div className="flex justify-between">
              <span>Items Total:</span>
              <span className="text-white">${Number(cartData?.subtotal || 0).toFixed(2)}</span>
            </div>
            {checkoutForm.fulfilmentType === 'DELIVERY' && (
              <div className="flex justify-between">
                <span>Delivery Fee:</span>
                <span className="text-white">
                  {cartData?.subtotal >= 50 ? 'FREE ($0.00)' : '+$5.00'}
                </span>
              </div>
            )}
            <div className="flex justify-between text-white font-bold pt-1 border-t border-slate-800">
              <span>Final Charge:</span>
              <span className="text-emerald-400 text-sm">
                $
                {Number(
                  (cartData?.estimatedTotal || 0) +
                    (checkoutForm.fulfilmentType === 'DELIVERY' && cartData?.subtotal < 50 ? 5 : 0)
                ).toFixed(2)}
              </span>
            </div>
          </div>

          {checkoutError && (
            <div data-testid="checkout-error-msg" className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
              {checkoutError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCheckoutModalOpen(false)}>
              Cancel
            </Button>
            <Button
              id="confirm-checkout-btn"
              data-testid="confirm-checkout-btn"
              variant="primary"
              loading={checkoutMutation.isPending}
              onClick={() => {
                if (checkoutForm.fulfilmentType === 'DELIVERY') {
                  if (!checkoutForm.deliveryAddress?.trim() || !checkoutForm.deliveryCity?.trim()) {
                    setCheckoutError('Delivery address and city are required.');
                    addToast({ type: 'error', title: 'Address Required', message: 'Delivery address and city are required.' });
                    return;
                  }
                  if (!/^\d{5,6}$/.test(checkoutForm.deliveryPincode?.trim() || '')) {
                    setCheckoutError('Delivery pincode must be 5 to 6 digits.');
                    addToast({ type: 'error', title: 'Invalid Pincode', message: 'Delivery pincode must be 5 to 6 digits.' });
                    return;
                  }
                }
                setCheckoutError('');
                checkoutMutation.mutate({
                  fulfilmentType: checkoutForm.fulfilmentType,
                  deliveryAddress: checkoutForm.deliveryAddress || undefined,
                  deliveryCity: checkoutForm.deliveryCity || undefined,
                  deliveryPincode: checkoutForm.deliveryPincode || undefined,
                  deliveryNotes: checkoutForm.deliveryNotes || undefined,
                  paymentMethod: checkoutForm.paymentMethod,
                });
              }}
            >
              Place Order & Pay
            </Button>
          </div>
        </div>
      </Modal>

      {/* LIVE ORDER TRACKING MODAL */}
      <Modal
        isOpen={trackingModalOpen}
        onClose={() => setTrackingModalOpen(false)}
        title="Live Order Tracking"
      >
        {activeOrderForTracking && (
          <div className="space-y-4 text-xs">
            {/* Order Identity & Pickup Code */}
            <div className="p-4 rounded-2xl bg-surface-950 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Order Number</div>
                <div id="order-tracking-number" className="font-mono text-base font-black text-white">
                  {activeOrderForTracking.orderNo}
                </div>
              </div>
              {activeOrderForTracking.pickupCode && (
                <div className="text-right">
                  <div className="text-[10px] text-emerald-400 uppercase font-bold">Counter Pickup Code</div>
                  <div
                    id="order-pickup-code"
                    data-testid="order-pickup-code"
                    className="font-mono text-lg font-black text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-500/40 inline-block"
                  >
                    {activeOrderForTracking.pickupCode}
                  </div>
                </div>
              )}
            </div>

            {/* Step Timeline */}
            <div className="p-4 rounded-2xl bg-surface-950 border border-slate-800 space-y-3">
              <div className="font-bold text-white mb-2">Fulfillment Progress</div>
              <div className="space-y-2">
                {[
                  { status: 'PLACED', label: 'Order Placed & Stock Reserved' },
                  { status: 'PAID', label: 'Payment Confirmed' },
                  { status: 'PACKED', label: 'Packed & Verified by Staff' },
                  {
                    status: activeOrderForTracking.fulfilmentType === 'DELIVERY' ? 'OUT_FOR_DELIVERY' : 'READY',
                    label:
                      activeOrderForTracking.fulfilmentType === 'DELIVERY'
                        ? 'Out for Delivery'
                        : 'Ready for Counter Pickup',
                  },
                  { status: 'COMPLETED', label: 'Completed & Delivered' },
                ].map((step, idx) => {
                  const statuses = ['PLACED', 'PAID', 'PACKED', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED'];
                  const currentIdx = statuses.indexOf(activeOrderForTracking.status);
                  const stepIdx = statuses.indexOf(step.status);
                  const isDone = currentIdx >= stepIdx;

                  return (
                    <div key={step.status} className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isDone
                            ? 'bg-emerald-500 text-surface-950'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {isDone ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                      </div>
                      <span className={isDone ? 'font-bold text-white' : 'text-slate-500'}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Items List */}
            <div className="space-y-1.5 border-t border-slate-800 pt-3">
              <div className="font-bold text-slate-400 text-[11px]">Itemized Summary:</div>
              {activeOrderForTracking.items?.map((it, i) => (
                <div key={i} className="flex justify-between text-slate-300">
                  <span>
                    {it.qty}x {it.itemName}
                  </span>
                  <span className="font-mono text-white">${Number(it.totalPrice).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-emerald-400 font-bold pt-2 border-t border-slate-800 text-sm">
                <span>Total Paid:</span>
                <span>${Number(activeOrderForTracking.total).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setTrackingModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MEMBER ORDER HISTORY MODAL */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title="Your Pro Shop Orders History"
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto text-xs">
          {myOrders.length === 0 ? (
            <div className="text-center py-10 text-slate-500">No past orders found.</div>
          ) : (
            myOrders.map((o) => (
              <div
                key={o.id}
                onClick={() => {
                  setActiveOrderForTracking(o);
                  setHistoryModalOpen(false);
                  setTrackingModalOpen(true);
                }}
                className="p-3 rounded-xl bg-surface-950 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition flex items-center justify-between"
              >
                <div>
                  <div className="font-mono font-bold text-white">{o.orderNo}</div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(o.createdAt).toLocaleDateString()} • {o.fulfilmentType} • {o.items?.length || 0} items
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-400">${Number(o.total).toFixed(2)}</div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-800 text-slate-300">
                    {o.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* PRODUCT DETAILS MODAL WITH PRICE BREAKDOWN QUOTE */}
      <Modal
        isOpen={!!selectedProductForDetails}
        onClose={() => setSelectedProductForDetails(null)}
        title={selectedProductForDetails?.name || 'Product Details'}
      >
        {selectedProductForDetails && (
          <div className="space-y-4 text-xs">
            {/* Image & specs */}
            <div className="flex gap-4">
              <div className="w-28 h-28 rounded-xl overflow-hidden shrink-0 border border-slate-800">
                <img
                  src={selectedProductForDetails.images?.[0]}
                  alt="detail"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <div className="text-slate-400 uppercase tracking-wider text-[10px]">
                  {selectedProductForDetails.brand} • {selectedProductForDetails.category?.name}
                </div>
                <div className="font-bold text-white text-sm">
                  {selectedProductForDetails.name}
                </div>
                <div className="text-slate-400 text-xs">
                  {selectedProductForDetails.description}
                </div>
              </div>
            </div>

            {/* Variant Selector */}
            {selectedProductForDetails.variants?.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="text-slate-300 font-bold block">Select Size / Specification:</label>
                <div className="flex flex-wrap gap-2">
                  {selectedProductForDetails.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                        selectedVariantId === v.id
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-slate-800 bg-surface-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {v.size} {v.color ? `(${v.color})` : ''} — {v.stockStatus}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Price Quote Box with breakdown */}
            {quoteData && (
              <div className="p-3.5 rounded-2xl bg-surface-950 border border-emerald-500/30 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                  <span>Price Quote Breakdown</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px]">
                    {quoteData.appliedTier} TIER
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Regular Base Price:</span>
                    <span>${Number(quoteData.unitBasePrice).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Member Discount ({quoteData.discountPercentage}%):</span>
                    <span>-${Number(quoteData.unitDiscount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Tax ({quoteData.taxRatePercentage}% {quoteData.taxCategory}):</span>
                    <span>+${Number(quoteData.unitTax).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold pt-1 border-t border-slate-800">
                    <span>Total Final Price:</span>
                    <span className="text-base text-emerald-400">
                      ${Number(quoteData.unitFinalPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setSelectedProductForDetails(null)}>
                Close
              </Button>
              <Button
                id="modal-add-to-cart-btn"
                variant="primary"
                onClick={() => {
                  if (selectedVariantId) {
                    addToCartMutation.mutate({ variantId: selectedVariantId, qty: 1 });
                    setSelectedProductForDetails(null);
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add to Cart
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* RE-STRINGING SERVICE MODAL */}
      <Modal
        isOpen={restringingModalOpen}
        onClose={() => setRestringingModalOpen(false)}
        title="Book Pro Racket Re-Stringing"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-400">
            Precision electronic tensioning with your choice of tournament string and turnaround speed.
          </p>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Select Tournament String:</label>
            <select
              value={restringForm.stringType}
              onChange={(e) => setRestringForm({ ...restringForm, stringType: e.target.value })}
              className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
            >
              <option value="Yonex BG65 Ti (0.70mm)">Yonex BG65 Ti (Durability & Crisp Sound)</option>
              <option value="Yonex BG80 Power (0.68mm)">Yonex BG80 Power (Maximum Repulsion)</option>
              <option value="Yonex Aerobite Hybrid (0.67/0.61mm)">Yonex Aerobite Hybrid (Spin & Control)</option>
              <option value="Wilson Sensation 16 (1.30mm)">Wilson Sensation 16 (Arm-friendly Comfort)</option>
              <option value="Luxilon ALU Power (1.25mm)">Luxilon ALU Power (Tour Poly Pinpoint Spin)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Tension (lbs):</label>
              <input
                type="number"
                step="0.5"
                min="18"
                max="35"
                value={restringForm.tensionLbs}
                onChange={(e) => setRestringForm({ ...restringForm, tensionLbs: e.target.value })}
                className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Turnaround Speed:</label>
              <select
                value={restringForm.turnaroundType}
                onChange={(e) => setRestringForm({ ...restringForm, turnaroundType: e.target.value })}
                className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
              >
                <option value="STANDARD_3_DAYS">Standard (3 Days) — Included</option>
                <option value="NEXT_DAY">Next-Day Rush (+$5.00)</option>
                <option value="SAME_DAY">Same-Day Express (+$10.00)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Additional Player Notes:</label>
            <textarea
              rows="2"
              placeholder="e.g. 4 knots pattern, replace damaged grommets..."
              value={restringForm.notes}
              onChange={(e) => setRestringForm({ ...restringForm, notes: e.target.value })}
              className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs">
            <span className="text-slate-300">Base Service Fee:</span>
            <span className="text-base font-black text-emerald-400">$25.00</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRestringingModalOpen(false)}>
              Cancel
            </Button>
            <Button
              id="confirm-restringing-btn"
              variant="primary"
              loading={restringingMutation.isPending}
              onClick={() => {
                restringingMutation.mutate({
                  stringType: restringForm.stringType,
                  tensionLbs: parseFloat(restringForm.tensionLbs),
                  turnaroundType: restringForm.turnaroundType,
                  notes: restringForm.notes,
                });
              }}
            >
              Submit Re-Stringing Ticket
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MemberShopPage;
