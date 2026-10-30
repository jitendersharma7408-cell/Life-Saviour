import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { writeAudit } from '@/lib/care';
import { useLanguage } from '@/contexts/LanguageContext';
import { Siren, Loader2, X, Plus, Trash2, MapPin, Phone, Mail, User, AlertTriangle, CheckCircle2, MessageCircle, Pencil } from 'lucide-react';

export default function EmergencySos() {
  const { user } = useAuth();
  const role = user?.role;
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showSos, setShowSos] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', relationship: '' });
  const [saving, setSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sosResult, setSosResult] = useState(null);
  const [location, setLocation] = useState(null);
  const [locError, setLocError] = useState('');

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const { items } = await base44.entities.SosContact.filter({}, { sort: 'created_date', limit: 20 });
      setContacts(items);
    } catch {
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    if (open && role) {
      loadContacts();
      setShowRegister(false);
      setShowSos(false);
      setSosResult(null);
      setAlertMessage('');
      setLocError('');
      setLocation(null);
    }
  }, [open, role, loadContacts]);

  if (!role) return null;

  const hasContacts = contacts.length > 0;

  const addContact = async () => {
    if (!form.name || !form.phone) return;
    setSaving(true);
    try {
      await base44.entities.SosContact.create({
        name: form.name,
        phone: form.phone,
        email: form.email,
        relationship: form.relationship
      });
      setForm({ name: '', phone: '', email: '', relationship: '' });
      await loadContacts();
      setShowRegister(false);
    } finally {
      setSaving(false);
    }
  };

  const removeContact = async (id) => {
    await base44.entities.SosContact.delete(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const getLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      setLocError('');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          setLocError(t('locationDenied'));
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const triggerSos = async () => {
    setSending(true);
    try {
      const loc = location || await getLocation();
      const res = await base44.functions.invoke('sendSosAlert', {
        location: loc,
        alertMessage: alertMessage || t('emergencyAssistance')
      });
      const result = res?.data?.result || res?.result || {};
      await writeAudit('emergency_sos', 'Escalation', result.escalation_id || '', `SOS triggered, contacts: ${contacts.length}`);
      setSosResult(result);
    } catch (e) {
      setSosResult({ error: e.message || t('sosFailed') });
    } finally {
      setSending(false);
    }
  };

  const close = () => {
    setOpen(false);
    setShowRegister(false);
    setShowSos(false);
    setSosResult(null);
    setAlertMessage('');
    setLocError('');
    setLocation(null);
  };

  const waLink = (phone, msg) => {
    const clean = (phone || '').replace(/[^0-9]/g, '');
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-700 animate-pulse"
      >
        <Siren className="h-5 w-5" /> SOS
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative w-full max-w-md rounded-xl bg-background border shadow-xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <Siren className="h-5 w-5" />
                <h3 className="font-semibold">Emergency SOS</h3>
              </div>
              <button onClick={close} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            {/* SOS triggered result */}
            {sosResult ? (
              <div className="space-y-4">
                {sosResult.error ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-medium">{t('sosFailed')}</p>
                      <p className="text-xs mt-1">{sosResult.error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-medium">{t('sosSent')}</p>
                        <p className="text-xs mt-1">{t('sosSentDesc')}</p>
                      </div>
                    </div>
                    {location && (
                      <div className="rounded-lg border p-3 flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-primary" />
                        <a href={`https://maps.google.com/?q=${location.lat},${location.lng}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          {t('viewLocation')}
                        </a>
                      </div>
                    )}
                    {/* WhatsApp quick links */}
                    {sosResult.contacts?.filter((c) => c.phone).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">{t('quickWhatsApp')}</p>
                        {sosResult.contacts.filter((c) => c.phone).map((c, i) => (
                          <a key={i} href={waLink(c.phone, `${t('sosAlertMsg')} ${user?.full_name || user?.email}. ${alertMessage || ''} ${location ? `https://maps.google.com/?q=${location.lat},${location.lng}` : ''}`)} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">
                            <MessageCircle className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{c.name}</span>
                            <span className="text-muted-foreground text-xs">{c.phone}</span>
                          </a>
                        ))}
                      </div>
                    )}
                    {sosResult.emails?.length > 0 && (
                      <div className="text-xs text-muted-foreground border-t pt-2">
                        <p className="font-medium mb-1">{t('emailAlerts')}</p>
                        {sosResult.emails.map((e, i) => (
                          <p key={i}>{e.name}: {e.email === 'sent' ? '✅' : '❌'}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button onClick={close} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">{t('close')}</button>
              </div>
            ) : showSos ? (
              /* SOS trigger screen */
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t('emergencyDetails')}</label>
                  <textarea value={alertMessage} onChange={(e) => setAlertMessage(e.target.value)} rows={3}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder={t('emergencyPlaceholder')} />
                </div>
                {locError && <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {locError}</p>}
                {location && (
                  <p className="text-xs text-green-600 flex items-center gap-1"><MapPin className="h-3 w-3" /> {t('locationReady')}</p>
                )}
                <button
                  disabled={sending}
                  onClick={triggerSos}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50 animate-pulse"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Siren className="h-5 w-5" />}
                  {t('triggerSos')}
                </button>
                <button onClick={() => setShowSos(false)} className="w-full text-xs text-muted-foreground hover:text-foreground">{t('back')}</button>
              </div>
            ) : loadingContacts ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : showRegister ? (
              /* Contact registration form */
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t('registerContactsDesc')}</p>
                {contacts.length > 0 && (
                  <div className="space-y-2">
                    {contacts.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.phone}{c.email ? ` • ${c.email}` : ''}</p>
                          </div>
                        </div>
                        <button onClick={() => removeContact(c.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{contacts.length > 0 ? t('addAnother') : t('addContact')}</h4>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t('contactName')}</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm" placeholder={t('contactNamePh')} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t('phone')} *</label>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm" placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t('email')}</label>
                    <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm" placeholder="name@example.com" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t('relationship')}</label>
                    <input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                      className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm" placeholder={t('relationshipPh')} />
                  </div>
                  <button onClick={addContact} disabled={!form.name || !form.phone || saving}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t('saveContact')}
                  </button>
                </div>
                <button onClick={() => setShowRegister(false)} className="w-full text-xs text-muted-foreground hover:text-foreground">{t('back')}</button>
              </div>
            ) : (
              /* Main screen */
              <div className="space-y-4">
                {hasContacts ? (
                  <>
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground">{t('registeredContacts')} ({contacts.length})</p>
                        <button onClick={() => setShowRegister(true)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                          <Pencil className="h-3 w-3" /> {t('edit')}
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {contacts.map((c) => (
                          <div key={c.id} className="flex items-center gap-2 text-sm">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">{c.name}</span>
                            <span className="text-muted-foreground text-xs">{c.phone}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => { getLocation(); setShowSos(true); }}
                      className="flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 animate-pulse"
                    >
                      <Siren className="h-5 w-5" /> {t('triggerSos')}
                    </button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                      <Phone className="h-6 w-6 text-red-600" />
                    </div>
                    <p className="text-sm font-medium mb-1">{t('registerContactsTitle')}</p>
                    <p className="text-xs text-muted-foreground mb-4">{t('registerContactsDesc')}</p>
                    <button onClick={() => setShowRegister(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
                      <Plus className="h-4 w-4" /> {t('addContact')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}