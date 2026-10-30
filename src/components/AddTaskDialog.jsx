import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { TYPE_LABEL, addDays, writeAudit } from '@/lib/care';

const OWNERS = ['clinic', 'lab', 'pharmacy', 'patient', 'insurer'];

export default function AddTaskDialog({ patientId, onCreated }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'follow_up',
    due_date: addDays(new Date().toISOString(), 2),
    owner_type: 'clinic',
    pathway_step: '',
    notes: ''
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setSaving(true);
    try {
      const t = await base44.entities.CareTask.create({
        ...form,
        patient: patientId,
        status: 'pending',
        sla_hours: 48,
        source: 'manual'
      });
      await writeAudit('task_created', 'CareTask', t.id, 'Task added from patient timeline');
      setOpen(false);
      onCreated && onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ Add task</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add care task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Type</Label>
            <select className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.type} onChange={set('type')}>
              {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <Label>Pathway step</Label>
            <Input value={form.pathway_step} onChange={set('pathway_step')} placeholder="e.g. HbA1c retest" />
          </div>
          <div>
            <Label>Due date</Label>
            <Input type="date" value={form.due_date} onChange={set('due_date')} />
          </div>
          <div>
            <Label>Owner</Label>
            <select className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm capitalize" value={form.owner_type} onChange={set('owner_type')}>
              {OWNERS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={form.notes} onChange={set('notes')} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Add task'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}