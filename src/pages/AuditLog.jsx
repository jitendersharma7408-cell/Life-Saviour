import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { AUDIT_ROLES, formatDate } from '@/lib/care';

export default function AuditLog() {
  const { user } = useAuth();
  const role = user?.role;
  const [logs, setLogs] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role && !AUDIT_ROLES.includes(role)) return;
    (async () => {
      setLoading(true);
      try {
        const res = await base44.entities.AuditLog.filter({}, { sort: '-created_date', limit: 500 });
        setLogs(res.items);
      } finally {
        setLoading(false);
      }
    })();
  }, [role]);

  if (role && !AUDIT_ROLES.includes(role)) return <Navigate to="/" replace />;

  const filtered = logs.filter((l) =>
    `${l.actor} ${l.action} ${l.entity} ${l.reason}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
      <p className="text-sm text-muted-foreground">Who did what and why. Admin only.</p>
      <div className="relative mt-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search actor, action, entity…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{formatDate(l.created_date)}</td>
                  <td className="px-3 py-2">{l.actor}</td>
                  <td className="px-3 py-2 font-medium">{l.action}</td>
                  <td className="px-3 py-2">{l.entity}{l.entity_id ? ` · ${String(l.entity_id).slice(-6)}` : ''}</td>
                  <td className="px-3 py-2 text-muted-foreground">{l.reason || '—'}</td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">No entries.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}