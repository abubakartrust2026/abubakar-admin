import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  HiOutlineHome,
  HiOutlineUserGroup,
  HiOutlineClipboardCheck,
  HiOutlineCurrencyRupee,
  HiOutlineDocumentText,
  HiOutlineCreditCard,
} from 'react-icons/hi';

const Sidebar = () => {
  const { user } = useSelector((state) => state.auth);
  const { sidebarOpen } = useSelector((state) => state.ui);

  const adminLinks = [
    { to: '/dashboard', icon: HiOutlineHome, label: 'Dashboard' },
    { to: '/students', icon: HiOutlineUserGroup, label: 'Students' },
    { to: '/attendance', icon: HiOutlineClipboardCheck, label: 'Attendance' },
    { to: '/fees', icon: HiOutlineCurrencyRupee, label: 'Fee Structure' },
    { to: '/invoices', icon: HiOutlineDocumentText, label: 'Invoices' },
    { to: '/payments', icon: HiOutlineCreditCard, label: 'Payments' },
  ];

  const parentLinks = [
    { to: '/dashboard', icon: HiOutlineHome, label: 'Dashboard' },
    { to: '/payments', icon: HiOutlineCreditCard, label: 'Payments' },
  ];

  const links = user?.role === 'admin' ? adminLinks : parentLinks;

  return (
    <aside
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-all duration-300 z-40 ${
        sidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'
      }`}
    >
      <div className="flex flex-col h-full py-4 overflow-y-auto scrollbar-thin">
        <nav className="flex-1 px-3 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <link.icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span className="ml-3">{link.label}</span>}
            </NavLink>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Abubakar English School
            </p>
            <p className="text-xs text-gray-400 text-center mt-1">v1.0.0</p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;