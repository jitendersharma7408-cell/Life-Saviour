import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'coordinator') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const sr = base44.asServiceRole;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // 1. pending tasks past due_date -> missed
    const { items: overdue } = await sr.entities.CareTask.filter(
      { status: 'pending', due_date: { $lt: todayStr } },
      { limit: 500 }
    );
    let missedCount = 0;
    if (overdue.length) {
      const ids = overdue.map((t) => t.id);
      await sr.entities.CareTask.updateMany({ id: { $in: ids } }, { $set: { status: 'missed' } });
      await sr.entities.AuditLog.bulkCreate(
        overdue.map((t) => ({
          actor: user.email || user.id,
          action: 'task_auto_missed',
          entity: 'CareTask',
          entity_id: t.id,
          reason: 'Due date passed without completion'
        }))
      );
      missedCount = ids.length;
    }

    // 2. missed tasks past SLA -> escalation (if none open)
    const { items: missed } = await sr.entities.CareTask.filter({ status: 'missed' }, { limit: 500 });
    const breached = missed.filter((t) => {
      const due = t.due_date ? new Date(t.due_date).getTime() : 0;
      const breachAt = due + (t.sla_hours || 48) * 3600 * 1000;
      return breachAt < now.getTime();
    });
    let escCount = 0;
    if (breached.length) {
      const taskIds = breached.map((t) => t.id);
      const { items: existing } = await sr.entities.Escalation.filter(
        { task: { $in: taskIds }, status: { $in: ['open', 'acknowledged'] } },
        { limit: 500 }
      );
      const existingSet = new Set(existing.map((e) => e.task));
      const toCreate = breached.filter((t) => !existingSet.has(t.id));
      if (toCreate.length) {
        await sr.entities.Escalation.bulkCreate(
          toCreate.map((t) => {
            const due = t.due_date ? new Date(t.due_date).getTime() : now.getTime();
            return {
              task: t.id,
              level: '1',
              reason: 'SLA breached — task overdue beyond SLA',
              assigned_to: 'coordinator',
              sla_breach_at: new Date(due + (t.sla_hours || 48) * 3600 * 1000).toISOString(),
              status: 'open',
              handoff_note: ''
            };
          })
        );
        const createIds = toCreate.map((t) => t.id);
        await sr.entities.CareTask.updateMany({ id: { $in: createIds } }, { $set: { status: 'escalated' } });
        await sr.entities.AuditLog.bulkCreate(
          toCreate.map((t) => ({
            actor: user.email || user.id,
            action: 'task_escalated',
            entity: 'CareTask',
            entity_id: t.id,
            reason: 'SLA breached — auto escalation'
          }))
        );
        escCount = toCreate.length;
      }
    }

    return Response.json({ missed: missedCount, escalated: escCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}