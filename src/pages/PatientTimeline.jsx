import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import ConsentBanner from '@/components/ConsentBanner';
import AddTaskDialog from '@/components/AddTaskDialog';
import StatusBadge from '@/components/StatusBadge';
import { Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { FULL_ACCESS_ROLES, effectiveStatus, formatDate, PATHWAY_LABEL, TYPE_LABEL, daysOverdue } from '@/lib/care';

export default function PatientTimeline() {
  const { id } = useParams();
  const { user } = useAuth();
  const role = user?.role;
  const [patient, setPatient] = useState(null);
  const [plan, setPlan] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await base44.entities.Patient.get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      setPatient(p);
      if (!p) return;
      const [planRes, taskRes] = await Promise.all([
        base44.entities.CarePlan.filter({ patient: id }, { limit: 50 }),
        base44.entities.CareTask.filter({ patient: id }, { sort: 'due_date', limit: 500 })
      ]);
      setPlan(planRes.items.find((pl) => pl.is_active) || planRes.items[0] || null);
      setTasks(taskRes.items);
      if (FULL_ACCESS_ROLES.includes(role)) {
        try {
          const c = await base44.entities.Consent.filter({ patient: id }, { limit: 50 });
          setConsents(c.items);
        } catch { /* restricted */ }
      }
    } finally {
      setLoading(false);
    }
  }, [id, role]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!patient) return <div className="p-6 text-muted-foreground">Patient not found.</div>;

  const sorted = [...tasks].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Link to="/patients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Patients
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{patient.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            {plan ? `${PATHWAY_LABEL[plan.pathway] || plan.pathway} pathway` : 'No active care plan'}
            {patient.primary_clinician ? ` · ${patient.primary_clinician}` : ''}
            {` · ${patient.preferred_language || 'en'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddTaskDialog patientId={patient.id} onCreated={load} />
          {FULL_ACCESS_ROLES.includes(role) && (
            <Link to={`/consent?patient=${patient.id}`} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm">
              <ShieldCheck className="h-4 w-4" /> Open consent
            </Link>
          )}
        </div>
      </div>

      <div className="mt-4"><ConsentBanner patient={patient} /></div>

      {plan?.steps && (
        <div className="mt-4 rounded-lg border bg-white p-4 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">Care plan steps</div>
          <p className="mt-1 whitespace-pre-wrap">{plan.steps}</p>
        </div>
      )}

      <h2 className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide">Timeline</h2>
      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">No tasks yet.</div>
      ) : (
        <ol className="relative border-l border-slate-200 ml-2 space-y-4">
          {sorted.map((t) => {
            const st = effectiveStatus(t);
            const missed = st === 'missed' || st === 'escalated';
            return (
              <li key={t.id} className="ml-4">
                <span className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full ${missed ? 'bg-red-500' : st === 'done' ? 'bg-primary' : 'bg-slate-300'}`} />
                <div className={`rounded-lg border p-3 ${missed ? 'border-red-200 bg-red-50' : 'bg-white'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{TYPE_LABEL[t.type] || t.type}{t.pathway_step ? ` · ${t.pathway_step}` : ''}</div>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Due {formatDate(t.due_date)} · {t.owner_type}</div>
                  {missed && (
                    <p className="mt-2 text-sm text-red-700">
                      {t.status === 'escalated' ? 'Escalated — SLA breached and handed off.' : 'Missed — due date passed without completion.'}
                      {daysOverdue(t) > 0 ? ` ${daysOverdue(t)} day(s) overdue.` : ''}
                    </p>
                  )}
                  {t.notes && <p className="mt-2 text-xs text-muted-foreground">{t.notes}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {FULL_ACCESS_ROLES.includes(role) && consents.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide">Consent</h2>
          <div className="space-y-2">
            {consents.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border bg-white px-4 py-2 text-sm">
                <span className="capitalize">{c.scope.replace('_', ' ')}</span>
                <span className="text-xs text-muted-foreground">{formatDate(c.valid_from)} → {formatDate(c.valid_to)}</span>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}