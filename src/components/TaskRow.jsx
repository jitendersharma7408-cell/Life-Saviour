import StatusBadge from '@/components/StatusBadge';
import TaskQuickActions from '@/components/TaskQuickActions';
import AiDraftPanel from '@/components/AiDraftPanel';
import { daysOverdue, TYPE_LABEL } from '@/lib/care';

const BORDER = {
  overdue: 'border-l-red-500',
  today: 'border-l-primary',
  waiting: 'border-l-amber-400',
  escalated: 'border-l-red-700',
  other: 'border-l-slate-300'
};

export default function TaskRow({ task, patient, section, role, onChanged }) {
  const overdueDays = daysOverdue(task);
  return (
    <div className={`border-l-4 ${BORDER[section] || BORDER.other} bg-white px-4 py-3`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">{patient?.full_name || 'Unknown patient'}</span>
            <StatusBadge status={task.status} />
          </div>
          <div className="mt-0.5 text-sm text-muted-foreground truncate">
            {TYPE_LABEL[task.type] || task.type}{task.pathway_step ? ` · ${task.pathway_step}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-xs">
            {overdueDays > 0 ? (
              <div><span className="font-semibold text-red-600">{overdueDays}d</span> <span className="text-muted-foreground">overdue</span></div>
            ) : (
              <div className="text-muted-foreground">
                Due {task.due_date ? new Date(task.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
              </div>
            )}
            <div className="text-muted-foreground capitalize">{task.owner_type}</div>
          </div>
          <TaskQuickActions task={task} role={role} onChanged={onChanged} />
        </div>
      </div>
      {(section === 'overdue' || section === 'escalated') && (
        <AiDraftPanel task={task} patient={patient} onChanged={onChanged} />
      )}
    </div>
  );
}