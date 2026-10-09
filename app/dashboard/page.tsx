// app/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Truck,
  Plus,
  Package,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  ExternalLink,
  FileText,
  RefreshCw,
  Trash2,
  UserCheck,
  Store,
} from 'lucide-react';

interface Delivery {
  id: string;
  invoiceNumber: string;
  jobNumber: string;
  customerName: string;
  customerPhone: string | null;
  status: 'DISPATCHED' | 'DELIVERED' | 'DISCREPANCY' | 'CANCELLED';
  dispatchedAt: string;
  deliveredAt: string | null;
  driverName: string | null;
  items: { id: string; productName: string; orderedQty: number }[];
  acknowledgement: {
    receiverName: string;
    receiverNic: string;
    acknowledgedAt: string;
  } | null;
}

export default function DashboardPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/deliveries?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) setDeliveries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDeliveries();
  };

  const copyDriverLink = (id: string) => {
    const url = `${window.location.origin}/pod/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteDelivery = async (id: string, invoiceNumber: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete delivery ${invoiceNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/deliveries?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeliveries((prev) => prev.filter((d) => d.id !== id));
      } else {
        alert('Failed to delete delivery order.');
      }
    } catch (err) {
      alert('Error connecting to the server.');
    }
  };

  const totalDispatches = deliveries.length;
  const totalDelivered = deliveries.filter((d) => d.status === 'DELIVERED').length;
  const totalDiscrepancies = deliveries.filter((d) => d.status === 'DISCREPANCY').length;
  const totalInTransit = deliveries.filter((d) => d.status === 'DISPATCHED').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header with Navigation */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-6 h-6 text-teal-600" /> Electronic Delivery Activity System (e-POD)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Central Logistics & Dispatch Management Portal</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/products"
              className="px-3 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <Package className="w-4 h-4 text-teal-600" /> Products
            </Link>
            <Link
              href="/drivers"
              className="px-3 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4 text-teal-600" /> Drivers
            </Link>
            <Link
              href="/customers"
              className="px-3 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <Store className="w-4 h-4 text-teal-600" /> Outlets
            </Link>
            <Link
              href="/deliveries/new"
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Dispatch
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Total Orders</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalDispatches}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> In Transit
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalInTransit}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalDelivered}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-rose-600 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Discrepancies
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalDiscrepancies}</p>
          </div>
        </div>

        {/* Deliveries Filter & Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
            <form onSubmit={handleSearch} className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Invoice, Job, Outlet, Driver..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </form>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="DISPATCHED">In Transit (Dispatched)</option>
                <option value="DELIVERED">Delivered</option>
                <option value="DISCREPANCY">Discrepancy</option>
              </select>

              <button
                onClick={fetchDeliveries}
                className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition"
                title="Refresh Table"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-3 px-4 font-semibold">Invoice No</th>
                  <th className="py-3 px-4 font-semibold">Job No</th>
                  <th className="py-3 px-4 font-semibold">Customer / Outlet</th>
                  <th className="py-3 px-4 font-semibold">Driver</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Recipient Info</th>
                  <th className="py-3 px-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">Loading dispatches...</td>
                  </tr>
                ) : deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No delivery orders found. Click "+ New Dispatch" to create one.
                    </td>
                  </tr>
                ) : (
                  deliveries.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{d.invoiceNumber}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{d.jobNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{d.customerName}</div>
                        {d.customerPhone && <div className="text-[11px] text-slate-400">{d.customerPhone}</div>}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {d.driverName || <span className="text-slate-400 italic">Unassigned</span>}
                      </td>
                      <td className="py-3 px-4">
                        {d.status === 'DELIVERED' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Delivered
                          </span>
                        )}
                        {d.status === 'DISCREPANCY' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Discrepancy
                          </span>
                        )}
                        {d.status === 'DISPATCHED' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            In Transit
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {d.acknowledgement ? (
                          <div>
                            <div className="font-medium text-slate-800">{d.acknowledgement.receiverName}</div>
                            <div className="text-[10px] font-mono text-slate-400">NIC: {d.acknowledgement.receiverNic}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Pending delivery</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => copyDriverLink(d.id)}
                            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition"
                            title="Copy Driver Confirmation Web Link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <Link
                            href={`/pod/${d.id}`}
                            target="_blank"
                            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 text-teal-600 transition"
                            title="Open Driver Mobile Screen"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          {d.acknowledgement ? (
                            <a
                              href={`/api/pod/${d.id}/pdf`}
                              target="_blank"
                              className="px-2 py-1 bg-slate-900 text-white rounded text-[11px] font-medium hover:bg-slate-800 transition flex items-center gap-1"
                              title="Download Signed e-POD Receipt"
                            >
                              <FileText className="w-3 h-3 text-teal-400" /> PDF
                            </a>
                          ) : (
                            <span className="text-slate-300 text-[10px] italic">Not signed</span>
                          )}

                          {/* Delete Order Button */}
                          <button
                            onClick={() => handleDeleteDelivery(d.id, d.invoiceNumber)}
                            className="p-1.5 border border-slate-200 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition ml-1"
                            title="Delete Delivery Order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {copiedId === d.id && (
                          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Link Copied!</div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}