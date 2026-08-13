import { useState } from 'react';

export default function CompanyEditModal({ company, title, onClose, onSubmit }) {
  const [form, setForm] = useState(
    company
      ? {
          name: company.name || '',
          country: company.location || '',
          branch: company.department || '',
          email: company.email || '',
          website: company.website || '',
          postalAddress: company.profile?.split(' | ')[0] || '',
          physicalAddress: company.profile?.split(' | ')[1] || '',
        }
      : {
          name: '',
          country: '',
          branch: '',
          email: '',
          website: '',
          postalAddress: '',
          physicalAddress: '',
        }
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.website.trim()) {
      setError('Name, email and website are required.');
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        country: form.country.trim(),
        branch: form.branch.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        postalAddress: form.postalAddress.trim(),
        physicalAddress: form.physicalAddress.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Unable to save company.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Company Name
            <input value={form.name} onChange={(e) => setField('name', e.target.value)} />
          </label>
          <label>
            Country
            <input value={form.country} onChange={(e) => setField('country', e.target.value)} />
          </label>
          <label>
            Branch
            <input value={form.branch} onChange={(e) => setField('branch', e.target.value)} />
          </label>
          <label>
            Company Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
            />
          </label>
          <label>
            Website
            <input value={form.website} onChange={(e) => setField('website', e.target.value)} />
          </label>
          <label>
            Postal Address
            <input
              value={form.postalAddress}
              onChange={(e) => setField('postalAddress', e.target.value)}
            />
          </label>
          <label>
            Physical Address
            <input
              value={form.physicalAddress}
              onChange={(e) => setField('physicalAddress', e.target.value)}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
