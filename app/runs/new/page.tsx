// app/runs/new/page.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Sparkles,
    Upload,
    Camera,
    Plus,
    Trash2,
    Truck,
    CheckCircle2,
    AlertCircle,
    Loader2,
    FileSpreadsheet,
    X,
} from 'lucide-react';

interface StopRow {
    stopOrder: number;
    invoiceNumber: string;
    customerName: string;
    customerPhone: string;
}

export default function NewDispatchRunPage() {
    const router = useRouter();

    const [deliveryDate, setDeliveryDate] = useState('');

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setDeliveryDate(today);
    }, []);
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [driverName, setDriverName] = useState('');
    const [driverPhone, setDriverPhone] = useState('');
    const [routeName, setRouteName] = useState('');

    const [stops, setStops] = useState<StopRow[]>([
        { stopOrder: 1, invoiceNumber: '', customerName: '', customerPhone: '' },
    ]);

    const [scanning, setScanning] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [scannedPreview, setScannedPreview] = useState<string | null>(null);

    // Live Camera Modal State (for Desktop Webcam or Mobile Browser)
    const [cameraOpen, setCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Compress & Send Image to AI Scanner
    const processAndScanImage = async (dataUrl: string) => {
        setScanning(true);
        setError(null);
        setSuccess(null);
        setScannedPreview(dataUrl);

        try {
            const res = await fetch('/api/runs/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: dataUrl }),
            });

            const result = await res.json();
            if (res.ok && result.data) {
                const d = result.data;
                if (d.deliveryDate) setDeliveryDate(d.deliveryDate);
                if (d.vehicleNumber) setVehicleNumber(d.vehicleNumber);
                if (d.driverName) setDriverName(d.driverName);
                if (d.routeName) setRouteName(d.routeName);
                if (Array.isArray(d.stops) && d.stops.length > 0) {
                    setStops(
                        d.stops.map((s: any, idx: number) => ({
                            stopOrder: s.stopOrder || idx + 1,
                            invoiceNumber: s.invoiceNumber || '',
                            customerName: s.customerName || '',
                            customerPhone: '',
                        }))
                    );
                }
                setSuccess(`AI successfully extracted ${d.stops?.length || 0} delivery stops from the sheet!`);
            } else {
                setError(result.error || 'Could not extract data from the document image.');
            }
        } catch (err) {
            setError('Failed to connect to AI scanner service.');
        } finally {
            setScanning(false);
        }
    };

    // Compress file via Canvas before scanning
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxDim = 1600;
                const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const compressed = canvas.toDataURL('image/jpeg', 0.85);
                    processAndScanImage(compressed);
                }
            };
            img.src = ev.target?.result as string;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Start Live Camera (Webcam / Rear Phone Camera)
    const startCamera = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
            });
            streamRef.current = stream;
            setCameraOpen(true);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
            }, 100);
        } catch (err) {
            setError('Camera access denied or unavailable. Please use the Upload Sheet button.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setCameraOpen(false);
    };

    const captureCameraFrame = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            stopCamera();
            processAndScanImage(dataUrl);
        }
    };

    const handleAddStop = () => {
        setStops([
            ...stops,
            {
                stopOrder: stops.length + 1,
                invoiceNumber: '',
                customerName: '',
                customerPhone: '',
            },
        ]);
    };

    const handleRemoveStop = (index: number) => {
        if (stops.length === 1) return;
        const filtered = stops.filter((_, i) => i !== index).map((s, idx) => ({ ...s, stopOrder: idx + 1 }));
        setStops(filtered);
    };

    const handleStopChange = (index: number, field: keyof StopRow, value: string) => {
        const updated = [...stops];
        updated[index] = { ...updated[index], [field]: value };
        setStops(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const validStops = stops.filter((s) => s.invoiceNumber.trim() && s.customerName.trim());
        if (validStops.length === 0) {
            setError('Please enter at least one valid Invoice Number and Customer Name.');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/runs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deliveryDate,
                    vehicleNumber,
                    driverName,
                    driverPhone,
                    routeName,
                    stops: validStops,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setSuccess('Vehicle Dispatch Run created successfully!');
                setTimeout(() => router.push('/dashboard'), 1000);
            } else {
                setError(data.error || 'Failed to save dispatch run.');
            }
        } catch (err) {
            setError('Network error saving dispatch run.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <Link href="/dashboard" className="text-sm font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>

                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Truck className="w-6 h-6 text-teal-600" /> Create Vehicle Dispatch Sheet
                    </h1>
                    <p className="text-sm text-slate-500">
                        Scan a printed Delivery Vehicle Acknowledgment sheet with AI or enter route stops manually
                    </p>
                </div>

                {/* AI Document Scanner Banner with BOTH Upload & Camera Options */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md border border-slate-700 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-400">
                            <Sparkles className="w-4 h-4" /> AI Vision Auto-Scanner
                        </div>
                        <h2 className="text-base font-bold">Scan "Delivery Vehicle Acknowledgment" Sheet</h2>
                        <p className="text-xs text-slate-300">
                            Upload an image or snap a photo with your camera to auto-fill Vehicle No, Driver, Route, and all Invoice rows.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        {/* Option 1: Upload File from PC / Gallery */}
                        <label className="flex-1 sm:flex-initial cursor-pointer px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm">
                            {scanning ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Scanning...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" /> Upload Image
                                </>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                disabled={scanning}
                                className="hidden"
                            />
                        </label>

                        {/* Option 2: Take Photo with Camera */}
                        <button
                            type="button"
                            onClick={startCamera}
                            disabled={scanning}
                            className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl border border-slate-600 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                        >
                            <Camera className="w-4 h-4 text-teal-400" /> Take Photo
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                        <span>{success}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Header Info */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b pb-2">
                            1. Vehicle & Driver Details
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Delivery Date *</label>
                                <input
                                    type="date"
                                    required
                                    value={deliveryDate}
                                    onChange={(e) => setDeliveryDate(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Vehicle No *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. PJ-4141"
                                    value={vehicleNumber}
                                    onChange={(e) => setVehicleNumber(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono uppercase font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Driver / Delivery Person *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. DHANUSHKA"
                                    value={driverName}
                                    onChange={(e) => setDriverName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl text-xs uppercase font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Route Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. KATUBEDDA TO KALUTARA"
                                    value={routeName}
                                    onChange={(e) => setRouteName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl text-xs uppercase"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stops Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <FileSpreadsheet className="w-4 h-4 text-teal-600" /> 2. Planned Outlet Deliveries ({stops.length})
                            </h3>
                            <button
                                type="button"
                                onClick={handleAddStop}
                                className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-xs font-bold hover:bg-teal-100 transition flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Row
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-600 border-b">
                                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                                        <th className="py-2.5 px-3">Invoice No *</th>
                                        <th className="py-2.5 px-3">Customer / Outlet Name *</th>
                                        <th className="py-2.5 px-3">Outlet Phone (For SMS)</th>
                                        <th className="py-2.5 px-3 w-16 text-center">Remove</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {stops.map((stop, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/80">
                                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">
                                                {stop.stopOrder}
                                            </td>
                                            <td className="py-2 px-3">
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="e.g. 26OCT_GSC_131896"
                                                    value={stop.invoiceNumber}
                                                    onChange={(e) => handleStopChange(idx, 'invoiceNumber', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 border rounded-lg font-mono text-xs"
                                                />
                                            </td>
                                            <td className="py-2 px-3">
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="e.g. SANIKMO SUPER"
                                                    value={stop.customerName}
                                                    onChange={(e) => handleStopChange(idx, 'customerName', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 border rounded-lg font-medium text-xs uppercase"
                                                />
                                            </td>
                                            <td className="py-2 px-3">
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 0771234567"
                                                    value={stop.customerPhone}
                                                    onChange={(e) => handleStopChange(idx, 'customerPhone', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                                                />
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveStop(idx)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Link href="/dashboard" className="px-5 py-2.5 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 disabled:opacity-50 shadow-sm"
                        >
                            {saving ? 'Creating Route...' : 'Save & Generate Driver Route Link'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Live Camera Capture Modal */}
            {cameraOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-slate-900 rounded-3xl max-w-xl w-full p-5 space-y-4 border border-slate-700 shadow-2xl">
                        <div className="flex justify-between items-center text-white">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <Camera className="w-4 h-4 text-teal-400" /> Position Dispatch Sheet in Frame
                            </h3>
                            <button onClick={stopCamera} className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="rounded-2xl overflow-hidden bg-black aspect-video relative">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={stopCamera}
                                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={captureCameraFrame}
                                className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2"
                            >
                                <Camera className="w-4 h-4" /> Capture & Scan Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}