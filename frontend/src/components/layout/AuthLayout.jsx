const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-800 via-primary-700 to-secondary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Abubakar English School" className="h-28 w-28 mx-auto mb-4 drop-shadow-lg" />
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
