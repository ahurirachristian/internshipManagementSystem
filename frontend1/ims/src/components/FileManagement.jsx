import { useEffect, useRef, useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'ims.fileManagement.documents';
const CATEGORIES = ['Logbook Templates', 'Evaluation Forms', 'Internship Guidelines'];

function loadDocuments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function FileManagement() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const canUpload = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

  const [documents, setDocuments] = useState(loadDocuments);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [fileData, setFileData] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    } catch {
      setError('Storage is full. Some uploaded documents could not be saved.');
    }
  }, [documents]);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setFileData(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFileData({ name: file.name, dataUrl: reader.result });
    };
    reader.readAsDataURL(file);
  }

  async function handleUpload(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!fileData) {
      setError('Choose a file to upload.');
      return;
    }
    setUploading(true);
    try {
      const doc = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name: fileData.name,
        category,
        uploadedBy: user?.username || 'Unknown',
        date: new Date().toISOString(),
        dataUrl: fileData.dataUrl,
      };
      setDocuments((prev) => [doc, ...prev]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setFileData(null);
      setNotice('Document uploaded successfully.');
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <DashboardLayout title="File Management" subtitle="Shared documents for the internship programme">
      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {canUpload && (
        <div className="card-panel">
          <h2>Upload Document</h2>
          <p>
            Share logbook templates, evaluation forms, or internship guidelines with students and
            staff.
          </p>
          <form onSubmit={handleUpload} className="fm-form">
            <div className="fm-form-grid">
              <label>
                Category
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                File
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button type="submit" className="primary-button" disabled={uploading || !fileData}>
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>File Name</th>
              <th>Category</th>
              <th>Uploaded By</th>
              <th>Date</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            {documents.length > 0 ? (
              documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="fm-name">
                    <i className="fa-solid fa-file"></i> {doc.name}
                  </td>
                  <td>
                    <span className="fm-category">{doc.category}</span>
                  </td>
                  <td>{doc.uploadedBy}</td>
                  <td>{formatDate(doc.date)}</td>
                  <td>
                    <a className="icon-button fm-download" href={doc.dataUrl} download={doc.name}>
                      <i className="fa-solid fa-download"></i> Download
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="empty-row">
                  No documents uploaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
