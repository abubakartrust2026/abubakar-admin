import { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Papa from 'papaparse';
import { HiOutlinePlus, HiOutlineDownload, HiOutlineUpload } from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { fetchPayments } from '../store/slices/feeSlice';
import { paymentApi, invoiceApi } from '../api/feeApi';
import { studentApi } from '../api/studentApi';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { formatDate, formatCurrency, getStatusColor } from '../utils/formatters';

const PAYMENT_METHODS = ['cash', 'card', 'online', 'bank_transfer', 'cheque'];

const Payments = () => {
  const dispatch = useDispatch();
  const { payments, paymentPagination, loading } = useSelector((state) => state.fees);
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentInvoices, setStudentInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingReceipt, setPendingReceipt] = useState(null);
  const [formData, setFormData] = useState({
    invoice: '', amount: '', paymentMethod: 'cash', remarks: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });
  const fileInputRef = useRef(null);
  const [importRows, setImportRows] = useState([]);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    dispatch(fetchPayments({ page, limit: 10 }));
  }, [dispatch, page]);

  const loadStudents = async () => {
    setStudentsLoading(true);
    try {
      const res = await studentApi.getAll({ limit: 200, status: 'active' });
      setAllStudents(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleOpenForm = () => {
    loadStudents();
    setShowForm(true);
  };

  // Show dropdown when focused (even empty) OR when typing without a selection
  const showDropdown = searchFocused && !selectedStudent;

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return allStudents.slice(0, 20);
    const q = studentSearch.toLowerCase();
    return allStudents.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.admissionNumber?.toLowerCase().includes(q) ||
      s.class?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [studentSearch, allStudents]);

  const handleStudentSelect = async (student) => {
    setSelectedStudent(student);
    setStudentSearch(`${student.firstName} ${student.lastName}`);
    setSearchFocused(false);
    setSelectedInvoice(null);
    setFormData(prev => ({ ...prev, invoice: '', amount: '' }));
    setInvoicesLoading(true);
    try {
      const [pendingRes, partialRes] = await Promise.all([
        invoiceApi.getAll({ studentId: student._id, status: 'pending', limit: 50 }),
        invoiceApi.getAll({ studentId: student._id, status: 'partially_paid', limit: 50 }),
      ]);
      setStudentInvoices([...pendingRes.data.data, ...partialRes.data.data]);
    } catch (err) {
      toast.error('Failed to load invoices for this student');
      setStudentInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleInvoiceSelect = async (invoiceId) => {
    setFormData(prev => ({ ...prev, invoice: invoiceId }));
    if (invoiceId) {
      try {
        const res = await invoiceApi.getById(invoiceId);
        setSelectedInvoice(res.data.data);
        setFormData(prev => ({ ...prev, amount: res.data.data.amountDue || res.data.data.total }));
      } catch (err) {
        console.error(err);
      }
    } else {
      setSelectedInvoice(null);
    }
  };

  const handleWhatsAppNotify = (payment, invoice) => {
    const phone = invoice?.parent?.phone;
    if (!phone) {
      toast.warn('Parent phone not set — WhatsApp receipt not sent');
      return;
    }
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone.startsWith('91')) cleanPhone = '91' + cleanPhone;
    const student = invoice?.student;
    const message = `*Abubakar English School - Payment Receipt*

*Receipt #:* ${payment.receiptNumber}
*Student:* ${student?.firstName} ${student?.lastName} (Class ${student?.class || ''})
*Amount Paid:* ${formatCurrency(payment.amount)}
*Payment Method:* ${payment.paymentMethod?.replace('_', ' ')}
*Date:* ${formatDate(payment.transactionDate)}
*Invoice #:* ${invoice?.invoiceNumber}
*Status:* ${invoice?.status?.replace('_', ' ')}

Thank you for your payment,
Abubakar English School`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await paymentApi.create({
        ...formData,
        amount: parseFloat(formData.amount),
      });
      const newPayment = res.data.data;
      toast.success('Payment recorded successfully');

      if (selectedInvoice) {
        setPendingReceipt({ payment: newPayment, invoiceId: selectedInvoice._id });
      }

      setShowForm(false);
      resetForm();
      dispatch(fetchPayments({ page, limit: 10 }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendPendingReceipt = async () => {
    if (!pendingReceipt) return;
    try {
      const invRes = await invoiceApi.getById(pendingReceipt.invoiceId);
      handleWhatsAppNotify(pendingReceipt.payment, invRes.data.data);
    } catch (err) {
      toast.error('Failed to load invoice details for WhatsApp receipt');
    } finally {
      setPendingReceipt(null);
    }
  };

  const resetForm = () => {
    setStudentSearch('');
    setSearchFocused(false);
    setSelectedStudent(null);
    setStudentInvoices([]);
    setInvoicesLoading(false);
    setSelectedInvoice(null);
    setFormData({
      invoice: '', amount: '', paymentMethod: 'cash', remarks: '',
      transactionDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleExportExcel = async () => {
    try {
      toast.info('Preparing export...');
      const res = await paymentApi.getAll({ limit: 10000 });
      const allPayments = res.data.data;
      if (!allPayments.length) {
        toast.info('No payments to export');
        return;
      }
      const headers = ['Receipt #', 'Student', 'Class', 'Invoice #', 'Amount', 'Method', 'Date', 'Status', 'Remarks'];
      const rows = allPayments.map(p => [
        p.receiptNumber,
        `${p.student?.firstName || ''} ${p.student?.lastName || ''}`.trim(),
        p.student?.class || '',
        p.invoice?.invoiceNumber || '',
        p.amount,
        p.paymentMethod?.replace('_', ' ') || '',
        formatDate(p.transactionDate),
        p.status,
        p.remarks || '',
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${allPayments.length} payments`);
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const validateImportRow = (row) => {
    const invoiceNumber = (row['Invoice #'] || row.invoiceNumber || '').trim();
    const amount = parseFloat(row['Amount'] || row.amount);
    const paymentMethod = (row['Payment Method'] || row.paymentMethod || '').trim().toLowerCase();
    const transactionDate = (row['Transaction Date'] || row.transactionDate || '').trim();
    const remarks = (row['Remarks'] || row.remarks || '').trim();

    let error = '';
    if (!invoiceNumber) error = 'Invoice # is required';
    else if (!amount || amount <= 0) error = 'Amount must be a positive number';
    else if (!PAYMENT_METHODS.includes(paymentMethod)) error = `Invalid payment method: ${paymentMethod || '(blank)'}`;

    return { invoiceNumber, amount, paymentMethod, transactionDate, remarks, error };
  };

  const handleImportFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.map(validateImportRow);
        if (rows.length === 0) {
          toast.error('No rows found in CSV');
          return;
        }
        setImportRows(rows);
        setShowImportPreview(true);
      },
      error: () => toast.error('Failed to parse CSV file'),
    });
  };

  const handleConfirmImport = async () => {
    const validRows = importRows.filter(r => !r.error);
    if (validRows.length === 0 || importing) return;
    setImporting(true);
    try {
      const res = await paymentApi.bulkCreate({
        payments: validRows.map(r => ({
          invoiceNumber: r.invoiceNumber,
          amount: r.amount,
          paymentMethod: r.paymentMethod,
          transactionDate: r.transactionDate || undefined,
          remarks: r.remarks,
        })),
      });
      const { created, failed } = res.data.data;
      if (created.length > 0) {
        toast.success(`${created.length} payment(s) imported successfully`);
        dispatch(fetchPayments({ page, limit: 10 }));
      }
      if (failed.length > 0) {
        toast.warn(`${failed.length} row(s) failed — see preview for details`);
        const failedByInvoice = new Map(failed.map(f => [f.row.invoiceNumber, f.error]));
        setImportRows(prev => prev.map(r => {
          if (r.error) return r;
          const serverError = failedByInvoice.get(r.invoiceNumber);
          return serverError ? { ...r, error: serverError } : null;
        }).filter(Boolean));
        return;
      }
      setShowImportPreview(false);
      setImportRows([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const validImportCount = importRows.filter(r => !r.error).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500">View and record payments ({paymentPagination.total} total)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-2">
            <HiOutlineDownload className="h-5 w-5" /> Export
          </button>
          {isAdmin && (
            <>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportFileSelect} />
              <button onClick={() => fileInputRef.current?.click()} className="btn-secondary flex items-center gap-2">
                <HiOutlineUpload className="h-5 w-5" /> Import CSV
              </button>
              <button onClick={handleOpenForm} className="btn-primary flex items-center gap-2">
                <HiOutlinePlus className="h-5 w-5" /> Record Payment
              </button>
            </>
          )}
        </div>
      </div>

      {pendingReceipt && (
        <div className="flex items-center justify-between gap-3 p-3 mb-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <div className="flex items-center gap-2">
            <FaWhatsapp className="h-4 w-4" />
            <span>Payment recorded. Send a WhatsApp receipt to the parent?</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleSendPendingReceipt} className="btn-primary py-1 px-3 text-xs">
              Send WhatsApp Receipt
            </button>
            <button type="button" onClick={() => setPendingReceipt(null)} className="btn-secondary py-1 px-3 text-xs">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {loading ? <Loader /> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Receipt #</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Invoice</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Method</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.length === 0 ? (
                  <tr><td colSpan="7" className="py-8 text-center text-gray-400">No payments found</td></tr>
                ) : (
                  payments.map(payment => (
                    <tr key={payment._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-xs">{payment.receiptNumber}</td>
                      <td className="py-3 px-4">{payment.student?.firstName} {payment.student?.lastName}</td>
                      <td className="py-3 px-4 text-xs text-gray-500">{payment.invoice?.invoiceNumber}</td>
                      <td className="py-3 px-4 font-semibold text-green-600">{formatCurrency(payment.amount)}</td>
                      <td className="py-3 px-4 capitalize text-gray-600">{payment.paymentMethod?.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(payment.transactionDate)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {paymentPagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">Page {paymentPagination.page} of {paymentPagination.pages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">Previous</button>
                <button onClick={() => setPage(p => Math.min(paymentPagination.pages, p + 1))}
                  disabled={page === paymentPagination.pages}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }} title="Record Payment" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Student Search */}
          <div className="relative">
            <label className="label">Search Student *</label>
            <input
              type="text"
              className="input-field"
              placeholder="Type name or admission number..."
              value={studentSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              onChange={(e) => {
                setStudentSearch(e.target.value);
                setSelectedStudent(null);
                setStudentInvoices([]);
                setSelectedInvoice(null);
                setFormData(prev => ({ ...prev, invoice: '', amount: '' }));
              }}
            />
            {/* Loading students */}
            {studentsLoading && (
              <p className="text-xs text-gray-400 mt-1">Loading students...</p>
            )}
            {/* Dropdown */}
            {showDropdown && !studentsLoading && (
              <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-400">No students found.</p>
                ) : (
                  filteredStudents.map(s => (
                    <button key={s._id} type="button"
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                      onMouseDown={() => handleStudentSelect(s)}>
                      <span className="font-medium">{s.firstName} {s.lastName}</span>
                      <span className="text-gray-400 ml-2 text-xs">Class {s.class} · {s.admissionNumber}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Invoice Selection — shown after student selected */}
          {selectedStudent && (
            <div>
              <label className="label">Select Invoice *</label>
              {invoicesLoading ? (
                <p className="text-sm text-gray-400 py-2">Loading invoices...</p>
              ) : studentInvoices.length === 0 ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                  No pending or partially paid invoices for this student.
                </div>
              ) : (
                <select className="input-field" required value={formData.invoice}
                  onChange={(e) => handleInvoiceSelect(e.target.value)}>
                  <option value="">Select invoice</option>
                  {studentInvoices.map(inv => (
                    <option key={inv._id} value={inv._id}>
                      {inv.invoiceNumber} — Total: {formatCurrency(inv.total)}
                      {inv.status === 'partially_paid' ? ' (Partial)' : ''} · Due: {formatDate(inv.dueDate)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Selected invoice details */}
          {selectedInvoice && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm space-y-1">
              <p><strong>Invoice:</strong> {selectedInvoice.invoiceNumber}</p>
              <p><strong>Total:</strong> {formatCurrency(selectedInvoice.total)}</p>
              <p><strong>Amount Paid:</strong> {formatCurrency(selectedInvoice.amountPaid ?? 0)}</p>
              <p className="text-primary-700 font-semibold"><strong>Amount Due:</strong> {formatCurrency(selectedInvoice.amountDue)}</p>
            </div>
          )}

          {/* Payment fields — only show once an invoice is selected */}
          {selectedInvoice && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Amount (INR) *</label>
                  <input type="number" className="input-field" required min="1" value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                </div>
                <div>
                  <label className="label">Payment Method *</label>
                  <select className="input-field" value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="online">Online</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Transaction Date</label>
                <input type="date" className="input-field" value={formData.transactionDate}
                  onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })} />
              </div>

              <div>
                <label className="label">Remarks</label>
                <textarea className="input-field" rows="2" value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
              </div>

              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                <FaWhatsapp className="h-4 w-4" />
                <span>WhatsApp receipt will be sent to parent after recording.</span>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit"
              disabled={!selectedStudent || !formData.invoice || !selectedInvoice || isSubmitting}
              className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Import CSV Preview Modal */}
      <Modal isOpen={showImportPreview} onClose={() => { setShowImportPreview(false); setImportRows([]); }} title="Import Payments from CSV" size="xl">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Expected columns: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">Invoice #, Amount, Payment Method, Transaction Date, Remarks</code>
          </p>
          <p className="text-sm">
            <span className="text-green-600 font-medium">{validImportCount} valid</span>
            {importRows.length - validImportCount > 0 && (
              <span className="text-red-600 font-medium ml-3">{importRows.length - validImportCount} with errors</span>
            )}
          </p>
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Invoice #</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Amount</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Method</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Date</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Remarks</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {importRows.map((row, idx) => (
                  <tr key={idx} className={row.error ? 'bg-red-50' : ''}>
                    <td className="py-2 px-3">{row.invoiceNumber || '—'}</td>
                    <td className="py-2 px-3">{row.amount || '—'}</td>
                    <td className="py-2 px-3 capitalize">{row.paymentMethod || '—'}</td>
                    <td className="py-2 px-3">{row.transactionDate || '—'}</td>
                    <td className="py-2 px-3 text-gray-500">{row.remarks || '—'}</td>
                    <td className="py-2 px-3 text-red-600 text-xs">{row.error || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => { setShowImportPreview(false); setImportRows([]); }} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleConfirmImport} disabled={validImportCount === 0 || importing}
              className="btn-primary disabled:opacity-50">
              {importing ? 'Importing...' : `Confirm Import (${validImportCount})`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Payments;
