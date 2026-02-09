import { useSelector } from 'react-redux';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import ParentDashboard from '../components/dashboard/ParentDashboard';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);

  if (user?.role === 'admin') return <AdminDashboard />;
  if (user?.role === 'parent') return <ParentDashboard />;

  return (
    <div className="text-center py-12">
      <p className="text-gray-500">Unknown user role. Please contact admin.</p>
    </div>
  );
};

export default Dashboard;