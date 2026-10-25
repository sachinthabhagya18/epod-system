// app/dashboard/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Truck,
  Plus,
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  ExternalLink,
  RefreshCw,
  Trash2,
  UserCheck,
  Store,
  Sparkles,
  Eye,
  Download,
  Calendar,
  Search,
  ChevronDown,
  Radio,
  X,
} from 'lucide-react';

interface DeliveryItem {
  id: string;
  productCode: string | null;
  productName: string;
  orderedQty: number;
  receivedQty: number | null;
  shortageQty: number;
  damageQty: number;
  discrepancyReason: string | null;
}

interface Delivery {
  id: string;
  stopOrder: number;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string | null;
  status: 'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'DISCREPANCY' | 'CANCELLED';
  dispatchedAt: string;
  deliveredAt: string | null;
  signedInvoicePhotoUrl: string | null;
  receiverName: string | null;
  remarks: string | null;
  items: DeliveryItem[];
}

interface DispatchRun {
  id: string;
  runNumber: string;
  deliveryDate: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string | null;
  routeName: string | null;
  deliveries: Delivery[];
}

export default function DashboardPage() {
  const [runs, setRuns] = useState<DispatchRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Delivery | null>(null);

  // Filter States
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [driverFilter, setDriverFilter] = useState<string>('');
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Real-Time Auto-Refresh State
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastSynced, setLastSynced] = useState<string>('');

  const fetchRuns = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/runs', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setRuns(data);
        setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial load + 5-second Real-Time Polling
  useEffect(() => {
    fetchRuns(false);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchRuns(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Close driver dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDriverDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyDriverRunLink = (runId: string) => {
    const url = `${window.location.origin}/driver/${runId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(runId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteRun = async (id: string, vehicle: string) => {
    if (!window.confirm(`Delete dispatch sheet for vehicle ${vehicle}?`)) return;
    await fetch(`/api/runs?id=${id}`, { method: 'DELETE' });
    fetchRuns(true);
  };

  const handleDownloadInvoice = (photoUrl: string, invoiceNo: string) => {
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = `Signed_Invoice_${invoiceNo}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Unique driver names for the searchable dropdown
  const uniqueDrivers = Array.from(new Set(runs.map((r) => r.driverName).filter(Boolean))).sort();
  const matchingDrivers = uniqueDrivers.filter((d) =>
    d.toLowerCase().includes(driverFilter.trim().toLowerCase())
  );

  // Filtered runs by Date and Driver Name
  const filteredRuns = runs.filter((run) => {
    const runDateStr = new Date(run.deliveryDate).toISOString().split('T')[0];
    const matchesDate = !selectedDate || runDateStr === selectedDate;
    const matchesDriver =
      !driverFilter.trim() ||
      run.driverName.toLowerCase().includes(driverFilter.trim().toLowerCase()) ||
      run.vehicleNumber.toLowerCase().includes(driverFilter.trim().toLowerCase());
    return matchesDate && matchesDriver;
  });

  const allDeliveries = filteredRuns.flatMap((r) => r.deliveries);
  const totalStops = allDeliveries.length;
  const completedStops = allDeliveries.filter((d) => d.status === 'DELIVERED').length;
  const discrepancyStops = allDeliveries.filter((d) => d.status === 'DISCREPANCY').length;
  const pendingStops = allDeliveries.filter((d) => d.status === 'DISPATCHED' || d.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-6 h-6 text-teal-600" /> George Steuart e-POD & Fleet Portal
              </h1>
              {/* Live Real-time Indicator */}
              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                  autoRefresh
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
                title="Click to toggle automatic 5-second live updates"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
                  }`}
                />
                {autoRefresh ? 'LIVE AUTO-SYNC ON' : 'AUTO-SYNC PAUSED'}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-Time Driver Route Tracking & Signed Invoice Verification{' '}
              {lastSynced && <span className="text-slate-400">• Last synced: {lastSynced}</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/products"
              className="px-3 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Package className="w-4 h-4 text-teal-600" /> Products
            </Link>
            <Link
              href="/drivers"
              className="px-3 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4 text-teal-600" /> Drivers
            </Link>
            <Link
              href="/customers"
              className="px-3 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Store className="w-4 h-4 text-teal-600" /> Outlets
            </Link>
            <Link
              href="/runs/new"
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-4 h-4" /> Scan Vehicle Sheet
            </Link>
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Filtered Outlet Stops</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalStops}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Pending / In Transit
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{pendingStops}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Full Complete
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{completedStops}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-rose-600 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Shortage / Damage
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{discrepancyStops}</p>
          </div>
        </div>

        {/* Filter Bar: Date Filter + Searchable Driver Combobox + Refresh */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* 1. Date Filter */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-slate-400">Filter by Date</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="p-1 text-slate-400 hover:text-rose-600"
                  title="Clear Date Filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Searchable Driver Combobox Dropdown */}
            <div ref={dropdownRef} className="relative flex-1 max-w-sm">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-teal-500 focus-within:bg-white">
                <Search className="w-4 h-4 text-teal-600 shrink-0" />
                <div className="flex-1">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">
                    Filter by Driver / Vehicle
                  </span>
                  <input
                    type="text"
                    placeholder="Type driver name or select..."
                    value={driverFilter}
                    onFocus={() => setDriverDropdownOpen(true)}
                    onChange={(e) => {
                      setDriverFilter(e.target.value);
                      setDriverDropdownOpen(true);
                    }}
                    className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                </div>
                {driverFilter ? (
                  <button
                    type="button"
                    onClick={() => setDriverFilter('')}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDriverDropdownOpen(!driverDropdownOpen)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdown Menu */}
              {driverDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-40 max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setDriverFilter('');
                      setDriverDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-teal-50 font-semibold text-teal-700"
                  >
                    All Drivers ({uniqueDrivers.length})
                  </button>
                  {matchingDrivers.length === 0 ? (
                    <div className="px-3.5 py-3 text-slate-400 italic">No matching driver found</div>
                  ) : (
                    matchingDrivers.map((dName) => (
                      <button
                        key={dName}
                        type="button"
                        onClick={() => {
                          setDriverFilter(dName);
                          setDriverDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 hover:bg-teal-50 flex items-center justify-between ${
                          driverFilter.toLowerCase() === dName.toLowerCase()
                            ? 'bg-teal-50/70 font-bold text-teal-800'
                            : 'text-slate-700 font-medium'
                        }`}
                      >
                        <span>{dName}</span>
                        <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(selectedDate || driverFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDate('');
                  setDriverFilter('');
                }}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition"
              >
                Reset Filters
              </button>
            )}
            <button
              onClick={() => fetchRuns(false)}
              className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 flex items-center justify-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-teal-400" /> Refresh Now
            </button>
          </div>
        </div>

        {/* Vehicle Dispatch Runs List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Vehicle Dispatch Sheets ({filteredRuns.length})
            </h2>
          </div>

          {loading ? (
            <div className="bg-white p-12 rounded-2xl border text-center text-slate-400 text-sm">
              Loading vehicle dispatch runs...
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border text-center space-y-3">
              <Truck className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500">
                No dispatch sheets match the selected date or driver filter.
              </p>
            </div>
          ) : (
            filteredRuns.map((run) => {
              const doneCount = run.deliveries.filter(
                (d) => d.status === 'DELIVERED' || d.status === 'DISCREPANCY'
              ).length;

              return (
                <div key={run.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono text-xs font-bold">
                        {run.vehicleNumber}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold">
                          Driver: {run.driverName}{' '}
                          {run.driverPhone && (
                            <span className="text-xs font-mono text-teal-300 ml-1">({run.driverPhone})</span>
                          )}
                          <span className="text-slate-400 font-normal">
                            {' '}
                            • {run.routeName || 'Standard Route'}
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Date: {new Date(run.deliveryDate).toLocaleDateString('en-GB')} • Progress: {doneCount}/
                          {run.deliveries.length} Outlets
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyDriverRunLink(run.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                      >
                        <Copy className="w-3.5 h-3.5 text-teal-400" />
                        {copiedId === run.id ? 'Driver Link Copied!' : 'Copy Driver Link'}
                      </button>

                      <Link
                        href={`/driver/${run.id}`}
                        target="_blank"
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open Driver View
                      </Link>

                      <button
                        onClick={() => handleDeleteRun(run.id, run.vehicleNumber)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                        title="Delete Run"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stops Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b">
                          <th className="py-2.5 px-4 w-12">#</th>
                          <th className="py-2.5 px-4">Invoice No</th>
                          <th className="py-2.5 px-4">Customer / Outlet Name</th>
                          <th className="py-2.5 px-4">Outlet Phone</th>
                          <th className="py-2.5 px-4">Products Summary</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4 text-center">Invoice Proof & Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {run.deliveries.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-400">{d.stopOrder}</td>
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{d.invoiceNumber}</td>
                            <td className="py-2.5 px-4 font-semibold text-slate-800">{d.customerName}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">
                              {d.customerPhone || <span className="text-slate-300">-</span>}
                            </td>
                            <td className="py-2.5 px-4">
                              {d.items && d.items.length > 0 ? (
                                <span className="font-medium text-slate-700">
                                  {d.items.length} Products Recorded
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Pending scan</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              {d.status === 'DELIVERED' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ✓ Full Complete
                                </span>
                              )}
                              {d.status === 'DISCREPANCY' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  ⚠ Shortage / Damage
                                </span>
                              )}
                              {(d.status === 'DISPATCHED' || d.status === 'PENDING') && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  In Transit
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {d.signedInvoicePhotoUrl ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => setPreviewInvoice(d)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg font-bold text-[11px] hover:bg-teal-100 transition"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> View
                                  </button>

                                  <button
                                    onClick={() => handleDownloadInvoice(d.signedInvoicePhotoUrl!, d.invoiceNumber)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white rounded-lg font-bold text-[11px] hover:bg-slate-800 transition"
                                    title="Download Signed Tax Invoice Image"
                                  >
                                    <Download className="w-3.5 h-3.5 text-teal-400" /> Download
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-300 italic">Awaiting Driver Upload</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: View Uploaded Signed Tax Invoice Photo + Extracted Products Table + Download Action */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Signed Tax Invoice • {previewInvoice.invoiceNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {previewInvoice.customerName}{' '}
                  {previewInvoice.customerPhone && `(${previewInvoice.customerPhone})`} • Delivered:{' '}
                  {previewInvoice.deliveredAt && new Date(previewInvoice.deliveredAt).toLocaleString('en-GB')}
                </p>
              </div>
              <button
                onClick={() => setPreviewInvoice(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 space-y-3">
                <div className="bg-slate-900 rounded-2xl p-2 flex items-center justify-center">
                  {previewInvoice.signedInvoicePhotoUrl && (
                    <img
                      src={previewInvoice.signedInvoicePhotoUrl}
                      alt="Signed Tax Invoice"
                      className="max-h-[58vh] mx-auto object-contain rounded-xl"
                    />
                  )}
                </div>

                {previewInvoice.signedInvoicePhotoUrl && (
                  <button
                    onClick={() =>
                      handleDownloadInvoice(previewInvoice.signedInvoicePhotoUrl!, previewInvoice.invoiceNumber)
                    }
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <Download className="w-4 h-4" /> Download Signed Invoice Photo
                  </button>
                )}
              </div>

              <div className="lg:col-span-7 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Invoice Products & Delivery Verification ({previewInvoice.items?.length || 0} Items)
                </h4>

                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b">
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3">Product Name</th>
                        <th className="py-2 px-3 text-right">Invoiced</th>
                        <th className="py-2 px-3 text-right">Delivered</th>
                        <th className="py-2 px-3 text-center">Status / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {previewInvoice.items?.map((item) => {
                        const isFull = item.shortageQty === 0 && item.damageQty === 0;
                        return (
                          <tr key={item.id}>
                            <td className="py-2 px-3 font-mono text-teal-700 font-semibold">
                              {item.productCode || '-'}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-900">{item.productName}</td>
                            <td className="py-2 px-3 text-right font-mono">{item.orderedQty}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold">
                              {item.receivedQty ?? item.orderedQty}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {isFull ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                                  ✓ Full Complete
                                </span>
                              ) : (
                                <div className="text-[10px] text-rose-700 font-bold">
                                  <span>
                                    Short: {item.shortageQty} | Dmg: {item.damageQty}
                                  </span>
                                  {item.discrepancyReason && (
                                    <div className="text-slate-500 font-normal">{item.discrepancyReason}</div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border space-y-1">
                  <div>
                    <strong>Receiver:</strong> {previewInvoice.receiverName || 'Outlet Staff'}
                  </div>
                  {previewInvoice.remarks && (
                    <div>
                      <strong>Remarks:</strong> {previewInvoice.remarks}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}