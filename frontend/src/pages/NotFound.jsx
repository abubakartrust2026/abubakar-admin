import { Link } from 'react-router-dom';
import { HiOutlineHome } from 'react-icons/hi';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary-200">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mt-4">Page Not Found</h2>
        <p className="text-gray-500 mt-2">The page you are looking for does not exist.</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 btn-primary mt-6"
        >
          <HiOutlineHome className="h-5 w-5" />
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;