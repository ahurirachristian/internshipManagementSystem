import { useEffect, useState } from 'react';
import { Building2, X } from 'lucide-react';
import CustomSelect from './CustomSelect';

const sizeOptions = [
  { value: '', label: 'Select Size' },
  { value: 'Small', label: 'Small' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Large', label: 'Large' },
  { value: 'Enterprise', label: 'Enterprise' },
];

export default function CompanyEditModal({ company, title, onClose, onSubmit }) {
  const [form, setForm] = useState(
    company
      ? {
          name: company.name || '',
          registrationNumber: company.registrationNumber || '',
          industry: company.industry || '',
          size: company.size || '',
          email: company.email || '',
          phone: company.phone || '',
          website: company.website || '',
          country: company.country || '',
          city: company.city || '',
          physicalAddress: company.physicalAddress || '',
          postalAddress: company.postalAddress || '',
          description: company.description || '',
        }
      : { name: '', registrationNumber: '', industry: '', size: '', email: '', phone: '', website: '', country: '', city: '', physicalAddress: '', postalAddress: '', description: '' }
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function handleKeyDown(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function setField(name, value) { setForm((prev) => ({ ...prev, [name]: value })); }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required.'); return; }
    setBusy(true);
    try {
      await onSubmit({ ...form });
      onClose();
    } catch (err) {
      setError(err.message || 'Unable to save company.');
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium";
  const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5";

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="company-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="company-modal-title" className="text-base font-bold text-slate-900 truncate">{title}</h3>
              <p className="text-xs text-slate-500 truncate">Fill in the company details below</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors" aria-label="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mx-4 sm:mx-5 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-sm animate-in fade-in">
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="company-name" className={labelClass}>Company Name <span className="text-rose-600">*</span></label>
              <input id="company-name" value={form.name} onChange={(e) => setField('name', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="company-reg" className={labelClass}>Registration Number</label>
              <input id="company-reg" value={form.registrationNumber} onChange={(e) => setField('registrationNumber', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="company-industry" className={labelClass}>Industry</label>
              <input id="company-industry" value={form.industry} onChange={(e) => setField('industry', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Size</label>
              <CustomSelect id="company-size" value={form.size} onChange={(val) => setField('size', val)} options={sizeOptions} />
            </div>
            <div>
              <label htmlFor="company-email" className={labelClass}>Email <span className="text-rose-600">*</span></label>
              <input id="company-email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="company-phone" className={labelClass}>Phone</label>
              <input id="company-phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="company-website" className={labelClass}>Website</label>
              <input id="company-website" value={form.website} onChange={(e) => setField('website', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="company-country" className={labelClass}>Country</label>
              <input id="company-country" value={form.country} onChange={(e) => setField('country', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="company-city" className={labelClass}>City</label>
              <input id="company-city" value={form.city} onChange={(e) => setField('city', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="company-postal" className={labelClass}>Postal Address</label>
              <input id="company-postal" value={form.postalAddress} onChange={(e) => setField('postalAddress', e.target.value)} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="company-physical" className={labelClass}>Physical Address</label>
              <input id="company-physical" value={form.physicalAddress} onChange={(e) => setField('physicalAddress', e.target.value)} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="company-desc" className={labelClass}>Description</label>
              <textarea id="company-desc" rows="3" value={form.description} onChange={(e) => setField('description', e.target.value)} className={`${inputClass} min-h-[60px] resize-y`} />
            </div>
          </div>
        </form>

        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button type="button" onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition-colors shadow-xs">
            Cancel
          </button>
          <button type="submit" onClick={handleSubmit} disabled={busy}
            className="px-3.5 py-2 rounded-xl bg-[#063b33] hover:bg-[#042823] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
            {busy ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
