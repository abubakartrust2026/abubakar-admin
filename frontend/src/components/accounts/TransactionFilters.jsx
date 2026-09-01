import { HiOutlineSearch } from 'react-icons/hi';

const TransactionFilters = ({ search, onSearchChange, type, onTypeChange, month, onMonthChange }) => (
  <div className="flex flex-col sm:flex-row gap-3">
    <div className="relative flex-1">
      <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none z-10" />
      <input
        type="text"
        placeholder="Search description, reference, remarks..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="input-field !pl-10"
      />
    </div>
    <select className="input-field sm:w-48" value={type} onChange={(e) => onTypeChange(e.target.value)}>
      <option value="">All Types</option>
      <option value="income">Income Only</option>
      <option value="expense">Expense Only</option>
    </select>
    <input type="month" className="input-field sm:w-48" value={month} onChange={(e) => onMonthChange(e.target.value)} />
  </div>
);

export default TransactionFilters;
