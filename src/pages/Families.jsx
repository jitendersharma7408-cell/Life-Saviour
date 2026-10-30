import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { FULL_ACCESS_ROLES, formatDate } from '@/lib/care';
import { Loader2, Users2, Plus, X, Trash2, FileText, Sparkles, Upload } from 'lucide-react';

export default function Families() {
  const { user } = useAuth();
  const role = user?.role;
  const canEdit = FULL_ACCESS_ROLES.includes(role);
  const [families, setFamilies] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ family_name: '', primary_contact: '', members: [], notes: '' });
  const [saving, setSaving] = useState(false);
  const [reportsFamily, setReportsFamily] = useState(null);
  const [familyReports, setFamilyReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm, setReportForm] = useState({ patient: '', file: null, preview: null, report_type: 'lab', title: '' });
  const [reportSaving, setReportSaving] = useState(false);
  const { lang, t } = useLanguage();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, pRes] = await Promise.all([
        base44.entities.Family.filter({}, { sort: '-created_date', limit: 500 }),
        base44.entities.Patient.filter({}, { limit: 500, sort: 'full_name' })
      ]);
      setFamilies(fRes.items);
      setPatients(pRes.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (role) load(); }, [role, load]);

  const patientMap = {};
  patients.forEach((p) => { patientMap[p.id] = p; });

  const memberNames = (ids) => (ids || []).map((id) => patientMap[id]?.full_name).filter(Boolean);

  const toggleMember = (id) => {
    setForm((f) => ({
      ...f,
      members: f.members.includes(id) ? f.members.filter((m) => m !== id) : [...f.members, id]
    }));
  };

  const save = async () => {
    if (!form.family_name) return;
    setSaving(true);
    try {
      await base44.entities.Family.create({
        family_name: form.family_name,
        primary_contact: form.primary_contact,
        members: form.members.join(','),
        notes: form.notes
      });
      setShowForm(false);
      setForm({ family_name: '', primary_contact: '', members: [], notes: '' });
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await base44.entities.Family.delete(id);
    load();
  };

  const openReports = async (family) => {
    setReportsFamily(family);
    setReportsLoading(true);
    const memberIds = (family.members || '').split(',').filter(Boolean);
    if (memberIds.length) {
      const res = await base44.entities.MedicalReport.filter({ patient: { $in: memberIds } }, { sort: '-created_date', limit: 50 });
      setFamilyReports(res.items || []);
    } else {
      setFamilyReports([]);
    }
    setReportsLoading(false);
  };

  const onPickReportFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setReportForm((prev) => ({ ...prev, file: f, preview: URL.createObjectURL(f), title: prev.title || f.name.replace(/\.[^.]+$/, '') }));
  };

  const saveReport = async () => {
    if (!reportForm.file || !reportForm.patient) return;
    setReportSaving(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: reportForm.file });
      const res = await base44.functions.invoke('summarizeReport', { file_uri, language: lang });
      const ai = res?.data?.result || res?.result || {};
      await base44.entities.MedicalReport.create({
        patient: reportForm.patient,
        family: reportsFamily?.id,
        title: reportForm.title || ai.title || 'Medical Report',
        report_file_uri: file_uri,
        report_type: reportForm.report_type,
        ai_summary: ai.easy_summary || '',
        report_date: new Date().toISOString().slice(0, 10)
      });
      setShowReportForm(false);
      setReportForm({ patient: '', file: null, preview: null, report_type: 'lab', title: '' });
      const memberIds = (reportsFamily.members || '').split(',').filter(Boolean);
      const res2 = await base44.entities.MedicalReport.filter({ patient: { $in: memberIds } }, { sort: '-created_date', limit: 50 });
      setFamilyReports(res2.items || []);
    } finally {
      setReportSaving(false);
    }
  };

  const removeReport = async (id) => {
    await base44.entities.MedicalReport.delete(id);
    setFamilyReports((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Users2 className="h-5 w-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Family Healthcare</h1>
            <p className="text-sm text-muted-foreground">Group patients into families to coordinate care across relatives.</p>
          </div>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" /> New family
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : families.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white px-4 py-12 text-center text-sm text-muted-foreground">No families yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {families.map((f) => {
            const ids = (f.members || '').split(',').filter(Boolean);
            const names = memberNames(ids);
            return (
              <div key={f.id} className="rounded-xl border bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{f.family_name}</div>
                    <div className="text-xs text-muted-foreground">Primary: {patientMap[f.primary_contact]?.full_name || '—'}</div>
                  </div>
                  {canEdit && <button onClick={() => remove(f.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                </div>
                {names.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {names.map((n) => <span key={n} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{n}</span>)}
                  </div>
                )}
                {f.notes && <p className="mt-3 text-xs text-muted-foreground">{f.notes}</p>}
                <button onClick={() => openReports(f)} className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                  <FileText className="h-3.5 w-3.5" /> {t('viewReports')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-lg rounded-xl bg-background border shadow-xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">New family</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Family name</label>
                <input value={form.family_name} onChange={(e) => setForm({ ...form, family_name: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g. The Sharma family" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Primary contact</label>
                <select value={form.primary_contact} onChange={(e) => setForm({ ...form, primary_contact: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="">Select…</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Members</label>
                <div className="mt-1 max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
                  {patients.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.members.includes(p.id)} onChange={() => toggleMember(p.id)} />
                      {p.full_name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              </div>
              <button onClick={save} disabled={!form.family_name || saving} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save family
              </button>
            </div>
          </div>
        </div>
      )}

      {reportsFamily && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !reportSaving && setReportsFamily(null)} />
          <div className="relative w-full max-w-2xl rounded-xl bg-background border shadow-xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">{t('familyReports')}</h3>
                <p className="text-xs text-muted-foreground">{reportsFamily.family_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowReportForm(true); setReportForm({ ...reportForm, patient: (reportsFamily.members || '').split(',')[0] || '' }); }} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                  <Plus className="h-3.5 w-3.5" /> {t('addReport')}
                </button>
                <button onClick={() => !reportSaving && setReportsFamily(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
            </div>

            {reportsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : familyReports.length === 0 ? (
              <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">{t('noReports')}</div>
            ) : (
              <div className="space-y-3">
                {familyReports.map((r) => (
                  <div key={r.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                          <div className="text-sm font-medium">{r.title}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary capitalize">{r.report_type}</span>
                            {r.report_date && <span>{r.report_date}</span>}
                            <span>• {patientMap[r.patient]?.full_name || '—'}</span>
                          </div>
                        </div>
                      </div>
                      {canEdit && <button onClick={() => removeReport(r.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                    {r.ai_summary && (
                      <div className="rounded-md bg-muted/40 p-2.5 mt-2">
                        <div className="flex items-center gap-1.5 mb-1 text-xs font-medium text-primary"><Sparkles className="h-3 w-3" /> {t('aiEasySummary')}</div>
                        <p className="text-xs text-foreground whitespace-pre-wrap">{r.ai_summary}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showReportForm && (
              <div className="mt-4 rounded-lg border p-4 bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">{t('uploadReport')}</h4>
                  <button onClick={() => setShowReportForm(false)} className="p-1 text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">{t('selectPatient')}</label>
                    <select value={reportForm.patient} onChange={(e) => setReportForm({ ...reportForm, patient: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm">
                      <option value="">—</option>
                      {(reportsFamily.members || '').split(',').filter(Boolean).map((id) => (
                        <option key={id} value={id}>{patientMap[id]?.full_name || id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t('reportTitle')}</label>
                    <input value={reportForm.title} onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm" placeholder="e.g. Blood Test" />
                  </div>
                  <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 cursor-pointer hover:bg-muted/40">
                    {reportForm.preview ? (
                      <img src={reportForm.preview} alt="preview" className="h-20 w-20 rounded-lg object-cover border" />
                    ) : (
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium">{reportForm.file ? reportForm.file.name : t('clickToUpload')}</span>
                    <span className="text-[0.65rem] text-muted-foreground">{t('storedPrivately')}</span>
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={onPickReportFile} />
                  </label>
                  <button onClick={saveReport} disabled={!reportForm.file || !reportForm.patient || reportSaving} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                    {reportSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {t('uploadAndSummarize')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}