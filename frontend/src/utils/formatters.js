import { format, parseISO, isValid } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, 'dd MMM yyyy') : '-';
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, 'dd MMM yyyy, hh:mm a') : '-';
};

export const formatCurrency = (amount) => {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const getInitials = (firstName, lastName) => {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
};

export const getStatusColor = (status) => {
  const colors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    present: 'bg-green-100 text-green-800',
    absent: 'bg-red-100 text-red-800',
    late: 'bg-yellow-100 text-yellow-800',
    excused: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    partially_paid: 'bg-orange-100 text-orange-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};