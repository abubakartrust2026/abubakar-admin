import { useState, useEffect, useCallback } from 'react';
import { HiOutlinePlus, HiOutlineDownload, HiOutlinePrinter, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { institutionApi, openingBalanceApi, ledgerApi } from '../api/accountsApi';
import InstitutionSelector from '../components/accounts/InstitutionSelector';
import FinancialYearSelector from '../components/accounts/FinancialYearSelector';
import TransactionForm from '../components/accounts/TransactionForm';
import TransactionTable from '../components/accounts/TransactionTable';
import TransactionFilters from '../components/accounts/TransactionFilters';
import ComparisonTable from '../components/accounts/ComparisonTable';
import MonthlySummaryTable from '../components/accounts/MonthlySummaryTable';
import CategoryBreakdownList from '../components/accounts/CategoryBreakdownList';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import StatsCard from '../components/dashboard/StatsCard';
import { formatCurrency, getCurrentFinancialYear } from '../utils/formatters';
import { HiOutlineCurrencyRupee, HiOutlineTrendingUp, HiOutlineTrendingDown, HiOutlineScale } from 'react-icons/hi';

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'institutions', label: 'Institutions' },
  { id: 'reports', label: 'Reports' },
];

const defaultTxForm = {
  type: 'income', institution: '', category: 'fees',
  date: new Date().toISOString().split('T')[0], amount: '',
  paymentMode: '', referenceNo: '', description: '', remarks: '',
};

const defaultInstForm = { name: '', shortName: '', description: '', isActive: true, sortOrder: 0 };

