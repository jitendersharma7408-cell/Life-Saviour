import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { file_uri } = await req.json().catch(() => ({}));
    if (!file_uri) return Response.json({ error: 'file_uri is required' }, { status: 400 });

    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 600 });

    const prompt =
      'You are a medical document scanner for a care-coordination platform. Analyse the uploaded document ' +
      '(prescription, lab report, referral letter, or discharge summary). Extract the patient name, date of birth if present, ' +
      'the document type, a short summary, and a list of follow-up tasks that should be tracked. ' +
      'Each task has a type (lab, follow_up, referral, medication, appointment), a short description, and a suggested due date in YYYY-MM-DD ' +
      '(about 7-30 days from today unless the document states otherwise). Return only the JSON.';

    const schema = {
      type: 'object',
      properties: {
        patient_name: { type: 'string' },
        dob: { type: 'string' },
        document_type: { type: 'string' },
        summary: { type: 'string' },
        suggested_tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['lab', 'follow_up', 'referral', 'medication', 'appointment'] },
              description: { type: 'string' },
              due_date: { type: 'string' }
            }
          }
        }
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