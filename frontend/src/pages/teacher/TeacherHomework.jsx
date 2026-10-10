import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import { homeworkApi } from '../../api/teacherApi';
import { selectUser } from '../../store/slices/authSlice';
import { classOptions, formatClassLabel } from '../../utils/teacherClasses';
import { formatDate } from '../../utils/formatters';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';

const emptyForm = { classKey: '', subject: '', title: '', description: '', dueDate: '' };

const TeacherHomework = () => {
  const user = useSelector(selectUser);
  const options = useMemo(() => classOptions(user?.assignedClasses), [user]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await homeworkApi.getAll({ limit: 100 });
      setItems(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load homework');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, classKey: options[0]?.value || '' });
    setModalOpen(true);
  };

  const openEdit = (h) => {
    setEditing(h);
    setForm({
      classKey: `${h.class}|${h.section || ''}`,
      subject: h.subject,
      title: h.title,
      description: h.description || '',
      dueDate: h.dueDate ? h.dueDate.slice(0, 10) : '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const [cls, section] = form.classKey.split('|');
    const payload = { class: cls, section, subject: form.subject, title: form.title, description: form.description, dueDate: form.dueDate };
    setSaving(true);
    try {
      if (editing) await homeworkApi.update(editing._id, payload);
      else await homeworkApi.create(payload);
      toast.success(editing ? 'Homework updated' : 'Homework added');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save homework');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (h) => {
    if (!window.confirm(`Delete "${h.title}"?`)) return;
    try {
      await homeworkApi.delete(h._id);
      toast.success('Homework deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete homework');
    }
  };

  if (loading) return <Loader size="lg" />;

  // A homework row for the whole class (no section) can be edited by anyone teaching that class
  const classLabel = (h) => `${formatClassLabel(h.class)}${h.section ? ` - ${h.section}` : ''}`;
  const canEdit = (h) => options.some((o) => o.class === h.class && (!o.section || o.section === (h.section || '')));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homework</h1>
          <p className="text-gray-500">Homework you have set for your classes</p>
        </div>
        {options.length > 0 && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="h-5 w-5" /> Add Homework
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Class</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Subject</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Title</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Due</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr><td colSpan="5" className="py-8 text-center text-gray-400">No homework yet</td></tr>
            ) : items.map((h) => (
              <tr key={h._id} className="hover:bg-gray-50 align-top">
                <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{classLabel(h)}</td>
                <td className="py-3 px-4 text-gray-600">{h.subject}</td>
                <td className="py-3 px-4">
                  <p className="font-medium text-gray-900">{h.title}</p>
                  {h.description && <p className="text-gray-500 whitespace-pre-line">{h.description}</p>}
                </td>
                <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{formatDate(h.dueDate)}</td>
                <td className="py-3 px-4">
                  {canEdit(h) && (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(h)} title="Edit" className="p-2 text-gray-500 hover:text-primary-700"><HiOutlinePencil className="h-5 w-5" /></button>
                      <button onClick={() => handleDelete(h)} title="Delete" className="p-2 text-gray-500 hover:text-red-600"><HiOutlineTrash className="h-5 w-5" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Homework' : 'Add Homework'}>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="label">Class</label>
            <select className="input-field" value={form.classKey} onChange={(e) => setForm({ ...form, classKey: e.target.value })} required>
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Subject</label>
              <input className="input-field" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" className="input-field" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Title</label>
            <input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="label">Details (optional)</label>
            <textarea rows={4} className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TeacherHomework;
