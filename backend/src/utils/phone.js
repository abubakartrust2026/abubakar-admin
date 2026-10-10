// Teacher login IDs are stored as the last 10 digits, so "+91 98765-43210" and "9876543210" match
export const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};
