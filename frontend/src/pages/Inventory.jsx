import { useState, useEffect, useCallback } from 'react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineExclamation, HiOutlineMinusSm, HiOutlinePlusSm } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { inventoryApi, INVENTORY_CATEGORIES } from '../api/inventoryApi';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { formatCurrency } from '../utils/formatters';

const categoryColors = {
  books: 'bg-blue-100 text-blue-700',
  drawing_book: 'bg-purple-100 text-purple-700',
  uniform: 'bg-green-100 text-green-700',
  notebooks: 'bg-yellow-100 text-yellow-700',
  scarf_cap: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-600',
};

const getCategoryLabel = (value) => INVENTORY_CATEGORIES.find(c => c.value === value)?.label || value;

const defaultForm = {
  name: '', category: 'books', description: '', quantity: 0,
  unitPrice: '', unit: 'pcs', lowStockThreshold: 10, isActive: true,
};

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [stockModal, setStockModal] = useState(null); // { item, adjustment: '' }
  const [adjusting, setAdjusting] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      const res = await inventoryApi.getAll(params);
      setItems(res.data.data);
    } catch (err) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleOpenForm = (item = null) => {
    if (item) {
      setEditing(item);
      const { name, category, description, quantity, unitPrice, unit, lowStockThreshold, isActive } = item;
      setFormData({ name, category, description: description || '', quantity, unitPrice, unit, lowStockThreshold, isActive });
    } else {
      setEditing(null);
      setFormData(defaultForm);
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const data = { ...formData, unitPrice: parseFloat(formData.unitPrice), quantity: parseInt(formData.quantity) };
      if (editing) {
        await inventoryApi.update(editing._id, data);
        toast.success('Item updated');
      } else {
        await inventoryApi.create(data);
        toast.success('Item added');
      }
      setShowForm(false);
      loadItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this inventory item?')) return;
    try {
      await inventoryApi.delete(id);
      toast.success('Item deleted');
      loadItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleStockAdjust = async (e) => {
    e.preventDefault();
    if (adjusting) return;
    const adj = parseInt(stockModal.adjustment);
    if (isNaN(adj) || adj === 0) { toast.error('Enter a valid adjustment value'); return; }
    setAdjusting(true);
    try {
      await inventoryApi.adjustStock(stockModal.item._id, adj);
      toast.success(`Stock ${adj > 0 ? 'added' : 'removed'} successfully`);
      setStockModal(null);
      loadItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Stock adjustment failed');
    } finally {
      setAdjusting(false);
    }
  };

  // Summary stats
  const totalItems = items.length;
  const totalValue = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const lowStockCount = items.filter(i => i.quantity <= i.lowStockThreshold).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Inventory</h1>
          <p className="text-gray-500">Manage school supplies and stock</p>
        </div>
        <button onClick={() => handleOpenForm()} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="h-5 w-5" /> Add Item
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalItems}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm text-gray-500">Total Stock Value</p>
          <p className="text-2xl font-bold text-primary-600 mt-1">{formatCurrency(totalValue)}</p>
        </div>
        <div className={`rounded-xl border shadow-sm p-4 ${lowStockCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
          <p className="text-sm text-gray-500">Low Stock Alerts</p>
          <p className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{lowStockCount}</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${!categoryFilter ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          All
        </button>
        {INVENTORY_CATEGORIES.map(cat => (
          <button key={cat.value} onClick={() => setCategoryFilter(cat.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${categoryFilter === cat.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? <Loader /> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Item</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Category</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Qty</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Unit Price</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Total Value</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 ? (
                  <tr><td colSpan="7" className="py-8 text-center text-gray-400">No inventory items found</td></tr>
                ) : (
                  items.map(item => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        {item.description && <div className="text-xs text-gray-400">{item.description}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[item.category] || 'bg-gray-100 text-gray-600'}`}>
                          {getCategoryLabel(item.category)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-semibold ${item.quantity <= item.lowStockThreshold ? 'text-red-600' : 'text-gray-900'}`}>
                          {item.quantity}
                        </span>
                        <span className="text-gray-400 ml-1 text-xs">{item.unit}</span>
                        {item.quantity <= item.lowStockThreshold && (
                          <HiOutlineExclamation className="inline h-4 w-4 text-red-500 ml-1" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-700">{formatCurrency(item.quantity * item.unitPrice)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setStockModal({ item, adjustment: '' })}
                            title="Adjust Stock"
                            className="p-1.5 hover:bg-gray-100 rounded text-blue-500 font-bold text-xs flex items-center gap-0.5">
                            <HiOutlineMinusSm className="h-3 w-3" /><HiOutlinePlusSm className="h-3 w-3" />
                          </button>
                          <button onClick={() => handleOpenForm(item)} className="p-1.5 hover:bg-gray-100 rounded">
                            <HiOutlinePencil className="h-4 w-4 text-blue-500" />
                          </button>
                          <button onClick={() => handleDelete(item._id)} className="p-1.5 hover:bg-gray-100 rounded">
                            <HiOutlineTrash className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? 'Edit Item' : 'Add Inventory Item'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Item Name *</label>
              <input type="text" className="input-field" required value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. English Textbook Std 5" />
            </div>
            <div>
              <label className="label">Category *</label>
              <select className="input-field" required value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                {INVENTORY_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Unit</label>
              <input type="text" className="input-field" value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="pcs / pair / set" />
            </div>
            <div>
              <label className="label">Quantity *</label>
              <input type="number" className="input-field" required min="0" value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
            </div>
            <div>
              <label className="label">Unit Price (INR) *</label>
              <input type="number" className="input-field" required min="0" value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })} />
            </div>
            <div>
              <label className="label">Low Stock Alert Threshold</label>
              <input type="number" className="input-field" min="0" value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="isActive" checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="h-4 w-4" />
              <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input-field" rows="2" value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">{submitting ? 'Saving...' : (editing ? 'Update' : 'Add Item')}</button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal isOpen={!!stockModal} onClose={() => setStockModal(null)} title="Adjust Stock" size="sm">
        {stockModal && (
          <form onSubmit={handleStockAdjust} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-medium">{stockModal.item.name}</p>
              <p className="text-gray-500">Current stock: <strong>{stockModal.item.quantity} {stockModal.item.unit}</strong></p>
            </div>
            <div>
              <label className="label">Adjustment</label>
              <p className="text-xs text-gray-400 mb-1">Use positive number to add stock, negative to remove.</p>
              <input type="number" className="input-field" required autoFocus
                placeholder="e.g. +50 or -10"
                value={stockModal.adjustment}
                onChange={(e) => setStockModal(prev => ({ ...prev, adjustment: e.target.value }))} />
            </div>
            {stockModal.adjustment !== '' && !isNaN(parseInt(stockModal.adjustment)) && (
              <div className="text-sm text-gray-600">
                New quantity: <strong>{stockModal.item.quantity + parseInt(stockModal.adjustment)} {stockModal.item.unit}</strong>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setStockModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={adjusting} className="btn-primary disabled:opacity-50">{adjusting ? 'Applying...' : 'Apply Adjustment'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Inventory;
