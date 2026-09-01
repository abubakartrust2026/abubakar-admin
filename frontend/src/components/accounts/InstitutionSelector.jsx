const InstitutionSelector = ({ value, onChange, institutions }) => (
  <div>
    <label className="label">Institution</label>
    <select className="input-field" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="all">All Institutions (Combined)</option>
      {institutions.map((inst) => (
        <option key={inst._id} value={inst._id}>{inst.name}</option>
      ))}
    </select>
  </div>
);

export default InstitutionSelector;
