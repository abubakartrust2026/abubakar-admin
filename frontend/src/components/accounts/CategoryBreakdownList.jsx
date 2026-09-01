import { formatCurrency } from '../../utils/formatters';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../../api/accountsApi';

const getCategoryLabel = (type, value) => {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find((c) => c.value === value)?.label || value;
};

const CategoryBreakdownList = ({ title, type, data, color }) => {
  const total = data.reduce((sum, d) => sum + d.total, 0);
  const colorClass = color === 'green' ? 'text-green-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ul className="divide-y divide-gray-100">
        {data.length === 0 ? (
          <li className="py-4 text-center text-gray-400 text-sm">No data available</li>
        ) : (
          data.map((row) => (
            <li key={row.category} className="flex justify-between py-2.5 text-sm">
              <span className="text-gray-700">{getCategoryLabel(type, row.category)}</span>
              <span className={`font-semibold ${colorClass}`}>{formatCurrency(row.total)}</span>
            </li>
          ))
        )}
      </ul>
      <div className="flex justify-between pt-3 mt-2 border-t-2 font-bold">
        <span>TOTAL {type === 'income' ? 'INCOME' : 'EXPENSES'}</span>
        <span className={colorClass}>{formatCurrency(total)}</span>
      </div>
    </div>
  );
};

export default CategoryBreakdownList;
