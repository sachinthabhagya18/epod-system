// app/products/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UploadCloud, CheckCircle2, AlertCircle, Search, ArrowLeft, Package, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  productCode: string;
  productName: string;
  category: string | null;
  unit: string;
}

export default function ProductsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProducts = async (q = '') => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    fetchProducts(val);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/products/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setFile(null);
        fetchProducts();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to upload file.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error communicating with the server.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProduct = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete product "${code}"?`)) return;

    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert('Failed to delete product.');
      }
    } catch (err) {
      alert('Network error.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link href="/dashboard" className="text-sm font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1 mb-1">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-teal-600" /> Products Master Catalog
            </h1>
            <p className="text-sm text-slate-500">Upload, manage, and delete warehouse catalog products</p>
          </div>
        </div>

        {/* Excel Upload Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-teal-600" /> Bulk Product Import
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Supported columns: <strong>Product Code</strong> (or SKU), <strong>Product Name</strong>, <strong>Category</strong>, <strong>Unit</strong>.
          </p>

          <form onSubmit={handleUpload} className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer border border-slate-200 rounded-lg p-1"
            />
            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 text-white font-medium text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50 transition shrink-0"
            >
              {uploading ? 'Processing...' : 'Upload Excel'}
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" /> : <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />}
              <span>{message.text}</span>
            </div>
          )}
        </div>

        {/* Products Search & Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
            <h3 className="font-semibold text-slate-800">Master Catalog Items ({products.length})</h3>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by code or title..."
                value={search}
                onChange={handleSearchChange}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-3 px-4 font-semibold">SKU / Code</th>
                  <th className="py-3 px-4 font-semibold">Product Name</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Unit</th>
                  <th className="py-3 px-4 font-semibold text-center w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">Loading catalog items...</td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-medium text-teal-700">{p.productCode}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{p.productName}</td>
                      <td className="py-3 px-4 text-slate-500">{p.category || '-'}</td>
                      <td className="py-3 px-4 text-slate-500">{p.unit}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.productCode)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Delete Product"
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
    </div>
  );
}