import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { writeAudit, TYPE_LABEL } from '@/lib/care';
import AvatarFace from '@/components/AvatarFace';
import { ScanLine, Loader2, Upload, FileText, CheckCircle2 } from 'lucide-react';

export default function Scanner({ onChanged }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setSaved(false);
    setPreview(URL.createObjectURL(f));
  };

  const scan = async () => {
    if (!file) return;
    setScanning(true);
    setResult(null);
    setSaved(false);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const res = await base44.functions.invoke('scanDocument', { file_uri });
      setResult(res?.data?.result || res?.result || res?.data?.error || { summary: 'Could not parse document.' });
    } catch {
      setResult({ summary: 'Scan failed. Please try again.' });
    } finally {
      setScanning(false);
    }
  };

  const createTasks = async () => {
    const tasks = result?.suggested_tasks || [];
    if (!tasks.length) return;
    setSaving(true);
    try {
      const patientName = result?.patient_name || 'Unknown';
      const { items } = await base44.entities.Patient.filter({ full_name: { $regex: patientName, $options: 'i' } }, { limit: 1 });
      const patientId = items[0]?.id || null;
      const created = await base44.entities.CareTask.bulkCreate(
        tasks.map((t) => ({
          patient: patientId || '',
          type: t.type || 'follow_up',
          pathway_step: t.description || '',
          due_date: t.due_date || new Date().toISOString().slice(0, 10),
          status: 'pending',
          owner_type: 'clinic',
          source: 'scanner'
        }))
      );
      await writeAudit('scan_create_tasks', 'CareTask', '', `Scanner created ${created.length} task(s) for ${patientName}`);
      setSaved(true);
      if (onChanged) onChanged();
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setSaved(false);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><ScanLine className="h-5 w-5 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Document Scanner</h1>
          <p className="text-sm text-muted-foreground">Upload a prescription, lab report or referral — AI extracts follow-up tasks automatically.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6">
        {!file && (
          <label className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-14 cursor-pointer hover:bg-muted/40">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">Click to upload a document</span>
            <span className="text-xs text-muted-foreground">PNG, JPG or PDF — stored privately</span>
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={onPick} />
          </label>
        )}

        {file && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {preview ? (
                <img src={preview} alt="preview" className="h-24 w-24 rounded-lg object-cover border" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border bg-muted"><FileText className="h-8 w-8 text-muted-foreground" /></div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{file.name}</div>
                <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
                <button onClick={reset} className="mt-1 text-xs text-primary hover:underline">Remove</button>
              </div>
            </div>

            <button onClick={scan} disabled={scanning} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
              {scanning ? 'Scanning…' : 'Scan document'}
            </button>

            {scanning && (
              <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-4">
                <AvatarFace gender="female" talking size={40} />
                <p className="text-sm text-muted-foreground">Analysing the document…</p>
              </div>
            )}

            {result && !scanning && (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-primary" /> Extracted details</div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Patient</dt><dd>{result.patient_name || '—'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">DOB</dt><dd>{result.dob || '—'}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Document type</dt><dd>{result.document_type || '—'}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Summary</dt><dd>{result.summary || '—'}</dd></div>
                </dl>
                {result.suggested_tasks?.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Suggested follow-up tasks</div>
                    <ul className="space-y-1">
                      {result.suggested_tasks.map((t, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[0.65rem] text-primary">{TYPE_LABEL[t.type] || t.type}</span>
                          <span className="truncate">{t.description}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{t.due_date}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {saved ? (
                  <div className="flex items-center gap-2 text-sm text-primary"><CheckCircle2 className="h-4 w-4" /> Tasks created and added to the queue.</div>
                ) : (
                  <button onClick={createTasks} disabled={saving || !result.suggested_tasks?.length} className="flex items-center gap-2 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary disabled:opacity-50">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Create {result.suggested_tasks?.length || 0} task(s)
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}