import { ShieldAlert } from 'lucide-react';

export default function ConsentBanner({ patient }) {
  if (!patient) return null;
  const status = patient.consent_status;
  if (status === 'active') return null;
  const msg =
    status === 'expired'
      ? 'Consent has expired. Outreach actions are disabled until consent is renewed.'
      : 'Consent is missing. Outreach actions are disabled until consent is granted.';
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">Consent {status}</p>
        <p className="text-red-700">{msg}</p>
      </div>
    </div>
  );
}