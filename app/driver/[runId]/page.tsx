// app/driver/[runId]/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import {
  Truck,
  Camera,
  Upload,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ChevronRight,
  X,
  UploadCloud,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  PackageCheck,
  Phone,
} from 'lucide-react';

interface ScannedProductItem {
  productCode: string;
  productName: string;
  orderedQty: number;
  receivedQty: number;
  shortageQty: number;
  damageQty: number;
  discrepancyReason: string;
  isFullComplete: boolean;
}

interface DeliveryStop {
  id: string;
  stopOrder: number;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string | null;
  status: 'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'DISCREPANCY';
  signedInvoicePhotoUrl: string | null;
  receiverName: string | null;
  deliveredAt: string | null;
  remarks: string | null;
  items: {
    id: string;
    productCode: string | null;
    productName: string;
    orderedQty: number;
    receivedQty: number | null;
    shortageQty: number;
    damageQty: number;
    discrepancyReason: string | null;
  }[];
}

interface DispatchRunData {
  id: string;
  runNumber: string;
  deliveryDate: string;
  vehicleNumber: string;
  driverName: string;
  routeName: string | null;
  deliveries: DeliveryStop[];
}

function DriverRunContent() {
  const params = useParams();
  const runId = params?.runId as string;

  const [run, setRun] = useState<DispatchRunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStop, setActiveStop] = useState<DeliveryStop | null>(null);

  // Modal Form State
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [scanningInvoice, setScanningInvoice] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [productItems, setProductItems] = useState<ScannedProductItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRun = async () => {
    if (!runId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/runs?id=${runId}`);
      const data = await res.json();
      if (res.ok) setRun(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRun();
  }, [runId]);

  const handleOpenStop = (stop: DeliveryStop) => {
    setActiveStop(stop);
    setPhotoPreview(stop.signedInvoicePhotoUrl || null);
    setCustomerPhone(stop.customerPhone || '');
    setReceiverName(stop.receiverName || '');
    setRemarks(stop.remarks || '');
    setError(null);
    setScanMessage(null);

    if (stop.items && stop.items.length > 0) {
      setProductItems(
        stop.items.map((i) => {
          const isFull = i.shortageQty === 0 && i.damageQty === 0;
          return {
            productCode: i.productCode || '',
            productName: i.productName,
            orderedQty: i.orderedQty,
            receivedQty: i.receivedQty ?? i.orderedQty,
            shortageQty: i.shortageQty || 0,
            damageQty: i.damageQty || 0,
            discrepancyReason: i.discrepancyReason || '',
            isFullComplete: isFull,
          };
        })
      );
    } else {
      setProductItems([]);
    }
  };

  // Auto-Scan Tax Invoice Photo with AI to Extract Products, Quantities & Phone
  const scanTaxInvoiceWithAI = async (compressedDataUrl: string) => {
    setScanningInvoice(true);
    setError(null);
    setScanMessage(null);

    try {
      const res = await fetch('/api/pod/scan-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: compressedDataUrl }),
      });

      const result = await res.json();
      if (res.ok && result.data) {
        const d = result.data;
        if (d.customerPhone && !customerPhone) {
          setCustomerPhone(String(d.customerPhone).trim());
        }
        if (Array.isArray(d.items)) {
          const extracted: ScannedProductItem[] = d.items.map((item: any) => {
            const qty = Number(item.orderedQty) || 1;
            return {
              productCode: String(item.productCode || '').trim(),
              productName: String(item.productName || '').trim(),
              orderedQty: qty,
              receivedQty: qty,
              shortageQty: 0,
              damageQty: 0,
              discrepancyReason: '',
              isFullComplete: true,
            };
          });
          setProductItems(extracted);
          setScanMessage(`AI extracted ${extracted.length} products from the Tax Invoice!`);
        }
      } else {
        setError(
          result.error ||
            'AI could not read all products automatically. You can add or edit items manually below.'
        );
        if (productItems.length === 0) {
          handleAddManualItem();
        }
      }
    } catch (err) {
      setError('Could not connect to AI Invoice Scanner. You can add items manually below.');
    } finally {
      setScanningInvoice(false);
    }
  };

  const handleCaptureInvoicePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 1400;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setPhotoPreview(compressedDataUrl);
          scanTaxInvoiceWithAI(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddManualItem = () => {
    setProductItems((prev) => [
      ...prev,
      {
        productCode: '',
        productName: '',
        orderedQty: 1,
        receivedQty: 1,
        shortageQty: 0,
        damageQty: 0,
        discrepancyReason: '',
        isFullComplete: true,
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    setProductItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: keyof ScannedProductItem, value: any) => {
    setProductItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[idx], [field]: value };

      if (field === 'isFullComplete' && value === true) {
        current.receivedQty = current.orderedQty;
        current.shortageQty = 0;
        current.damageQty = 0;
        current.discrepancyReason = '';
      } else if (field === 'orderedQty') {
        const ord = Math.max(0, Number(value) || 0);
        current.orderedQty = ord;
        if (current.isFullComplete) {
          current.receivedQty = ord;
        } else {
          current.shortageQty = Math.max(0, ord - current.receivedQty);
        }
      } else if (field === 'receivedQty') {
        const rec = Math.max(0, Number(value) || 0);
        current.receivedQty = rec;
        current.shortageQty = Math.max(0, current.orderedQty - rec);
      }

      updated[idx] = current;
      return updated;
    });
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStop) return;
    if (!photoPreview) {
      setError('Please capture or upload a photo of the signed Tax Invoice.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/pod/${activeStop.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedInvoicePhotoUrl: photoPreview,
          customerPhone,
          receiverName,
          remarks,
          items: productItems,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActiveStop(null);
        await loadRun();
      } else {
        setError(data.error || 'Failed to save delivery confirmation.');
      }
    } catch (err) {
      setError('Network error while uploading delivery confirmation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
        Loading Driver Route Sheet...
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow max-w-md w-full text-center">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
          <h2 className="font-bold text-slate-800">Dispatch Route Not Found</h2>
        </div>
      </div>
    );
  }

  const totalStops = run.deliveries.length;
  const completedStops = run.deliveries.filter(
    (d) => d.status === 'DELIVERED' || d.status === 'DISCREPANCY'
  ).length;
  const progressPercent = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-12">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">
                {run.vehicleNumber} • {run.driverName}
              </h1>
              <p className="text-[11px] text-slate-400">
                {run.routeName || 'Daily Delivery Route'} ({new Date(run.deliveryDate).toLocaleDateString('en-GB')})
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-teal-400">
              {completedStops} / {totalStops}
            </span>
            <span className="block text-[10px] text-slate-400">Completed</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-700">
            <span>Route Completion Progress</span>
            <span className="text-teal-700 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Assigned Outlet Stops (Tap outlet to scan signed Tax Invoice)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {run.deliveries.map((stop) => {
              const isDone = stop.status === 'DELIVERED' || stop.status === 'DISCREPANCY';
              return (
                <div
                  key={stop.id}
                  onClick={() => handleOpenStop(stop)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 shadow-sm ${
                    stop.status === 'DELIVERED'
                      ? 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50'
                      : stop.status === 'DISCREPANCY'
                      ? 'bg-amber-50/70 border-amber-300 hover:bg-amber-50'
                      : 'bg-white border-slate-200 hover:border-teal-500'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        stop.status === 'DELIVERED'
                          ? 'bg-emerald-600 text-white'
                          : stop.status === 'DISCREPANCY'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {stop.stopOrder}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {stop.customerName}
                      </h3>
                      <p className="text-xs font-mono text-slate-500 mt-0.5 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-teal-600" /> {stop.invoiceNumber}
                      </p>
                      {isDone && (
                        <p className="text-[10px] font-semibold mt-1 text-emerald-700">
                          ✓ {stop.items?.length || 0} Products Recorded •{' '}
                          {stop.status === 'DISCREPANCY' ? 'Shortage/Damage Marked' : 'Full Complete'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isDone ? (
                      <CheckCircle2
                        className={`w-5 h-5 ${
                          stop.status === 'DISCREPANCY' ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      />
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 font-bold text-[11px] flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5" /> Scan Invoice
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modal: Capture Signed Tax Invoice + AI Product Auto-Fill + Custom Outlet Phone */}
      {activeStop && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-3xl w-full max-h-[94vh] overflow-y-auto p-5 sm:p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-teal-50 text-teal-700">
                  Stop #{activeStop.stopOrder} • {activeStop.invoiceNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{activeStop.customerName}</h3>
              </div>
              <button
                onClick={() => setActiveStop(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {scanMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{scanMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitProof} className="space-y-5">
              {/* Step 1: Capture / Upload Signed Tax Invoice */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    1. Photograph or Upload Signed Tax Invoice <span className="text-rose-500">*</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition">
                      <Camera className="w-3.5 h-3.5" /> Take Camera Photo
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleCaptureInvoicePhoto}
                        className="hidden"
                      />
                    </label>

                    <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition">
                      <Upload className="w-3.5 h-3.5" /> Upload File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCaptureInvoicePhoto}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {photoPreview ? (
                  <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 text-center space-y-2">
                    <img
                      src={photoPreview}
                      alt="Signed Invoice Preview"
                      className="max-h-52 mx-auto rounded-xl object-contain border bg-white"
                    />
                    {scanningInvoice && (
                      <div className="inline-flex items-center gap-2 text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin" /> AI is reading products & quantities from the invoice...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50/60">
                    <Camera className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-slate-700">
                      Snap a photo of the signed Tax Invoice to auto-extract all products & quantities
                    </p>
                  </div>
                )}
              </div>

              {/* Step 2: Auto-Filled Invoice Products & Shortage / Damage Verification */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-teal-600" /> 2. Invoice Products & Quantity Check ({productItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddManualItem}
                    className="px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-bold hover:bg-teal-100 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Product Row
                  </button>
                </div>

                {productItems.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border text-center text-xs text-slate-500">
                    Upload or snap the Tax Invoice photo above to auto-fill products, or click "+ Add Product Row" to enter manually.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {productItems.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border transition space-y-3 ${
                          item.isFullComplete
                            ? 'bg-slate-50/70 border-slate-200'
                            : 'bg-amber-50/60 border-amber-300'
                        }`}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-semibold text-slate-500">SKU / Item Code</label>
                            <input
                              type="text"
                              placeholder="SKU Code"
                              value={item.productCode}
                              onChange={(e) => handleItemChange(idx, 'productCode', e.target.value)}
                              className="w-full px-2.5 py-1.5 border rounded-lg text-xs font-mono bg-white"
                            />
                          </div>

                          <div className="sm:col-span-5">
                            <label className="block text-[10px] font-semibold text-slate-500">Product Name *</label>
                            <input
                              type="text"
                              required
                              placeholder="Product description"
                              value={item.productName}
                              onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                              className="w-full px-2.5 py-1.5 border rounded-lg text-xs font-semibold bg-white"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-semibold text-slate-500">Invoice Qty</label>
                            <input
                              type="number"
                              min="1"
                              value={item.orderedQty}
                              onChange={(e) => handleItemChange(idx, 'orderedQty', e.target.value)}
                              className="w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold font-mono bg-white"
                            />
                          </div>

                          <div className="sm:col-span-2 flex justify-end pt-3 sm:pt-4">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleItemChange(idx, 'isFullComplete', true)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border ${
                              item.isFullComplete
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            ✓ Full Complete ({item.orderedQty})
                          </button>

                          <button
                            type="button"
                            onClick={() => handleItemChange(idx, 'isFullComplete', false)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border ${
                              !item.isFullComplete
                                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            ⚠ Shortage / Damaged
                          </button>
                        </div>

                        {!item.isFullComplete && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-amber-200/80">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                                Actual Delivered Qty
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={item.orderedQty}
                                value={item.receivedQty}
                                onChange={(e) => handleItemChange(idx, 'receivedQty', e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white text-xs font-bold"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-rose-700 mb-0.5">
                                Shortage / Missing Qty
                              </label>
                              <input
                                type="number"
                                readOnly
                                value={item.shortageQty}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-100 text-rose-700 text-xs font-bold"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-rose-700 mb-0.5">
                                Damaged Units
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={item.damageQty}
                                onChange={(e) => handleItemChange(idx, 'damageQty', e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white text-rose-600 text-xs font-bold"
                              />
                            </div>

                            <div className="sm:col-span-3">
                              <input
                                type="text"
                                placeholder="Reason for shortage or damage (e.g. 2 packs damaged, 3 missing from stock)..."
                                value={item.discrepancyReason}
                                onChange={(e) => handleItemChange(idx, 'discrepancyReason', e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 3: Outlet Mobile Phone (For Confirmation SMS), Receiver Name & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t pt-4">
                <div>
                  <label className="block text-xs font-bold text-teal-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> Outlet Phone (For Confirmation SMS)
                  </label>
                  <input
                    type="tel"
                    placeholder="Enter shop mobile e.g. 0771234567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-teal-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Receiver Name / Outlet Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Store Manager"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    General Delivery Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Received and stamped"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || scanningInvoice || !photoPreview}
                className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-md"
              >
                <UploadCloud className="w-4 h-4" />
                {submitting ? 'Confirming & Sending SMS...' : 'Confirm Delivery & Send SMS'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DriverRunPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
          Loading Driver Portal...
        </div>
      }
    >
      <DriverRunContent />
    </Suspense>
  );
}