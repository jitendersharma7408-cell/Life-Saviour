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
      'You are a medicine identification assistant on the "Life Saviour" healthcare platform. ' +
      'A patient has uploaded a photo of medicine packaging (box, blister pack, or label) — this could be ' +
      'a store-bought medicine or one prescribed by a doctor. ' +
      'Identify the medicine and provide complete details that a patient can easily understand. ' +
      'Include: medicine name, generic/salt name, what it is used for, typical dosage, common side effects, ' +
      'important warnings, storage instructions, and the expiry date if visible on the packaging. ' +
      'If you cannot identify the medicine with confidence, say so. ' +
      'Respond entirely in ' + langName + '.';

    const schema = {
      type: 'object',
      properties: {
        medicine_name: { type: 'string', description: 'Brand or common name of the medicine' },
        generic_name: { type: 'string', description: 'Generic/salt name (active ingredient)' },
        used_for: { type: 'string', description: 'What the medicine is used for, in simple words' },
        dosage: { type: 'string', description: 'Typical dosage instructions' },
        side_effects: { type: 'array', items: { type: 'string' }, description: 'Common side effects' },
        warnings: { type: 'array', items: { type: 'string' }, description: 'Important warnings' },
        storage: { type: 'string', description: 'Storage instructions' },
        expiry_date: { type: 'string', description: 'Expiry date printed on the packaging, if visible' },
        manufacturer: { type: 'string', description: 'Manufacturer or brand company name' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Confidence in identification' }
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