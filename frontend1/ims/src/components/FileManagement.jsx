import { useEffect, useRef, useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { fetchFiles, uploadFile, deleteFile } from '../services/api';

const CATEGORIES = ['Logbook Templates', 'Evaluation Forms', 'Internship Guidelines'];

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
  const canDelete = user?.role !== 'STUDENT';

  const [documents, setDocuments] = useState([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  async function loadFiles() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchFiles();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load files.');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  }

  async function handleUpload(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!selectedFile) {
      setError('Choose a file to upload.');
      return;
    }
    setUploading(true);
    try {
      await uploadFile(selectedFile, category);
      setNotice('Document uploaded successfully.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSelectedFile(null);
      await loadFiles();
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this file?')) return;
    setError('');
    setNotice('');
    try {
      await deleteFile(id);
      setNotice('File deleted successfully.');
      await loadFiles();
    } catch (err) {
      setError(err.message || 'Unable to delete file.');
    }
  }

  return (
    <DashboardLayout title="File Management" subtitle="Shared documents for the internship programme">
      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

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
            <button type="submit" className="primary-button" disabled={uploading || !selectedFile}>
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>

      {loading && <div className="status-message">Loading files...</div>}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>File Name</th>
              <th>Category</th>
              <th>Uploaded By</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.length > 0 ? (
              documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="fm-name">
                    <i className="fa-solid fa-file"></i> {doc.originalFileName}
                  </td>
                  <td>
                    <span className="fm-category">{doc.category}</span>
                  </td>
                  <td>{doc.uploadedBy}</td>
                  <td>{formatDate(doc.uploadDate)}</td>
                  <td>
                    <a
                      className="icon-button"
                      href={`http://localhost:8082/api/files/view/${doc.fileName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View file"
                    >
                      <i className="fa-solid fa-eye"></i>
                    </a>
                    <a
                      className="icon-button fm-download"
                      href={`http://localhost:8082/api/files/view/${doc.fileName}`}
                      download={doc.originalFileName}
                      title="Download file"
                    >
                      <i className="fa-solid fa-download"></i>
                    </a>
                    {canDelete && (
                      <button className="icon-button delete" onClick={() => handleDelete(doc.id)} title="Delete file">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    )}
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
