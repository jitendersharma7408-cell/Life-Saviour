import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const LANG_NAME = { en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', bn: 'Bengali' };

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { task_id } = await req.json().catch(() => ({}));
    if (!task_id) return Response.json({ error: 'task_id is required' }, { status: 400 });

    const task = await base44.entities.CareTask.get(task_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    const patient = task.patient
      ? await base44.entities.Patient.get(task.patient).catch((e) => (e.status === 404 ? null : Promise.reject(e)))
      : null;
    const lang = patient?.preferred_language || 'en';
    const langName = LANG_NAME[lang] || 'English';

    const prompt =
      'You are a care coordinator at a clinic. A patient follow-up step was missed. ' +
      'Write a short, warm, plain-language outreach message to the patient (or their family) in ' + langName +
      ', reminding them about the missed step and gently encouraging them to come in. ' +
      'Keep it under 80 words, friendly and non-alarmist. Do not invent medical advice. ' +
      'Task type: ' + (task.type || 'follow-up') + '. Step: ' + (task.pathway_step || 'follow-up') +
      '. Patient name: ' + (patient?.full_name || 'the patient') + '. ' +
      'Output only the message text in ' + langName + ', ready to send.';

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    const draft = typeof result === 'string' ? result : (result?.response || result?.text || JSON.stringify(result));

    return Response.json({ draft: draft.trim(), language: langName });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}