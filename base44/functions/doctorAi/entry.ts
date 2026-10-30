import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { question, language, patient_context } = await req.json().catch(() => ({}));
    if (!question) return Response.json({ error: 'question is required' }, { status: 400 });

    const langName = {
      en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', bn: 'Bengali'
    }[language] || 'English';

    const prompt =
      'You are "Doctor AI", a virtual medical assistant on the "Life Saviour" healthcare platform. ' +
      'You help patients and caregivers understand symptoms, medications, lab results, and general health guidance. ' +
      'Be warm, clear, and empathetic. Provide practical guidance based on general medical knowledge. ' +
      'Always end your response with this disclaimer in the same language: ' +
      '"This guidance is general and not a substitute for consulting a qualified doctor in person." ' +
      'Respond entirely in ' + langName + '. ' +
      (patient_context ? 'Patient context: ' + patient_context + ' ' : '') +
      'Patient question: ' + question;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash'
    });

    const answer = typeof result === 'string'
      ? result
      : (result?.response || result?.text || JSON.stringify(result));
    return Response.json({ answer: answer.trim() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}