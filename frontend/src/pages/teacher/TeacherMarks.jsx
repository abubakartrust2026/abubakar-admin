import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { marksApi } from '../../api/teacherApi';
import { studentApi } from '../../api/studentApi';
import { selectUser } from '../../store/slices/authSlice';
import { classOptions, inSection } from '../../utils/teacherClasses';

// Indian school year runs April-March, e.g. "2026-2027"
const currentAcademicYear = () => {
  const now = new Date();
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${start + 1}`;
};

const TeacherMarks = () => {
  const user = useSelector(selectUser);
  const options = useMemo(() => classOptions(user?.assignedClasses), [user]);
  const [selected, setSelected] = useState(options[0]?.value || '');
  const [exam, setExam] = useState('');
  const [subject, setSubject] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = options.find((o) => o.value === selected);

  const load = async () => {
    if (!current) return toast.error('Please select a class');
    if (!exam.trim() || !subject.trim()) return toast.error('Enter the exam name and subject');
    setLoading(true);
    try {
      const [studentsRes, marksRes] = await Promise.all([
        studentApi.getByClass(current.class),
        marksApi.get({ class: current.class, section: current.section || undefined, exam: exam.trim(), subject: subject.trim() }),
      ]);
      const list = studentsRes.data.data.filter((s) => inSection(s, current.section));
      const existing = {};
      let existingMax;
      (marksRes.data.data || []).forEach((m) => {
        if (m.student) existing[m.student._id] = m.marksObtained;
        existingMax = m.maxMarks;
      });
      if (existingMax) setMaxMarks(String(existingMax));
      setStudents(list);
      setMarks(Object.fromEntries(list.map((s) => [s._id, existing[s._id] ?? ''])));
      setLoaded(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (saving) return;
    const max = Number(maxMarks);
    if (!Number.isFinite(max) || max < 1) return toast.error('Maximum marks must be at least 1');
    const bad = students.find((s) => marks[s._id] !== '' && (Number(marks[s._id]) < 0 || Number(marks[s._id]) > max));
    if (bad) return toast.error(`${bad.firstName}'s marks must be between 0 and ${max}`);

    setSaving(true);
    try {
      const records = students.map((s) => ({ student: s._id, marksObtained: marks[s._id] }));
      const res = await marksApi.bulkSave({ exam: exam.trim(), subject: subject.trim(), maxMarks: max, academicYear, records });
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  if (options.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
        <p className="text-gray-500">No classes are assigned to you yet. Please contact the school office.</p>
      </div>
    );
  }

  const invalidate = () => setLoaded(false);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Marks</h1>
        <p className="text-gray-500">Enter marks for one exam and subject at a time. Leave a student blank if absent.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <select value={selected} onChange={(e) => { setSelected(e.target.value); invalidate(); }} className="input-field">
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input className="input-field" placeholder="Exam (e.g. Unit Test 1)" value={exam} onChange={(e) => { setExam(e.target.value); invalidate(); }} />
        <input className="input-field" placeholder="Subject" value={subject} onChange={(e) => { setSubject(e.target.value); invalidate(); }} />
        <input type="number" min="1" className="input-field" placeholder="Max marks" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} />
        <input className="input-field" placeholder="Academic year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
      </div>
      <button onClick={load} disabled={loading} className="btn-primary mb-6">{loading ? 'Loading...' : 'Load Students'}</button>

      {loaded && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{current?.label} — {exam} — {subject}</h3>
            <button onClick={save} disabled={saving || students.length === 0} className="btn-primary text-sm">{saving ? 'Saving...' : 'Save Marks'}</button>
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
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Marks (out of {maxMarks || '-'})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 text-gray-400">{s.rollNumber || '-'}</td>
                      <td className="py-2 px-4 font-medium text-gray-900">{s.firstName} {s.lastName}</td>
                      <td className="py-2 px-4">
                        <input type="number" min="0" max={maxMarks || undefined} step="0.5" inputMode="decimal"
                          className="input-field w-28" value={marks[s._id]}
                          onChange={(e) => setMarks((prev) => ({ ...prev, [s._id]: e.target.value }))} />
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

export default TeacherMarks;
