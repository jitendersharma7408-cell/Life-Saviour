import { base44 } from '@/api/base44Client';

export const STAFF_ROLES = ['admin', 'coordinator', 'clinician', 'lab', 'pharmacy'];
export const FULL_ACCESS_ROLES = ['admin', 'coordinator', 'clinician'];
export const CONSENT_ROLES = ['admin', 'coordinator', 'clinician'];
export const AUDIT_ROLES = ['admin'];

export function effectiveRole(role) {
  if (!role || !STAFF_ROLES.includes(role)) return 'coordinator';
  return role;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function todayStr(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function effectiveStatus(task, now = new Date()) {
  if (task.status === 'escalated') return 'escalated';
  if (task.status === 'done') return 'done';
  if (task.status === 'in_progress') return 'in_progress';
  const due = task.due_date ? new Date(task.due_date) : null;
  if (task.status === 'pending' && due && startOfDay(due) < startOfDay(now)) return 'missed';
  if (task.status === 'missed') return 'missed';
  return task.status || 'pending';
}

export function daysOverdue(task, now = new Date()) {
  const due = task.due_date ? new Date(task.due_date) : null;
  if (!due) return 0;
  return Math.floor((startOfDay(now) - startOfDay(due)) / 86400000);
}

export function isDueToday(task, now = new Date()) {
  const due = task.due_date ? new Date(task.due_date) : null;
  return !!due && due.toISOString().slice(0, 10) === todayStr(now);
}

export function classifyTask(task, escalations, now = new Date()) {
  const esc = escalations.find(
    (e) => e.task === task.id && (e.status === 'open' || e.status === 'acknowledged')
  );
  if (esc || task.status === 'escalated') return 'escalated';
  const status = effectiveStatus(task, now);
  if (status === 'missed') return 'overdue';
  if (status === 'pending' && isDueToday(task, now)) return 'today';
  if (status === 'pending' && task.owner_type === 'patient') return 'waiting';
  return 'other';
}

export function consentBlocked(patient) {
  return patient && (patient.consent_status === 'missing' || patient.consent_status === 'expired');
}

export async function writeAudit(action, entity, entityId, reason) {
  try {
    const me = await base44.auth.me();
    await base44.entities.AuditLog.create({
      actor: me.email || me.id,
      action,
      entity,
      entity_id: entityId || '',
      reason: reason || ''
    });
  } catch (e) {
    /* audit write must not block the action */
  }
}

export function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function addDays(dateStr, n) {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export const TYPE_LABEL = {
  lab: 'Lab test',
  follow_up: 'Follow-up',
  referral: 'Referral',
  medication: 'Medication',
  appointment: 'Appointment'
};

export const STATUS_LABEL = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
  missed: 'Missed',
  escalated: 'Escalated'
};

export const PATHWAY_LABEL = {
  diabetes: 'Diabetes',
  post_op: 'Post-op',
  maternal: 'Maternal',
  tb: 'TB'
};