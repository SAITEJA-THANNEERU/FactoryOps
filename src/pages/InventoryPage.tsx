import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  DollarSign,
  Truck,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { SparePart } from '../types';

export const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showOnlyLowStock, setShowOnlyLowStock] = useState<boolean>(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(10);

  // Form State
  const [formData, setFormData] = useState<Partial<SparePart>>({
    part_number: '',
    name: '',
    category: 'Mechanical',
    stock_quantity: 10,
    min_reorder_level: 5,
    unit_cost_usd: 50,
    supplier: '',
    location_bin: 'A-01-01'
  });

  const categories = ['All', 'Mechanical', 'Hydraulics', 'Electrical', 'Consumables', 'Tooling', 'Sensors'];

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.inventory.getAll();
      setParts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleSavePart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPart) {
        await api.inventory.update(editingPart.id, formData);
      } else {
        await api.inventory.create(formData);
      }
      setIsAddModalOpen(false);
      setEditingPart(null);
      resetForm();
      fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to save spare part');
    }
  };

  const handleRestock = async (part: SparePart) => {
    const newQty = part.stock_quantity + restockAmount;
    try {
      await api.inventory.update(part.id, {
        stock_quantity: newQty,
        last_restocked_at: new Date().toISOString()
      });
      setEditingPart(null);
      fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to restock item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this spare part item?')) return;
    try {
      await api.inventory.delete(id);
      fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to delete item');
    }
  };

  const resetForm = () => {
    setFormData({
      part_number: '',
      name: '',
      category: 'Mechanical',
      stock_quantity: 10,
      min_reorder_level: 5,
      unit_cost_usd: 50,
      supplier: '',
      location_bin: 'A-01-01'
    });
  };

  const openEditModal = (part: SparePart) => {
    setEditingPart(part);
    setFormData({
      part_number: part.part_number,
      name: part.name,
      category: part.category,
      stock_quantity: part.stock_quantity,
      min_reorder_level: part.min_reorder_level,
      unit_cost_usd: part.unit_cost_usd,
      supplier: part.supplier,
      location_bin: part.location_bin
    });
    setIsAddModalOpen(true);
  };

  const filteredParts = parts.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesLowStock = !showOnlyLowStock || p.stock_quantity <= p.min_reorder_level;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location_bin.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesLowStock && matchesSearch;
  });

  const lowStockParts = parts.filter(p => p.stock_quantity <= p.min_reorder_level);
  const totalValue = parts.reduce((sum, p) => sum + p.stock_quantity * p.unit_cost_usd, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans text-[#191923]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#191923] flex items-center gap-3">
            <Package className="w-6 h-6 text-[#0E79B2]" />
            Spare Parts & Inventory Management
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Inventory levels, reorder alerts, supplier information, and maintenance-related parts.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchInventory}
            className="p-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER_SUPERVISOR' || user?.role === 'TECHNICIAN') && (
            <button
              onClick={() => {
                resetForm();
                setEditingPart(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#0E79B2] hover:bg-[#0c6799] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Spare Part</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#191923]/10 rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 border border-blue-100 text-[#0E79B2] rounded-lg">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#191923] font-mono">{parts.length}</div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Part SKUs</div>
          </div>
        </div>

        <div className="bg-white border border-[#191923]/10 rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-600 rounded-lg">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600 font-mono">{lowStockParts.length}</div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Low Stock SKUs</div>
          </div>
        </div>

        <div className="bg-white border border-[#191923]/10 rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#191923] font-mono">${totalValue.toLocaleString('en-US')}</div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Valuation</div>
          </div>
        </div>

        <div className="bg-white border border-[#191923]/10 rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-lg">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#191923] font-mono">
              {new Set(parts.map(p => p.supplier)).size}
            </div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Approved Suppliers</div>
          </div>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockParts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-amber-900 shadow-2xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="font-bold text-sm">
                Attention: {lowStockParts.length} spare part SKU(s) have reached critical reorder thresholds!
              </div>
              <div className="text-xs text-amber-800/90 font-medium">
                {lowStockParts.map(p => p.name).join(', ')}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowOnlyLowStock(prev => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold self-start md:self-auto transition-colors cursor-pointer border ${
              showOnlyLowStock
                ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
            }`}
          >
            {showOnlyLowStock ? 'Show All Inventory SKUs' : 'View Low Stock SKUs'}
          </button>
        </div>
      )}

      {showOnlyLowStock && (
        <div className="flex items-center justify-between bg-amber-100/80 border border-amber-300 px-4 py-2 rounded-lg text-xs text-amber-900 font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span>Showing Low Stock SKUs only ({filteredParts.length} matching items).</span>
          </div>
          <button
            onClick={() => setShowOnlyLowStock(false)}
            className="text-amber-900 hover:text-amber-950 font-bold underline cursor-pointer"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Search & Category Filter Section */}
      <div className="bg-white border border-[#191923]/10 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by part number, name, location or supplier..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#0E79B2]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#0E79B2] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Inventory Table Container (15 records visible with sticky header and summary footer) */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0E79B2]" />
            Loading spare parts catalog...
          </div>
        ) : error ? (
          <div className="py-8 text-center text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-lg font-medium">
            {error}
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No spare parts match your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto min-w-[850px]">
            <div className="overflow-y-auto max-h-[615px] border border-slate-200 rounded-lg relative">
              <table className="w-full text-left border-collapse text-xs">
                {/* Fixed Sticky Header */}
                <thead className="sticky top-0 z-20 bg-slate-100 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider shadow-xs border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 bg-slate-100">Part # / Name</th>
                    <th className="py-2.5 px-4 bg-slate-100">Category</th>
                    <th className="py-2.5 px-4 bg-slate-100">Bin Location</th>
                    <th className="py-2.5 px-4 bg-slate-100">Stock Level</th>
                    <th className="py-2.5 px-4 bg-slate-100 text-right">Unit Cost</th>
                    <th className="py-2.5 px-4 bg-slate-100">Supplier</th>
                    <th className="py-2.5 px-4 bg-slate-100 text-center">Actions</th>
                  </tr>
                </thead>

                {/* Vertically Scrollable Body (15 rows visible) */}
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredParts.map(part => {
                    const isLow = part.stock_quantity <= part.min_reorder_level;
                    return (
                      <tr key={part.id} className="hover:bg-slate-50/80 transition-colors h-[41px]">
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-900">{part.name}</div>
                          <div className="text-[10.5px] text-[#0E79B2] font-mono font-medium">{part.part_number}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {part.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-semibold text-slate-700 text-xs">
                          {part.location_bin}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold font-mono text-xs ${
                                isLow ? 'text-amber-600' : 'text-emerald-600'
                              }`}
                            >
                              {part.stock_quantity}
                            </span>
                            <span className="text-[10.5px] text-slate-400">/ min {part.min_reorder_level}</span>
                            {isLow && (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-600" /> Low Stock
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-800 text-right">
                          ${part.unit_cost_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 text-xs font-medium text-slate-600">
                          {part.supplier}
                        </td>
                        <td className="py-2.5 px-4 text-center space-x-1.5">
                          <button
                            onClick={() => {
                              setEditingPart(part);
                              setRestockAmount(10);
                            }}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10.5px] font-bold transition-colors cursor-pointer"
                            title="Quick Restock"
                          >
                            Restock
                          </button>
                          <button
                            onClick={() => openEditModal(part)}
                            className="p-1 text-slate-400 hover:text-[#0E79B2] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Edit Part"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(part.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Delete Part"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Permanently Visible Non-Scrolling Summary Footer */}
                {filteredParts.length > 0 && (
                  <tfoot className="sticky bottom-0 z-20 bg-slate-50 font-bold text-xs text-slate-900 border-t-2 border-slate-200 shadow-md">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-4 uppercase tracking-wider text-slate-600 bg-slate-50">
                        Total / Summary ({filteredParts.length} SKUs Listed)
                      </td>
                      <td className="py-2.5 px-4 bg-slate-50 font-mono text-amber-700">
                        {filteredParts.filter(p => p.stock_quantity <= p.min_reorder_level).length} Low Stock SKUs
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[#0E79B2] bg-slate-50">
                        ${filteredParts.reduce((sum, p) => sum + p.stock_quantity * p.unit_cost_usd, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td colSpan={2} className="bg-slate-50"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Part Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-900">
            <h2 className="text-base font-bold text-[#191923] flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 pb-3">
              <Package className="w-5 h-5 text-[#0E79B2]" />
              {editingPart ? 'Edit Spare Part Details' : 'Add New Spare Part SKU'}
            </h2>

            <form onSubmit={handleSavePart} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Part Number / SKU</label>
                  <input
                    type="text"
                    required
                    value={formData.part_number}
                    onChange={e => setFormData({ ...formData, part_number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-1 focus:ring-[#0E79B2]"
                    placeholder="e.g. SKF-7014-ACD"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-1 focus:ring-[#0E79B2]"
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Part Name / Description</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-1 focus:ring-[#0E79B2]"
                  placeholder="e.g. Spindle High-Precision Ceramic Bearing"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock_quantity}
                    onChange={e => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-1 focus:ring-[#0E79B2]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reorder Threshold</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.min_reorder_level}
                    onChange={e => setFormData({ ...formData, min_reorder_level: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-1 focus:ring-[#0E79B2]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.unit_cost_usd}
                    onChange={e => setFormData({ ...formData, unit_cost_usd: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-1 focus:ring-[#0E79B2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bin Location</label>
                  <input
                    type="text"
                    required
                    value={formData.location_bin}
                    onChange={e => setFormData({ ...formData, location_bin: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-1 focus:ring-[#0E79B2]"
                    placeholder="e.g. A-12-04"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier Name</label>
                  <input
                    type="text"
                    required
                    value={formData.supplier}
                    onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-1 focus:ring-[#0E79B2]"
                    placeholder="e.g. SKF Industrial Motion"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0E79B2] hover:bg-[#0c6799] text-white text-xs rounded-lg font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  Save Spare Part
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Restock Dialog */}
      {editingPart && !isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900">
            <h2 className="text-base font-bold text-[#191923] flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 pb-3">
              <RefreshCw className="w-5 h-5 text-emerald-600" />
              Restock SKU: {editingPart.name}
            </h2>

            <p className="text-xs text-slate-600">
              Current stock level: <span className="text-slate-900 font-mono font-bold">{editingPart.stock_quantity}</span> (Reorder threshold: {editingPart.min_reorder_level})
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Quantity Received</label>
              <input
                type="number"
                min="1"
                value={restockAmount}
                onChange={e => setRestockAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-emerald-500 font-mono text-base font-bold"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingPart(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRestock(editingPart)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg font-bold shadow-2xs transition-colors cursor-pointer"
              >
                Confirm Restock (+{restockAmount})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
