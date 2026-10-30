import { useEffect, useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/StatusBadge';
import { Loader2 } from 'lucide-react';
import { CONSENT_ROLES, formatDate, writeAudit } from '@/lib/care';

export default function Consent() {
  const { user } = useAuth();
  const role = user?.role;
  const [params] = useSearchParams();
  const patientFilter = params.get('patient');
  const [consents, setConsents] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role && !CONSENT_ROLES.includes(role)) return;
    (async () => {
      setLoading(true);
      try {
        const query = patientFilter ? { patient: patientFilter } : {};
        const res = await base44.entities.Consent.filter(query, { sort: '-valid_to', limit: 500 });
        setConsents(res.items);
        const ids = [...new Set(res.items.map((c) => c.patient).filter(Boolean))];
        if (ids.length) {
          const pr = await base44.entities.Patient.filter({ id: { $in: ids } }, { limit: 500 });
          setPatients(pr.items);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [patientFilter, role]);

  if (role && !CONSENT_ROLES.includes(role)) return <Navigate to="/" replace />;

  const patientName = (pid) => patients.find((p) => p.id === pid)?.full_name || 'Patient';
  const hasIssue = consents.some((c) => c.status === 'missing' || c.status === 'expired');

  const renew = async (c) => {
    const valid_from = new Date().toISOString().slice(0, 10);
    const valid_to = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10);
    await base44.entities.Consent.update(c.id, { status: 'active', valid_from, valid_to });
    await writeAudit('consent_renewed', 'Consent', c.id, 'Consent renewed');
    setConsents((cs) => cs.map((x) => (x.id === c.id ? { ...x, status: 'active', valid_from, valid_to } : x)));
  };
  const revoke = async (c) => {
    await base44.entities.Consent.update(c.id, { status: 'expired' });
    await writeAudit('consent_revoked', 'Consent', c.id, 'Consent revoked');
    setConsents((cs) => cs.map((x) => (x.id === c.id ? { ...x, status: 'expired' } : x)));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Consent</h1>
      {hasIssue && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          One or more patients have missing or expired consent. Outreach is disabled for those patients until consent is active.
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : consents.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">No consent records.</div>
      ) : (
        <div className="mt-4 space-y-2">
          {consents.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-4 py-3">
              <div>
                <div className="font-medium">{patientName(c.patient)}</div>
                <div className="text-xs text-muted-foreground capitalize">{c.scope.replace('_', ' ')}{c.granted_to ? ` · ${c.granted_to}` : ''}</div>
                <div className="text-xs text-muted-foreground">{formatDate(c.valid_from)} → {formatDate(c.valid_to)}</div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={c.status} />
                {c.status !== 'active' && <Button size="sm" variant="outline" onClick={() => renew(c)}>Renew</Button>}
                {c.status === 'active' && <Button size="sm" variant="ghost" onClick={() => revoke(c)}>Revoke</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}