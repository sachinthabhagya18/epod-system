// app/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
  routeName: string | null;
  deliveries: Delivery[];
}

export default function DashboardPage() {
  const [runs, setRuns] = useState<DispatchRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Delivery | null>(null);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/runs');
      const data = await res.json();
      if (Array.isArray(data)) setRuns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
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
    fetchRuns();
  };

  const allDeliveries = runs.flatMap((r) => r.deliveries);
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
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-6 h-6 text-teal-600" /> George Steuart e-POD & Fleet Portal
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              AI Sheet & Tax Invoice Scanner, Product Discrepancy Tracking & Auto-Synced Master Data
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/products"
              className="px-3 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Package className="w-4 h-4 text-teal-600" /> Scanned Products
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
            <p className="text-xs font-medium text-slate-500">Total Outlet Stops</p>
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

        {/* Vehicle Dispatch Runs List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Active Vehicle Dispatch Sheets ({runs.length})
            </h2>
            <button
              onClick={fetchRuns}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
            </button>
          </div>

          {loading ? (
            <div className="bg-white p-12 rounded-2xl border text-center text-slate-400 text-sm">
              Loading vehicle dispatch runs...
            </div>
          ) : runs.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border text-center space-y-3">
              <Truck className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500">No vehicle dispatch sheets created yet.</p>
              <Link
                href="/runs/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold"
              >
                <Plus className="w-4 h-4" /> Scan First Vehicle Sheet
              </Link>
            </div>
          ) : (
            runs.map((run) => {
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
                          <span className="text-slate-400 font-normal">
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
                          <th className="py-2.5 px-4">Products Summary</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4 text-center">Invoice & Products</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {run.deliveries.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-400">{d.stopOrder}</td>
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{d.invoiceNumber}</td>
                            <td className="py-2.5 px-4 font-semibold text-slate-800">{d.customerName}</td>
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
                                <button
                                  onClick={() => setPreviewInvoice(d)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg font-bold text-[11px] hover:bg-teal-100 transition"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View Invoice & Products ({d.items?.length || 0})
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-300">Awaiting Driver Upload</span>
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

      {/* Modal: View Uploaded Signed Tax Invoice Photo + Extracted Products Table */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Invoice {previewInvoice.invoiceNumber} • {previewInvoice.customerName}
                </h3>
                <p className="text-xs text-slate-500">
                  Receiver: {previewInvoice.receiverName || 'Outlet Staff'} • Delivered:{' '}
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
              {/* Left: Signed Tax Invoice Image */}
              <div className="lg:col-span-5 bg-slate-900 rounded-2xl p-2">
                {previewInvoice.signedInvoicePhotoUrl && (
                  <img
                    src={previewInvoice.signedInvoicePhotoUrl}
                    alt="Signed Tax Invoice"
                    className="max-h-[65vh] mx-auto object-contain rounded-xl"
                  />
                )}
              </div>

              {/* Right: Scanned Products & Quantities Breakdown */}
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

                {previewInvoice.remarks && (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border">
                    <strong>Driver Remarks:</strong> {previewInvoice.remarks}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}