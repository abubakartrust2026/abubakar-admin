import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineAcademicCap, HiOutlineClipboardCheck, HiOutlineUserGroup, HiOutlineClock } from 'react-icons/hi';
import { dashboardApi } from '../../api/dashboardApi';
import StatsCard from './StatsCard';
import Loader from '../common/Loader';
import { formatDate } from '../../utils/formatters';
import { formatClassLabel } from '../../utils/teacherClasses';

const TeacherDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    dashboardApi.getTeacherDashboard()
      .then((res) => setData(res.data.data))
      .catch(() => setError('Could not load dashboard. Please refresh the page or try again.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader size="lg" />;
  if (error) return <p className="text-center text-red-500 py-12">{error}</p>;
  if (!data) return <p className="text-center text-gray-500">Failed to load dashboard data.</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="text-gray-500">Today, {formatDate(data.date)}</p>
      </div>

      {data.classes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <p className="text-gray-500">No classes are assigned to you yet. Please contact the school office.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard title="My Classes" value={data.totals.classes} icon={HiOutlineAcademicCap} color="blue" />
            <StatsCard title="Students" value={data.totals.students} icon={HiOutlineUserGroup} color="green" href="/students" />
            <StatsCard title="Attendance Marked" value={data.totals.marked} icon={HiOutlineClipboardCheck} color="green" href="/attendance" />
            <StatsCard title="Attendance Pending" value={data.totals.pending} icon={HiOutlineClock} color="yellow" href="/attendance" />
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mb-3">Today's attendance by class</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.classes.map((c) => (
              <div key={`${c.class}|${c.section}`} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{formatClassLabel(c.class)}{c.section && ` - ${c.section}`}</h3>
                  {c.pending === 0 && c.totalStudents > 0 ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Done</span>
                  ) : (
                    <Link to="/attendance" className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      {c.pending} pending
                    </Link>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {c.totalStudents} students · Present {c.present} · Absent {c.absent} · Late {c.late} · Excused {c.excused}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherDashboard;