const Accounts = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState('all');
  const [financialYear, setFinancialYear] = useState(getCurrentFinancialYear());
  const [loading, setLoading] = useState(false);

  // Dashboard
  const [dashboard, setDashboard] = useState(null);
  const [comparison, setComparison] = useState({ data: [], grandTotal: null });

  // Transactions
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [showTxForm, setShowTxForm] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [txFormData, setTxFormData] = useState(defaultTxForm);
  const [txSubmitting, setTxSubmitting] = useState(false);

  // Institutions tab
  const [showInstForm, setShowInstForm] = useState(false);
  const [editingInst, setEditingInst] = useState(null);
  const [instFormData, setInstFormData] = useState(defaultInstForm);
  const [instSubmitting, setInstSubmitting] = useState(false);
  const [openingBalances, setOpeningBalances] = useState({});

  // Reports
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [incomeBreakdown, setIncomeBreakdown] = useState([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState([]);

  const loadInstitutions = useCallback(async () => {
    try {
      const res = await institutionApi.getAll({ isActive: true });
      setInstitutions(res.data.data);
    } catch {
      toast.error('Failed to load institutions');
    }
  }, []);

  useEffect(() => { loadInstitutions(); }, [loadInstitutions]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, compRes] = await Promise.all([
        ledgerApi.getDashboard({ institution: selectedInstitution, financialYear }),
        ledgerApi.getComparison({ financialYear }),
      ]);
      setDashboard(dashRes.data.data);
      setComparison({ data: compRes.data.data, grandTotal: compRes.data.grandTotal });
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [selectedInstitution, financialYear]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { institution: selectedInstitution, financialYear, limit: 500 };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (monthFilter) params.month = monthFilter;
      const res = await ledgerApi.getTransactions(params);
      setTransactions(res.data.data);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [selectedInstitution, financialYear, search, typeFilter, monthFilter]);

  const loadInstitutionsTabData = useCallback(async () => {
    try {
      const res = await openingBalanceApi.getByYear(financialYear);
      const map = {};
      res.data.data.forEach((row) => { map[row.institution._id] = row.amount; });
      setOpeningBalances(map);
    } catch {
      toast.error('Failed to load opening balances');
    }
  }, [financialYear]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const [monthlyRes, incRes, expRes] = await Promise.all([
        ledgerApi.getMonthlySummary({ institution: selectedInstitution, financialYear }),
        ledgerApi.getBreakdown({ institution: selectedInstitution, financialYear, type: 'income' }),
        ledgerApi.getBreakdown({ institution: selectedInstitution, financialYear, type: 'expense' }),
      ]);
      setMonthlySummary(monthlyRes.data.data);
      setIncomeBreakdown(incRes.data.data);
      setExpenseBreakdown(expRes.data.data);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [selectedInstitution, financialYear]);

  useEffect(() => {
    if (activeTab === 'dashboard') loadDashboard();
    else if (activeTab === 'transactions') loadTransactions();
    else if (activeTab === 'institutions') loadInstitutionsTabData();
    else if (activeTab === 'reports') loadReports();
  }, [activeTab, loadDashboard, loadTransactions, loadInstitutionsTabData, loadReports]);

  // Transaction handlers
  const handleOpenTxForm = (tx = null) => {
    if (tx) {
      setEditingTx(tx);
      setTxFormData({
        type: tx.type, institution: tx.institution?._id || tx.institution,
        category: tx.category, date: tx.date.split('T')[0], amount: tx.amount,
        paymentMode: tx.paymentMode || '', referenceNo: tx.referenceNo || '',
        description: tx.description, remarks: tx.remarks || '',
      });
    } else {
      setEditingTx(null);
      setTxFormData({
        ...defaultTxForm,
        institution: selectedInstitution !== 'all' ? selectedInstitution : '',
      });
    }
    setShowTxForm(true);
  };

  const handleTxSubmit = async (e) => {
    e.preventDefault();
    if (txSubmitting) return;
    setTxSubmitting(true);
    try {
      const data = { ...txFormData, amount: parseFloat(txFormData.amount), financialYear };
      if (editingTx) {
        await ledgerApi.updateTransaction(editingTx._id, data);
        toast.success('Transaction updated');
      } else {
        await ledgerApi.createTransaction(data);
        toast.success('Transaction added');
      }
      setShowTxForm(false);
      loadTransactions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setTxSubmitting(false);
    }
  };

  const handleTxDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await ledgerApi.deleteTransaction(id);
      toast.success('Transaction deleted');
      loadTransactions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleExportExcel = async () => {
    try {
      toast.info('Preparing export...');
      const res = await ledgerApi.exportXlsx({ institution: selectedInstitution, financialYear });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Ledger_${financialYear}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  // Institution handlers
  const handleOpenInstForm = (inst = null) => {
    if (inst) {
      setEditingInst(inst);
      setInstFormData({
        name: inst.name, shortName: inst.shortName || '', description: inst.description || '',
        isActive: inst.isActive, sortOrder: inst.sortOrder || 0,
      });
    } else {
      setEditingInst(null);
      setInstFormData(defaultInstForm);
    }
    setShowInstForm(true);
  };

  const handleInstSubmit = async (e) => {
    e.preventDefault();
    if (instSubmitting) return;
    setInstSubmitting(true);
    try {
      if (editingInst) {
        await institutionApi.update(editingInst._id, instFormData);
        toast.success('Institution updated');
      } else {
        await institutionApi.create(instFormData);
        toast.success('Institution added');
      }
      setShowInstForm(false);
      loadInstitutions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setInstSubmitting(false);
    }
  };

  const handleInstDelete = async (id) => {
    if (!window.confirm('Delete this institution?')) return;
    try {
      await institutionApi.delete(id);
      toast.success('Institution deleted');
      loadInstitutions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleOpeningBalanceChange = async (institutionId, amount) => {
    setOpeningBalances((prev) => ({ ...prev, [institutionId]: amount }));
  };

  const handleOpeningBalanceSave = async (institutionId) => {
    try {
      await openingBalanceApi.upsert({
        institution: institutionId, financialYear,
        amount: parseFloat(openingBalances[institutionId]) || 0,
      });
      toast.success('Opening balance saved');
      loadInstitutionsTabData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save opening balance');
    }
  };

  const handlePrint = () => window.print();

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-500">Manage trust and institution income & expenses</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 rounded-lg p-1 print:hidden">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Shared filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InstitutionSelector value={selectedInstitution} onChange={setSelectedInstitution} institutions={institutions} />
          <FinancialYearSelector value={financialYear} onChange={setFinancialYear} />
        </div>
      </div>

      {loading ? <Loader /> : (
        <>
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && dashboard && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatsCard title="Opening Balance" value={formatCurrency(dashboard.opening)} icon={HiOutlineScale} color="blue" />
                <StatsCard title="Total Income" value={formatCurrency(dashboard.income)} icon={HiOutlineTrendingUp} color="green" />
                <StatsCard title="Total Expenses" value={formatCurrency(dashboard.expense)} icon={HiOutlineTrendingDown} color="red" />
                <StatsCard title="Closing Balance" value={formatCurrency(dashboard.closing)} icon={HiOutlineCurrencyRupee} color="primary" />
              </div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">All Institutions Comparison</h3>
                <ComparisonTable data={comparison.data} grandTotal={comparison.grandTotal} />
              </div>
            </div>
          )}

          {/* TRANSACTIONS TAB */}
          {activeTab === 'transactions' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 print:hidden">
                <TransactionFilters
                  search={search} onSearchChange={setSearch}
                  type={typeFilter} onTypeChange={setTypeFilter}
                  month={monthFilter} onMonthChange={setMonthFilter}
                />
                <div className="flex gap-2 shrink-0">
                  <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-2">
                    <HiOutlineDownload className="h-5 w-5" /> Export
                  </button>
                  <button onClick={() => handleOpenTxForm()} className="btn-primary flex items-center gap-2">
                    <HiOutlinePlus className="h-5 w-5" /> Add Transaction
                  </button>
                </div>
              </div>
              <TransactionTable
                transactions={transactions}
                showInstitution={selectedInstitution === 'all'}
                onEdit={handleOpenTxForm}
                onDelete={handleTxDelete}
              />
            </div>
          )}

          {/* INSTITUTIONS TAB */}
          {activeTab === 'institutions' && (
            <div>
              <div className="flex justify-end mb-4 print:hidden">
                <button onClick={() => handleOpenInstForm()} className="btn-primary flex items-center gap-2">
                  <HiOutlinePlus className="h-5 w-5" /> Add Institution
                </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">Opening Balance ({financialYear})</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {institutions.map((inst) => (
                        <tr key={inst._id} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{inst.name}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inst.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {inst.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <input type="number" className="input-field !py-1 !w-32 text-right"
                                value={openingBalances[inst._id] ?? 0}
                                onChange={(e) => handleOpeningBalanceChange(inst._id, e.target.value)} />
                              <button onClick={() => handleOpeningBalanceSave(inst._id)} className="btn-secondary !py-1 !px-3 text-xs">Save</button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleOpenInstForm(inst)} className="p-1.5 hover:bg-gray-100 rounded">
                                <HiOutlinePencil className="h-4 w-4 text-blue-500" />
                              </button>
                              <button onClick={() => handleInstDelete(inst._id)} className="p-1.5 hover:bg-gray-100 rounded">
                                <HiOutlineTrash className="h-4 w-4 text-red-500" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* REPORTS TAB */}
          {activeTab === 'reports' && (
            <div>
              <div className="flex justify-end mb-4 print:hidden">
                <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
                  <HiOutlinePrinter className="h-5 w-5" /> Print Report
                </button>
              </div>
              <div className="mb-6">
                <MonthlySummaryTable data={monthlySummary} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CategoryBreakdownList title="Income Breakdown" type="income" data={incomeBreakdown} color="green" />
                <CategoryBreakdownList title="Expense Breakdown" type="expense" data={expenseBreakdown} color="red" />
              </div>
            </div>
          )}
        </>
      )}

      {/* Transaction Modal */}
      <Modal isOpen={showTxForm} onClose={() => setShowTxForm(false)} title={editingTx ? 'Edit Transaction' : 'Add Transaction'} size="lg">
        <TransactionForm
          formData={txFormData} setFormData={setTxFormData} institutions={institutions}
          onSubmit={handleTxSubmit} onCancel={() => setShowTxForm(false)} editing={!!editingTx}
          submitting={txSubmitting}
        />
      </Modal>

      {/* Institution Modal */}
      <Modal isOpen={showInstForm} onClose={() => setShowInstForm(false)} title={editingInst ? 'Edit Institution' : 'Add Institution'} size="md">
        <form onSubmit={handleInstSubmit} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input type="text" className="input-field" required value={instFormData.name}
              onChange={(e) => setInstFormData({ ...instFormData, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Short Name</label>
            <input type="text" className="input-field" value={instFormData.shortName}
              onChange={(e) => setInstFormData({ ...instFormData, shortName: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input-field" rows="2" value={instFormData.description}
              onChange={(e) => setInstFormData({ ...instFormData, description: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="inst-active" checked={instFormData.isActive}
              onChange={(e) => setInstFormData({ ...instFormData, isActive: e.target.checked })} className="h-4 w-4" />
            <label htmlFor="inst-active" className="text-sm text-gray-700">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowInstForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={instSubmitting} className="btn-primary disabled:opacity-50">{instSubmitting ? 'Saving...' : `${editingInst ? 'Update' : 'Add'} Institution`}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Accounts;
