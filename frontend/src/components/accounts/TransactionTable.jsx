import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import { formatDate, formatCurrency } from '../../utils/formatters';

const TransactionTable = ({ transactions, showInstitution, onEdit, onDelete }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
            {showInstitution && <th className="text-left py-3 px-4 font-medium text-gray-500">Institution</th>}
            <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Source / Category</th>
            <th className="text-right py-3 px-4 font-medium text-gray-500">Amount</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Description</th>
            <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.length === 0 ? (
            <tr><td colSpan={showInstitution ? 7 : 6} className="py-8 text-center text-gray-400">No transactions found</td></tr>
          ) : (
            transactions.map((t) => (
              <tr key={t._id} className="hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-600">{formatDate(t.date)}</td>
                {showInstitution && <td className="py-3 px-4">{t.institution?.name}</td>}
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {t.type}
                  </span>
                </td>
                <td className="py-3 px-4 capitalize">{t.category?.replace(/_/g, ' ')}</td>
                <td className={`py-3 px-4 text-right font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(t.amount)}
                </td>
                <td className="py-3 px-4 text-gray-500">{t.description}</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onEdit(t)} className="p-1.5 hover:bg-gray-100 rounded">
                      <HiOutlinePencil className="h-4 w-4 text-blue-500" />
                    </button>
                    <button onClick={() => onDelete(t._id)} className="p-1.5 hover:bg-gray-100 rounded">
                      <HiOutlineTrash className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default TransactionTable;
