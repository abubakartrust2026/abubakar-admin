import { formatCurrency } from '../../utils/formatters';

const ComparisonTable = ({ data, grandTotal }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Institution</th>
            <th className="text-right py-3 px-4 font-medium text-gray-500">Opening</th>
            <th className="text-right py-3 px-4 font-medium text-gray-500">Income</th>
            <th className="text-right py-3 px-4 font-medium text-gray-500">Expenses</th>
            <th className="text-right py-3 px-4 font-medium text-gray-500">Closing</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr><td colSpan="5" className="py-8 text-center text-gray-400">No institutions found</td></tr>
          ) : (
            data.map((row) => (
              <tr key={row.institution._id} className="hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{row.institution.name}</td>
                <td className="py-3 px-4 text-right">{formatCurrency(row.opening)}</td>
                <td className="py-3 px-4 text-right text-green-600">{formatCurrency(row.income)}</td>
                <td className="py-3 px-4 text-right text-red-600">{formatCurrency(row.expense)}</td>
                <td className="py-3 px-4 text-right font-semibold">{formatCurrency(row.closing)}</td>
              </tr>
            ))
          )}
        </tbody>
        {grandTotal && (
          <tfoot className="bg-gray-50 font-semibold">
            <tr>
              <td className="py-3 px-4">TRUST COMBINED TOTAL</td>
              <td className="py-3 px-4 text-right">{formatCurrency(grandTotal.opening)}</td>
              <td className="py-3 px-4 text-right text-green-600">{formatCurrency(grandTotal.income)}</td>
              <td className="py-3 px-4 text-right text-red-600">{formatCurrency(grandTotal.expense)}</td>
              <td className="py-3 px-4 text-right">{formatCurrency(grandTotal.closing)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  </div>
);

export default ComparisonTable;
