import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { HiOutlineClipboardCheck } from 'react-icons/hi';
import { attendanceApi } from '../../api/attendanceApi';
import { studentApi } from '../../api/studentApi';
import { selectUser } from '../../store/slices/authSlice';
import { classOptions, inSection } from '../../utils/teacherClasses';
import { formatDate, getStatusColor, getTodayISO } from '../../utils/formatters';

const STATUS_OPTIONS = ['present', 'absent', 'late', 'excused'];

const TeacherAttendance = () => {
  const user = useSelector(selectUser);
  const options = useMemo(() => classOptions(user?.assignedClasses), [user]);
  const [selected, setSelected] = useState(options[0]?.value || '');
  const [date, setDate] = useState(getTodayISO());
  const [students, setStudents] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const current = options.find((o) => o.value === selected);

  const load = async () => {
    if (!current) return toast.error('Please select a class');
    if (!date) return toast.error('Please select a date');
    setLoading(true);
    try {
      const [studentsRes, existingRes] = await Promise.all([
        studentApi.getByClass(current.class),
        attendanceApi.getAll({ date, class: current.class, limit: 500 }),
      ]);
      const list = studentsRes.data.data.filter((s) => inSection(s, current.section));
      const existing = {};
      (existingRes.data.data || []).forEach((r) => {
        if (r.student) existing[r.student._id] = r.status;
      });
      setStudents(list);
      setStatuses(Object.fromEntries(list.map((s) => [s._id, existing[s._id] || 'present'])));
      setAlreadyMarked(list.some((s) => existing[s._id]));
      setLoaded(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (submitting || students.length === 0) return;
    setSubmitting(true);
    try {
      const records = students.map((s) => ({ student: s._id, status: statuses[s._id] }));
      await attendanceApi.bulkMark({ date, records });
      toast.success(`Attendance saved for ${records.length} students`);
      setAlreadyMarked(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSubmitting(false);
    }
  };

  if (options.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
        <p className="text-gray-500">No classes are assigned to you yet. Please contact the school office.</p>
      </div>
    );
  }

  const markAll = (status) => setStatuses(Object.fromEntries(students.map((s) => [s._id, status])));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-500">Mark attendance for your classes. Parents are notified automatically.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input type="date" value={date} max={getTodayISO()}
          onChange={(e) => { setDate(e.target.value); setLoaded(false); }}
          className="input-field w-full sm:w-48" />
        <select value={selected} onChange={(e) => { setSelected(e.target.value); setLoaded(false); }}
          className="input-field w-full sm:w-48">
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={load} disabled={loading} className="btn-primary flex items-center justify-center gap-2">
          <HiOutlineClipboardCheck className="h-5 w-5" /> {loading ? 'Loading...' : 'Load Students'}
        </button>
      </div>

      {loaded && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900">{current?.label} — {formatDate(date)}</h3>
              {alreadyMarked && <p className="text-xs text-amber-600">Attendance already marked for this date. Saving will update it.</p>}
            </div>
            <button onClick={save} disabled={submitting || students.length === 0} className="btn-primary text-sm">
              {submitting ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>

          <div className="p-4 bg-gray-50 border-b flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 mr-2">Mark all:</span>
            {STATUS_OPTIONS.map((status) => (
              <button key={status} onClick={() => markAll(status)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(status)}`}>
                {status}
              </button>
            ))}
          </div>

          {students.length === 0 ? (
            <p className="py-8 text-center text-gray-400">No active students in this class</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Roll</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Student</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-400">{s.rollNumber || '-'}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{s.firstName} {s.lastName}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {STATUS_OPTIONS.map((status) => (
                            <button key={status} title={status}
                              onClick={() => setStatuses((prev) => ({ ...prev, [s._id]: status }))}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                statuses[s._id] === status ? getStatusColor(status) : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}>
                              {status.charAt(0).toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherAttendance;
