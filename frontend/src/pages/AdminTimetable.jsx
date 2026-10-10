import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';
import { timetableApi } from '../api/teacherApi';
import { userApi } from '../api/userApi';
import { formatClassLabel } from '../utils/teacherClasses';
import Loader from '../components/common/Loader';

const CLASS_ORDER = ['Jr. KG', 'Sr. KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const blankPeriod = { start: '09:00', end: '09:40', subject: '', teacher: '' };

const AdminTimetable = () => {
  const [cls, setCls] = useState('1');
  const [section, setSection] = useState('');
  const [day, setDay] = useState('monday');
  const [rows, setRows] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    userApi.getAll({ role: 'teacher', limit: 200 }).then((res) => setTeachers(res.data.data || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await timetableApi.get({ class: cls });
      setRows((res.data.data || []).filter((r) => (r.section || '') === section.trim()));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  }, [cls, section]);

  useEffect(() => { load(); }, [load]);

  // Show the saved periods of the selected day in the editor
  useEffect(() => {
    const row = rows.find((r) => r.day === day);
    setPeriods((row?.periods || []).map((p) => ({ start: p.start, end: p.end, subject: p.subject, teacher: p.teacher?._id || '' })));
  }, [rows, day]);

  const update = (idx, patch) => setPeriods((list) => list.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await timetableApi.saveDay({
        class: cls,
        section: section.trim(),
        day,
        periods: periods.map((p) => ({ ...p, teacher: p.teacher || undefined })),
      });
      toast.success(periods.length ? 'Timetable saved' : 'Day cleared');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save timetable');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
        <p className="text-gray-500">Set each day's periods for a class. Teachers see their own periods automatically.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select value={cls} onChange={(e) => setCls(e.target.value)} className="input-field w-full sm:w-40">
          {CLASS_ORDER.map((c) => <option key={c} value={c}>{formatClassLabel(c)}</option>)}
        </select>
        <input value={section} onChange={(e) => setSection(e.target.value)} placeholder="Section (blank = all)" className="input-field w-full sm:w-52" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {WEEK_DAYS.map((d) => {
          const hasRows = rows.some((r) => r.day === d);
          return (
            <button key={d} onClick={() => setDay(d)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${
                day === d ? 'bg-primary-700 text-white' : hasRows ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-500'
              }`}>
              {d}
            </button>
          );
        })}
      </div>

      {loading ? <Loader /> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          {periods.length === 0 && <p className="text-sm text-gray-400 mb-3">No periods for this day.</p>}
          <div className="space-y-2">
            {periods.map((p, idx) => (
              <div key={idx} className="grid grid-cols-2 sm:grid-cols-[auto_auto_1fr_1fr_auto] gap-2 items-center">
                <input type="time" className="input-field" value={p.start} onChange={(e) => update(idx, { start: e.target.value })} />
                <input type="time" className="input-field" value={p.end} onChange={(e) => update(idx, { end: e.target.value })} />
                <input className="input-field col-span-2 sm:col-span-1" placeholder="Subject" value={p.subject} onChange={(e) => update(idx, { subject: e.target.value })} />
                <select className="input-field col-span-2 sm:col-span-1" value={p.teacher} onChange={(e) => update(idx, { teacher: e.target.value })}>
                  <option value="">No teacher</option>
                  {teachers.map((t) => <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>)}
                </select>
                <button onClick={() => setPeriods((list) => list.filter((_, i) => i !== idx))} title="Remove period" className="p-2 text-gray-400 hover:text-red-600 justify-self-end">
                  <HiOutlineTrash className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4">
            <button onClick={() => setPeriods((list) => [...list, { ...blankPeriod, start: list.at(-1)?.end || blankPeriod.start }])} className="btn-secondary flex items-center gap-2">
              <HiOutlinePlus className="h-5 w-5" /> Add Period
            </button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Day'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTimetable;
