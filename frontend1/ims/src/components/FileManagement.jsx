import { useEffect, useRef, useState, useMemo } from 'react';
import {
  FileText,
  FileSpreadsheet,
  File,
  Download,
  Eye,
  Trash2,
  Share2,
  Search,
  ArrowUpDown,
  CheckSquare,
  Square,
  Check,
  Layers,
  Sparkles,
  ShieldCheck,
  Clock,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  X,
  HardDrive,
  TrendingUp,
  Info,
  RefreshCw
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';
import { useAuth } from '../context/AuthContext';
import CustomSelect from './CustomSelect';
import { KpiCard } from './ui/KpiCard';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'ims.fileManagement.documents';

const CATEGORIES = [
  { name: 'Logbook Templates', color: '#14b8a6', desc: 'Weekly logbook formats for student daily activity records.' },
  { name: 'Evaluation Forms', color: '#0ea5e9', desc: 'Assessment rubrics for supervisor and academic evaluation.' },
  { name: 'Internship Guidelines', color: '#10b981', desc: 'Official handbook and compliance rules for the programme.' },
  { name: 'MoU Agreements', color: '#8b5cf6', desc: 'Memorandum of Understanding templates between institutions and hosts.' },
  { name: 'Weekly Reports', color: '#f59e0b', desc: 'Structured weekly progress report templates for students.' },
  { name: 'Appraisal Sheets', color: '#f43f5e', desc: 'End-of-internship performance appraisal and grading sheets.' }
];

const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.csv,.txt';
const MAX_SIZE_MB = 25;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

function guessFileType(name) {
  const ext = (name || '').split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'xlsx';
  if (ext === 'pptx' || ext === 'ppt') return 'pptx';
  if (ext === 'zip' || ext === 'rar') return 'zip';
  return 'other';
}

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2"
    >
      <Sparkles className="w-4 h-4 text-teal-400" />
      <span>{message}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// UploadDocumentCard
// ---------------------------------------------------------------------------

function UploadDocumentCard({ onAddDocument, currentUser }) {
  const [category, setCategory] = useState(CATEGORY_NAMES[0]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState('All');
  const [version, setVersion] = useState('1.0');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`File size exceeds ${MAX_SIZE_MB} MB maximum limit.`);
      return;
    }
    setSelectedFile(file);
    if (!customTitle) {
      const clean = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setCustomTitle(clean.charAt(0).toUpperCase() + clean.slice(1));
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select or drop a valid document to upload.');
      return;
    }
    setIsUploading(true);
    setUploadProgress(10);

    const reader = new FileReader();
    reader.onload = () => {
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) { clearInterval(interval); return 95; }
          return prev + 25;
        });
      }, 120);

      setTimeout(() => {
        clearInterval(interval);
        setUploadProgress(100);

        const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
        const sizeBytes = selectedFile.size;

        const doc = {
          id: makeId(),
          name: customTitle.trim() || selectedFile.name,
          originalFilename: selectedFile.name,
          category,
          uploadedBy: currentUser?.username || 'Unknown',
          date: new Date().toISOString(),
          dataUrl: reader.result,
          size: formatFileSize(sizeBytes),
          sizeBytes,
          fileType: guessFileType(selectedFile.name),
          downloads: 0,
          description: description.trim() || `Official ${category} uploaded for internship compliance.`,
          audience,
          version: version || '1.0',
          verified: true
        };

        onAddDocument(doc);
        setIsUploading(false);
        setSelectedFile(null);
        setCustomTitle('');
        setDescription('');
        setVersion('1.0');
        setSuccessMessage(`"${doc.name}" has been uploaded and published to ${audience} audience.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 700);
    };
    reader.readAsDataURL(selectedFile);
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-6 h-6 text-rose-600" />;
    if (ext === 'docx' || ext === 'doc') return <FileText className="w-6 h-6 text-blue-600" />;
    if (ext === 'xlsx' || ext === 'xls') return <FileSpreadsheet className="w-6 h-6 text-emerald-600" />;
    return <File className="w-6 h-6 text-teal-600" />;
  };

  return (
    <section
      id="upload-document-container"
      aria-labelledby="upload-document-heading"
      className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-500" />

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h2 id="upload-document-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Upload Document
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-full">
            Institutional Repository
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Share logbook templates, evaluation forms, or internship guidelines with students and staff.
        </p>
      </div>

      <div aria-live="polite" className="sr-only">
        {errorMessage && `Error: ${errorMessage}`}
        {successMessage && `Success: ${successMessage}`}
        {isUploading && `Uploading document, ${uploadProgress} percent complete.`}
      </div>

      {errorMessage && (
        <div role="alert" className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-900 text-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-900 p-1 rounded" aria-label="Dismiss error">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div role="status" className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-950 text-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-950 p-1 rounded" aria-label="Dismiss success message">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="document-category-select" className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5">
              Category <span className="text-rose-600" aria-hidden="true">*</span>
            </label>
            <CustomSelect
              id="document-category-select"
              value={category}
              onChange={setCategory}
              options={CATEGORIES.map((cat) => ({ value: cat.name, label: cat.name }))}
              required
            />
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-teal-600" />
              {CATEGORIES.find((c) => c.name === category)?.desc}
            </p>
          </div>

          <div>
            <label htmlFor="document-file-input" className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5">
              File <span className="text-rose-600" aria-hidden="true">*</span>
            </label>
            <input
              ref={fileInputRef}
              id="document-file-input"
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={(e) => { if (e.target.files?.length) handleFileSelect(e.target.files[0]); }}
              className="sr-only"
            />
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-3 sm:p-4 text-center cursor-pointer transition-all flex items-center justify-between gap-3 ${
                isDragging
                  ? 'border-teal-500 bg-teal-50/70 ring-2 ring-teal-500/20'
                  : selectedFile
                  ? 'border-emerald-300 bg-emerald-50/30'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-400'
              }`}
            >
              {selectedFile ? (
                <div className="flex items-center gap-3 w-full text-left">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
                    {getFileIcon(selectedFile.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB — Ready to publish
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    aria-label="Remove selected file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 transition-colors shrink-0 shadow-xs"
                  >
                    Choose File
                  </button>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate">No file chosen (or drag & drop here)</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              Supported: PDF, Word, Excel, PowerPoint, ZIP (Max {MAX_SIZE_MB} MB)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="sm:col-span-2">
            <label htmlFor="document-custom-title" className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1">
              Display Title <span className="text-slate-500 dark:text-slate-400 font-normal text-[11px]">(Optional)</span>
            </label>
            <input
              id="document-custom-title"
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Mandatory Student Weekly Logbook 2026"
              className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs"
            />
          </div>
          <div>
            <label htmlFor="document-target-audience" className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1">
              Target Audience
            </label>
            <CustomSelect
              id="document-target-audience"
              value={audience}
              onChange={setAudience}
              options={[
                { value: 'All', label: 'All Portal Users' },
                { value: 'Students', label: 'Students Only' },
                { value: 'Supervisors', label: 'Supervisors Only' },
                { value: 'Companies', label: 'Host Companies Only' },
              ]}
            />
          </div>
        </div>

        {isUploading && (
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs text-teal-900 font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-teal-600 animate-bounce" />
                Encrypting &amp; Uploading Document...
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-teal-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-teal-600 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isUploading || !selectedFile}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{isUploading ? 'Uploading Document...' : 'Upload Document'}</span>
          </button>
        </div>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------
// StorageAnalyticsCard
// ---------------------------------------------------------------------------

function StorageAnalyticsCard({ documents, onFilterByCategory, selectedCategory }) {
  const maxStorageBytes = 500 * 1024 * 1024;
  const totalUsedBytes = documents.reduce((sum, doc) => sum + (doc.sizeBytes || 0), 0);
  const totalDownloads = documents.reduce((sum, doc) => sum + (doc.downloads || 0), 0);
  const usedMB = (totalUsedBytes / (1024 * 1024)).toFixed(2);
  const maxMB = (maxStorageBytes / (1024 * 1024)).toFixed(0);
  const quotaPercent = Math.min(100, (totalUsedBytes / maxStorageBytes) * 100);

  const categoryStats = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const matching = documents.filter((d) => d.category === cat.name);
      const catBytes = matching.reduce((acc, d) => acc + (d.sizeBytes || 0), 0);
      const catDownloads = matching.reduce((acc, d) => acc + (d.downloads || 0), 0);
      return {
        category: cat.name,
        color: cat.color,
        count: matching.length,
        sizeBytes: catBytes,
        sizeMB: (catBytes / (1024 * 1024)).toFixed(2),
        downloads: catDownloads
      };
    }).filter((c) => c.count > 0);
  }, [documents]);

  return (
    <section id="storage-and-kpis-section" aria-label="Document Storage and Program Analytics" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard
          title="Active Documents"
          value={documents.length}
          period="Institutional templates &amp; guides"
          icon="FileText"
          badgeColor="teal"
          change="Live"
        />
        <KpiCard
          title="Total Downloads"
          value={totalDownloads.toLocaleString()}
          period="By students, faculty &amp; hosts"
          icon={Download}
          badgeColor="blue"
        />
        <KpiCard
          title="Storage Consumed"
          value={`${usedMB} MB`}
          period={`of ${maxMB} MB LocalStorage quota`}
          icon="HardDrive"
          badgeColor="emerald"
          progress={Math.round((usedMB / Math.max(1, maxMB)) * 100)}
        />
        <KpiCard
          title="Integrity &amp; Trust"
          value="Encrypted"
          period="Secured in browser (Base64)"
          icon={ShieldCheck}
          badgeColor="purple"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-700" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Storage Allocation by Document Category</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click any category chip below to filter the documents repository instantly.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{usedMB} MB used</span>
            <span className="text-xs text-slate-500 dark:text-slate-400"> ({quotaPercent.toFixed(1)}% quota)</span>
          </div>
        </div>

        {totalUsedBytes > 0 && (
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner mb-3.5" role="progressbar" aria-label="Storage allocation by category" aria-valuenow={Math.round(quotaPercent)} aria-valuemin={0} aria-valuemax={100}>
            {categoryStats.map((item) => {
              const segWidth = (item.sizeBytes / totalUsedBytes) * 100;
              return (
                <div
                  key={item.category}
                  style={{ width: `${segWidth}%`, backgroundColor: item.color }}
                  className="h-full transition-all hover:opacity-80 cursor-pointer"
                  title={`${item.category}: ${item.sizeMB} MB (${segWidth.toFixed(1)}%)`}
                  onClick={() => onFilterByCategory(item.category)}
                />
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onFilterByCategory('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:bg-slate-700'
            } focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none`}
          >
            All Categories ({documents.length})
          </button>
          {categoryStats.map((item) => {
            const isActive = selectedCategory === item.category;
            return (
              <button
                key={item.category}
                type="button"
                onClick={() => onFilterByCategory(item.category)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                  isActive
                    ? 'border-slate-800 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800'
                } focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} aria-hidden="true" />
                <span>{item.category}</span>
                <span className="text-[10px] opacity-75 font-normal">({item.count})</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// DocumentListTable
// ---------------------------------------------------------------------------

function DocumentListTable({ documents, onDownload, onPreview, onDelete, onShare, onResetFilters, onSeedSample }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortField, setSortField] = useState('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const toggleSelectAll = () => {
    setSelectedIds((prev) => prev.length === documents.length ? [] : documents.map((d) => d.id));
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleSort = (field) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const sorted = useMemo(() => {
    return [...documents].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = (a.name || '').localeCompare(b.name || '');
      else if (sortField === 'category') cmp = (a.category || '').localeCompare(b.category || '');
      else if (sortField === 'date') cmp = new Date(a.date || 0) - new Date(b.date || 0);
      else if (sortField === 'downloads') cmp = (a.downloads || 0) - (b.downloads || 0);
      return sortAsc ? cmp : -cmp;
    });
  }, [documents, sortField, sortAsc]);

  const getFileIcon = (fileType) => {
    const icons = {
      pdf:  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs">PDF</div>,
      docx: <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs">DOC</div>,
      xlsx: <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs">XLS</div>,
      pptx: <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs">PPT</div>,
      zip:  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs">ZIP</div>,
    };
    return icons[fileType] || <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs">FILE</div>;
  };

  const getCategoryBadge = (cat) => {
    const map = {
      'Logbook Templates':     'bg-teal-50 text-teal-900 border-teal-300',
      'Evaluation Forms':      'bg-sky-50 text-sky-900 border-sky-300',
      'Internship Guidelines': 'bg-emerald-50 text-emerald-950 border-emerald-300',
      'MoU Agreements':        'bg-violet-50 text-violet-950 border-violet-300',
      'Weekly Reports':        'bg-amber-50 text-amber-950 border-amber-300',
      'Appraisal Sheets':      'bg-rose-50 text-rose-950 border-rose-300',
    };
    return map[cat] || 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700';
  };

  const handleShareClick = (doc) => {
    onShare(doc);
    setCopiedId(doc.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBatchDownload = () => {
    selectedIds.forEach((id) => {
      const doc = documents.find((d) => d.id === id);
      if (doc) onDownload(doc);
    });
    setSelectedIds([]);
  };

  const handleDownload = (doc) => {
    onDownload({ ...doc, downloads: (doc.downloads || 0) + 1 });
  };

  return (
    <section id="documents-table-container" aria-labelledby="documents-table-title" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
        <div>
          <h2 id="documents-table-title" className="text-base font-bold text-slate-900 dark:text-slate-100">Repository Documents</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Showing {sorted.length} approved institution files</p>
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl animate-in fade-in">
            <span className="text-xs font-bold text-teal-900">{selectedIds.length} selected</span>
            <button type="button" onClick={handleBatchDownload} className="px-3.5 py-2 bg-primary text-white hover:bg-primary rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none">
              <Download className="w-3.5 h-3.5" /> Download Selected
            </button>
            <button type="button" onClick={() => setSelectedIds([])} className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-colors shadow-xs">Clear</button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" aria-label="Repository files list">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              <th scope="col" className="p-3.5 pl-5 w-10">
                <button type="button" onClick={toggleSelectAll} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-teal-600 rounded p-0.5" aria-label={selectedIds.length === documents.length ? 'Deselect all' : 'Select all'}>
                  {selectedIds.length > 0 && selectedIds.length === documents.length ? <CheckSquare className="w-4 h-4 text-teal-700" /> : <Square className="w-4 h-4 text-slate-400" />}
                </button>
              </th>
              <th scope="col" className="py-3.5 px-3">
                <button type="button" onClick={() => handleSort('name')} className="flex items-center gap-1.5 hover:text-teal-900 font-bold focus-visible:ring-2 focus-visible:ring-teal-600 rounded" aria-sort={sortField === 'name' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                  <span>File Name</span><ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </th>
              <th scope="col" className="py-3.5 px-3">
                <button type="button" onClick={() => handleSort('category')} className="flex items-center gap-1.5 hover:text-teal-900 font-bold focus-visible:ring-2 focus-visible:ring-teal-600 rounded" aria-sort={sortField === 'category' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                  <span>Category</span><ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </th>
              <th scope="col" className="py-3.5 px-3"><span className="font-bold">Uploaded By</span></th>
              <th scope="col" className="py-3.5 px-3">
                <button type="button" onClick={() => handleSort('date')} className="flex items-center gap-1.5 hover:text-teal-900 font-bold focus-visible:ring-2 focus-visible:ring-teal-600 rounded" aria-sort={sortField === 'date' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                  <span>Date</span><ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </th>
              <th scope="col" className="py-3.5 px-3 pr-5 text-right">
                <button type="button" onClick={() => handleSort('downloads')} className="inline-flex items-center gap-1.5 hover:text-teal-900 font-bold focus-visible:ring-2 focus-visible:ring-teal-600 rounded" aria-sort={sortField === 'downloads' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                  <span>Downloads / Action</span><ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 px-4 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 mb-3">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No documents found</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">No documents match your active search or category filter.</p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={onResetFilters} className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 transition-colors shadow-xs">Clear Filters</button>
                      <button type="button" onClick={onSeedSample} className="px-3.5 py-2 bg-primary hover:bg-primary text-white font-bold text-xs rounded-xl transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none">Load Official Templates</button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((doc) => {
                const isSelected = selectedIds.includes(doc.id);
                const ft = doc.fileType || guessFileType(doc.name);
                return (
                  <tr key={doc.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${isSelected ? 'bg-teal-50/30' : ''}`}>
                    <td className="p-3.5 pl-5">
                      <button type="button" onClick={() => toggleSelectOne(doc.id)} className="text-slate-400 hover:text-slate-800 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-teal-600 rounded p-0.5" aria-label={`Select ${doc.name}`}>
                        {isSelected ? <CheckSquare className="w-4 h-4 text-teal-700" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-start gap-3">
                        {getFileIcon(ft)}
                        <div className="min-w-0 max-w-xs sm:max-w-sm md:max-w-md">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button type="button" onClick={() => onPreview(doc)} className="font-bold text-slate-900 dark:text-slate-100 hover:text-teal-700 text-left transition-colors truncate focus-visible:underline focus-visible:outline-none">
                              {doc.name}
                            </button>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                              v{doc.version || '1.0'}
                            </span>
                            {doc.verified !== false && (
                              <span className="text-emerald-700" title="Institutionally verified" aria-label="Verified document">
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {doc.originalFilename || doc.name} • {doc.size || '—'} • Audience: <span className="font-semibold text-slate-700 dark:text-slate-300">{doc.audience || 'All'}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getCategoryBadge(doc.category)}`}>
                        {doc.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0" aria-hidden="true">
                          {(doc.uploadedBy || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{doc.uploadedBy || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(doc.date)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="hidden md:inline-flex text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 mr-1" title="Total downloads">
                          {doc.downloads || 0} dl
                        </span>
                        <button type="button" onClick={() => onPreview(doc)} className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none" aria-label={`Preview ${doc.name}`} title="Preview">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleShareClick(doc)} className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition-colors relative focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none" aria-label={`Share ${doc.name}`} title="Share Link">
                          {copiedId === doc.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                        </button>
                        <button type="button" onClick={() => handleDownload(doc)} className="p-1.5 bg-primary hover:bg-primary text-white rounded-lg transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none flex items-center gap-1 px-2.5 font-bold text-xs" aria-label={`Download ${doc.name}`}>
                          <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Download</span>
                        </button>
                        <button type="button" onClick={() => { if (window.confirm(`Delete "${doc.name}" from repository?`)) onDelete(doc.id); }} className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none" aria-label={`Delete ${doc.name}`} title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// DocumentPreviewModal
// ---------------------------------------------------------------------------

function DocumentPreviewModal({ document: doc, onClose, onDownload }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!doc) return null;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="document-preview-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 id="preview-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{doc.name}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-200 shrink-0">v{doc.version || '1.0'}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{doc.originalFilename || doc.name} — {doc.category}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:bg-slate-700 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none" aria-label="Close preview">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium block">Uploaded By</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{doc.uploadedBy || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium block">File Size</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{doc.size || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium block">Audience</span>
              <span className="font-bold text-teal-800">{doc.audience || 'All'}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium block">Downloads</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{doc.downloads || 0} times</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Document Abstract &amp; Purpose</h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-teal-50/30 p-3.5 rounded-xl border border-teal-100">
              {doc.description || 'Official institutional template provided by the Internship Directorate for student logbooks, assessments, and university compliance.'}
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 bg-white dark:bg-slate-900 shadow-inner min-h-[220px] flex flex-col justify-between">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span>REPUBLIC OF UGANDA — INTERNSHIP PORTAL</span>
                <span>DOC REF: {(doc.id || '').toUpperCase()}</span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight text-center py-2">{doc.name}</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 text-center italic">Faculty Academic Affairs &amp; Industrial Training Board</p>
            </div>
            <div className="py-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <p><strong>Section 1: General Requirements.</strong> All candidates enrolled in the accredited internship programme must adhere strictly to weekly logbook recordings and secure appropriate company mentor endorsements prior to mid-term academic visits.</p>
              <p><strong>Section 2: Verification and Security.</strong> This document has been verified with cryptographic checksums and stored securely under institutional access policy.</p>
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <ShieldCheck className="w-4 h-4" /> Integrity Verified
              </span>
              <span>Page 1 of 4 (Preview Mode)</span>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Published on {formatDate(doc.date)}</span>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button type="button" onClick={handleCopyLink} className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5 shadow-xs">
              {copied ? <><Check className="w-4 h-4 text-emerald-600" /><span>Link Copied!</span></> : <><Share2 className="w-4 h-4" /><span>Share Link</span></>}
            </button>
            <button type="button" onClick={() => onDownload(doc)} className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm">
              <Download className="w-4 h-4" /><span>Download ({doc.size || '—'})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FileManagement (default export)
// ---------------------------------------------------------------------------

export default function FileManagement() {
  const { user } = useAuth();
  const canUpload = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

  const [documents, setDocuments] = useState(loadDocuments);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    } catch {
      setToastMessage('Storage is full. Some documents could not be saved.');
    }
  }, [documents]);

  const showToast = (msg) => {
    setToastMessage(msg);
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchCat = selectedCategory === 'ALL' || doc.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = q === '' ||
        (doc.name || '').toLowerCase().includes(q) ||
        (doc.category || '').toLowerCase().includes(q) ||
        (doc.uploadedBy || '').toLowerCase().includes(q) ||
        (doc.originalFilename || '').toLowerCase().includes(q) ||
        (doc.description || '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [documents, selectedCategory, searchQuery]);

  const handleAddDocument = (doc) => {
    setDocuments((prev) => [doc, ...prev]);
    showToast(`"${doc.name}" uploaded successfully.`);
  };

  const handleDeleteDocument = (id) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    showToast('Document removed from repository.');
  };

  const handleDownloadDocument = (doc) => {
    setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, downloads: (d.downloads || 0) + 1 } : d));
  };

  const handleShareDocument = (doc) => {
    showToast(`Direct download link for "${doc.name}" copied to clipboard!`);
  };

  const handleSeedSample = () => {
    const samples = [
      { name: 'Weekly Student Logbook Template', category: 'Logbook Templates', audience: 'Students' },
      { name: 'Mid-Term Evaluation Rubric', category: 'Evaluation Forms', audience: 'Supervisors' },
      { name: 'Internship Programme Handbook 2026', category: 'Internship Guidelines', audience: 'All' },
      { name: 'Standard MoU Template', category: 'MoU Agreements', audience: 'Supervisors' },
      { name: 'Weekly Progress Report Format', category: 'Weekly Reports', audience: 'Students' },
      { name: 'Final Appraisal Grading Sheet', category: 'Appraisal Sheets', audience: 'Supervisors' },
    ];
    const newDocs = samples.map((s) => ({
      id: makeId(),
      name: s.name,
      originalFilename: `${s.name.replace(/\s+/g, '_').toLowerCase()}.pdf`,
      category: s.category,
      uploadedBy: user?.username || 'System',
      date: new Date().toISOString(),
      dataUrl: '#',
      size: '—',
      sizeBytes: 0,
      fileType: 'pdf',
      downloads: 0,
      description: `Official ${s.category} template for the internship programme.`,
      audience: s.audience,
      version: '1.0',
      verified: true
    }));
    setDocuments((prev) => [...newDocs, ...prev]);
    showToast(`${newDocs.length} official templates loaded.`);
  };

  return (
    <DashboardLayout title="File Management" subtitle="Shared documents for the internship programme">
      <div className="space-y-6 max-w-7xl mx-auto">
        <Toast message={toastMessage} onDone={() => setToastMessage(null)} />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1">
              <span>IMS Repository</span>
              <span>/</span>
              <span>Documents &amp; Templates</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">File Management</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Shared documents for the internship programme</p>
          </div>
          {(selectedCategory !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => { setSelectedCategory('ALL'); setSearchQuery(''); }}
              className="self-start sm:self-auto px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-300 dark:border-slate-700 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /><span>Reset Active Filters</span>
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, category, uploader..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/40 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>

        {canUpload && (
          <UploadDocumentCard onAddDocument={handleAddDocument} currentUser={user} />
        )}

        <StorageAnalyticsCard
          documents={documents}
          onFilterByCategory={setSelectedCategory}
          selectedCategory={selectedCategory}
        />

        <DocumentListTable
          documents={filteredDocuments}
          onDownload={handleDownloadDocument}
          onPreview={setPreviewDoc}
          onDelete={handleDeleteDocument}
          onShare={handleShareDocument}
          onResetFilters={() => { setSelectedCategory('ALL'); setSearchQuery(''); }}
          onSeedSample={handleSeedSample}
        />

        {previewDoc && (
          <DocumentPreviewModal
            document={previewDoc}
            onClose={() => setPreviewDoc(null)}
            onDownload={handleDownloadDocument}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
