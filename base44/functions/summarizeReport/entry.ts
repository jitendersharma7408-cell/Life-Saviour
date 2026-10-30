import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { file_uri, language } = await req.json().catch(() => ({}));
    if (!file_uri) return Response.json({ error: 'file_uri is required' }, { status: 400 });

    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 600 });

    const langName = {
      en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', bn: 'Bengali'
    }[language] || 'English';

    const prompt =
      'You are a medical assistant on the "Life Saviour" healthcare platform. ' +
      'A patient has uploaded a medical report (lab result, prescription, discharge summary, or imaging report). ' +
      'Your job is to explain this report in simple, easy-to-understand language that a non-medical person can follow. ' +
      'Include: 1) What the report is about, 2) Key findings in plain words, 3) What the numbers or results mean, ' +
      '4) Whether anything needs attention, 5) Simple next steps. ' +
      'Avoid medical jargon — if you must use a medical term, explain it in brackets. ' +
      'Respond entirely in ' + langName + '.';

    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'A short title for this report' },
        report_type: { type: 'string', enum: ['lab', 'prescription', 'discharge', 'imaging', 'other'] },
        easy_summary: { type: 'string', description: 'The full easy-to-understand explanation' },
        key_findings: { type: 'array', items: { type: 'string' }, description: 'Bullet points of key findings' },
        needs_attention: { type: 'boolean', description: 'Whether any result needs medical attention' },
        next_steps: { type: 'array', items: { type: 'string' }, description: 'Simple next steps for the patient' }
      }
    };

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [signed_url],
      response_json_schema: schema
    });

    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}