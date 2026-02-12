import { useState, useEffect } from 'react';
import {
  HiOutlineCurrencyRupee, HiOutlineExclamation,
  HiOutlineCreditCard, HiOutlineDocumentText,
} from 'react-icons/hi';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import { toast } from 'react-toastify';
import { reportApi } from '../api/reportApi';
import StatsCard from '../components/dashboard/StatsCard';
import Loader from '../components/common/Loader';
import { formatCurrency, formatDate, getStatusColor } from '../utils/formatters';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const CLASS_OPTIONS = ['Jr. KG', 'Sr. KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const tabs = [
  { id: 'fee-collection', label: 'Fee Collection' },
  { id: 'outstanding-dues', label: 'Outstanding Dues' },
  { id: 'payment-history', label: 'Payment History' },
  { id: 'class-wise-summary', label: 'Class-wise Summary' },
];

const Reports = () => {
  const [activeTab, setActiveTab] = useState('fee-collection');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', classFilter: '', paymentMethod: '' });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchReportData = async (tab = activeTab, page = 1) => {
    setLoading(true);
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.classFilter) params.classFilter = filters.classFilter;
      if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
      if (tab === 'outstanding-dues' || tab === 'payment-history') {
        params.page = page;
        params.limit = 20;
      }

      let res;
      switch (tab) {
        case 'fee-collection': res = await reportApi.getFeeCollection(params); break;
        case 'outstanding-dues': res = await reportApi.getOutstandingDues(params); break;
        case 'payment-history': res = await reportApi.getPaymentHistory(params); break;
        case 'class-wise-summary': res = await reportApi.getClassWiseSummary(params); break;
      }
      setData(res.data.data);
      if (res.data.pagination) setPagination(res.data.pagination);
    } catch {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setData(null);
    setPagination({ page: 1, pages: 1, total: 0 });
    setTimeout(() => fetchReportData(tabId, 1), 0);
  };

  const handleApplyFilters = () => fetchReportData(activeTab, 1);

  const handleResetFilters = () => {
    setFilters({ startDate: '', endDate: '', classFilter: '', paymentMethod: '' });
    setTimeout(() => fetchReportData(activeTab, 1), 0);
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchReportData(activeTab, newPage);
  };

  // Chart data builders
  const getFeeCollectionChart = () => {
    if (!data?.monthlyCollection?.length) return null;
    return {
      labels: data.monthlyCollection.map(m => m.month),
      datasets: [{
        label: 'Collected',
        data: data.monthlyCollection.map(m => m.totalCollected),
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
      }],
    };
  };

  const getClassWiseChart = () => {
    if (!data?.classSummary?.length) return null;
    return {
      labels: data.classSummary.map(c => ['Jr. KG', 'Sr. KG'].includes(c.class) ? c.class : `Class ${c.class}`),
      datasets: [
        { label: 'Billed', data: data.classSummary.map(c => c.totalBilled), backgroundColor: 'rgba(59, 130, 246, 0.5)' },
        { label: 'Collected', data: data.classSummary.map(c => c.totalCollected), backgroundColor: 'rgba(16, 185, 129, 0.5)' },
        { label: 'Pending', data: data.classSummary.map(c => c.totalPending), backgroundColor: 'rgba(239, 68, 68, 0.5)' },
      ],
    };
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
        <p className="text-gray-500">View fee collection, outstanding dues, and payment reports</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input-field" value={filters.startDate}
              onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input-field" value={filters.endDate}
              onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">Class</label>
            <select className="input-field" value={filters.classFilter}
              onChange={e => setFilters(prev => ({ ...prev, classFilter: e.target.value }))}>
              <option value="">All Classes</option>
              {CLASS_OPTIONS.map(c => (
                <option key={c} value={c}>{['Jr. KG', 'Sr. KG'].includes(c) ? c : `Class ${c}`}</option>
              ))}
            </select>
          </div>
          {activeTab === 'payment-history' && (
            <div>
              <label className="label">Payment Method</label>
              <select className="input-field" value={filters.paymentMethod}
                onChange={e => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}>
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
              </select>
            </div>
          )}
          <button onClick={handleApplyFilters} className="btn-primary">Apply</button>
          <button onClick={handleResetFilters} className="btn-secondary">Reset</button>
        </div>
      </div>

      {/* Content */}
      {loading ? <Loader /> : data && (
        <>
          {/* Fee Collection Tab */}
          {activeTab === 'fee-collection' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <StatsCard title="Total Collected" value={formatCurrency(data.grandTotal)} icon={HiOutlineCurrencyRupee} color="green" />
                <StatsCard title="Total Payments" value={data.totalPayments} icon={HiOutlineCreditCard} color="blue" />
              </div>
              {getFeeCollectionChart() && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Collection</h3>
                  <Bar data={getFeeCollectionChart()} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                </div>
              )}
              {data.classBreakdown?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4 border-b"><h3 className="text-lg font-semibold text-gray-900">Class-wise Breakdown</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Month</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Class</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-500">Collected</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-500">Payments</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.classBreakdown.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="py-3 px-4">{row.month}</td>
                            <td className="py-3 px-4">{['Jr. KG', 'Sr. KG'].includes(row.class) ? row.class : `Class ${row.class}`}</td>
                            <td className="py-3 px-4 text-right font-semibold text-green-600">{formatCurrency(row.totalCollected)}</td>
                            <td className="py-3 px-4 text-right">{row.paymentCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Outstanding Dues Tab */}
          {activeTab === 'outstanding-dues' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatsCard title="Total Outstanding" value={formatCurrency(data.summary?.totalDue || 0)} icon={HiOutlineExclamation} color="red" />
                <StatsCard title="Overdue Invoices" value={data.summary?.overdueCount || 0} icon={HiOutlineExclamation} color="yellow" />
                <StatsCard title="Total Billed" value={formatCurrency(data.summary?.totalBilled || 0)} icon={HiOutlineDocumentText} color="blue" />
                <StatsCard title="Total Paid" value={formatCurrency(data.summary?.totalPaid || 0)} icon={HiOutlineCurrencyRupee} color="green" />
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Invoice #</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Student</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Class</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Parent</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">Total</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">Paid</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">Due</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Due Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.invoices?.length === 0 ? (
                        <tr><td colSpan="9" className="py-8 text-center text-gray-400">No outstanding dues found</td></tr>
                      ) : data.invoices?.map((inv, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-mono text-sm">{inv.invoiceNumber}</td>
                          <td className="py-3 px-4">{inv.studentName}</td>
                          <td className="py-3 px-4">{['Jr. KG', 'Sr. KG'].includes(inv.studentClass) ? inv.studentClass : `Class ${inv.studentClass}`}</td>
                          <td className="py-3 px-4">{inv.parentName}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(inv.total)}</td>
                          <td className="py-3 px-4 text-right text-green-600">{formatCurrency(inv.amountPaid)}</td>
                          <td className="py-3 px-4 text-right font-semibold text-red-600">{formatCurrency(inv.amountDue)}</td>
                          <td className="py-3 px-4">{formatDate(inv.dueDate)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(inv.isOverdue ? 'overdue' : inv.status)}`}>
                              {inv.isOverdue ? 'overdue' : inv.status?.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages} ({pagination.total} records)</p>
                    <div className="flex gap-2">
                      <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">Previous</button>
                      <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.pages}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment History Tab */}
          {activeTab === 'payment-history' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatsCard title="Grand Total" value={formatCurrency(data.grandTotal)} icon={HiOutlineCurrencyRupee} color="green" />
                {data.methodSummary?.map((m, i) => (
                  <StatsCard key={i} title={`${m.method?.replace('_', ' ') || 'Other'}`} value={formatCurrency(m.totalAmount)}
                    icon={HiOutlineCreditCard} color={['blue', 'purple', 'yellow'][i % 3]}
                    subtitle={`${m.count} payments`} />
                ))}
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Payment #</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Student</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Class</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Invoice</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">Amount</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Method</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.payments?.length === 0 ? (
                        <tr><td colSpan="7" className="py-8 text-center text-gray-400">No payments found</td></tr>
                      ) : data.payments?.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-mono text-sm">{p.paymentNumber}</td>
                          <td className="py-3 px-4">{p.studentName}</td>
                          <td className="py-3 px-4">{['Jr. KG', 'Sr. KG'].includes(p.studentClass) ? p.studentClass : `Class ${p.studentClass}`}</td>
                          <td className="py-3 px-4 font-mono text-sm">{p.invoiceNumber}</td>
                          <td className="py-3 px-4 text-right font-semibold text-green-600">{formatCurrency(p.amount)}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs capitalize">{p.paymentMethod?.replace('_', ' ')}</span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{formatDate(p.transactionDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages} ({pagination.total} records)</p>
                    <div className="flex gap-2">
                      <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">Previous</button>
                      <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.pages}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Class-wise Summary Tab */}
          {activeTab === 'class-wise-summary' && (
            <div>
              {getClassWiseChart() && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Billed vs Collected vs Pending</h3>
                  <Bar data={getClassWiseChart()} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
                </div>
              )}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Class</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">Students</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">Invoices</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">Billed</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">Collected</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">Pending</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">Collection %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.classSummary?.length === 0 ? (
                        <tr><td colSpan="7" className="py-8 text-center text-gray-400">No data available</td></tr>
                      ) : data.classSummary?.map((c, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{['Jr. KG', 'Sr. KG'].includes(c.class) ? c.class : `Class ${c.class}`}</td>
                          <td className="py-3 px-4 text-right">{c.studentCount}</td>
                          <td className="py-3 px-4 text-right">{c.invoiceCount}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(c.totalBilled)}</td>
                          <td className="py-3 px-4 text-right text-green-600">{formatCurrency(c.totalCollected)}</td>
                          <td className="py-3 px-4 text-right text-red-600">{formatCurrency(c.totalPending)}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              c.collectionRate >= 80 ? 'bg-green-50 text-green-700' :
                              c.collectionRate >= 50 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                            }`}>{c.collectionRate}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {data.totals && (
                      <tfoot className="bg-gray-50 font-semibold">
                        <tr>
                          <td className="py-3 px-4" colSpan="3">Total</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(data.totals.totalBilled)}</td>
                          <td className="py-3 px-4 text-right text-green-600">{formatCurrency(data.totals.totalCollected)}</td>
                          <td className="py-3 px-4 text-right text-red-600">{formatCurrency(data.totals.totalPending)}</td>
                          <td className="py-3 px-4 text-right">
                            {data.totals.totalBilled > 0 ? `${Math.round((data.totals.totalCollected / data.totals.totalBilled) * 10000) / 100}%` : '0%'}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
