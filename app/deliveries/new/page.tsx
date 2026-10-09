// app/deliveries/new/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Truck,
  UserCheck,
  Store,
  X,
} from 'lucide-react';

interface ProductOption {
  id: string;
  productCode: string;
  productName: string;
  unit: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  productCode: string;
  orderedQty: number;
  unit: string;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

export default function NewDeliveryPage() {
  const router = useRouter();

  // Form Fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [jobNumber, setJobNumber] = useState('');

  // Customer / Outlet
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [outletAddress, setOutletAddress] = useState('');
  const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Driver
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [showDriverModal, setShowDriverModal] = useState(false);

  // Quick Add Driver Modal Inputs
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverVehicle, setNewDriverVehicle] = useState('');

  // Quick Add Outlet Modal Inputs
  const [newOutletName, setNewOutletName] = useState('');
  const [newOutletPhone, setNewOutletPhone] = useState('');
  const [newOutletAddress, setNewOutletAddress] = useState('');

  // Item Picker State
  const [items, setItems] = useState<OrderItem[]>([]);
  const [productQuery, setProductQuery] = useState('');
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [qtyInput, setQtyInput] = useState<number>(1);
  const [searchingProduct, setSearchingProduct] = useState(false);

  // Status & Alerts
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 1. Fetch Drivers on load
  const loadDrivers = async () => {
    try {
      const res = await fetch('/api/drivers');
      const data = await res.json();
      if (Array.isArray(data)) setDrivers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  // 2. Search Customers as user types
  useEffect(() => {
    if (customerName.trim().length < 2 || customerId) {
      setCustomerOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(customerName)}`);
        const data = await res.json();
        if (Array.isArray(data)) setCustomerOptions(data);
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerName, customerId]);

  // Select existing customer
  const handleSelectCustomer = (c: Customer) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone || '');
    setOutletAddress(c.address || '');
    setCustomerOptions([]);
  };

  // 3. Search Products as user types
  useEffect(() => {
    if (productQuery.trim().length < 2) {
      setProductOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingProduct(true);
        const res = await fetch(`/api/products?q=${encodeURIComponent(productQuery)}`);
        const data = await res.json();
        if (Array.isArray(data)) setProductOptions(data);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingProduct(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [productQuery]);

  const handleSelectProduct = (prod: ProductOption) => {
    setSelectedProduct(prod);
    setProductQuery(`${prod.productCode} - ${prod.productName}`);
    setProductOptions([]);
  };

  const handleAddItem = () => {
    if (!selectedProduct || qtyInput <= 0) return;

    const exists = items.find((i) => i.productId === selectedProduct.id);
    if (exists) {
      setItems(
        items.map((i) =>
          i.productId === selectedProduct.id
            ? { ...i, orderedQty: i.orderedQty + Number(qtyInput) }
            : i
        )
      );
    } else {
      setItems([
        ...items,
        {
          productId: selectedProduct.id,
          productName: selectedProduct.productName,
          productCode: selectedProduct.productCode,
          orderedQty: Number(qtyInput),
          unit: selectedProduct.unit,
        },
      ]);
    }

    setSelectedProduct(null);
    setProductQuery('');
    setQtyInput(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Quick Add Driver Submit
  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName || !newDriverPhone) return;

    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDriverName,
          phone: newDriverPhone,
          vehicleNumber: newDriverVehicle,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await loadDrivers();
        setSelectedDriverId(data.id);
        setShowDriverModal(false);
        setNewDriverName('');
        setNewDriverPhone('');
        setNewDriverVehicle('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Add Outlet Submit
  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutletName) return;

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOutletName,
          phone: newOutletPhone,
          address: newOutletAddress,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCustomerId(data.id);
        setCustomerName(data.name);
        setCustomerPhone(data.phone || '');
        setOutletAddress(data.address || '');
        setShowCustomerModal(false);
        setNewOutletName('');
        setNewOutletPhone('');
        setNewOutletAddress('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Main Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (items.length === 0) {
      setError('Please add at least one product item to the order.');
      return;
    }

    const assignedDriver = drivers.find((d) => d.id === selectedDriverId);

    setLoading(true);

    try {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: invoiceNumber.trim(),
          jobNumber: jobNumber.trim(),
          customerId,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          outletAddress: outletAddress.trim(),
          driverId: selectedDriverId || null,
          driverName: assignedDriver ? assignedDriver.name : null,
          items,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Dispatch Order successfully created!');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1200);
      } else {
        setError(data.error || 'Failed to create dispatch order.');
      }
    } catch (err) {
      setError('Connection error communicating with the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/dashboard" className="text-sm font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-teal-600" /> New Delivery Dispatch Order
          </h1>
          <p className="text-sm text-slate-500">
            Allocate products and assign delivery drivers to modern trade outlets
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Order & Driver Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
            <h2 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-2">
              1. Dispatch & Driver Assignment
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Invoice Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-2026-0045"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Job Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JOB-8832"
                  value={jobNumber}
                  onChange={(e) => setJobNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Driver Dropdown with Quick Add */}
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-teal-600" /> Assigned Delivery Driver / Courier
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDriverModal(true)}
                    className="text-xs text-teal-700 font-semibold hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Quick Add Driver
                  </button>
                </div>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="">-- Select Assigned Driver (Optional) --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.phone}) {d.vehicleNumber ? `- [${d.vehicleNumber}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section: Customer / Outlet Search with Autocomplete */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-teal-600" /> Target Outlet / Customer Details
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  className="text-xs text-teal-700 font-semibold hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Quick Add Outlet
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 relative">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Customer / Outlet Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Type to search registered outlet or enter new..."
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setCustomerId(null);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                    {customerId && (
                      <span className="absolute right-3 top-2.5 text-xs text-emerald-600 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" /> Registered
                      </span>
                    )}
                  </div>

                  {/* Customer Autocomplete Dropdown */}
                  {customerOptions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {customerOptions.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          className="px-3 py-2 hover:bg-teal-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                        >
                          <div className="font-semibold text-slate-800">{c.name}</div>
                          <div className="text-xs text-slate-500">{c.address || 'No address'} {c.phone ? `• ${c.phone}` : ''}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Outlet Phone / Contact
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 077 123 4567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Delivery Address / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. No. 120, High Level Road, Nugegoda"
                    value={outletAddress}
                    onChange={(e) => setOutletAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Products Allocation */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-2">
              2. Add Invoiced Products
            </h2>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 relative">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Search Product Catalog (by Code or Name)
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type product name or SKU..."
                      value={productQuery}
                      onChange={(e) => {
                        setProductQuery(e.target.value);
                        setSelectedProduct(null);
                      }}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  {productOptions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                      {productOptions.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectProduct(p)}
                          className="px-3 py-2 hover:bg-teal-50 cursor-pointer text-sm border-b border-slate-50 last:border-0 transition"
                        >
                          <span className="font-mono text-xs font-bold text-teal-700 mr-2">{p.productCode}</span>
                          <span className="text-slate-800 font-medium">{p.productName}</span>
                          <span className="text-xs text-slate-400 ml-2">({p.unit})</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchingProduct && (
                    <div className="absolute z-20 right-3 top-8 text-xs text-slate-400">Searching...</div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={qtyInput}
                      onChange={(e) => setQtyInput(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!selectedProduct}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Items Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="py-2.5 px-3 font-semibold">SKU</th>
                    <th className="py-2.5 px-3 font-semibold">Product Description</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Invoiced Qty</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                        No products added yet. Use the search bar above to add products.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-xs font-semibold text-teal-700">{item.productCode}</td>
                        <td className="py-2.5 px-3 text-slate-800 font-medium">{item.productName}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                          {item.orderedQty} <span className="text-xs text-slate-500 font-normal">{item.unit}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-100 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="px-6 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition shadow-sm"
            >
              {loading ? 'Dispatching...' : 'Confirm & Dispatch Order'}
            </button>
          </div>
        </form>

        {/* --- Quick Add Driver Modal --- */}
        {showDriverModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-5 h-5 text-teal-600" /> Register New Driver
                </h3>
                <button onClick={() => setShowDriverModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateDriver} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Driver Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kasun Bandara"
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 077 555 1234"
                    value={newDriverPhone}
                    onChange={(e) => setNewDriverPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Vehicle Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. WP CAA-4590"
                    value={newDriverVehicle}
                    onChange={(e) => setNewDriverVehicle(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDriverModal(false)}
                    className="px-4 py-2 border text-slate-600 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700"
                  >
                    Save Driver
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- Quick Add Outlet Modal --- */}
        {showCustomerModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Store className="w-5 h-5 text-teal-600" /> Register New Outlet / Shop
                </h3>
                <button onClick={() => setShowCustomerModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateOutlet} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Outlet / Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cargills Food City - Maharagama"
                    value={newOutletName}
                    onChange={(e) => setNewOutletName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 011 285 4444"
                    value={newOutletPhone}
                    onChange={(e) => setNewOutletPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Delivery Address</label>
                  <input
                    type="text"
                    placeholder="e.g. No. 45, High Level Road, Maharagama"
                    value={newOutletAddress}
                    onChange={(e) => setNewOutletAddress(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(false)}
                    className="px-4 py-2 border text-slate-600 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700"
                  >
                    Save Outlet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}