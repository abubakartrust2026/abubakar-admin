import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_MODES } from '../../api/accountsApi';

const TransactionForm = ({ formData, setFormData, institutions, onSubmit, onCancel, editing }) => {
  const categories = formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleTypeChange = (type) => {
    const newCategories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    setFormData({ ...formData, type, category: newCategories[0].value });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Type *</label>
          <select className="input-field" value={formData.type}
            onChange={(e) => handleTypeChange(e.target.value)}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div>
          <label className="label">Institution *</label>
          <select className="input-field" required value={formData.institution}
            onChange={(e) => setFormData({ ...formData, institution: e.target.value })}>
            <option value="">Select institution</option>
            {institutions.map((inst) => (
              <option key={inst._id} value={inst._id}>{inst.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{formData.type === 'income' ? 'Income Source' : 'Expense Category'} *</label>
          <select className="input-field" required value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Date *</label>
          <input type="date" className="input-field" required value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
        </div>
        <div>
          <label className="label">Amount (INR) *</label>
          <input type="number" className="input-field" required min="0.01" step="any" value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
        </div>
        <div>
          <label className="label">Payment Mode</label>
          <select className="input-field" value={formData.paymentMode}
            onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}>
            <option value="">Select mode</option>
            {PAYMENT_MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Reference No.</label>
          <input type="text" className="input-field" value={formData.referenceNo}
            onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })} placeholder="Cheque / receipt no." />
        </div>
      </div>
      <div>
        <label className="label">Description *</label>
        <input type="text" className="input-field" required value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Particulars" />
      </div>
      <div>
        <label className="label">Remarks</label>
        <textarea className="input-field" rows="2" value={formData.remarks}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">{editing ? 'Update' : 'Add'} Transaction</button>
      </div>
    </form>
  );
};

export default TransactionForm;
