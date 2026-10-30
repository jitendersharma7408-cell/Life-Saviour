import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Loader2, Upload, Pill, Trash2, Plus, X, Sparkles, Camera, AlertTriangle, Info, Calendar, Building2 } from 'lucide-react';

export default function MedicineScanner() {
  const { lang, t } = useLanguage();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    setLoading(true);
    try {
      const page = await base44.entities.MedicineScan.filter({}, { sort: '-created_date', limit: 50 });
      setScans(page.items || []);
    } catch {
      setScans([]);
    } finally {
      setLoading(false);
    }
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const scanMedicine = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const res = await base44.functions.invoke('scanMedicine', { file_uri, language: lang });
      const ai = res?.data?.result || res?.result || {};
      await base44.entities.MedicineScan.create({
        medicine_name: ai.medicine_name || 'Unknown Medicine',
        image_uri: file_uri,
        details: JSON.stringify(ai),
        scanned_date: new Date().toISOString().slice(0, 10)
      });
      setShowUpload(false);
      setFile(null);
      setPreview(null);
      await loadScans();
    } finally {
      setUploading(false);
    }
  };

  const removeScan = async (id) => {
    await base44.entities.MedicineScan.delete(id);
    setScans((prev) => prev.filter((s) => s.id !== id));
  };

  const parseDetails = (detailsStr) => {
    try { return JSON.parse(detailsStr); } catch { return {}; }
  };

  const renderDetail = (scan) => {
    const d = parseDetails(scan.details);
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            d.confidence === 'high' ? 'bg-green-100 text-green-700' :
            d.confidence === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
          }`}>{t('confidence')}: {d.confidence || '—'}</span>
          {d.expiry_date && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1 ${
              isExpired(d.expiry_date) ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}>
              <Calendar className="h-3 w-3" /> {t('expiryDate')}: {d.expiry_date}
              {isExpired(d.expiry_date) && ' ⚠'}
            </span>
          )}
        </div>
        {d.generic_name && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-0.5">{t('genericName')}</div>
            <p className="text-sm">{d.generic_name}</p>
          </div>
        )}
        {d.used_for && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1"><Info className="h-3 w-3" /> {t('usedFor')}</div>
            <p className="text-sm">{d.used_for}</p>
          </div>
        )}
        {d.dosage && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1"><Pill className="h-3 w-3" /> {t('dosage')}</div>
            <p className="text-sm">{d.dosage}</p>
          </div>
        )}
        {d.side_effects?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1"><AlertTriangle className="h-3 w-3" /> {t('sideEffects')}</div>
            <ul className="text-sm space-y-0.5">{d.side_effects.map((s, i) => <li key={i}>• {s}</li>)}</ul>
          </div>
        )}
        {d.warnings?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 mb-1"><AlertTriangle className="h-3 w-3" /> {t('warnings')}</div>
            <ul className="text-sm space-y-0.5 text-red-700">{d.warnings.map((w, i) => <li key={i}>• {w}</li>)}</ul>
          </div>
        )}
        {d.storage && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">{t('storage')}</div>
            <p className="text-sm">{d.storage}</p>
          </div>
        )}
        {d.manufacturer && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" /> {d.manufacturer}
          </div>
        )}
      </div>
    );
  };

  const isExpired = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return !isNaN(d.getTime()) && d < new Date();
    } catch { return false; }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('medicineScanner')}</h1>
        <p className="text-sm text-muted-foreground">{t('scanMedicineDesc')}</p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t('scannedMedicines')}</h2>
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> {t('scanMedicine')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : scans.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">{t('noMedicineScans')}</div>
      ) : (
        <div className="grid gap-4">
          {scans.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Pill className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{s.medicine_name}</h3>
                    {s.scanned_date && <span className="text-xs text-muted-foreground">{s.scanned_date}</span>}
                  </div>
                </div>
                <button onClick={() => removeScan(s.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
              {renderDetail(s)}
            </Card>
          ))}
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !uploading && setShowUpload(false)} />
          <div className="relative w-full max-w-lg rounded-xl bg-background border shadow-xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{t('scanMedicine')}</h3>
              <button onClick={() => !uploading && setShowUpload(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-14 cursor-pointer hover:bg-muted/40">
                {preview ? (
                  <img src={preview} alt="medicine" className="h-32 w-32 rounded-lg object-cover border" />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{file ? file.name : t('uploadMedicinePhoto')}</span>
                <span className="text-xs text-muted-foreground">{t('storedPrivately')}</span>
                <input type="file" accept="image/*" className="hidden" onChange={onPickFile} />
              </label>
              <button onClick={scanMedicine} disabled={!file || uploading} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('aiAnalyzing')}</> : <><Sparkles className="h-4 w-4" /> {t('identifyMedicine')}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}