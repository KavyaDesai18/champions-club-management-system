import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Check,
  ChevronRight,
  Filter,
  Info,
  Package,
  Search,
  ShoppingCart,
  Sparkles,
  Tag,
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

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProductForDetails, setSelectedProductForDetails] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);

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

  const restringingService = services.find((s) => s.code === 'RESTRINGING');

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
              id="restringing-cta-btn"
              variant="outline"
              size="sm"
              className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
              onClick={() => setRestringingModalOpen(true)}
            >
              <Wrench className="w-4 h-4 mr-2" />
              Book Racket Re-Stringing
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
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-surface-900 text-slate-400 hover:text-white border border-slate-800'
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
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-surface-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            id="member-shop-search-input"
            type="text"
            placeholder="Search gear, brand, racket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-surface-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Products Grid */}
      {catalogLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 rounded-2xl bg-surface-900/40 border border-slate-800/80 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 space-y-2">
          <Package className="w-8 h-8 text-slate-500 mx-auto" />
          <div className="text-sm font-bold text-slate-300">No items match your filter</div>
          <div className="text-xs text-slate-500">Try adjusting your category or search keywords</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((product) => {
            const isOut = product.overallStockStatus === 'OUT_OF_STOCK';
            const isLow = product.overallStockStatus === 'LOW_STOCK';
            const firstImg = product.images?.[0] || 'https://images.unsplash.com/photo-1613918108466-292b78a8ef95?w=600';

            return (
              <motion.div
                key={product.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                id={`product-card-${product.sku}`}
                data-testid={`product-card-${product.sku}`}
                className="group rounded-2xl bg-surface-900/80 border border-slate-800 hover:border-slate-700 overflow-hidden flex flex-col justify-between shadow-lg"
              >
                <div>
                  {/* Image container */}
                  <div className="relative h-48 bg-surface-950 overflow-hidden">
                    <img
                      src={firstImg}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />

                    {/* Stock status badge */}
                    <div className="absolute top-3 left-3">
                      <span
                        data-testid={`member-stock-badge-${product.sku}`}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-md ${
                          isOut
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                            : isLow
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40 animate-pulse'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </div>

                    {/* Brand Pill */}
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-slate-300 backdrop-blur-md border border-slate-700">
                        {product.brand}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-2">
                    <div className="text-[11px] uppercase font-bold text-emerald-400">
                      {product.category?.name || 'Equipment'}
                    </div>
                    <h3 className="font-bold text-white text-sm line-clamp-2 leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>

                    {/* Variant chips */}
                    {product.variants?.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-1">
                        {product.variants.slice(0, 4).map((v) => (
                          <span
                            key={v.id}
                            className="px-1.5 py-0.5 rounded bg-surface-950 border border-slate-800 text-[10px] text-slate-300 font-mono"
                          >
                            {v.size || v.color}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer price & detail button */}
                <div className="p-4 pt-0 border-t border-slate-800/60 mt-3 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Member Price</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-black text-emerald-400">
                        ${Number(product.basePrice * 0.8).toFixed(2)}
                      </span>
                      <span className="text-xs line-through text-slate-500">
                        ${Number(product.basePrice).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button
                    id={`view-details-${product.sku}`}
                    data-testid={`view-details-${product.sku}`}
                    size="xs"
                    variant="primary"
                    disabled={isOut}
                    onClick={() => {
                      setSelectedProductForDetails(product);
                      setSelectedVariantId(product.variants?.[0]?.id || null);
                    }}
                  >
                    {isOut ? 'Sold Out' : 'Details'}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

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
                variant="primary"
                onClick={() => {
                  addToast({
                    type: 'info',
                    title: 'Pro Shop Pickup Ready',
                    message: 'Visit the Pro Shop counter or scan this item for lightning checkout!',
                  });
                  setSelectedProductForDetails(null);
                }}
              >
                Inquire at Pro Shop
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
              <label className="block text-slate-300 font-bold mb-1">Turnaround:</label>
              <select
                value={restringForm.turnaroundType}
                onChange={(e) => setRestringForm({ ...restringForm, turnaroundType: e.target.value })}
                className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
              >
                <option value="STANDARD_3_DAYS">Standard (2-3 Days) — $25.00</option>
                <option value="NEXT_DAY">Next Day Priority — $30.00</option>
                <option value="SAME_DAY">Same Day Rush — $35.00</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Special Notes / Preferences:</label>
            <input
              type="text"
              placeholder="e.g. 4-knot pattern, string logo stencil..."
              value={restringForm.notes}
              onChange={(e) => setRestringForm({ ...restringForm, notes: e.target.value })}
              className="w-full px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="ghost" onClick={() => setRestringingModalOpen(false)}>
              Cancel
            </Button>
            <Button
              id="submit-restringing-ticket-btn"
              variant="primary"
              loading={restringingMutation.isPending}
              onClick={() => {
                if (!restringingService) {
                  addToast({ type: 'error', title: 'Service unavailable', message: 'Restringing service is not configured.' });
                  return;
                }
                restringingMutation.mutate({
                  serviceId: restringingService.id,
                  stringType: restringForm.stringType,
                  tensionLbs: parseFloat(restringForm.tensionLbs),
                  turnaroundType: restringForm.turnaroundType,
                  notes: restringForm.notes,
                });
              }}
            >
              Submit Ticket
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MemberShopPage;
