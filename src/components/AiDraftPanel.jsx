import { useState } from 'react';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { consentBlocked, writeAudit } from '@/lib/care';

export default function AiDraftPanel({ task, patient, onChanged }) {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const blocked = consentBlocked(patient);

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('draftOutreach', { task_id: task.id });
      setDraft(res.data?.draft || 'No draft generated.');
    } catch (e) {
      setError('Could not generate a draft. You can still act on this task manually.');
    } finally {
      setLoading(false);
    }
  };

  const approve = async () => {
    try {
      const notes = (task.notes ? task.notes + '\n' : '') + 'Outreach sent (AI draft approved).';
      await base44.entities.CareTask.update(task.id, { status: 'in_progress', notes });
      await writeAudit('outreach_approved', 'CareTask', task.id, 'AI outreach draft approved and sent');
      setDraft(null);
      onChanged();
    } catch (e) {
      setError('Could not apply the draft.');
    }
  };

  if (blocked) {
    return (
      <div className="mt-2" title="Outreach disabled — patient consent is missing or expired">
        <Button size="sm" variant="outline" disabled className="gap-2 opacity-60 cursor-not-allowed">
          <Sparkles className="h-4 w-4" /> AI outreach
        </Button>
        <p className="mt-1 text-xs text-red-600">Outreach disabled — consent {patient.consent_status}.</p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      {!draft && !error && (
        <Button size="sm" variant="outline" onClick={generate} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          AI outreach draft
        </Button>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {draft && (
        <div className="mt-2 rounded-md border border-dashed bg-muted/40 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> AI draft · {patient?.preferred_language || 'en'} · review before sending
          </div>
          <p className="text-sm whitespace-pre-wrap">{draft}</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={approve} className="gap-1">
              <Check className="h-4 w-4" /> Approve &amp; send
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Discard</Button>
          </div>
        </div>
      )}
    </div>
  );
}