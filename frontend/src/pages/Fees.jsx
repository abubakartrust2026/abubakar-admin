import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { fetchFees } from '../store/slices/feeSlice';
import { feeApi } from '../api/feeApi';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { formatCurrency } from '../utils/formatters';

const Fees = () => {
  const dispatch = useDispatch();
  const { fees, loading } = useSelector((state) => state.fees);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', amount: '', frequency: 'monthly',
    applicableFor: { classes: [], academicYear: '2025-2026' }, isActive: true,
  });

  useEffect(() => {
    dispatch(fetchFees({}));
  }, [dispatch]);

  const resetForm = () => {
    setFormData({
      name: '', description: '', amount: '', frequency: 'monthly',
      applicableFor: { classes: [], academicYear: '2025-2026' }, isActive: true,
    });
    setEditing(null);
  };

  const handleOpenForm = (fee = null) => {
    if (fee) {
      setEditing(fee);
      setFormData({ ...fee });
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData, amount: parseFloat(formData.amount) };
      if (editing) {
        await feeApi.update(editing._id, data);
        toast.success('Fee structure updated');
      } else {
        await feeApi.create(data);
        toast.success('Fee structure created');
      }
      setShowForm(false);
      resetForm();
      dispatch(fetchFees({}));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this fee structure?')) return;
    try {
      await feeApi.delete(id);
      toast.success('Fee structure deleted');
      dispatch(fetchFees({}));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleClassToggle = (cls) => {
    setFormData(prev => {
      const classes = prev.applicableFor.classes.includes(cls)
        ? prev.applicableFor.classes.filter(c => c !== cls)
        : [...prev.applicableFor.classes, cls];
      return { ...prev, applicableFor: { ...prev.applicableFor, classes } };
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Structure</h1>
          <p className="text-gray-500">Manage fee types and amounts</p>
        </div>
        <button onClick={() => handleOpenForm()} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="h-5 w-5" /> Add Fee
        </button>
      </div>

      {loading ? <Loader /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fees.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl shadow-sm border p-8 text-center">
              <p className="text-gray-400">No fee structures defined yet.</p>
            </div>
          ) : (
            fees.map(fee => (
              <div key={fee._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{fee.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{fee.description || 'No description'}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleOpenForm(fee)} className="p-1.5 hover:bg-gray-100 rounded"><HiOutlinePencil className="h-4 w-4 text-blue-500" /></button>
                    <button onClick={() => handleDelete(fee._id)} className="p-1.5 hover:bg-gray-100 rounded"><HiOutlineTrash className="h-4 w-4 text-red-500" /></button>
                  </div>
                </div>
                <p className="text-2xl font-bold text-primary-600 mb-2">{formatCurrency(fee.amount)}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs capitalize">{fee.frequency}</span>
                  {fee.isActive ? (
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">Inactive</span>
                  )}
                </div>
                {fee.applicableFor?.classes?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {fee.applicableFor.classes.map(c => (
                      <span key={c} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{['Jr. KG', 'Sr. KG', 'all'].includes(c) ? (c === 'all' ? 'All' : c) : `Class ${c}`}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }}
        title={editing ? 'Edit Fee Structure' : 'Add Fee Structure'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Fee Name *</label>
            <input type="text" className="input-field" required value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Tuition Fee" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input-field" rows="2" value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount (INR) *</label>
              <input type="number" className="input-field" required min="0" value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
            </div>
            <div>
              <label className="label">Frequency *</label>
              <select className="input-field" value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="one-time">One-time</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Applicable Classes</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {['Jr. KG','Sr. KG','1','2','3','4','5','6','7','8','9','10','all'].map(c => (
                <button key={c} type="button" onClick={() => handleClassToggle(c)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    formData.applicableFor?.classes?.includes(c)
                      ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                  {c === 'all' ? 'All' : ['Jr. KG', 'Sr. KG'].includes(c) ? c : `Class ${c}`}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Fees;