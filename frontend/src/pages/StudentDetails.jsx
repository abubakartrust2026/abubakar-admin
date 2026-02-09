import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import { studentApi } from '../api/studentApi';
import { attendanceApi } from '../api/attendanceApi';
import Loader from '../components/common/Loader';
import { formatDate, formatCurrency, getStatusColor, getInitials } from '../utils/formatters';

const StudentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    const load = async () => {
      try {
        const [studentRes, attendanceRes, summaryRes] = await Promise.all([
          studentApi.getById(id),
          attendanceApi.getByStudent(id, {}),
          attendanceApi.getSummary(id, {}),
        ]);
        setStudent(studentRes.data.data);
        setAttendance(attendanceRes.data.data);
        setAttendanceSummary(summaryRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <Loader size="lg" />;
  if (!student) return <p className="text-center text-gray-500 py-8">Student not found.</p>;

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'attendance', label: 'Attendance' },
  ];

  return (
    <div>
      <button onClick={() => navigate('/students')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
        <HiOutlineArrowLeft className="h-4 w-4" /> Back to Students
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-xl font-bold text-primary-700">
              {getInitials(student.firstName, student.lastName)}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{student.firstName} {student.lastName}</h1>
            <p className="text-gray-500">Class {student.class}{student.section && `-${student.section}`} | {student.admissionNumber}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
              {student.status}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Personal Information</h3>
            <dl className="space-y-3">
              {[
                ['Date of Birth', formatDate(student.dateOfBirth)],
                ['Gender', student.gender],
                ['Blood Group', student.bloodGroup || '-'],
                ['Admission Date', formatDate(student.admissionDate)],
                ['Academic Year', student.academicYear],
                ['Roll Number', student.rollNumber || '-'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-sm text-gray-500">{label}</dt>
                  <dd className="text-sm font-medium text-gray-900 capitalize">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Parent Information</h3>
            <dl className="space-y-3">
              {[
                ['Name', `${student.parent?.firstName || ''} ${student.parent?.lastName || ''}`],
                ['Email', student.parent?.email || '-'],
                ['Phone', student.parent?.phone || '-'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-sm text-gray-500">{label}</dt>
                  <dd className="text-sm font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div>
          {attendanceSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
              {[
                ['Total Days', attendanceSummary.total, 'bg-gray-50'],
                ['Present', attendanceSummary.present, 'bg-green-50'],
                ['Absent', attendanceSummary.absent, 'bg-red-50'],
                ['Late', attendanceSummary.late, 'bg-yellow-50'],
                ['Rate', `${attendanceSummary.attendanceRate}%`, 'bg-blue-50'],
              ].map(([label, value, bg]) => (
                <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendance.length === 0 ? (
                  <tr><td colSpan="3" className="py-6 text-center text-gray-400">No attendance records</td></tr>
                ) : (
                  attendance.slice(0, 30).map(record => (
                    <tr key={record._id}>
                      <td className="py-3 px-4">{formatDate(record.date)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{record.remarks || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetails;
