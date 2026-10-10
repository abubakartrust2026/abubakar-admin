import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineKey, HiOutlineDownload, HiOutlineX } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { userApi } from '../api/userApi';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { classOptions, formatClassLabel } from '../utils/teacherClasses';

const CLASS_ORDER = ['Jr. KG', 'Sr. KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
// Fixed URL (not window.location.origin) so the QR is right even when printed from the admin domain
const TEACHER_APP_URL = 'https://teachers.abubakartrust.in/teacher/login';

const emptyForm = { firstName: '', lastName: '', phone: '', password: '', assignedClasses: [] };

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [newClass, setNewClass] = useState({ class: '1', section: '' });
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await userApi.getAll({ role: 'teacher', limit: 200 });
      setTeachers(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    QRCode.toDataURL(TEACHER_APP_URL, { width: 600, margin: 2, errorCorrectionLevel: 'M' }).then(setQrDataUrl).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      firstName: t.firstName,
      lastName: t.lastName,
      phone: t.phone || '',
      password: '',
      assignedClasses: (t.assignedClasses || []).map((a) => ({ class: a.class, section: a.section || '' })),
    });
    setModalOpen(true);
  };

  const addClass = () => {
    const section = newClass.section.trim();
    if (form.assignedClasses.some((a) => a.class === newClass.class && a.section === section)) return;
    setForm((f) => ({ ...f, assignedClasses: [...f.assignedClasses, { class: newClass.class, section }] }));
  };

  const removeClass = (idx) =>
    setForm((f) => ({ ...f, assignedClasses: f.assignedClasses.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        assignedClasses: form.assignedClasses,
      };
      if (editing) {
        await userApi.update(editing._id, payload);
        toast.success('Teacher updated');
      } else {
        const res = await userApi.create({ ...payload, role: 'teacher', ...(form.password && { password: form.password }) });
        toast.success('Teacher created');
        setCredentials({ name: `${payload.firstName} ${payload.lastName}`, phone: res.data.data.phone, password: res.data.tempPassword || form.password });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save teacher');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (t) => {
    if (!window.confirm(`Issue a new temporary password for ${t.firstName} ${t.lastName}? Their current password will stop working.`)) return;
    try {
      const res = await userApi.resetTeacherPassword(t._id);
      const d = res.data.data;
      setCredentials({ name: d.teacherName, phone: d.phone, password: d.tempPassword });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const toggleActive = async (t) => {
    try {
      await userApi.update(t._id, { isActive: !t.isActive });
      toast.success(t.isActive ? 'Teacher deactivated' : 'Teacher activated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update teacher');
    }
  };

  const downloadQr = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'abubakar-teacher-app-qr.png';
    a.click();
  };

  if (loading) return <Loader size="lg" />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-gray-500">Create teacher accounts and assign their classes</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="h-5 w-5" /> Add Teacher
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Phone (login)</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Classes</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {teachers.length === 0 ? (
              <tr><td colSpan="5" className="py-8 text-center text-gray-400">No teachers yet</td></tr>
            ) : teachers.map((t) => (
              <tr key={t._id} className="hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-gray-900">{t.firstName} {t.lastName}</td>
                <td className="py-3 px-4 text-gray-600">{t.phone}</td>
                <td className="py-3 px-4 text-gray-600">
                  {classOptions(t.assignedClasses).map((o) => o.label).join(', ') || <span className="text-amber-600">None assigned</span>}
                </td>
                <td className="py-3 px-4">
                  <button onClick={() => toggleActive(t)}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(t)} title="Edit" className="p-2 text-gray-500 hover:text-primary-700"><HiOutlinePencil className="h-5 w-5" /></button>
                    <button onClick={() => handleReset(t)} title="Reset password" className="p-2 text-gray-500 hover:text-primary-700"><HiOutlineKey className="h-5 w-5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row items-center gap-6">
        {qrDataUrl && <img src={qrDataUrl} alt="Teacher app QR code" className="w-40 h-40" />}
        <div className="text-center sm:text-left">
          <h2 className="text-lg font-semibold text-gray-900">Teacher App</h2>
          <p className="text-sm text-gray-500 mb-1">Teachers scan this to open and install the app.</p>
          <p className="text-sm text-gray-700 break-all mb-3">{TEACHER_APP_URL}</p>
          <button onClick={downloadQr} className="btn-secondary inline-flex items-center gap-2">
            <HiOutlineDownload className="h-5 w-5" /> Download QR
          </button>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Teacher' : 'Add Teacher'}>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name</label>
              <input className="input-field" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input-field" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Phone Number (used to log in)</label>
            <input type="tel" inputMode="numeric" className="input-field" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile number" required />
          </div>
          {!editing && (
            <div>
              <label className="label">Temporary Password (optional)</label>
              <input className="input-field" value={form.password} minLength={6}
                onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to generate one" />
              <p className="text-xs text-gray-400 mt-1">The teacher must change it at first login.</p>
            </div>
          )}

          <div>
            <label className="label">Assigned Classes</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.assignedClasses.length === 0 && <span className="text-sm text-gray-400">None yet</span>}
              {form.assignedClasses.map((a, idx) => (
                <span key={`${a.class}|${a.section}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium">
                  {formatClassLabel(a.class)}{a.section && ` - ${a.section}`}
                  <button type="button" onClick={() => removeClass(idx)}><HiOutlineX className="h-3.5 w-3.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <select className="input-field" value={newClass.class} onChange={(e) => setNewClass({ ...newClass, class: e.target.value })}>
                {CLASS_ORDER.map((c) => <option key={c} value={c}>{formatClassLabel(c)}</option>)}
              </select>
              <input className="input-field" placeholder="Section (optional)" value={newClass.section}
                onChange={(e) => setNewClass({ ...newClass, section: e.target.value })} />
              <button type="button" onClick={addClass} className="btn-secondary whitespace-nowrap">Add</button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Leave the section empty to give access to every section of the class.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!credentials} onClose={() => setCredentials(null)} title="Teacher Login Details" size="sm">
        {credentials && (
          <div className="p-4 space-y-3">
            <p className="text-sm text-gray-600">Share these with {credentials.name}. The password is shown only once.</p>
            <div className="bg-gray-50 border rounded-lg p-3 text-sm space-y-1">
              <p><span className="text-gray-500">Website:</span> teachers.abubakartrust.in</p>
              <p><span className="text-gray-500">Phone:</span> <strong>{credentials.phone}</strong></p>
              <p><span className="text-gray-500">Temporary password:</span> <strong>{credentials.password}</strong></p>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setCredentials(null)} className="btn-primary">Done</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Teachers;
