// app/pod/[id]/page.tsx
'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  AlertTriangle,
  PenTool,
  RotateCcw,
  Truck,
  Building2,
  UserCheck,
  ShieldCheck,
  PackageCheck,
  Calendar,
  FileCheck,
  Clock,
  Phone,
  MapPin,
} from 'lucide-react';

interface DeliveryItem {
  id: string;
  productName: string;
  orderedQty: number;
  receivedQty: number;
  shortageQty: number;
  damageQty: number;
  discrepancyReason: string;
}

interface DeliveryData {
  id: string;
  invoiceNumber: string;
  jobNumber: string;
  customerName: string;
  customerPhone: string | null;
  outletAddress: string | null;
  driverName: string | null;
  status: string;
  dispatchedAt: string;
  items: DeliveryItem[];
  acknowledgement: {
    receiverName: string;
    receiverNic: string;
    acknowledgedAt: string;
  } | null;
}

function DriverPodContent() {
  const params = useParams();
  const deliveryId = params?.id as string;

  const [delivery, setDelivery] = useState<DeliveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Verification state
  const [isFullDelivery, setIsFullDelivery] = useState(true);
  const [itemStates, setItemStates] = useState<DeliveryItem[]>([]);

  // Signer Details
  const [receiverName, setReceiverName] = useState('');
  const [receiverNic, setReceiverNic] = useState('');
  const [remarks, setRemarks] = useState('');

  // Canvas Signature Pad State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Fetch Delivery Details
  useEffect(() => {
    async function loadData() {
      if (!deliveryId) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/pod/${deliveryId}`);
        const data = await res.json();

        if (res.ok) {
          setDelivery(data);
          const initialItems = data.items.map((i: any) => ({
            ...i,
            receivedQty: i.orderedQty,
            shortageQty: 0,
            damageQty: 0,
            discrepancyReason: '',
          }));
          setItemStates(initialItems);

          if (data.acknowledgement) {
            setSuccess(true);
          }
        } else {
          setError(data.error || 'Failed to load delivery.');
        }
      } catch (err) {
        setError('Network error communicating with the server.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [deliveryId]);

  // Configure Canvas Resolution & Pen
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(2, 2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
    }
  };

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, [loading, success]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleToggleFullDelivery = (isFull: boolean) => {
    setIsFullDelivery(isFull);
    if (isFull) {
      setItemStates(
        itemStates.map((i) => ({
          ...i,
          receivedQty: i.orderedQty,
          shortageQty: 0,
          damageQty: 0,
          discrepancyReason: '',
        }))
      );
    }
  };

  const handleItemQtyChange = (
    index: number,
    field: 'receivedQty' | 'shortageQty' | 'damageQty' | 'discrepancyReason',
    value: any
  ) => {
    const updated = [...itemStates];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'receivedQty') {
      const received = Math.max(0, parseInt(value) || 0);
      const shortage = Math.max(0, updated[index].orderedQty - received);
      updated[index].receivedQty = received;
      updated[index].shortageQty = shortage;
    }

    setItemStates(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!receiverName.trim()) {
      setError('Please enter the Recipient Full Name.');
      return;
    }

    if (!receiverNic.trim()) {
      setError('Please enter the Recipient NIC Number.');
      return;
    }

    if (!hasSignature || !canvasRef.current) {
      setError('Customer touch signature is mandatory to complete delivery acknowledgement.');
      return;
    }

    setSubmitting(true);
    const signatureDataUrl = canvasRef.current.toDataURL('image/png');

    try {
      const res = await fetch(`/api/pod/${deliveryId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverName,
          receiverNic,
          signatureDataUrl,
          items: itemStates,
          remarks,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'Failed to submit acknowledgement.');
      }
    } catch (err) {
      setError('Connection failure communicating with the server.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-slate-300">
          <Truck className="w-10 h-10 animate-bounce mx-auto text-teal-400 mb-2" />
          <p className="text-sm font-semibold tracking-wide">Loading Delivery Manifest...</p>
        </div>
      </div>
    );
  }

  if (error && !delivery) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full text-center border border-slate-200">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Delivery Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // Already Completed State
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm max-w-lg w-full text-center space-y-6 border border-slate-200">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Delivery Acknowledged & Closed</h1>
            <p className="text-xs text-slate-500 mt-1">
              Electronic Proof of Delivery (e-POD) record has been captured and locked.
            </p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl text-left text-xs space-y-2 border border-slate-200/80">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Invoice Number:</span>
              <span className="font-mono font-bold text-slate-900">{delivery?.invoiceNumber}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Job Number:</span>
              <span className="font-mono text-slate-700">{delivery?.jobNumber}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Customer / Outlet:</span>
              <span className="font-semibold text-slate-900">{delivery?.customerName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Acknowledged By:</span>
              <span className="font-semibold text-slate-900">{receiverName || delivery?.acknowledgement?.receiverName}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">NIC Number:</span>
              <span className="font-mono font-bold text-slate-900">{receiverNic || delivery?.acknowledgement?.receiverNic}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-emerald-700 bg-emerald-50 py-2.5 px-4 rounded-xl border border-emerald-200/70 font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Invoice closure authorized. Operations team has been notified.</span>
          </div>

          {delivery && (
            <a
              href={`/api/pod/${delivery.id}/pdf`}
              target="_blank"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
            >
              <FileCheck className="w-4 h-4 text-teal-400" /> View Signed PDF Document
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Top Header Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Steuart e-POD Portal</h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">Digital Delivery Acknowledgement System</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">INVOICE:</span>
            <span className="text-xs font-mono font-bold bg-teal-500/20 text-teal-300 px-2.5 py-1 rounded-lg border border-teal-500/30">
              {delivery?.invoiceNumber}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container - Responsive 2-Column Desktop Grid / 1-Column Mobile Flow */}
      <main className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: Sticky Order Summary & Manifest (Desktop)    */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
            {/* Manifest Overview Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
                  <Building2 className="w-4 h-4 text-teal-600" /> Delivery Target Details
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  In Transit
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">{delivery?.customerName}</h2>
                {delivery?.outletAddress && (
                  <p className="text-xs text-slate-500 flex items-start gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{delivery.outletAddress}</span>
                  </p>
                )}
                {delivery?.customerPhone && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{delivery.customerPhone}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-medium">Job Number</span>
                  <span className="font-mono text-xs font-bold text-slate-800">{delivery?.jobNumber}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-medium">Assigned Driver</span>
                  <span className="text-xs font-bold text-slate-800 truncate block">
                    {delivery?.driverName || 'Courier Service'}
                  </span>
                </div>
                <div className="col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Dispatched:
                  </span>
                  <span className="font-medium text-slate-700 text-[11px]">
                    {delivery?.dispatchedAt && new Date(delivery.dispatchedAt).toLocaleString('en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Invoiced Items Summary Badge */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 hidden lg:block">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                <span>Total Invoiced Products</span>
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                  {delivery?.items.length} items
                </span>
              </div>
              <ul className="divide-y divide-slate-100 text-xs max-h-48 overflow-y-auto">
                {delivery?.items.map((item) => (
                  <li key={item.id} className="py-2 flex justify-between items-center text-slate-600">
                    <span className="truncate pr-2 font-medium">{item.productName}</span>
                    <span className="font-mono font-bold text-slate-800 shrink-0">x {item.orderedQty}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: Interactive Verification & E-Signature Form */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 space-y-5">
            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 shadow-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Step 1: Quantity Verification Card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-teal-600" /> 1. Quantity Verification & Inspection
                  </h3>
                  <span className="text-[11px] text-slate-400">Confirm received units against invoice</span>
                </div>

                {/* Full Delivery vs Shortage/Damage Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleFullDelivery(true)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      isFullDelivery
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Full Quantity Received
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleFullDelivery(false)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      !isFullDelivery
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" /> Shortage / Damage Record
                  </button>
                </div>

                {/* Items Checklist Table */}
                <div className="space-y-2.5 pt-1">
                  {itemStates.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs transition"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-slate-900 text-xs">{item.productName}</span>
                        <div className="flex items-center gap-1 font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs shrink-0 ml-2">
                          <span className="text-slate-400 text-[10px] font-normal">Inv:</span> {item.orderedQty}
                        </div>
                      </div>

                      {/* Discrepancy Editing Sub-row (if not full delivery) */}
                      {!isFullDelivery && (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-slate-200/80">
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                              Actual Received
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={item.orderedQty}
                              value={item.receivedQty}
                              onChange={(e) => handleItemQtyChange(idx, 'receivedQty', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-semibold text-rose-600 mb-1">
                              Damaged Units
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={item.damageQty}
                              onChange={(e) => handleItemQtyChange(idx, 'damageQty', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-rose-600 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-semibold text-amber-700 mb-1">
                              Shortage Units
                            </label>
                            <input
                              type="number"
                              readOnly
                              value={item.shortageQty}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-100 font-bold text-amber-700 text-xs cursor-not-allowed"
                            />
                          </div>
                          <div className="sm:col-span-12">
                            <input
                              type="text"
                              placeholder="Specify reason (e.g. Box damaged in transit, item missing from warehouse)..."
                              value={item.discrepancyReason}
                              onChange={(e) => handleItemQtyChange(idx, 'discrepancyReason', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Recipient Details Card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-teal-600" /> 2. Recipient Confirmation Details
                  </h3>
                  <span className="text-[10px] text-rose-500 font-semibold">* Mandatory</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Recipient Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Samantha Perera"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Recipient NIC / Identification Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 198512345678 or 851234567V"
                      value={receiverNic}
                      onChange={(e) => setReceiverNic(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono uppercase focus:ring-2 focus:ring-teal-500 focus:outline-none font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Acknowledgement Remarks / Condition Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Checked and received all items in original seal..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Touch Signature Canvas Card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-teal-600" /> 3. Electronic Touch Signature <span className="text-rose-500">*</span>
                  </h3>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-xs text-rose-600 font-semibold hover:underline flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Clear Signature
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  Please ask the recipient / store manager to sign directly in the box below using their finger, stylus, or mouse:
                </p>

                <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 overflow-hidden relative touch-none shadow-inner">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-44 sm:h-52 cursor-crosshair block bg-slate-50"
                  />
                  {!hasSignature && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 text-xs gap-1">
                      <PenTool className="w-5 h-5 text-slate-300" />
                      <span className="italic font-medium">Sign Here (Touch / Mouse)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: Submission & Legal Notice */}
              <div className="space-y-4 pt-1">
                <div className="flex items-start gap-2.5 bg-teal-50/80 p-3.5 rounded-2xl border border-teal-200/70 text-xs text-teal-900 leading-relaxed">
                  <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Legal Notice:</strong> Under the Sri Lankan Electronic Transactions Act, by signing above the recipient certifies that the goods have been checked and received. This electronic acknowledgment serves as proof of delivery and initiates invoice closure.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !hasSignature}
                  className="w-full py-4 bg-teal-600 text-white rounded-2xl font-bold text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
                >
                  {submitting ? 'Recording Acknowledgement...' : 'Confirm & Complete Delivery'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}

// Next.js 16 Suspense Boundary
export default function DriverPodPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm font-medium">
          Loading Delivery Portal...
        </div>
      }
    >
      <DriverPodContent />
    </Suspense>
  );
}