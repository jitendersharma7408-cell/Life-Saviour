import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { question, context } = await req.json().catch(() => ({}));
    if (!question) return Response.json({ error: 'question is required' }, { status: 400 });

    const role = user.role || 'staff';
    const prompt =
      'You are the AI assistant inside "Life Saviour", a care-coordination platform for clinic staff who track patient follow-ups across clinics, laboratories and pharmacies. ' +
      'Answer the staff member concisely and helpfully in English. You can advise on task prioritisation, escalation handling, consent rules, and care pathways. ' +
      'Do not invent patient data or give clinical/medical advice beyond coordination guidance. ' +
      'The user role is: ' + role + '. ' +
      (context ? 'Context: ' + context + ' ' : '') +
      'Question: ' + question;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    const answer = typeof result === 'string' ? result : (result?.response || result?.text || JSON.stringify(result));
    return Response.json({ answer: answer.trim() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}