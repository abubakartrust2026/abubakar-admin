import { getFinancialYearOptions } from '../../utils/formatters';

const FinancialYearSelector = ({ value, onChange }) => (
  <div>
    <label className="label">Financial Year</label>
    <select className="input-field" value={value} onChange={(e) => onChange(e.target.value)}>
      {getFinancialYearOptions().map((fy) => (
        <option key={fy} value={fy}>{fy}</option>
      ))}
    </select>
  </div>
);

export default FinancialYearSelector;
