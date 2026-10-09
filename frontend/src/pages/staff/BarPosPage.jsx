import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coffee,
  UtensilsCrossed,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  Divide,
  CreditCard,
  DollarSign,
  QrCode,
  ShieldAlert,
  Lock,
  RefreshCw,
  Search,
  Sparkles,
  WifiOff,
  User,
  Users,
  ChevronRight,
  Send,
  Receipt,
  X,
} from 'lucide-react';
import { barApi } from '../../api/barApi';
import { membersApi } from '../../api/membersApi';
import { emitToast } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';

export const BarPosPage = () => {
  const { user } = useAuth();

  // State
  const [activeShift, setActiveShift] = useState(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [stationFilter, setStationFilter] = useState('ALL');

  // Active Tab & Cart
  const [currentTab, setCurrentTab] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [pendingItems, setPendingItems] = useState([]); // Items added in current ordering session before sending
  const [loadingTab, setLoadingTab] = useState(false);

  // Modals
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('1000.00');
  const [shiftStation, setShiftStation] = useState('BAR');

  const [newTabModal, setNewTabModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestIsUnder18, setGuestIsUnder18] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState([]);

  const [moveTableModal, setMoveTableModal] = useState(false);
  const [splitBillModal, setSplitBillModal] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [splitType, setSplitType] = useState('EQUAL');
  const [tabSplits, setTabSplits] = useState([]);

  const [voidModal, setVoidModal] = useState(false);
  const [voidItemTarget, setVoidItemTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('Customer changed mind');
  const [managerPin, setManagerPin] = useState('');

  const [settleModal, setSettleModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [tipInput, setTipInput] = useState('0');
  const [tenderedCash, setTenderedCash] = useState('');
  const [settleSplitId, setSettleSplitId] = useState(null);

  const [carryForwardModal, setCarryForwardModal] = useState(false);
  const [carryForwardReason, setCarryForwardReason] = useState('');

  // Safeguards & Alerts
  const [conflictWarning, setConflictWarning] = useState(null);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    loadActiveShift();
    loadCatalog();
    loadTables();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadActiveShift = async () => {
    try {
      setShiftLoading(true);
      const res = await barApi.getActiveShift();
      setActiveShift(res.data || res);
    } catch (err) {
      setActiveShift(null);
    } finally {
      setShiftLoading(false);
    }
  };

  const loadCatalog = async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        barApi.getCategories(),
        barApi.getMenuItems({ availableOnly: false }),
      ]);
      setCategories(catRes.data || catRes || []);
      setMenuItems(itemRes.data || itemRes || []);
    } catch (err) {
      emitToast({ type: 'error', title: 'Catalog Error', message: 'Failed to load menu items' });
    }
  };

  const loadTables = async () => {
    try {
      const res = await barApi.getTables();
      setTables(res.data || res || []);
    } catch (err) {
      console.error('Failed to load tables', err);
    }
  };

  const loadTabDetails = async (tabId) => {
    try {
      setLoadingTab(true);
      setConflictWarning(null);
      const res = await barApi.getTab(tabId);
      const data = res.data || res;
      setCurrentTab(data);
      setPendingItems([]);
    } catch (err) {
      emitToast({ type: 'error', title: 'Tab Error', message: 'Could not load tab details' });
    } finally {
      setLoadingTab(false);
    }
  };

  const handleTableClick = (table) => {
    setSelectedTable(table);
    if (table.currentTabId) {
      loadTabDetails(table.currentTabId);
    } else {
      setCurrentTab(null);
      setPendingItems([]);
      setNewTabModal(true);
    }
  };

  const handleOpenShift = async (e) => {
    e.preventDefault();
    try {
      const res = await barApi.openShift({
        openingCash: parseFloat(openingFloat) || 0,
        station: shiftStation,
        notes: 'Shift opened via POS interface',
      });
      setActiveShift(res.data || res);
      setOpenShiftModal(false);
      emitToast({ type: 'success', title: 'Shift Started', message: `Station ${shiftStation} opened with float ₹${openingFloat}` });
    } catch (err) {
      emitToast({ type: 'error', title: 'Shift Open Failed', message: err.response?.data?.message || err.message });
    }
  };

  const searchMembers = async (term) => {
    setMemberSearchTerm(term);
    if (!term || term.length < 2) {
      setMemberSearchResults([]);
      return;
    }
    try {
      const res = await membersApi.searchMembers(term);
      setMemberSearchResults(res.content || res.data || res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTab = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        tableId: selectedTable ? selectedTable.id : null,
        memberId: selectedMember ? selectedMember.id : null,
        guestName: guestName.trim() || (selectedMember ? selectedMember.fullName : 'Walk-in Guest'),
        guestIsUnder18: guestIsUnder18,
      };

      const res = await barApi.openTab(payload);
      const newTab = res.data || res;
      setCurrentTab(newTab);
      setNewTabModal(false);
      setGuestName('');
      setSelectedMember(null);
      loadTables();
      emitToast({ type: 'success', title: 'Tab Opened', message: `Tab #${newTab.tabNumber} started on ${selectedTable?.label || 'Counter'}` });
    } catch (err) {
      emitToast({
        type: 'error',
        title: 'Open Tab Rejected',
        message: err.response?.data?.message || err.message,
      });
    }
  };

  // Determine underage customer for age safeguards
  const isCustomerUnderage = useMemo(() => {
    if (!currentTab) return false;
    if (currentTab.guestIsUnder18) return true;
    if (currentTab.memberPlanCode === 'JUNIOR') return true;
    return false;
  }, [currentTab]);

  const handleAddItemToPending = (menuItem) => {
    if (!currentTab) {
      emitToast({ type: 'warning', title: 'No Tab Selected', message: 'Please select or open a table tab first.' });
      return;
    }

    if (!menuItem.isAvailable) {
      emitToast({ type: 'error', title: 'Unavailable', message: `${menuItem.name} is currently out of stock.` });
      return;
    }

    if (menuItem.isAlcoholic && isCustomerUnderage) {
      emitToast({
        type: 'error',
        title: 'Age Safeguard (18+)',
        message: `Alcoholic beverages cannot be ordered for Junior members or guests under 18!`,
      });
      return;
    }

    const existingIndex = pendingItems.findIndex((it) => it.menuItemId === menuItem.id);
    if (existingIndex > -1) {
      const updated = [...pendingItems];
      updated[existingIndex].qty += 1;
      setPendingItems(updated);
    } else {
      setPendingItems([
        ...pendingItems,
        {
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          taxCategory: menuItem.taxCategory,
          station: menuItem.prepStation,
          isAlcoholic: menuItem.isAlcoholic,
          qty: 1,
          notes: '',
        },
      ]);
    }
  };

  const handleUpdatePendingQty = (index, delta) => {
    const updated = [...pendingItems];
    const newQty = updated[index].qty + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].qty = newQty;
    }
    setPendingItems(updated);
  };

  const handleSendOrder = async () => {
    if (!currentTab || pendingItems.length === 0) return;

    const payload = {
      version: currentTab.version,
      items: pendingItems.map((p) => ({
        menuItemId: p.menuItemId,
        qty: p.qty,
        notes: p.notes,
      })),
    };

    const idempotencyKey = `TAB-ORDER-${currentTab.id}-${Date.now()}`;

    try {
      const res = await barApi.addItemsToTab(currentTab.id, payload, idempotencyKey);
      const updated = res.data || res;
      setCurrentTab(updated);
      setPendingItems([]);
      setConflictWarning(null);
      loadTables();
      emitToast({
        type: 'success',
        title: 'Order Sent to Kitchen & Bar',
        message: `Tickets fired successfully for Tab #${updated.tabNumber}`,
      });
    } catch (err) {
      const errCode = err.response?.data?.code;
      if (errCode === 'CONCURRENT_EDIT_CONFLICT' || err.response?.status === 409) {
        setConflictWarning('Optimistic Concurrency Conflict: Another staff member modified this tab simultaneously. Please reload the latest tab state.');
      } else {
        emitToast({
          type: 'error',
          title: 'Order Send Failed',
          message: err.response?.data?.message || err.message,
        });
      }
    }
  };

  const handleVoidItemClick = (item) => {
    setVoidItemTarget(item);
    setVoidReason('Customer changed mind');
    setManagerPin('');
    setVoidModal(true);
  };

  const handleConfirmVoid = async () => {
    if (!voidItemTarget || !currentTab) return;

    try {
      const payload = {
        reason: voidReason,
        managerPin: voidItemTarget.status === 'SERVED' ? managerPin : null,
      };

      const res = await barApi.voidTabItem(currentTab.id, voidItemTarget.id, payload);
      const updated = res.data || res;
      setCurrentTab(updated);
      setVoidModal(false);
      loadTables();
      emitToast({
        type: 'success',
        title: 'Item Voided',
        message: `Voided ${voidItemTarget.itemName} from tab #${updated.tabNumber}`,
      });
    } catch (err) {
      emitToast({
        type: 'error',
        title: 'Void Rejected',
        message: err.response?.data?.message || err.message,
      });
    }
  };

  const handleMoveTable = async (targetTable) => {
    if (!currentTab) return;
    try {
      await barApi.moveTabTable(currentTab.id, targetTable.id);
      setMoveTableModal(false);
      loadTables();
      loadTabDetails(currentTab.id);
      emitToast({
        type: 'success',
        title: 'Table Moved',
        message: `Tab #${currentTab.tabNumber} moved to Table ${targetTable.label}`,
      });
    } catch (err) {
      emitToast({
        type: 'error',
        title: 'Move Failed',
        message: err.response?.data?.message || err.message,
      });
    }
  };

  const handleCalculateSplit = async () => {
    if (!currentTab) return;
    try {
      const res = await barApi.splitBill(currentTab.id, {
        splitType: 'EQUAL',
        splitCount: parseInt(splitCount, 10),
      });
      setTabSplits(res.data || res || []);
      emitToast({
        type: 'success',
        title: 'Bill Split Calculated',
        message: `Generated ${splitCount}-way penny-exact splits`,
      });
    } catch (err) {
      emitToast({
        type: 'error',
        title: 'Split Failed',
        message: err.response?.data?.message || err.message,
      });
    }
  };

  const handleSettleTab = async () => {
    if (!currentTab) return;
    try {
      const payload = {
        paymentMethod: paymentMethod,
        tipAmount: parseFloat(tipInput) || 0,
        splitId: settleSplitId,
        paidAmount: settleSplitId
          ? undefined
          : currentTab.totalAmount + (parseFloat(tipInput) || 0),
        notes: `Settled via POS by ${user?.fullName || 'Bar Staff'}`,
      };

      const idempotencyKey = `TAB-SETTLE-${currentTab.id}-${Date.now()}`;
      const res = await barApi.settleTab(currentTab.id, payload, idempotencyKey);
      const settled = res.data || res;

      setSettleModal(false);
      setCurrentTab(null);
      setSelectedTable(null);
      loadTables();

      emitToast({
        type: 'success',
        title: 'Tab Settled & Table Released',
        message: `Tab #${settled.tabNumber} paid in full via ${paymentMethod}`,
      });
    } catch (err) {
      emitToast({
        type: 'error',
        title: 'Settlement Failed',
        message: err.response?.data?.message || err.message,
      });
    }
  };

  const handleCarryForward = async () => {
    if (!currentTab) return;
    if (!carryForwardReason.trim()) {
      emitToast({ type: 'warning', title: 'Reason Required', message: 'Please provide a carry forward reason' });
      return;
    }

    try {
      await barApi.carryForwardTab(currentTab.id, carryForwardReason.trim());
      setCarryForwardModal(false);
      setCurrentTab(null);
      loadTables();
      emitToast({
        type: 'success',
        title: 'Tab Carried Forward',
        message: `Tab #${currentTab.tabNumber} marked carried forward for next shift`,
      });
    } catch (err) {
      emitToast({
        type: 'error',
        title: 'Action Failed',
        message: err.response?.data?.message || err.message,
      });
    }
  };

  // Filtered menu
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category?.id !== selectedCategory) return false;
      if (stationFilter !== 'ALL' && item.prepStation !== stationFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.taxCategory.toLowerCase().includes(q);
      }
      return true;
    });
  }, [menuItems, selectedCategory, stationFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* 1. Header & Shift Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl glass-card bg-surface-950/80 border-slate-700/60 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-surface-950 shadow-lg shadow-amber-500/20">
            <Coffee className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">Bar & Cafeteria POS</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Tablet Mode
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live orders, table map, kitchen dispatch, automatic plan discounts & age safeguards
            </p>
          </div>
        </div>

        {/* Shift status & controls */}
        <div className="flex items-center gap-3">
          {activeShift ? (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-2xl">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-left">
                <div className="text-xs font-black text-emerald-300 uppercase tracking-wide">
                  Shift Active ({activeShift.station})
                </div>
                <div className="text-[11px] text-slate-300">
                  Float: ₹{Number(activeShift.openingCash || 0).toFixed(2)} | Cash: ₹{Number(activeShift.cashCollected || 0).toFixed(2)}
                </div>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={Clock}
              onClick={() => setOpenShiftModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-surface-950 font-black shadow-lg shadow-amber-500/25"
            >
              Clock In / Open Shift
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={() => {
              loadTables();
              if (currentTab) loadTabDetails(currentTab.id);
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Offline Banner */}
      {isOffline && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-between text-rose-300">
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 animate-pulse" />
            <div>
              <div className="text-xs font-black uppercase tracking-wider">Network Disconnected</div>
              <div className="text-xs text-slate-300">Working in offline mode. Orders will queue and resend idempotently.</div>
            </div>
          </div>
        </div>
      )}

      {/* Optimistic Conflict Alert Banner */}
      {conflictWarning && (
        <div className="p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-between text-amber-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div className="text-xs font-semibold">{conflictWarning}</div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => currentTab && loadTabDetails(currentTab.id)}
            className="border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
          >
            Load Latest State
          </Button>
        </div>
      )}

      {/* Main POS Interface Grid: Left (Tables + Menu Catalog) | Right (Active Tab Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Table Map & Menu Touch Catalog */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Table Map Grid */}
          <div className="glass-card rounded-3xl p-5 bg-surface-950/80 border-slate-700/60 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Floor Plan & Tables</h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                icon={Plus}
                onClick={() => {
                  setSelectedTable(null);
                  setCurrentTab(null);
                  setNewTabModal(true);
                }}
                className="text-amber-400 hover:text-amber-300"
              >
                + Direct Walk-in Tab
              </Button>
            </div>

            {/* Table Cards */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {tables.map((t) => {
                const isSelected = selectedTable?.id === t.id;
                const isOccupied = t.status === 'OCCUPIED';

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTableClick(t)}
                    className={`p-3.5 rounded-2xl text-left transition relative flex flex-col justify-between h-24 border ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/30'
                        : isOccupied
                        ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10'
                        : 'border-slate-800 bg-surface-900/60 hover:bg-surface-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-base font-black text-white">{t.label}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOccupied ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                        }`}
                      />
                    </div>

                    <div className="text-[10px] space-y-0.5">
                      <div className="text-slate-400">{t.seats} seats</div>
                      {isOccupied && (
                        <div className="font-bold text-amber-300 truncate">
                          ₹{Number(t.currentTabTotal || 0).toFixed(0)}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Menu Catalog Filters & Search */}
          <div className="glass-card rounded-3xl p-5 bg-surface-950/80 border-slate-700/60 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 ${
                    selectedCategory === 'ALL'
                      ? 'bg-amber-500 text-surface-950'
                      : 'bg-surface-900 text-slate-300 hover:bg-surface-800 border border-slate-800'
                  }`}
                >
                  All Items
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 ${
                      selectedCategory === c.id
                        ? 'bg-amber-500 text-surface-950'
                        : 'bg-surface-900 text-slate-300 hover:bg-surface-800 border border-slate-800'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {/* Station Toggle (Kitchen / Bar) */}
              <div className="flex items-center gap-1 bg-surface-900 p-1 rounded-xl border border-slate-800 shrink-0">
                {['ALL', 'BAR', 'KITCHEN'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStationFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition ${
                      stationFilter === st
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search menu items (beer, sandwich, mocktail, pasta)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Menu Items Touch Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredMenuItems.map((item) => {
                const isAlcoholBlocked = item.isAlcoholic && isCustomerUnderage;

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.isAvailable || isAlcoholBlocked}
                    onClick={() => handleAddItemToPending(item)}
                    className={`p-3.5 rounded-2xl text-left border transition relative flex flex-col justify-between min-h-[110px] group ${
                      !item.isAvailable
                        ? 'opacity-40 border-slate-800 bg-surface-900 cursor-not-allowed'
                        : isAlcoholBlocked
                        ? 'opacity-50 border-rose-500/30 bg-rose-500/5 cursor-not-allowed'
                        : 'border-slate-800 bg-surface-900/60 hover:bg-surface-800/90 hover:border-amber-500/40 active:scale-[0.98]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-black text-white group-hover:text-amber-300 transition line-clamp-1">
                          {item.name}
                        </span>
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                            item.prepStation === 'BAR'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : 'bg-orange-500/20 text-orange-300'
                          }`}
                        >
                          {item.prepStation}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.taxCategory}</div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-black text-amber-400">
                        ₹{Number(item.price).toFixed(2)}
                      </span>

                      {item.isAlcoholic && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                          18+ Alc
                        </span>
                      )}
                    </div>

                    {isAlcoholBlocked && (
                      <div className="absolute inset-0 bg-surface-950/80 backdrop-blur-[1px] rounded-2xl flex items-center justify-center p-2 text-center">
                        <span className="text-[10px] font-black text-rose-400 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> Under 18 Blocked
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Active Tab & Sidebar Detail */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="glass-card rounded-3xl p-5 bg-surface-950/90 border-slate-700/70 shadow-2xl space-y-5 sticky top-6">
            {/* Tab Header Info */}
            {currentTab ? (
              <div className="space-y-3 pb-3 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black">
                      #{currentTab.tabNumber}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {currentTab.tableLabel ? `Table ${currentTab.tableLabel}` : 'Counter Tab'}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      currentTab.status === 'OPEN'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {currentTab.status}
                  </span>
                </div>

                {/* Customer / Member Info */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-200">
                      {currentTab.memberName || currentTab.guestName || 'Guest'}
                    </span>
                    {currentTab.memberPlanCode && (
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-black">
                        {currentTab.memberPlanCode} Plan
                      </span>
                    )}
                  </div>
                  {isCustomerUnderage && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[9px] font-black">
                      Under 18
                    </span>
                  )}
                </div>

                {/* Top Action Pills: Move Table | Split | Carry Forward */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setMoveTableModal(true)}
                    className="flex-1 px-2.5 py-1 rounded-xl bg-surface-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <ArrowRightLeft className="w-3 h-3 text-cyan-400" /> Move Table
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSplitBillModal(true);
                      handleCalculateSplit();
                    }}
                    className="flex-1 px-2.5 py-1 rounded-xl bg-surface-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Divide className="w-3 h-3 text-amber-400" /> Split Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => setCarryForwardModal(true)}
                    className="flex-1 px-2.5 py-1 rounded-xl bg-surface-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Clock className="w-3 h-3 text-violet-400" /> Carry Over
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 border-b border-slate-800">
                <Coffee className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-300">No Open Tab Active</h4>
                <p className="text-xs text-slate-500 mt-0.5">Select an occupied table or tap "+ Direct Walk-in Tab"</p>
              </div>
            )}

            {/* Line Items List */}
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {/* Confirmed Tab Items */}
              {currentTab?.items?.map((item) => (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                    item.status === 'VOID'
                      ? 'bg-rose-500/5 border-rose-500/20 opacity-40 line-through'
                      : 'bg-surface-900/70 border-slate-800/80'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{item.itemName}</span>
                      <span className="text-[10px] text-slate-400">×{item.qty}</span>
                      <span
                        className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase ${
                          item.status === 'READY'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : item.status === 'PREPARING'
                            ? 'bg-amber-500/20 text-amber-300'
                            : item.status === 'SERVED'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : item.status === 'VOID'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    {item.discountAmount > 0 && (
                      <div className="text-[10px] text-emerald-400">
                        Plan Discount: -₹{Number(item.discountAmount).toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">
                      ₹{Number(item.lineTotal).toFixed(2)}
                    </span>
                    {item.status !== 'VOID' && currentTab.status === 'OPEN' && (
                      <button
                        type="button"
                        onClick={() => handleVoidItemClick(item)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Void item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Pending / Unsent Items (staged for sending to kitchen) */}
              {pendingItems.length > 0 && (
                <div className="pt-2 border-t border-dashed border-amber-500/30">
                  <div className="text-[10px] font-black text-amber-400 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                    <span>New Unsent Lines</span>
                    <span>Tap Send to dispatch</span>
                  </div>
                  {pendingItems.map((p, idx) => (
                    <div
                      key={p.menuItemId}
                      className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs mb-1.5"
                    >
                      <div>
                        <span className="font-bold text-amber-200">{p.name}</span>
                        <div className="text-[10px] text-amber-400/80">₹{p.price} each ({p.station})</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-surface-950 rounded-lg p-0.5 border border-amber-500/40">
                          <button
                            type="button"
                            onClick={() => handleUpdatePendingQty(idx, -1)}
                            className="p-1 text-slate-300 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-1 font-bold text-white text-xs">{p.qty}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdatePendingQty(idx, 1)}
                            className="p-1 text-slate-300 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-black text-amber-300">
                          ₹{(p.price * p.qty).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Summary */}
            {currentTab && (
              <div className="space-y-1.5 pt-3 border-t border-slate-800 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>₹{Number(currentTab.subtotal || 0).toFixed(2)}</span>
                </div>

                {currentTab.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-400 font-medium">
                    <span>Member Plan Discount</span>
                    <span>-₹{Number(currentTab.discountAmount || 0).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-400">
                  <span>GST Tax</span>
                  <span>₹{Number(currentTab.taxAmount || 0).toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                  <span>Running Total</span>
                  <span className="text-amber-400">₹{Number(currentTab.totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {pendingItems.length > 0 && (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  icon={Send}
                  onClick={handleSendOrder}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-surface-950 font-black shadow-lg shadow-amber-500/25"
                >
                  Send to Kitchen/Bar ({pendingItems.length} lines)
                </Button>
              )}

              {currentTab && currentTab.status === 'OPEN' && (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  icon={Receipt}
                  onClick={() => setSettleModal(true)}
                  disabled={!currentTab.items || currentTab.items.filter((i) => i.status !== 'VOID').length === 0}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-surface-950 font-black shadow-lg shadow-emerald-500/25"
                >
                  Settle Tab (₹{Number(currentTab.totalAmount || 0).toFixed(2)})
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Open Shift Modal */}
      {openShiftModal && (
        <div className="fixed inset-0 z-50 bg-surface-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 bg-surface-950 border-slate-700 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" /> Start Staff Shift
            </h3>
            <p className="text-xs text-slate-400">
              An active open shift is required before serving orders. Count and enter the cash drawer float.
            </p>

            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Station</label>
                <select
                  value={shiftStation}
                  onChange={(e) => setShiftStation(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="BAR">BAR</option>
                  <option value="KITCHEN">KITCHEN</option>
                  <option value="CAFETERIA">CAFETERIA</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Opening Cash Float (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpenShiftModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="bg-amber-500 text-surface-950 font-bold">
                  Confirm Clock-in
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Tab Modal */}
      {newTabModal && (
        <div className="fixed inset-0 z-50 bg-surface-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 bg-surface-950 border-slate-700 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Coffee className="w-5 h-5 text-amber-400" /> Open New Tab
              </h3>
              <button
                type="button"
                onClick={() => setNewTabModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTab} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Table</label>
                <div className="text-sm font-bold text-amber-400 mt-0.5">
                  {selectedTable ? `Table ${selectedTable.label} (${selectedTable.seats} Seats)` : 'Bar Counter (Walk-in)'}
                </div>
              </div>

              {/* Member Search */}
              <div>
                <label className="text-xs font-bold text-slate-300">Club Member (Optional for Auto Discount)</label>
                <input
                  type="text"
                  placeholder="Search member by name or number..."
                  value={memberSearchTerm}
                  onChange={(e) => searchMembers(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-xs text-white"
                />

                {memberSearchResults.length > 0 && (
                  <div className="mt-1 max-h-32 overflow-y-auto bg-surface-900 border border-slate-800 rounded-xl p-1 space-y-1">
                    {memberSearchResults.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMember(m);
                          setMemberSearchResults([]);
                          setMemberSearchTerm('');
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-surface-800 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-white">{m.fullName} ({m.memberNo})</span>
                        <span className="text-[10px] text-cyan-400 font-bold">{m.planName}</span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedMember && (
                  <div className="mt-2 p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-cyan-200">{selectedMember.fullName}</span>
                      <div className="text-[10px] text-slate-300">Auto Plan Bar Discount applies</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMember(null)}
                      className="text-rose-400 hover:text-rose-300 font-bold text-[10px]"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {!selectedMember && (
                <div>
                  <label className="text-xs font-bold text-slate-300">Guest Name</label>
                  <input
                    type="text"
                    placeholder="Guest name (e.g. John Doe)"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              )}

              {/* Under 18 toggle */}
              <div className="p-3 rounded-xl bg-surface-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Under 18 Age Safeguard</div>
                  <div className="text-[10px] text-slate-400">Disables alcoholic beverage ordering server-side</div>
                </div>
                <input
                  type="checkbox"
                  checked={guestIsUnder18}
                  onChange={(e) => setGuestIsUnder18(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setNewTabModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="bg-amber-500 text-surface-950 font-bold">
                  Open Tab
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Table Modal */}
      {moveTableModal && (
        <div className="fixed inset-0 z-50 bg-surface-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 bg-surface-950 border-slate-700 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-cyan-400" /> Move Tab to Table
            </h3>
            <p className="text-xs text-slate-400">
              Select an available FREE table to transfer Tab #{currentTab?.tabNumber}.
            </p>

            <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {tables
                .filter((t) => t.status === 'FREE')
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleMoveTable(t)}
                    className="p-3 rounded-xl bg-surface-900 border border-slate-800 hover:border-cyan-400 hover:bg-cyan-500/10 text-center transition"
                  >
                    <div className="font-bold text-white text-sm">{t.label}</div>
                    <div className="text-[10px] text-slate-400">{t.seats} seats</div>
                  </button>
                ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setMoveTableModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Split Bill Modal */}
      {splitBillModal && (
        <div className="fixed inset-0 z-50 bg-surface-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 bg-surface-950 border-slate-700 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Divide className="w-5 h-5 text-amber-400" /> Split Tab #{currentTab?.tabNumber}
              </h3>
              <button type="button" onClick={() => setSplitBillModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300">Number of Ways (Equal Split)</label>
              <div className="flex items-center gap-2 mt-2">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setSplitCount(num);
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition ${
                      splitCount === num
                        ? 'bg-amber-500 text-surface-950'
                        : 'bg-surface-900 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {num}-Way
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCalculateSplit}
              className="w-full border-amber-500/40 text-amber-300"
            >
              Recompute Penny-Exact Breakdown
            </Button>

            {/* Split breakdown table */}
            {tabSplits.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <div className="text-xs font-bold text-slate-300">Penny-Exact Breakdown:</div>
                <div className="bg-surface-900 rounded-xl p-3 border border-slate-800 space-y-1.5">
                  {tabSplits.map((sp) => (
                    <div key={sp.id || sp.splitNumber} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Split #{sp.splitNumber}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-amber-400">₹{Number(sp.amount).toFixed(2)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            setSettleSplitId(sp.id);
                            setSplitBillModal(false);
                            setSettleModal(true);
                          }}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300"
                        >
                          Settle Split
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Line Void Modal with Manager PIN */}
      {voidModal && (
        <div className="fixed inset-0 z-50 bg-surface-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 bg-surface-950 border-slate-700 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-rose-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Void Line Item
            </h3>
            <p className="text-xs text-slate-300">
              Voiding: <span className="font-bold text-white">{voidItemTarget?.itemName}</span> (Status: {voidItemTarget?.status})
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300">Reason</label>
                <select
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="Customer changed mind">Customer changed mind</option>
                  <option value="Incorrect entry by waiter">Incorrect entry by waiter</option>
                  <option value="Quality complaint">Quality complaint</option>
                  <option value="Kitchen out of ingredient">Kitchen out of ingredient</option>
                </select>
              </div>

              {voidItemTarget?.status === 'SERVED' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                    <Lock className="w-4 h-4" /> Manager Authorization Required
                  </div>
                  <p className="text-[10px] text-slate-400">
                    This item is already served. Enter Manager PIN (default: 8888) to approve void.
                  </p>
                  <input
                    type="password"
                    placeholder="Enter Manager PIN..."
                    value={managerPin}
                    onChange={(e) => setManagerPin(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-950 border border-slate-800 rounded-xl text-xs text-white focus:border-amber-400"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setVoidModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleConfirmVoid}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                Confirm Void
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Tab Modal */}
      {settleModal && (
        <div className="fixed inset-0 z-50 bg-surface-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 bg-surface-950 border-slate-700 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-400" /> Settle Bill
            </h3>

            <div className="p-3 rounded-2xl bg-surface-900 border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Total Payable</span>
              <span className="text-xl font-black text-emerald-400">
                ₹{Number(currentTab?.totalAmount || 0).toFixed(2)}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300">Payment Method</label>
                <div className="grid grid-cols-4 gap-2 mt-1.5">
                  {[
                    { id: 'UPI', icon: QrCode, label: 'UPI' },
                    { id: 'CARD', icon: CreditCard, label: 'Card' },
                    { id: 'CASH', icon: DollarSign, label: 'Cash' },
                    { id: 'WALLET', icon: Sparkles, label: 'Wallet' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                        paymentMethod === m.id
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 font-bold'
                          : 'border-slate-800 bg-surface-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      <m.icon className="w-4 h-4" />
                      <span className="text-[10px]">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tip Input */}
              <div>
                <label className="text-xs font-bold text-slate-300">Optional Tip (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={tipInput}
                  onChange={(e) => setTipInput(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              {paymentMethod === 'CASH' && (
                <div>
                  <label className="text-xs font-bold text-slate-300">Cash Tendered (₹)</label>
                  <input
                    type="number"
                    step="10"
                    placeholder="Enter cash handed over..."
                    value={tenderedCash}
                    onChange={(e) => setTenderedCash(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-xs text-white"
                  />
                  {parseFloat(tenderedCash) >= (currentTab?.totalAmount || 0) && (
                    <div className="mt-1 text-xs text-emerald-400 font-bold">
                      Change Due: ₹{(parseFloat(tenderedCash) - currentTab.totalAmount).toFixed(2)}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setSettleModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSettleTab}
                className="bg-emerald-500 hover:bg-emerald-400 text-surface-950 font-black shadow-lg shadow-emerald-500/20"
              >
                Complete Payment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Carry Forward Modal */}
      {carryForwardModal && (
        <div className="fixed inset-0 z-50 bg-surface-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 bg-surface-950 border-slate-700 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-violet-400 flex items-center gap-2">
              <Clock className="w-5 h-5" /> Carry Forward Open Tab
            </h3>
            <p className="text-xs text-slate-300">
              Carry forward Tab #{currentTab?.tabNumber} to the next shift or day close.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-300">Carry Forward Reason</label>
              <textarea
                rows={3}
                required
                placeholder="Reason (e.g. VIP member requested late night lounge tab extension)..."
                value={carryForwardReason}
                onChange={(e) => setCarryForwardReason(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setCarryForwardModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCarryForward}
                className="bg-violet-600 hover:bg-violet-500 text-white font-bold"
              >
                Approve Carry Forward
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarPosPage;
