const MAP = {
  pending: { label: 'Pending', cls: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In progress', cls: 'bg-primary/10 text-primary' },
  done: { label: 'Done', cls: 'bg-primary/15 text-primary' },
  missed: { label: 'Missed', cls: 'bg-red-50 text-red-600' },
  escalated: { label: 'Escalated', cls: 'bg-red-100 text-red-700' },
  active: { label: 'Active', cls: 'bg-primary/15 text-primary' },
  expired: { label: 'Expired', cls: 'bg-red-50 text-red-600' },
  missing: { label: 'Missing', cls: 'bg-red-100 text-red-700' }
};

export default function StatusBadge({ status }) {
  const s = MAP[status] || MAP.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}