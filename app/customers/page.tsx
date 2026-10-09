// app/customers/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Store, Plus, Trash2, Search, MapPin, Phone } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // New Outlet Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async (q = '') => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (Array.isArray(data)) setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    fetchCustomers(val);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, address }),
      });
      if (res.ok) {
        setName('');
        setPhone('');
        setAddress('');
        fetchCustomers();
      } else {
        alert('Failed to add outlet.');
      }
    } catch (err) {
      alert('Error adding outlet.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (id: string, outletName: string) => {
    if (!window.confirm(`Are you sure you want to delete outlet "${outletName}"?`)) return;

    try {
      const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert('Failed to delete outlet.');
      }
    } catch (err) {
      alert('Error deleting outlet.');
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
            <Store className="w-6 h-6 text-teal-600" /> Outlets & Modern Trade Stores
          </h1>
          <p className="text-sm text-slate-500">Manage registered delivery outlets, supermarket branches, and clients</p>
        </div>

        {/* Add Outlet Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-800">Register New Outlet</h2>
          <form onSubmit={handleCreateCustomer} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <input
                type="text"
                required
                placeholder="Outlet Name (e.g. Keells Nugegoda) *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Contact Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Full Delivery Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" /> Save Outlet
              </button>
            </div>
          </form>
        </div>

        {/* Outlets Search & Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="font-semibold text-slate-800 text-sm">Registered Outlets ({customers.length})</span>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search outlets..."
                value={search}
                onChange={handleSearchChange}
                className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-xs"
              />
            </div>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b">
                <th className="py-3 px-4 font-semibold">Outlet Name</th>
                <th className="py-3 px-4 font-semibold">Phone</th>
                <th className="py-3 px-4 font-semibold">Address</th>
                <th className="py-3 px-4 font-semibold text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">Loading outlets...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">No outlets found.</td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {c.phone ? (
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {c.phone}</span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.address ? (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {c.address}</span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteCustomer(c.id, c.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Delete Outlet"
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