import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { timetableApi } from '../../api/teacherApi';
import { selectUser } from '../../store/slices/authSlice';
import { classOptions, formatClassLabel } from '../../utils/teacherClasses';
import Loader from '../../components/common/Loader';

export const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const TeacherTimetable = () => {
  const user = useSelector(selectUser);
  const options = useMemo(() => classOptions(user?.assignedClasses), [user]);
  const [view, setView] = useState('mine'); // 'mine' or a class option value
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const current = options.find((o) => o.value === view);
    const request = view === 'mine' ? timetableApi.getMine() : timetableApi.get({ class: current?.class, section: current?.section || undefined });
    request
      .then((res) => { if (!cancelled) setRows(res.data.data || []); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load timetable'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [view, options]);

  const byDay = (day) => rows.filter((r) => r.day === day);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
        <p className="text-gray-500">Your periods, or the full timetable of a class you teach</p>
      </div>

      <select value={view} onChange={(e) => setView(e.target.value)} className="input-field w-full sm:w-56 mb-6">
        <option value="mine">My periods</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label} (full class)</option>)}
      </select>

      {loading ? <Loader /> : rows.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <p className="text-gray-500">No timetable has been set up yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WEEK_DAYS.filter((d) => byDay(d).length > 0).map((day) => (
            <div key={day} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 capitalize mb-2">{day}</h3>
              {byDay(day).map((r) => (
                <div key={`${r.class}|${r.section}`} className="mb-2 last:mb-0">
                  {view === 'mine' && (
                    <p className="text-xs text-gray-400 mb-1">{formatClassLabel(r.class)}{r.section && ` - ${r.section}`}</p>
                  )}
                  <ul className="divide-y divide-gray-100 text-sm">
                    {r.periods.map((p, i) => (
                      <li key={i} className="py-1.5 flex justify-between gap-3">
                        <span className="text-gray-500 whitespace-nowrap">{p.start} - {p.end}</span>
                        <span className="text-gray-900 text-right">
                          {p.subject}
                          {view !== 'mine' && p.teacher?.firstName && <span className="text-gray-400"> · {p.teacher.firstName} {p.teacher.lastName}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherTimetable;
