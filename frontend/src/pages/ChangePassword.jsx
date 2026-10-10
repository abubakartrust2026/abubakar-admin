import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import AuthLayout from '../components/layout/AuthLayout';
import { setUser } from '../store/slices/authSlice';
import { authApi } from '../api/authApi';

const ChangePassword = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const forced = !!user?.mustChangePassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (form.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      dispatch(setUser(res.data.user));
      toast.success('Password changed successfully');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  const field = (name, label, autoComplete) => (
    <div>
      <label className="label">{label}</label>
      <input
        type="password"
        autoComplete={autoComplete}
        className="input-field"
        required
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      />
    </div>
  );

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">{forced ? 'Set your password' : 'Change password'}</h2>
      <p className="text-gray-500 mb-6">
        {forced
          ? 'You are using a temporary password. Please choose your own to continue.'
          : 'Choose a new password for your account.'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        {field('currentPassword', forced ? 'Temporary password' : 'Current password', 'current-password')}
        {field('newPassword', 'New password (min 8 characters)', 'new-password')}
        {field('confirmPassword', 'Confirm new password', 'new-password')}
        <button type="submit" disabled={submitting} className="w-full btn-primary py-3 disabled:opacity-50">
          {submitting ? 'Saving...' : 'Save Password'}
        </button>
        {!forced && (
          <button type="button" onClick={() => navigate(-1)} className="w-full btn-secondary py-3">Cancel</button>
        )}
      </form>
    </AuthLayout>
  );
};

export default ChangePassword;
