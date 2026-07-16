import { useState, useEffect, useMemo } from 'react';
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

function getCurrentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

const defaultFormData = {
  student: '', parent: '', selectedClass: '',
  items: [{ fee: '', description: '', amount: 0 }],
  dueDate: '', academicYear: getCurrentAcademicYear(), term: '',
  tax: 0, discount: 0,
  startMonth: `${new Date().getFullYear()}-01`,
  dueDayOfMonth: 10,
};

const Invoices = () => {
  const dispatch = useDispatch();
  const { invoices, fees, invoicePagination, loading } = useSelector((state) => state.fees);
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [invoiceMode, setInvoiceMode] = useState('single'); // 'single' | 'bulk'
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    dispatch(fetchInvoices({ page, limit: 10, status: statusFilter || undefined }));
    dispatch(fetchFees({}));
  }, [dispatch, page, statusFilter]);

  useEffect(() => {
    if (isAdmin) {
      studentApi.getAll({ limit: 100 }).then(res => setStudents(res.data.data)).catch(() => {});
    }
  }, [isAdmin]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students.slice(0, 20);
    const q = studentSearch.toLowerCase();
    return students.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.admissionNumber?.toLowerCase().includes(q) ||
      s.class?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [studentSearch, students]);

  const handleCloseForm = () => {
    setShowForm(false);
    setInvoiceMode('single');
    setFormData(defaultFormData);
    setStudentSearch('');
    setSelectedStudent(null);
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setStudentSearch(`${student.firstName} ${student.lastName}`);
    setFormData(prev => ({
      ...prev,
      student: student._id,
      parent: student?.parent?._id || student?.parent || '',
    }));
  };

  const handleItemChange = (idx, field, value) => {
    setFormData(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (invoiceMode === 'single') {
        const data = {
          ...formData,
          items: formData.items.map(item => ({ ...item, amount: parseFloat(item.amount) })),
          tax: parseFloat(formData.tax) || 0,
          discount: parseFloat(formData.discount) || 0,
        };
        await invoiceApi.create(data);
        toast.success('Invoice created');
      } else {
        if (!formData.items[0].description) {
          toast.error('Please add at least one fee item');
          setSubmitting(false);
          return;
        }
        const [startYear, startMonthNum] = formData.startMonth.split('-').map(Number);
        const promises = [];
        for (let i = 0; i < 12; i++) {
          const monthDate = new Date(startYear, startMonthNum - 1 + i, 1);
          const dueDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), parseInt(formData.dueDayOfMonth));
          const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
          const items = formData.items
            .filter(item => item.description)
            .map(item => ({ ...item, amount: parseFloat(item.amount), description: `${item.description} - ${monthName}` }));
          const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
          const tax = parseFloat(formData.tax) || 0;
          const discount = parseFloat(formData.discount) || 0;
          promises.push(invoiceApi.create({
            student: formData.student,
            parent: formData.parent,
            items,
            dueDate: dueDate.toISOString().split('T')[0],
            academicYear: formData.academicYear,
            term: monthName,
            tax,
            discount,
            subtotal,
            total: subtotal + tax - discount,
          }));
        }
        await Promise.all(promises);
        toast.success('12 monthly invoices created successfully');
      }
      handleCloseForm();
      dispatch(fetchInvoices({ page, limit: 10, status: statusFilter || undefined }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsAppShare = (invoice) => {
    const phone = invoice.parent?.phone;
    if (!phone) {
      toast.error('Parent phone number not available');
      return;
    }
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone.startsWith('91')) cleanPhone = '91' + cleanPhone;
    const items = invoice.items?.map(item => `- ${item.description}: ${formatCurrency(item.amount)}`).join('\n') || '';
    const message = `*Abubakar English School - Fee Invoice*

*Invoice:* ${invoice.invoiceNumber}
*Student:* ${invoice.student?.firstName} ${invoice.student?.lastName} (Class ${invoice.student?.class || ''})
*Date:* ${formatDate(invoice.createdAt)}

*Items:*
${items}

*Total:* ${formatCurrency(invoice.total)}
*Due Date:* ${formatDate(invoice.dueDate)}
*Status:* ${invoice.status?.replace('_', ' ')}${invoice.amountPaid != null ? `\n*Paid:* ${formatCurrency(invoice.amountPaid)}\n*Due:* ${formatCurrency(invoice.amountDue)}` : ''}

Thank you,
Abubakar English School`;
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

      {/* Create Invoice Modal (single + bulk merged) */}
      <Modal isOpen={showForm} onClose={handleCloseForm} title="Create Invoice" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Mode Toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
            <button
              type="button"
              onClick={() => setInvoiceMode('single')}
              className={`flex-1 py-2 transition-colors ${invoiceMode === 'single' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              Single Invoice
            </button>
            <button
              type="button"
              onClick={() => setInvoiceMode('bulk')}
              className={`flex-1 py-2 transition-colors ${invoiceMode === 'bulk' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              12 Monthly
            </button>
          </div>

          {/* Student Search */}
          <div className="relative">
            <label className="label">Search Student *</label>
            <input
              type="text"
              className="input-field"
              placeholder="Type name or admission number..."
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value);
                setSelectedStudent(null);
                setFormData(prev => ({ ...prev, student: '', parent: '' }));
              }}
            />
            {studentSearch && !selectedStudent && filteredStudents.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                {filteredStudents.map(s => (
                  <button key={s._id} type="button"
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                    onClick={() => handleStudentSelect(s)}>
                    <span className="font-medium">{s.firstName} {s.lastName}</span>
                    <span className="text-gray-400 ml-2 text-xs">Class {s.class} · {s.admissionNumber}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedStudent && (
              <p className="text-xs text-green-600 mt-1">
                Selected: <strong>{selectedStudent.firstName} {selectedStudent.lastName}</strong> — Class {selectedStudent.class}
              </p>
            )}
            {/* Hidden required input to trigger form validation if no student selected */}
            <input type="text" required className="sr-only" value={formData.student} readOnly tabIndex={-1} />
          </div>

          {/* Academic Year */}
          <div>
            <label className="label">Academic Year *</label>
            <input type="text" className="input-field" required placeholder="e.g. 2026-2027"
              value={formData.academicYear}
              onChange={(e) => setFormData(prev => ({ ...prev, academicYear: e.target.value }))} />
          </div>

          {/* Due Date (single) OR Start Month + Due Day (bulk) */}
          {invoiceMode === 'single' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Due Date *</label>
                <input type="date" className="input-field" required value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Start Month *</label>
                <input type="month" className="input-field" required value={formData.startMonth}
                  onChange={(e) => setFormData(prev => ({ ...prev, startMonth: e.target.value }))} />
              </div>
              <div>
                <label className="label">Due Day of Month</label>
                <input type="number" className="input-field" min="1" max="28" value={formData.dueDayOfMonth}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDayOfMonth: e.target.value }))} />
              </div>
            </div>
          )}

          {/* Fee Items */}
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
                  <button type="button"
                    onClick={() => setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))}
                    className="text-red-500 px-2">X</button>
                )}
              </div>
            ))}
            <button type="button"
              onClick={() => setFormData(prev => ({ ...prev, items: [...prev.items, { fee: '', description: '', amount: 0 }] }))}
              className="text-sm text-primary-600 hover:underline">+ Add Item</button>
          </div>

          {/* Tax + Discount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{invoiceMode === 'bulk' ? 'Tax (per invoice)' : 'Tax'}</label>
              <input type="number" className="input-field" min="0" value={formData.tax}
                onChange={(e) => setFormData(prev => ({ ...prev, tax: e.target.value }))} />
            </div>
            <div>
              <label className="label">{invoiceMode === 'bulk' ? 'Discount (per invoice)' : 'Discount'}</label>
              <input type="number" className="input-field" min="0" value={formData.discount}
                onChange={(e) => setFormData(prev => ({ ...prev, discount: e.target.value }))} />
            </div>
          </div>

          {/* Bulk info banner */}
          {invoiceMode === 'bulk' && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              This will create <strong>12 invoices</strong> — one per month starting from the selected month.
              Each item description will include the month name.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={handleCloseForm} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting
                ? (invoiceMode === 'bulk' ? 'Generating...' : 'Creating...')
                : (invoiceMode === 'bulk' ? 'Generate 12 Invoices' : 'Create Invoice')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Invoices;
