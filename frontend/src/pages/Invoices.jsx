import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlinePlus, HiOutlineEye, HiOutlineTrash } from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { fetchInvoices, fetchFees } from '../store/slices/feeSlice';
import { invoiceApi } from '../api/feeApi';
import { studentApi } from '../api/studentApi';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { formatDate, formatCurrency, getStatusColor } from '../utils/formatters';

const Invoices = () => {
  const dispatch = useDispatch();
  const { invoices, fees, invoicePagination, loading } = useSelector((state) => state.fees);
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [viewInvoice, setViewInvoice] = useState(null);
  const [formData, setFormData] = useState({
    student: '', parent: '', items: [{ fee: '', description: '', amount: 0 }],
    dueDate: '', academicYear: '2025-2026', term: '', tax: 0, discount: 0,
  });

  useEffect(() => {
    dispatch(fetchInvoices({ page, limit: 10, status: statusFilter || undefined }));
    dispatch(fetchFees({}));
  }, [dispatch, page, statusFilter]);

  useEffect(() => {
    if (isAdmin) {
      studentApi.getAll({ limit: 100 }).then(res => setStudents(res.data.data)).catch(() => {});
    }
  }, [isAdmin]);

  const classes = Array.from(new Set(students.map(s => s.class).filter(Boolean))).sort();

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { fee: '', description: '', amount: 0 }],
    }));
  };

  const handleRemoveItem = (idx) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleItemChange = (idx, field, value) => {
    setFormData(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      // Auto-fill from fee selection
      if (field === 'fee' && value) {
        const fee = fees.find(f => f._id === value);
        if (fee) {
          items[idx].description = fee.name;
          items[idx].amount = fee.amount;
        }
      }
      return { ...prev, items };
    });
  };

  const handleStudentSelect = (studentId) => {
    const student = students.find(s => s._id === studentId);
    setFormData(prev => ({
      ...prev,
      student: studentId,
      parent: student?.parent?._id || student?.parent || '',
    }));
  };

  const handleClassSelect = (cls) => {
    setSelectedClass(cls);
    // clear selected student when class changes
    setFormData(prev => ({ ...prev, student: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        items: formData.items.map(item => ({ ...item, amount: parseFloat(item.amount) })),
        tax: parseFloat(formData.tax) || 0,
        discount: parseFloat(formData.discount) || 0,
      };
      await invoiceApi.create(data);
      toast.success('Invoice created');
      setShowForm(false);
      dispatch(fetchInvoices({ page, limit: 10 }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    }
  };

  const handleWhatsAppShare = (invoice) => {
    const phone = invoice.parent?.phone;
    if (!phone) {
      toast.error('Parent phone number not available');
      return;
    }
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    // Add +91 country code if not already present
    if (!cleanPhone.startsWith('91')) {
      cleanPhone = '91' + cleanPhone;
    }
    const items = invoice.items?.map(item => `- ${item.description}: ${formatCurrency(item.amount)}`).join('\n') || '';
    const message = `*Abubakar Trust - Fee Invoice*

*Invoice:* ${invoice.invoiceNumber}
*Student:* ${invoice.student?.firstName} ${invoice.student?.lastName} (Class ${invoice.student?.class || ''})
*Date:* ${formatDate(invoice.createdAt)}

*Items:*
${items}

*Total:* ${formatCurrency(invoice.total)}
*Due Date:* ${formatDate(invoice.dueDate)}
*Status:* ${invoice.status?.replace('_', ' ')}${invoice.amountPaid != null ? `\n*Paid:* ${formatCurrency(invoice.amountPaid)}\n*Due:* ${formatCurrency(invoice.amountDue)}` : ''}

Thank you,
Abubakar Trust`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleViewInvoice = async (id) => {
    try {
      const res = await invoiceApi.getById(id);
      setViewInvoice(res.data.data);
    } catch (err) {
      toast.error('Failed to load invoice');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice? This cannot be undone.')) return;
    try {
      await invoiceApi.delete(id);
      toast.success('Invoice deleted');
      dispatch(fetchInvoices({ page, limit: 10, status: statusFilter || undefined }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete invoice');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500">Manage student invoices ({invoicePagination.total} total)</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="h-5 w-5" /> Create Invoice
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field w-48">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Table */}
      {loading ? <Loader /> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Invoice #</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Total</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Due Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.length === 0 ? (
                  <tr><td colSpan="6" className="py-8 text-center text-gray-400">No invoices found</td></tr>
                ) : (
                  invoices.map(inv => (
                    <tr key={inv._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4">{inv.student?.firstName} {inv.student?.lastName}</td>
                      <td className="py-3 px-4 font-semibold">{formatCurrency(inv.total)}</td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(inv.dueDate)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}>
                          {inv.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right flex items-center justify-end gap-1">
                        <button onClick={() => handleViewInvoice(inv._id)} className="p-1.5 hover:bg-gray-100 rounded">
                          <HiOutlineEye className="h-4 w-4 text-gray-500" />
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleDelete(inv._id)} className="p-1.5 hover:bg-gray-100 rounded">
                            <HiOutlineTrash className="h-4 w-4 text-red-500" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {invoicePagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">Page {invoicePagination.page} of {invoicePagination.pages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">Previous</button>
                <button onClick={() => setPage(p => Math.min(invoicePagination.pages, p + 1))}
                  disabled={page === invoicePagination.pages}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Invoice Modal */}
      <Modal isOpen={!!viewInvoice} onClose={() => setViewInvoice(null)} title="Invoice Details" size="lg">
        {viewInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Invoice #:</span> <strong>{viewInvoice.invoiceNumber}</strong></div>
              <div><span className="text-gray-500">Status:</span>{' '}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewInvoice.status)}`}>
                  {viewInvoice.status?.replace('_', ' ')}
                </span>
              </div>
              <div><span className="text-gray-500">Student:</span> <strong>{viewInvoice.student?.firstName} {viewInvoice.student?.lastName}</strong></div>
              <div><span className="text-gray-500">Due Date:</span> <strong>{formatDate(viewInvoice.dueDate)}</strong></div>
            </div>
            {isAdmin && (
              <div className="flex justify-end">
                <button onClick={() => handleWhatsAppShare(viewInvoice)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium">
                  <FaWhatsapp className="h-4 w-4" /> Share on WhatsApp
                </button>
              </div>
            )}
            <table className="w-full text-sm border-t mt-4">
              <thead><tr className="border-b"><th className="py-2 text-left text-gray-500">Item</th><th className="py-2 text-right text-gray-500">Amount</th></tr></thead>
              <tbody>
                {viewInvoice.items?.map((item, i) => (
                  <tr key={i} className="border-b"><td className="py-2">{item.description}</td><td className="py-2 text-right">{formatCurrency(item.amount)}</td></tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td className="py-2 font-medium">Subtotal</td><td className="py-2 text-right">{formatCurrency(viewInvoice.subtotal)}</td></tr>
                {viewInvoice.tax > 0 && <tr><td className="py-2">Tax</td><td className="py-2 text-right">{formatCurrency(viewInvoice.tax)}</td></tr>}
                {viewInvoice.discount > 0 && <tr><td className="py-2">Discount</td><td className="py-2 text-right">-{formatCurrency(viewInvoice.discount)}</td></tr>}
                <tr className="font-bold border-t"><td className="py-2">Total</td><td className="py-2 text-right">{formatCurrency(viewInvoice.total)}</td></tr>
                {viewInvoice.amountPaid != null && (
                  <>
                    <tr><td className="py-2 text-green-600">Paid</td><td className="py-2 text-right text-green-600">{formatCurrency(viewInvoice.amountPaid)}</td></tr>
                    <tr className="font-bold"><td className="py-2 text-red-600">Due</td><td className="py-2 text-right text-red-600">{formatCurrency(viewInvoice.amountDue)}</td></tr>
                  </>
                )}
              </tfoot>
            </table>
          </div>
        )}
      </Modal>

      {/* Create Invoice Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create Invoice" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Class</label>
              <select className="input-field" value={selectedClass} onChange={(e) => handleClassSelect(e.target.value)}>
                <option value="">All Classes</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Student *</label>
              <select className="input-field" required value={formData.student} onChange={(e) => handleStudentSelect(e.target.value)}>
                <option value="">Select Student</option>
                {students
                  .filter(s => !selectedClass || s.class === selectedClass)
                  .map(s => (
                    <option key={s._id} value={s._id}>{s.firstName} {s.lastName} (Class {s.class})</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="label">Due Date *</label>
              <input type="date" className="input-field" required value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Items</label>
            {formData.items.map((item, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <select className="input-field w-64" value={item.fee} onChange={(e) => handleItemChange(idx, 'fee', e.target.value)}>
                  <option value="">Select Fee</option>
                  {fees.map(f => <option key={f._id} value={f._id}>{f.name} ({formatCurrency(f.amount)})</option>)}
                </select>
                <input type="text" className="input-field flex-1" value={item.description}
                  onChange={(e) => handleItemChange(idx, 'description', e.target.value)} placeholder="Description" />
                <input type="number" className="input-field w-32" min="0" value={item.amount}
                  onChange={(e) => handleItemChange(idx, 'amount', e.target.value)} placeholder="Amount" />
                {formData.items.length > 1 && (
                  <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 px-2">X</button>
                )}
              </div>
            ))}
            <button type="button" onClick={handleAddItem} className="text-sm text-primary-600 hover:underline">+ Add Item</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tax</label>
              <input type="number" className="input-field" min="0" value={formData.tax}
                onChange={(e) => setFormData({ ...formData, tax: e.target.value })} />
            </div>
            <div>
              <label className="label">Discount</label>
              <input type="number" className="input-field" min="0" value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Invoice</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Invoices;