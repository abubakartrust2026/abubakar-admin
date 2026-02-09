import { useState, useEffect } from 'react';
import { HiOutlineAcademicCap, HiOutlineClipboardCheck, HiOutlineCurrencyRupee } from 'react-icons/hi';
import { dashboardApi } from '../../api/dashboardApi';
import StatsCard from './StatsCard';
import Loader from '../common/Loader';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatters';

const ParentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await dashboardApi.getParentDashboard();
        setData(res.data.data);
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Loader size="lg" />;
  if (!data) return <p className="text-center text-gray-500">Failed to load dashboard data.</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
        <p className="text-gray-500">Monitor your children's progress and fees.</p>
      </div>

      {data.children.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <p className="text-gray-500">No children records found.</p>
        </div>
      ) : (
        data.children.map(({ student, attendance, fees }) => (
          <div key={student._id} className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {student.firstName} {student.lastName} — Class {student.class}
              {student.section && ` (${student.section})`}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <StatsCard
                title="Class"
                value={`Class ${student.class}`}
                icon={HiOutlineAcademicCap}
                color="blue"
              />
              <StatsCard
                title="Attendance (30 days)"
                value={`${attendance.attendanceRate}%`}
                icon={HiOutlineClipboardCheck}
                color="green"
                subtitle={`${attendance.presentDays}/${attendance.totalDays} days present`}
              />
              <StatsCard
                title="Pending Fees"
                value={formatCurrency(fees.totalDue)}
                icon={HiOutlineCurrencyRupee}
                color={fees.totalDue > 0 ? 'red' : 'green'}
                subtitle={`${fees.pendingInvoices} invoice(s) pending`}
              />
            </div>

            {/* Recent Attendance */}
            {attendance.recentRecords.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Attendance</h3>
                <div className="flex flex-wrap gap-2">
                  {attendance.recentRecords.map((record) => (
                    <div key={record._id} className="text-center">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                        {formatDate(record.date).slice(0, 6)}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 capitalize">{record.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Due */}
            {fees.upcomingDue && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-sm font-medium text-yellow-800">
                  Next payment due: {formatCurrency(fees.upcomingDue.total)} by {formatDate(fees.upcomingDue.dueDate)}
                </p>
              </div>
            )}
          </div>
        ))
      )}

      {/* Recent Payments */}
      {data.recentPayments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h3>
          <div className="space-y-3">
            {data.recentPayments.map((p) => (
              <div key={p._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {p.student?.firstName} {p.student?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{p.invoice?.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-gray-500">{formatDate(p.transactionDate)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;