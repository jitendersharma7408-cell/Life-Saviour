import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, CheckCircle2, AlertTriangle, Siren, ShieldCheck } from 'lucide-react';

const STATUS_COLORS = {
  pending: '#94a3b8',
  in_progress: '#14b8a6',
  done: '#0d9488',
  missed: '#f87171',
  escalated: '#dc2626'
};
const TYPE_COLORS = ['#14b8a6', '#0d9488', '#f59e0b', '#6366f1', '#ec4899'];

function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    green: 'bg-primary/10 text-primary',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    teal: 'bg-teal-50 text-teal-600'
  };
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone] || tones.teal}`}><Icon className="h-5 w-5" /></div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role;


  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ['dashboard-stats', role],
    queryFn: async () => {
      const [statusAgg, typeAgg, escAgg, consentAgg, taskCount] = await Promise.all([
        base44.entities.CareTask.aggregate({ groupBy: 'status', sum: [] }),
        base44.entities.CareTask.aggregate({ groupBy: 'type', sum: [] }),
        base44.entities.Escalation.count({ status: { $in: ['open', 'acknowledged'] } }),
        base44.entities.Patient.aggregate({ groupBy: 'consent_status', sum: [] }),
        base44.entities.CareTask.count({})
      ]);
      return {
        statusRows: statusAgg.rows || [],
        typeRows: typeAgg.rows || [],
        escalations: escAgg,
        consent: (consentAgg.rows || []).reduce((a, r) => { a[r._id || r.consent_status] = r.count; return a; }, {}),
        totalTasks: taskCount
      };
    },
    enabled: !!role,
    staleTime: 60000
  });

  if (loading || !stats) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const consentMissing = (stats.consent.missing || 0) + (stats.consent.expired || 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Care coordination overview at a glance.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard icon={CheckCircle2} label="Total tasks" value={stats.totalTasks || 0} tone="teal" />
        <StatCard icon={AlertTriangle} label="Missed steps" value={(stats.statusRows.find((r) => r._id === 'missed') || {}).count || 0} tone="red" />
        <StatCard icon={Siren} label="Open escalations" value={stats.escalations} tone="amber" />
        <StatCard icon={ShieldCheck} label="Consent blocked" value={consentMissing} tone="red" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-3">Tasks by status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.statusRows.map((r) => ({ name: r._id, value: r.count }))} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {stats.statusRows.map((r) => <Cell key={r._id} fill={STATUS_COLORS[r._id] || '#94a3b8'} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {stats.statusRows.map((r) => (
              <span key={r._id} className="flex items-center gap-1 text-xs"><span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[r._id] || '#94a3b8' }} />{r._id} ({r.count})</span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-3">Tasks by type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.typeRows.map((r) => ({ name: r._id, count: r.count }))}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stats.typeRows.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}