import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash, HiOutlineEye } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchStudents } from '../store/slices/studentSlice';
import { studentApi } from '../api/studentApi';
import { userApi } from '../api/userApi';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { formatDate, getStatusColor } from '../utils/formatters';

const Students = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, pagination, loading } = useSelector((state) => state.students);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [parents, setParents] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', dateOfBirth: '', gender: 'male',
    admissionNumber: '', admissionDate: new Date().toISOString().split('T')[0],
    class: '', section: '', rollNumber: '', parent: '', academicYear: '2025-2026',
    bloodGroup: '', address: { street: '', city: '', state: '', zipCode: '' },
    emergencyContact: { name: '', relationship: '', phone: '' },
  });

  useEffect(() => {
    dispatch(fetchStudents({ page, limit: 10, search, class: classFilter }));
  }, [dispatch, page, search, classFilter]);

  useEffect(() => {
    userApi.getParents().then(res => setParents(res.data.data)).catch(() => {});
  }, []);

  const resetForm = () => {
    setFormData({
      firstName: '', lastName: '', dateOfBirth: '', gender: 'male',
      admissionNumber: '', admissionDate: new Date().toISOString().split('T')[0],
      class: '', section: '', rollNumber: '', parent: '', academicYear: '2025-2026',
      bloodGroup: '', address: { street: '', city: '', state: '', zipCode: '' },
      emergencyContact: { name: '', relationship: '', phone: '' },
    });
    setEditingStudent(null);
  };

  const handleOpenForm = (student = null) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        ...student,
        dateOfBirth: student.dateOfBirth?.split('T')[0] || '',
        admissionDate: student.admissionDate?.split('T')[0] || '',
        parent: student.parent?._id || student.parent || '',
      });
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await studentApi.update(editingStudent._id, formData);
        toast.success('Student updated successfully');
      } else {
        await studentApi.create(formData);
        toast.success('Student created successfully');
      }
      setShowForm(false);
      resetForm();
      dispatch(fetchStudents({ page, limit: 10, search, class: classFilter }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      await studentApi.delete(id);
      toast.success('Student deleted');
      dispatch(fetchStudents({ page, limit: 10, search, class: classFilter }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500">Manage student records ({pagination.total} total)</p>
        </div>
        <button onClick={() => handleOpenForm()} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="h-5 w-5" /> Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text" placeholder="Search students..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-10"
          />
        </div>
        <select
          value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
          className="input-field w-full sm:w-40"
        >
          <option value="">All Classes</option>
          {[...'12345678910'].filter((_, i, arr) => arr.indexOf(_) === i).map((c) => null)}
          {['1','2','3','4','5','6','7','8','9','10'].map((c) => (
            <option key={c} value={c}>Class {c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? <Loader /> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Admission #</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Class</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Parent</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.length === 0 ? (
                  <tr><td colSpan="6" className="py-8 text-center text-gray-400">No students found</td></tr>
                ) : (
                  list.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary-700">
                              {student.firstName?.[0]}{student.lastName?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{student.firstName} {student.lastName}</p>
                            <p className="text-xs text-gray-400">{student.gender}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{student.admissionNumber}</td>
                      <td className="py-3 px-4 text-gray-600">{student.class}{student.section && `-${student.section}`}</td>
                      <td className="py-3 px-4 text-gray-600">{student.parent?.firstName} {student.parent?.lastName}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate(`/students/${student._id}`)} className="p-1.5 hover:bg-gray-100 rounded" title="View">
                            <HiOutlineEye className="h-4 w-4 text-gray-500" />
                          </button>
                          <button onClick={() => handleOpenForm(student)} className="p-1.5 hover:bg-gray-100 rounded" title="Edit">
                            <HiOutlinePencil className="h-4 w-4 text-blue-500" />
                          </button>
                          <button onClick={() => handleDelete(student._id)} className="p-1.5 hover:bg-gray-100 rounded" title="Delete">
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

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">Previous</button>
                <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }}
        title={editingStudent ? 'Edit Student' : 'Add New Student'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input type="text" className="input-field" required value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input type="text" className="input-field" required value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
            </div>
            <div>
              <label className="label">Date of Birth *</label>
              <input type="date" className="input-field" required value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
            </div>
            <div>
              <label className="label">Gender *</label>
              <select className="input-field" value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Admission Number *</label>
              <input type="text" className="input-field" required value={formData.admissionNumber}
                onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })} />
            </div>
            <div>
              <label className="label">Admission Date *</label>
              <input type="date" className="input-field" required value={formData.admissionDate}
                onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Class *</label>
              <select className="input-field" required value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}>
                <option value="">Select Class</option>
                {['1','2','3','4','5','6','7','8','9','10'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Section</label>
              <input type="text" className="input-field" value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })} placeholder="A, B, C..." />
            </div>
            <div>
              <label className="label">Roll Number</label>
              <input type="text" className="input-field" value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })} />
            </div>
            <div>
              <label className="label">Parent *</label>
              <select className="input-field" required value={formData.parent}
                onChange={(e) => setFormData({ ...formData, parent: e.target.value })}>
                <option value="">Select Parent</option>
                {parents.map(p => (
                  <option key={p._id} value={p._id}>{p.firstName} {p.lastName} ({p.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Blood Group</label>
              <input type="text" className="input-field" value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })} placeholder="A+, B-, O+..." />
            </div>
            <div>
              <label className="label">Academic Year</label>
              <input type="text" className="input-field" value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingStudent ? 'Update' : 'Create'} Student</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Students;