import { useState } from 'react';
import { Check, Clock, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { FULL_ACCESS_ROLES, addDays, writeAudit } from '@/lib/care';

export default function TaskQuickActions({ task, role, onChanged }) {
  const [busy, setBusy] = useState('');
  const canEscalate = FULL_ACCESS_ROLES.includes(role);

  const markDone = async () => {
    setBusy('done');
    try {
      await base44.entities.CareTask.update(task.id, { status: 'done' });
      await writeAudit('task_marked_done', 'CareTask', task.id, 'Marked done from Today queue');
      onChanged();
    } finally { setBusy(''); }
  };
  const snooze = async () => {
    setBusy('snooze');
    try {
      await base44.entities.CareTask.update(task.id, { due_date: addDays(task.due_date, 3), status: 'pending' });
      await writeAudit('task_snoozed', 'CareTask', task.id, 'Snoozed 3 days from Today queue');
      onChanged();
    } finally { setBusy(''); }
  };
  const escalate = async () => {
    setBusy('escalate');
    try {
      await base44.entities.Escalation.create({
        task: task.id,
        level: '1',
        reason: 'Manual escalation from Today queue',
        assigned_to: 'coordinator',
        sla_breach_at: new Date().toISOString(),
        status: 'open',
        handoff_note: ''
      });
      await base44.entities.CareTask.update(task.id, { status: 'escalated' });
      await writeAudit('task_escalated', 'CareTask', task.id, 'Manually escalated from Today queue');
      onChanged();
    } finally { setBusy(''); }
  };

  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="ghost" disabled={!!busy} onClick={markDone} title="Mark done">
        <Check className="h-4 w-4" /><span className="hidden sm:inline">Done</span>
      </Button>
      <Button size="sm" variant="ghost" disabled={!!busy} onClick={snooze} title="Snooze 3 days">
        <Clock className="h-4 w-4" /><span className="hidden sm:inline">Snooze</span>
      </Button>
      {canEscalate && (
        <Button size="sm" variant="ghost" disabled={!!busy} onClick={escalate} title="Escalate">
          <ArrowUpCircle className="h-4 w-4" /><span className="hidden sm:inline">Escalate</span>
        </Button>
      )}
    </div>
  );
}