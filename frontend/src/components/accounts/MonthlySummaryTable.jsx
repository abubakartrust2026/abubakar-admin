import { formatCurrency } from '../../utils/formatters';

const formatMonth = (monthKey) => {
  const [y, m] = monthKey.split('-');
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

const MonthlySummaryTable = ({ data }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="p-4 border-b"><h3 className="text-lg font-semibold text-gray-900">Monthly Summary</h3></div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Month</th>
            <th className="text-right py-3 px-4 font-medium text-gray-500">Opening</th>
            <th className="text-right py-3 px-4 font-medium text-gray-500">Income</th>
            <th className="text-right py-3 px-4 font-medium text-gray-500">Expenses</th>
            <th className="text-right py-3 px-4 font-medium text-gray-500">Closing</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr><td colSpan="5" className="py-8 text-center text-gray-400">No transaction data available</td></tr>
          ) : (
            data.map((row) => (
              <tr key={row.month} className="hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{formatMonth(row.month)}</td>
                <td className="py-3 px-4 text-right">{formatCurrency(row.opening)}</td>
                <td className="py-3 px-4 text-right text-green-600">{formatCurrency(row.income)}</td>
                <td className="py-3 px-4 text-right text-red-600">{formatCurrency(row.expense)}</td>
                <td className="py-3 px-4 text-right font-semibold">{formatCurrency(row.closing)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default MonthlySummaryTable;
