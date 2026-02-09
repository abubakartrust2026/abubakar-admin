const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-2xl font-bold text-primary-600">A</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Abubakar English School</h1>
          <p className="text-primary-200 mt-1">Management System</p>
        </div>
        <div className="bg-white rounded-xl shadow-2xl p-8">
          {children}
        </div>
        <p className="text-center text-primary-200 text-sm mt-6">
          &copy; {new Date().getFullYear()} Abubakar Trust. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;