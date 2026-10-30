import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import TaskRow from '@/components/TaskRow';
import { FULL_ACCESS_ROLES, classifyTask, effectiveRole } from '@/lib/care';
import { Loader2 } from 'lucide-react';

const SECTIONS = [
  { key: 'overdue', title: 'Overdue', desc: 'Past due and not yet completed' },
  { key: 'today', title: 'Due today', desc: 'Tasks due today' },
  { key: 'waiting', title: 'Waiting on patient', desc: 'Awaiting the patient' },
  { key: 'escalated', title: 'Escalated', desc: 'SLA breached and escalated' }
];

export default function Today() {
  const { user } = useAuth();
  const role = effectiveRole(user?.role);
  const [tasks, setTasks] = useState([]);
  const [patients, setPatients] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (FULL_ACCESS_ROLES.includes(role)) {
        try { await base44.functions.invoke('syncCareTasks', {}); } catch { /* non-blocking */ }
      }
      const { items: taskList } = await base44.entities.CareTask.filter({}, { sort: 'due_date', limit: 500 });
      const patientIds = [...new Set(taskList.map((t) => t.patient).filter(Boolean))];
      let patientList = [];
      if (patientIds.length) {
        const res = await base44.entities.Patient.filter({ id: { $in: patientIds } }, { limit: 500 });
        patientList = res.items;
      }
      let escList = [];
      if (FULL_ACCESS_ROLES.includes(role)) {
        try {
          const res = await base44.entities.Escalation.filter({ status: { $in: ['open', 'acknowledged'] } }, { limit: 500 });
          escList = res.items;
        } catch { /* restricted role */ }
      }
      setTasks(taskList);
      setPatients(patientList);
      setEscalations(escList);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => { if (role) load(); }, [role, load]);

  const patientMap = {};
  patients.forEach((p) => { patientMap[p.id] = p; });

  const grouped = { overdue: [], today: [], waiting: [], escalated: [] };
  tasks.forEach((t) => {
    const c = classifyTask(t, escalations);
    if (grouped[c]) grouped[c].push(t);
  });
  Object.values(grouped).forEach((arr) => arr.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground">Your coordination queue — every outstanding step in one place.</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map((sec) => (
            <section key={sec.key}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">{sec.title}</h2>
                <span className="text-xs text-muted-foreground">{grouped[sec.key].length} task{grouped[sec.key].length !== 1 ? 's' : ''}</span>
              </div>
              {grouped[sec.key].length === 0 ? (
                <div className="rounded-lg border border-dashed bg-white px-4 py-6 text-center text-sm text-muted-foreground">Nothing here.</div>
              ) : (
                <div className="divide-y rounded-lg border bg-white overflow-hidden">
                  {grouped[sec.key].map((t) => (
                    <TaskRow key={t.id} task={t} patient={patientMap[t.patient]} section={sec.key} role={role} onChanged={load} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}