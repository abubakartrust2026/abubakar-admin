import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { studentApi } from '../../api/studentApi';
import { selectUser } from '../../store/slices/authSlice';
import { classOptions, inSection } from '../../utils/teacherClasses';
import Loader from '../../components/common/Loader';

const TeacherStudents = () => {
  const user = useSelector(selectUser);
  const options = useMemo(() => classOptions(user?.assignedClasses), [user]);
  const [selected, setSelected] = useState(options[0]?.value || '');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const current = options.find((o) => o.value === selected);

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    setLoading(true);
    studentApi.getByClass(current.class)
      .then((res) => { if (!cancelled) setStudents(res.data.data.filter((s) => inSection(s, current.section))); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load students'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [current?.class, current?.section]); // eslint-disable-line react-hooks/exhaustive-deps

  if (options.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
        <p className="text-gray-500">No classes are assigned to you yet. Please contact the school office.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Students</h1>
        <p className="text-gray-500">Students in your assigned classes</p>
      </div>

      <select value={selected} onChange={(e) => setSelected(e.target.value)} className="input-field w-full sm:w-48 mb-6">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {loading ? <Loader /> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Roll</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Admission No.</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Parent</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Parent Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.length === 0 ? (
                <tr><td colSpan="5" className="py-8 text-center text-gray-400">No students found</td></tr>
              ) : students.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-400">{s.rollNumber || '-'}</td>
                  <td className="py-3 px-4 font-medium text-gray-900">{s.firstName} {s.lastName}</td>
                  <td className="py-3 px-4 text-gray-600">{s.admissionNumber}</td>
                  <td className="py-3 px-4 text-gray-600">{s.parent ? `${s.parent.firstName} ${s.parent.lastName}` : '-'}</td>
                  <td className="py-3 px-4 text-gray-600">{s.parent?.phone || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TeacherStudents;
