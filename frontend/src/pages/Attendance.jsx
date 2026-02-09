import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlineClipboardCheck, HiOutlineSearch } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { fetchAttendance } from '../store/slices/attendanceSlice';
import { attendanceApi } from '../api/attendanceApi';
import { studentApi } from '../api/studentApi';
import Loader from '../components/common/Loader';
import { formatDate, getStatusColor } from '../utils/formatters';

const Attendance = () => {
  const dispatch = useDispatch();
  const { records, loading } = useSelector((state) => state.attendance);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [markingMode, setMarkingMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchAttendance({ date: selectedDate, class: selectedClass || undefined }));
  }, [dispatch, selectedDate, selectedClass]);

  const loadStudentsForMarking = async () => {
    if (!selectedClass) {
      toast.error('Please select a class');
      return;
    }
    try {
      const res = await studentApi.getByClass(selectedClass);
      const studentList = res.data.data;
      setStudents(studentList);

      // Pre-fill existing attendance
      const existing = {};
      records.forEach(r => {
        if (r.student) existing[r.student._id] = r.status;
      });
      const initial = {};
      studentList.forEach(s => {
        initial[s._id] = existing[s._id] || 'present';
      });
      setAttendanceData(initial);
      setMarkingMode(true);
    } catch (err) {
      toast.error('Failed to load students');
    }
  };

  const handleBulkSubmit = async () => {
    setSubmitting(true);
    try {
      const bulkRecords = Object.entries(attendanceData).map(([studentId, status]) => ({
        student: studentId,
        status,
      }));
      await attendanceApi.bulkMark({ date: selectedDate, records: bulkRecords });
      toast.success(`Attendance marked for ${bulkRecords.length} students`);
      setMarkingMode(false);
      dispatch(fetchAttendance({ date: selectedDate, class: selectedClass || undefined }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const statusOptions = ['present', 'absent', 'late', 'excused'];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500">Mark and view student attendance</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input type="date" value={selectedDate}
          onChange={(e) => { setSelectedDate(e.target.value); setMarkingMode(false); }}
          className="input-field w-full sm:w-48" />
        <select value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setMarkingMode(false); }}
          className="input-field w-full sm:w-40">
          <option value="">All Classes</option>
          {['1','2','3','4','5','6','7','8','9','10'].map(c => (
            <option key={c} value={c}>Class {c}</option>
          ))}
        </select>
        {!markingMode && (
          <button onClick={loadStudentsForMarking} className="btn-primary flex items-center gap-2">
            <HiOutlineClipboardCheck className="h-5 w-5" /> Mark Attendance
          </button>
        )}
      </div>

      {/* Marking Mode */}
      {markingMode && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Mark Attendance — Class {selectedClass} — {formatDate(selectedDate)}
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setMarkingMode(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleBulkSubmit} disabled={submitting} className="btn-primary text-sm">
                {submitting ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-4 bg-gray-50 border-b flex gap-2">
            <span className="text-sm text-gray-500 mr-2">Mark all:</span>
            {statusOptions.map(status => (
              <button key={status} onClick={() => {
                const updated = {};
                students.forEach(s => { updated[s._id] = status; });
                setAttendanceData(updated);
              }} className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(status)}`}>
                {status}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">#</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Roll No.</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student, idx) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">{student.firstName} {student.lastName}</td>
                    <td className="py-3 px-4 text-gray-600">{student.rollNumber || '-'}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {statusOptions.map(status => (
                          <button key={status}
                            onClick={() => setAttendanceData(prev => ({ ...prev, [student._id]: status }))}
                            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                              attendanceData[student._id] === status
                                ? getStatusColor(status)
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
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
        </div>
      )}

      {/* View Existing Records */}
      {!markingMode && (
        loading ? <Loader /> : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Student</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Class</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Marked By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.length === 0 ? (
                    <tr><td colSpan="5" className="py-8 text-center text-gray-400">No attendance records for this date</td></tr>
                  ) : (
                    records.map(record => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{record.student?.firstName} {record.student?.lastName}</td>
                        <td className="py-3 px-4 text-gray-600">{record.student?.class}</td>
                        <td className="py-3 px-4 text-gray-600">{formatDate(record.date)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500">{record.markedBy?.firstName} {record.markedBy?.lastName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default Attendance;