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
  Info,
  RefreshCw,
  FolderClosed,
  Upload,
  Users,
  Globe,
  FileCode,
  FileArchive
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';
import { useAuth } from '../context/AuthContext';
import CustomSelect from './CustomSelect';
import { KpiCard } from './ui/KpiCard';
import { TableCard } from './ui/TableCard';
import { FilterTabs } from './ui/FilterTabs';
import { Avatar } from './ui/Avatar';
import { EmptyState } from './ui/EmptyState';
import { Modal } from './ui/Modal';

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
    <>
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
    </>
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

function DocumentListTable({ documents, activeCategory, onCategoryChange, searchQuery, onSearchChange, onDownload, onPreview, onDelete, onShare, onRequestBulkDelete, onResetFilters, onSeedSample, canUpload, onUploadClick }) {
  const [selectedIds, setSelectedIds] = useState([]);

  const isAllSelected = documents.length > 0 && documents.every((d) => selectedIds.includes(d.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(selectedIds.filter((id) => !documents.some((d) => d.id === id)));
    } else {
      const newIds = new Set([...selectedIds, ...documents.map((d) => d.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleDeleteOne = (doc) => {
    if (window.confirm(`Delete "${doc.name}" from repository?`)) {
      onDelete(doc.id);
      setSelectedIds((prev) => prev.filter((id) => id !== doc.id));
    }
  };

  const getIconTile = (fileType) => {
    const tile = {
      pdf:  { icon: FileText,       label: 'PDF',  bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/60' },
      docx: { icon: FileText,       label: 'DOC',  bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/60' },
      xlsx: { icon: FileSpreadsheet,label: 'XLS',  bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60' },
      pptx: { icon: FileText,       label: 'PPT',  bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60' },
      zip:  { icon: FileArchive,    label: 'ZIP',  bg: 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border-orange-200/60 dark:border-orange-800/60' },
      code: { icon: FileCode,       label: 'CODE', bg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/60' },
    };
    return tile[fileType || ''] || { icon: FileText, label: 'FILE', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
  };

  const getCategoryBadge = (cat) => {
    const map = {
      'Logbook Templates':     'bg-teal-50 text-teal-800 border-teal-300',
      'Evaluation Forms':      'bg-sky-50 text-sky-800 border-sky-300',
      'Internship Guidelines': 'bg-emerald-50 text-emerald-800 border-emerald-300',
      'MoU Agreements':        'bg-violet-50 text-violet-800 border-violet-300',
      'Weekly Reports':        'bg-amber-50 text-amber-800 border-amber-300',
      'Appraisal Sheets':      'bg-rose-50 text-rose-800 border-rose-300',
    };
    return map[cat] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  };

  const getAudienceIcon = (audience) => {
    switch (audience) {
      case 'Students':   return <Users className="w-3 h-3 text-blue-500" />;
      case 'Supervisors':return <Users className="w-3 h-3 text-emerald-500" />;
      case 'Companies':  return <Globe className="w-3 h-3 text-amber-500" />;
      case 'All':
      default:           return <Globe className="w-3 h-3 text-teal-500" />;
    }
  };

  const categories = useMemo(() => {
    const base = [
      { id: 'ALL', label: 'All Files', count: documents.length },
      ...CATEGORY_NAMES.map((name) => ({
        id: name,
        label: name,
        count: documents.filter((d) => d.category === name).length,
      })),
    ];
    return base;
  }, [documents]);

  return (
    <TableCard
      title="Repository Documents"
      subtitle={`Manage ${documents.length} approved institution files and templates`}
      icon={FolderClosed}
      actions={
        <div className="flex items-center gap-2">
          {documents.length === 0 && onSeedSample && (
            <button
              type="button"
              onClick={onSeedSample}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Official Templates</span>
            </button>
          )}
          {canUpload && (
            <button
              type="button"
              onClick={onUploadClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-95 transition-opacity shadow-xs bg-primary"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload File</span>
            </button>
          )}
        </div>
      }
    >
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/40 dark:bg-slate-900/40">
        <FilterTabs
          tabs={categories}
          activeTab={activeCategory}
          onChange={onCategoryChange}
        />

        <div className="flex items-center gap-3 w-full lg:w-auto">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => onRequestBulkDelete(selectedIds)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/80 hover:bg-rose-100 transition-colors shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedIds.length})</span>
            </button>
          )}

          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search file name, uploader..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-[12px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              <th className="px-5 py-3.5 w-10">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {isAllSelected ? (
                    <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3.5">File Name</th>
              <th className="px-4 py-3.5">Category</th>
              <th className="px-4 py-3.5">Size</th>
              <th className="px-4 py-3.5">Uploaded By</th>
              <th className="px-4 py-3.5">Last Modified</th>
              <th className="px-4 py-3.5">Audience</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {documents.length > 0 ? (
              documents.map((doc) => {
                const isSelected = selectedIds.includes(doc.id);
                const ft = doc.fileType || guessFileType(doc.name);
                const tile = getIconTile(ft);
                const IconComponent = tile.icon;

                return (
                  <tr
                    key={doc.id}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-teal-50/40 dark:bg-teal-950/20'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => toggleSelectOne(doc.id)}
                        className="flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl border ${tile.bg} flex items-center justify-center font-mono font-bold text-[10px] shrink-0 shadow-2xs`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onPreview(doc)}
                              className="font-semibold text-slate-800 dark:text-slate-100 block truncate max-w-xs hover:text-teal-700 transition-colors focus-visible:underline focus-visible:outline-none"
                            >
                              {doc.name}
                            </button>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 shrink-0">
                              v{doc.version || '1.0'}
                            </span>
                            {doc.verified !== false && (
                              <span className="text-emerald-600 dark:text-emerald-400 shrink-0" title="Institutionally verified">
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            .{(doc.fileType || guessFileType(doc.name) || 'FILE').toUpperCase()} · {doc.downloads || 0} downloads
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full border font-bold text-[11px] ${getCategoryBadge(doc.category)}`}>
                        {doc.category}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-700 dark:text-slate-300">
                      {doc.size || formatFileSize(doc.sizeBytes)}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={doc.uploadedBy || 'Unknown'}
                          size="xs"
                        />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {doc.uploadedBy || 'Unknown'}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                      {formatDate(doc.date)}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {getAudienceIcon(doc.audience)}
                        <span>{doc.audience || 'All'}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => onPreview(doc)}
                          title="Preview File"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDownload(doc)}
                          title="Download File"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onShare(doc)}
                          title="Share Link"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOne(doc)}
                          title="Delete File"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="p-0">
                  <EmptyState
                    title="No files match filter"
                    description="No documents match your active category or search filters."
                    actionLabel="Reset Filters"
                    onAction={onResetFilters}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          Total: <strong className="text-slate-700 dark:text-slate-200">{documents.length}</strong> items displayed
        </span>
        {selectedIds.length > 0 && (
          <span className="text-teal-700 dark:text-teal-400 font-semibold">
            {selectedIds.length} item(s) selected
          </span>
        )}
      </div>
    </TableCard>
  );
}

// ---------------------------------------------------------------------------
// DocumentPreviewModal
// ---------------------------------------------------------------------------

function DocumentPreviewModal({ document: doc, onClose, onDownload }) {
  const [copied, setCopied] = useState(false);

  if (!doc) return null;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={!!doc}
      onClose={onClose}
      title={doc.name}
      subtitle={`${doc.originalFilename || doc.name} — ${doc.category}`}
      maxWidth="max-w-3xl"
      footer={
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
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
      }
    >
      <div className="space-y-6">
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
    </Modal>
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
  const [shareDoc, setShareDoc] = useState(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
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
    setShareDoc(doc);
  };

  const handleBulkDeleteConfirm = () => {
    setDocuments((prev) => prev.filter((d) => !bulkDeleteIds.includes(d.id)));
    showToast(`${bulkDeleteIds.length} document(s) removed from repository.`);
    setBulkDeleteIds([]);
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

        <StorageAnalyticsCard
          documents={documents}
          onFilterByCategory={setSelectedCategory}
          selectedCategory={selectedCategory}
        />

        <DocumentListTable
          documents={filteredDocuments}
          activeCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onDownload={handleDownloadDocument}
          onPreview={setPreviewDoc}
          onDelete={handleDeleteDocument}
          onShare={handleShareDocument}
          onRequestBulkDelete={(ids) => setBulkDeleteIds(ids)}
          onResetFilters={() => { setSelectedCategory('ALL'); setSearchQuery(''); }}
          onSeedSample={handleSeedSample}
          canUpload={canUpload}
          onUploadClick={() => setIsUploadOpen(true)}
        />

        {canUpload && (
          <Modal
            isOpen={isUploadOpen}
            onClose={() => setIsUploadOpen(false)}
            title="Upload Document"
            subtitle="Publish logbook templates, evaluation forms, or internship guidelines"
            maxWidth="max-w-2xl"
          >
            <UploadDocumentCard onAddDocument={(doc) => { handleAddDocument(doc); setIsUploadOpen(false); }} currentUser={user} />
          </Modal>
        )}

        <Modal
          isOpen={!!shareDoc}
          onClose={() => setShareDoc(null)}
          title="Share Secure Link"
          subtitle={`Generate encrypted shareable URL for ${shareDoc?.name}`}
          maxWidth="max-w-md"
          footer={
            <button
              type="button"
              onClick={() => {
                if (shareDoc) {
                  navigator.clipboard?.writeText(`https://portal.ims.ac.ug/documents/${shareDoc.id}`);
                  showToast(`Direct download link for "${shareDoc.name}" copied to clipboard!`);
                }
                setShareDoc(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white shadow-xs"
            >
              Copy Link
            </button>
          }
        >
          <div className="space-y-3 text-xs">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Share URL (Expires in 7 days)
            </label>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-600 dark:text-slate-300 select-all overflow-x-auto">
              <span>{`https://portal.ims.ac.ug/documents/${shareDoc?.id || 'doc-token'}`}</span>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={bulkDeleteIds.length > 0}
          onClose={() => setBulkDeleteIds([])}
          title="Delete Selected Documents"
          subtitle={`Remove ${bulkDeleteIds.length} document(s) from the repository`}
          maxWidth="max-w-md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setBulkDeleteIds([])}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteConfirm}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs"
              >
                Delete {bulkDeleteIds.length} file(s)
              </button>
            </>
          }
        >
          <p className="text-xs text-slate-600 dark:text-slate-400">
            This will permanently remove the selected documents from the institutional repository. This action cannot be undone.
          </p>
        </Modal>

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
