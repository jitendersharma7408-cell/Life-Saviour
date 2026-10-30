import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { location, alertMessage } = await req.json().catch(() => ({}));

    // Get the user's SOS contacts
    const { items: contacts } = await base44.asServiceRole.entities.SosContact.filter(
      { created_by_id: user.id },
      { limit: 50 }
    );

    if (!contacts.length) {
      return Response.json({ error: 'No emergency contacts registered' }, { status: 400 });
    }

    const userName = user.full_name || user.email;
    const locationText = location && location.lat
      ? `Location: https://maps.google.com/?q=${location.lat},${location.lng}`
      : 'Location: unavailable';
    const time = new Date().toISOString();
    const subject = `🚨 EMERGENCY ALERT from ${userName}`;
    const body =
      `${userName} has triggered an EMERGENCY SOS.\n\n` +
      `${alertMessage || 'Emergency assistance needed immediately.'}\n\n` +
      `${locationText}\n\n` +
      `Time: ${time}`;

    // Send email alert to each contact with an email address
    const emailResults = [];
    for (const contact of contacts) {
      if (contact.email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: contact.email,
            subject,
            body,
            category: 'transactional'
          });
          emailResults.push({ name: contact.name, email: 'sent' });
        } catch (e) {
          emailResults.push({ name: contact.name, email: 'failed', error: e.message });
        }
      }
    }

    // Create an escalation record
    const esc = await base44.asServiceRole.entities.Escalation.create({
      task: '',
      level: '3',
      reason: `EMERGENCY SOS: ${alertMessage || 'Emergency'} | ${locationText} | ${time}`,
      assigned_to: 'admin',
      status: 'open'
    });

    return Response.json({
      result: {
        escalation_id: esc.id,
        emails: emailResults,
        contacts: contacts.map((c) => ({ name: c.name, phone: c.phone, email: c.email }))
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}