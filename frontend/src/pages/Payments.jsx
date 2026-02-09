import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlinePlus } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { fetchPayments, fetchInvoices } from '../store/slices/feeSlice';
import { paymentApi, invoiceApi } from '../api/feeApi';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { formatDate, formatCurrency, getStatusColor } from '../utils/formatters';

const Payments = () => {
  const dispatch = useDispatch();
  const { payments, paymentPagination, loading } = useSelector((state) => state.fees);
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formData, setFormData] = useState({
    invoice: '', amount: '', paymentMethod: 'cash', remarks: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    dispatch(fetchPayments({ page, limit: 10 }));
  }, [dispatch, page]);

  const loadPendingInvoices = async () => {
    try {
      const res = await invoiceApi.getAll({ status: 'pending', limit: 100 });
      const partialRes = await invoiceApi.getAll({ status: 'partially_paid', limit: 100 });
      setPendingInvoices([...res.data.data, ...partialRes.data.data]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenForm = () => {
    loadPendingInvoices();
    setShowForm(true);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await paymentApi.create({
        ...formData,
        amount: parseFloat(formData.amount),
      });
      toast.success('Payment recorded successfully');
      setShowForm(false);
      setSelectedInvoice(null);
      setFormData({
        invoice: '', amount: '', paymentMethod: 'cash', remarks: '',
        transactionDate: new Date().toISOString().split('T')[0],
      });
      dispatch(fetchPayments({ page, limit: 10 }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500">View and record payments ({paymentPagination.total} total)</p>
        </div>
        {isAdmin && (
          <button onClick={handleOpenForm} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="h-5 w-5" /> Record Payment
          </button>
        )}
      </div>

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
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setSelectedInvoice(null); }} title="Record Payment" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Select Invoice *</label>
            <select className="input-field" required value={formData.invoice} onChange={(e) => handleInvoiceSelect(e.target.value)}>
              <option value="">Select pending invoice</option>
              {pendingInvoices.map(inv => (
                <option key={inv._id} value={inv._id}>
                  {inv.invoiceNumber} - {inv.student?.firstName} {inv.student?.lastName} ({formatCurrency(inv.total)})
                </option>
              ))}
            </select>
          </div>

          {selectedInvoice && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <p><strong>Invoice:</strong> {selectedInvoice.invoiceNumber}</p>
              <p><strong>Total:</strong> {formatCurrency(selectedInvoice.total)}</p>
              <p><strong>Amount Due:</strong> {formatCurrency(selectedInvoice.amountDue)}</p>
            </div>
          )}

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

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => { setShowForm(false); setSelectedInvoice(null); }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Record Payment</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Payments;