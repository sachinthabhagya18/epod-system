// app/drivers/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserCheck, Plus, Trash2, Phone, Truck } from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string | null;
  nic: string | null;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // New Driver Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [nic, setNic] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/drivers');
      const data = await res.json();
      if (Array.isArray(data)) setDrivers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, vehicleNumber, nic }),
      });
      if (res.ok) {
        setName('');
        setPhone('');
        setVehicleNumber('');
        setNic('');
        fetchDrivers();
      } else {
        alert('Failed to add driver.');
      }
    } catch (err) {
      alert('Error adding driver.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDriver = async (id: string, driverName: string) => {
    if (!window.confirm(`Are you sure you want to delete driver "${driverName}"?`)) return;

    try {
      const res = await fetch(`/api/drivers?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDrivers((prev) => prev.filter((d) => d.id !== id));
      } else {
        alert('Failed to delete driver.');
      }
    } catch (err) {
      alert('Error deleting driver.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link href="/dashboard" className="text-sm font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1 mb-1">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-teal-600" /> Delivery Personnel & Drivers
          </h1>
          <p className="text-sm text-slate-500">Manage registered delivery drivers and fleet vehicles</p>
        </div>

        {/* Add Driver Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-800">Add New Driver</h2>
          <form onSubmit={handleCreateDriver} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <input
                type="text"
                required
                placeholder="Full Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs"
              />
            </div>
            <div>
              <input
                type="text"
                required
                placeholder="Mobile Phone *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Vehicle No (e.g. WP CAA-4590)"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" /> Save Driver
              </button>
            </div>
          </form>
        </div>

        {/* Drivers Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b font-semibold text-slate-800 text-sm">
            Registered Drivers ({drivers.length})
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b">
                <th className="py-3 px-4 font-semibold">Driver Name</th>
                <th className="py-3 px-4 font-semibold">Phone Number</th>
                <th className="py-3 px-4 font-semibold">Vehicle Number</th>
                <th className="py-3 px-4 font-semibold text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">Loading drivers...</td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">No drivers registered yet.</td>
                </tr>
              ) : (
                drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{d.name}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {d.phone}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-mono font-medium">
                      {d.vehicleNumber ? (
                        <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-slate-400" /> {d.vehicleNumber}</span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteDriver(d.id, d.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Delete Driver"
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
    </div>
  );
}