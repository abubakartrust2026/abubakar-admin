import { useState, useEffect } from 'react';
import {
  HiOutlineUserGroup, HiOutlineClipboardCheck,
  HiOutlineCurrencyRupee, HiOutlineExclamation,
} from 'react-icons/hi';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { dashboardApi } from '../../api/dashboardApi';
import StatsCard from './StatsCard';
import Loader from '../common/Loader';
import { formatCurrency, formatDate } from '../../utils/formatters';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await dashboardApi.getAdminDashboard();
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

  const { stats, monthlyRevenue, recentPayments, studentsByClass, weeklyAttendance } = data;

  const revenueChartData = {
    labels: monthlyRevenue.map((m) => m._id),
    datasets: [{
      label: 'Revenue',
      data: monthlyRevenue.map((m) => m.total),
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1,
    }],
  };

  const studentDistribution = {
    labels: studentsByClass.map((s) => `Class ${s._id}`),
    datasets: [{
      data: studentsByClass.map((s) => s.count),
      backgroundColor: [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
        '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
      ],
    }],
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome back! Here's an overview of your school.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Students" value={stats.totalStudents} icon={HiOutlineUserGroup} color="blue" />
        <StatsCard
          title="Attendance Today"
          value={`${stats.attendanceRate}%`}
          icon={HiOutlineClipboardCheck}
          color="green"
          subtitle={`${stats.presentToday}/${stats.totalAttendanceToday} present`}
        />
        <StatsCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={HiOutlineCurrencyRupee} color="purple" />
        <StatsCard
          title="Pending Invoices"
          value={stats.pendingInvoices}
          icon={HiOutlineExclamation}
          color="yellow"
          subtitle={`${stats.overdueInvoices} overdue`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
          {monthlyRevenue.length > 0 ? (
            <Bar data={revenueChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          ) : (
            <p className="text-gray-400 text-center py-8">No revenue data available</p>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Students by Class</h3>
          {studentsByClass.length > 0 ? (
            <div className="flex justify-center"><div className="w-64"><Doughnut data={studentDistribution} /></div></div>
          ) : (
            <p className="text-gray-400 text-center py-8">No student data available</p>
          )}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h3>
        {recentPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Student</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Parent</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Amount</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => (
                  <tr key={p._id} className="border-b border-gray-50">
                    <td className="py-3 px-2">{p.student?.firstName} {p.student?.lastName}</td>
                    <td className="py-3 px-2">{p.parent?.firstName} {p.parent?.lastName}</td>
                    <td className="py-3 px-2 font-semibold text-green-600">{formatCurrency(p.amount)}</td>
                    <td className="py-3 px-2 text-gray-500">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">No recent payments</p>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;