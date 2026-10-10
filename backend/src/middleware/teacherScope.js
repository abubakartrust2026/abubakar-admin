import Student from '../models/Student.js';

// A teacher is assigned { class, section } pairs. An empty section means the whole class.
export const teacherCanAccessClass = (user, studentClass, section) => {
  if (user.role === 'admin') return true;
  if (user.role !== 'teacher') return false;
  return (user.assignedClasses || []).some(
    (a) => a.class === String(studentClass) && (!a.section || !section || a.section === String(section))
  );
};

// Mongo filter limiting Student queries to a teacher's assigned classes (admins get no restriction)
export const studentScopeFilter = (user) => {
  if (user.role === 'admin') return {};
  const assigned = user.assignedClasses || [];
  if (!assigned.length) return { _id: { $in: [] } };
  return {
    $or: assigned.map((a) => (a.section ? { class: a.class, section: a.section } : { class: a.class })),
  };
};

export const teacherCanAccessStudent = async (user, studentId) => {
  if (user.role === 'admin') return true;
  const student = await Student.findById(studentId).select('class section');
  return !!student && teacherCanAccessClass(user, student.class, student.section);
};

// Express middleware: for teachers, the class in params/query/body must be one of their assigned classes
export const requireClassAccess = (req, res, next) => {
  if (req.user.role !== 'teacher') return next();
  const studentClass = req.params.class || req.query.class || req.body?.class;
  const section = req.query.section || req.body?.section;
  if (!studentClass || !teacherCanAccessClass(req.user, studentClass, section)) {
    res.status(403);
    return next(new Error('You are not assigned to this class'));
  }
  next();
};

// Stricter than teacherCanAccessClass, for writes: an empty section only passes if the teacher
// holds the whole class (a teacher assigned to 5-A alone can't write something for "all of class 5")
export const teacherCanWriteClass = (user, studentClass, section) => {
  if (user.role === 'admin') return true;
  if (user.role !== 'teacher') return false;
  return (user.assignedClasses || []).some(
    (a) => a.class === String(studentClass) && (!a.section || a.section === String(section || ''))
  );
};

// Filter for documents that carry { class, section } where section '' means "whole class"
// (homework, timetable). Teachers also see whole-class items for any class they teach a section of.
export const classScopeFilter = (user) => {
  if (user.role === 'admin') return {};
  const assigned = user.assignedClasses || [];
  if (!assigned.length) return { _id: { $in: [] } };
  return {
    $or: assigned.flatMap((a) =>
      a.section ? [{ class: a.class, section: a.section }, { class: a.class, section: '' }] : [{ class: a.class }]
    ),
  };
};
