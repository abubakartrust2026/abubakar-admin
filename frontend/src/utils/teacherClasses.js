// Teacher's assigned { class, section } pairs as select options ("5|A"), and helpers to filter by them
export const formatClassLabel = (c) => (c.startsWith('Jr') || c.startsWith('Sr') ? c : `Class ${c}`);

export const classOptions = (assignedClasses = []) =>
  assignedClasses.map((a) => ({
    value: `${a.class}|${a.section || ''}`,
    class: a.class,
    section: a.section || '',
    label: `${formatClassLabel(a.class)}${a.section ? ` - ${a.section}` : ''}`,
  }));

export const inSection = (student, section) => !section || student?.section === section;
