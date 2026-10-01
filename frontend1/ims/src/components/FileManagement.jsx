import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
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
import { useTheme } from '../context/ThemeContext';
import CustomSelect from './CustomSelect';
import { KpiCard } from './ui/KpiCard';
import { TableCard } from './ui/TableCard';
import { FilterTabs } from './ui/FilterTabs';
import { Avatar } from './ui/Avatar';
import { EmptyState } from './ui/EmptyState';
import { Modal } from './ui/Modal';
import { chartColor } from '../charts/colors';
import {
  API_ROOT,
  fetchDocuments,
  fetchDocumentUsage,
  deleteDocument,
  updateDocumentShare,
  uploadDocument,
} from '../services/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * `tone` indexes the shared categorical palette so category hues stay in sync
 * with the charts and survive the dark-mode token swap. The hand-picked hexes
 * this replaced were fixed in light mode only.
 */
const CATEGORIES = [
  { name: 'Logbook Templates', tone: 0, desc: 'Weekly logbook formats for student daily activity records.' },
  { name: 'Evaluation Forms', tone: 4, desc: 'Assessment rubrics for supervisor and academic evaluation.' },
  { name: 'Internship Guidelines', tone: 2, desc: 'Official handbook and compliance rules for the programme.' },
  { name: 'MoU Agreements', tone: 5, desc: 'Memorandum of Understanding templates between institutions and hosts.' },
  { name: 'Weekly Reports', tone: 1, desc: 'Structured weekly progress report templates for students.' },
  { name: 'Appraisal Sheets', tone: 3, desc: 'End-of-internship performance appraisal and grading sheets.' }
];

const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.csv,.txt';
const MAX_SIZE_MB = 25;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function UploadDocumentCard({ onAddDocument }) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select or drop a valid document to upload.');
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      await uploadDocument(
        selectedFile,
        {
          category,
          audience,
          version,
          description: description.trim() || `Official ${category} uploaded for internship compliance.`,
        },
        setUploadProgress
      );
      setUploadProgress(100);
      await onAddDocument();
      setSelectedFile(null);
      setCustomTitle('');
      setDescription('');
      setVersion('1.0');
      setSuccessMessage(`"${selectedFile.name}" has been uploaded and published to ${audience} audience.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      setErrorMessage(error.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
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

function StorageAnalyticsCard({ documents, usage, isDark, onFilterByCategory }) {
  const totalUsedBytes = usage?.totalBytes ?? documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);
  const totalDownloads = usage?.totalDownloads ?? documents.reduce((sum, doc) => sum + (doc.downloadCount || 0), 0);
  const usedMB = (totalUsedBytes / (1024 * 1024)).toFixed(2);
  const sharedCount = documents.filter((doc) => doc.shared).length;

  // Proportional bar against the documents actually present. There is no server
  // storage quota, so the old hardcoded 500 MB "LocalStorage quota" and the
  // "Encrypted in browser (Base64)" claim were both fiction and are gone.
  const categoryStats = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const matching = documents.filter((d) => d.category === cat.name);
      const catBytes = matching.reduce((acc, d) => acc + (d.fileSize || 0), 0);
      const catDownloads = matching.reduce((acc, d) => acc + (d.downloadCount || 0), 0);
      return {
        category: cat.name,
        color: chartColor(cat.tone, isDark),
        count: matching.length,
        sizeBytes: catBytes,
        sizeMB: (catBytes / (1024 * 1024)).toFixed(2),
        downloads: catDownloads
      };
    }).filter((c) => c.count > 0);
  }, [documents, isDark]);

  return (
    <section id="storage-and-kpis-section" aria-label="Document Storage and Program Analytics" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard
          title="Active Documents"
          value={usage?.documentCount ?? documents.length}
          period="Visible to your institution"
          icon="FileText"
          badgeColor="teal"
          change="Live"
        />
        <KpiCard
          title="Total Downloads"
          value={Number(totalDownloads || 0).toLocaleString()}
          period="Recorded server-side"
          icon={Download}
          badgeColor="blue"
        />
        <KpiCard
          title="Storage Consumed"
          value={`${usedMB} MB`}
          period="Across all documents you can read"
          icon="HardDrive"
          badgeColor="emerald"
        />
        <KpiCard
          title="Share Links Active"
          value={sharedCount}
          period={sharedCount > 0 ? 'Publicly reachable by token' : 'None shared yet'}
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
              Click a segment to filter the repository by that category.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{usedMB} MB used</span>
            <span className="text-xs text-slate-500 dark:text-slate-400"> across {documents.length} documents</span>
          </div>
        </div>

        {totalUsedBytes > 0 && (
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner mb-3.5" role="progressbar" aria-label="Storage allocation by category" aria-valuenow={100} aria-valuemin={0} aria-valuemax={100}>
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

      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// RepositorySidebar
// ---------------------------------------------------------------------------

/**
 * Left rail: real usage, real category counts.
 *
 * Chris's reference layout hardcoded a "Trial Version / 100 GB Space" plan card,
 * eight fictional quick-access buckets (Videos, Music, Apps), and folders named
 * "Tivo admin" with invented file counts. None of that maps onto this data
 * model, so the structure is kept and the contents are driven by real rows.
 */
function RepositorySidebar({ documents, usage, isDark, activeCategory, onCategoryChange, searchQuery, onSearchChange }) {
  const categoryStats = useMemo(() => CATEGORIES.map((cat) => {
    const matching = documents.filter((d) => d.category === cat.name);
    return {
      name: cat.name,
      color: chartColor(cat.tone, isDark),
      count: matching.length,
      sizeBytes: matching.reduce((acc, d) => acc + (d.fileSize || 0), 0),
    };
  }), [documents, isDark]);

  const totalBytes = usage?.totalBytes ?? documents.reduce((acc, d) => acc + (d.fileSize || 0), 0);
  const sharedCount = documents.filter((d) => d.shared).length;

  return (
    <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-bold">Repository Storage</h3>
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
            {usage?.documentCount ?? documents.length} files
          </span>
        </div>
        <p className="text-[11px] text-white/85 mb-2">
          Real usage across every document you can read.
        </p>
        <div className="h-2 rounded-full bg-white/25 overflow-hidden" aria-hidden="true">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-orange-500"
            // No server quota exists, so the fill reflects category share of the
            // documents actually present rather than a fictional plan ceiling.
            style={{ width: `${totalBytes > 0 ? 100 : 0}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-white/85">
          {formatFileSize(totalBytes)} stored · {sharedCount} share link{sharedCount === 1 ? '' : 's'}
        </p>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 shadow-xs">
        <label htmlFor="document-search" className="sr-only">Search documents</label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus-within:border-teal-500">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            id="document-search"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search documents..."
            className="flex-1 bg-transparent border-0 outline-none text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
          />
        </div>
      </div>

      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 px-1">
          Quick Access
        </h4>
        <ul className="grid gap-1">
          <li>
            <button
              type="button"
              onClick={() => onCategoryChange('ALL')}
              aria-current={activeCategory === 'ALL' ? 'true' : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeCategory === 'ALL'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FolderClosed className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">All Documents</span>
              <span className="text-[10px] opacity-70">{documents.length}</span>
            </button>
          </li>
          {categoryStats.map((cat) => (
            <li key={cat.name}>
              <button
                type="button"
                onClick={() => onCategoryChange(cat.name)}
                aria-current={activeCategory === cat.name ? 'true' : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  activeCategory === cat.name
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="w-4 h-4 rounded shrink-0" style={{ backgroundColor: cat.color }} aria-hidden="true" />
                <span className="flex-1 text-left truncate">{cat.name}</span>
                <span className="text-[10px] opacity-70">{cat.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 px-1">
          Folder Sizes
        </h4>
        <ul className="grid gap-2">
          {categoryStats.filter((cat) => cat.count > 0).map((cat) => (
            <li key={cat.name} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: cat.color }} aria-hidden="true">
                <FolderClosed className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{cat.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {cat.count} file{cat.count === 1 ? '' : 's'} · {formatFileSize(cat.sizeBytes)}
                </p>
              </div>
            </li>
          ))}
          {categoryStats.every((cat) => cat.count === 0) && (
            <li className="text-center py-4 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
              No documents yet.
            </li>
          )}
        </ul>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// DocumentListTable
// ---------------------------------------------------------------------------

function DocumentListTable({ documents, activeCategory, onCategoryChange, onDownload, onPreview, onDelete, onShare, onRequestBulkDelete, onResetFilters, canUpload, onUploadClick }) {
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
    if (window.confirm(`Delete "${doc.originalFileName}" from repository?`)) {
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
                const ft = guessFileType(doc.originalFileName);
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
                              {doc.originalFileName}
                            </button>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 shrink-0">
                              v{doc.version || '1.0'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            .{guessFileType(doc.originalFileName).toUpperCase()} · {doc.downloadCount || 0} downloads
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
                      {formatFileSize(doc.fileSize)}
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
                      {formatDate(doc.uploadDate)}
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

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];
const TEXT_EXTENSIONS = ['txt', 'csv', 'md', 'json', 'xml', 'html', 'css', 'js', 'sql', 'log'];

/**
 * Renders the real stored file. The previous version drew a fixed mock page
 * ("Page 1 of 4", invented Section 1/2 boilerplate, "Integrity Verified") for
 * every document, so a CSV and a scanned MoU looked identical. Anything the
 * browser cannot render inline says so instead of faking it.
 */
function DocumentPreviewBody({ doc }) {
  const extension = (doc.originalFileName || '').split('.').pop()?.toLowerCase() || '';
  const viewUrl = `${API_ROOT}/api/files/view/${encodeURIComponent(doc.fileName)}`;
  const [textContent, setTextContent] = useState(null);
  const [textError, setTextError] = useState('');

  useEffect(() => {
    if (!TEXT_EXTENSIONS.includes(extension)) return undefined;
    let cancelled = false;
    setTextContent(null);
    setTextError('');

    // Fetched rather than linked so the session cookie is sent and so the text
    // can be length-capped instead of freezing the modal on a huge file.
    fetch(viewUrl, { credentials: 'include' })
      .then((response) => {
        if (!response.ok) throw new Error(`Preview unavailable (${response.status})`);
        return response.text();
      })
      .then((value) => {
        if (cancelled) return;
        setTextContent(value.length > 20000 ? `${value.slice(0, 20000)}\n\n... truncated for preview` : value);
      })
      .catch((error) => {
        if (!cancelled) setTextError(error.message || 'Could not load preview.');
      });

    return () => { cancelled = true; };
  }, [extension, viewUrl]);

  if (IMAGE_EXTENSIONS.includes(extension)) {
    return (
      <img
        src={viewUrl}
        alt={`Preview of ${doc.originalFileName}`}
        className="w-full max-h-[420px] object-contain rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
      />
    );
  }

  if (extension === 'pdf') {
    // The browser's own viewer needs the response inline, which /view provides.
    return (
      <object
        data={viewUrl}
        type="application/pdf"
        className="w-full h-[420px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
        aria-label={`PDF preview of ${doc.originalFileName}`}
      >
        <p className="p-4 text-xs text-slate-600 dark:text-slate-400">
          Your browser cannot display this PDF inline.{' '}
          <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            Open it in a new tab
          </a>
          .
        </p>
      </object>
    );
  }

  if (TEXT_EXTENSIONS.includes(extension)) {
    if (textError) {
      return <p className="p-4 text-xs text-rose-700 dark:text-rose-300">{textError}</p>;
    }
    if (textContent === null) {
      return (
        <div className="h-[220px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 animate-pulse" aria-hidden="true" />
      );
    }
    return (
      <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 text-[11px] font-mono text-slate-700 dark:text-slate-300">
        {textContent}
      </pre>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-4 py-10 text-center">
      <File className="w-8 h-8 text-slate-400" />
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        No inline preview for .{extension} files
      </p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Download the file to open it in the appropriate application.
      </p>
    </div>
  );
}

function DocumentPreviewModal({ document: doc, onClose, onDownload }) {
  const [copied, setCopied] = useState(false);

  if (!doc) return null;

  // Copies the real public share URL, and only when one exists.
  const handleCopyLink = () => {
    if (!doc?.shared || !doc?.shareToken) return;
    navigator.clipboard?.writeText(`${API_ROOT}/api/files/share/${doc.shareToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={!!doc}
      onClose={onClose}
      title={doc.originalFileName}
      subtitle={`${doc.category} — uploaded by ${doc.uploadedBy || 'Unknown'}`}
      maxWidth="max-w-3xl"
      footer={
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Published on {formatDate(doc.uploadDate)}</span>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {doc.shared ? (
              <button type="button" onClick={handleCopyLink} className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5 shadow-xs">
                {copied ? <><Check className="w-4 h-4 text-emerald-600" /><span>Link Copied!</span></> : <><Share2 className="w-4 h-4" /><span>Copy Share Link</span></>}
              </button>
            ) : null}
            <button type="button" onClick={() => onDownload(doc)} className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm">
              <Download className="w-4 h-4" /><span>Download ({formatFileSize(doc.fileSize)})</span>
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
            <span className="font-bold text-slate-900 dark:text-slate-100">{formatFileSize(doc.fileSize)}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 font-medium block">Audience</span>
            <span className="font-bold text-teal-800">{doc.audience || 'All'}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 font-medium block">Downloads</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{doc.downloadCount || 0} times</span>
          </div>
        </div>

        {doc.description && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Document Abstract &amp; Purpose</h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-teal-50/30 p-3.5 rounded-xl border border-teal-100 dark:border-teal-900/40">
              {doc.description}
            </p>
          </div>
        )}

        <DocumentPreviewBody doc={doc} />
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// FileManagement (default export)
// ---------------------------------------------------------------------------

export default function FileManagement() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const canUpload = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR' || user?.role === 'INDUSTRIAL_SUPERVISOR';

  const [documents, setDocuments] = useState([]);
  const [usage, setUsage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [shareDoc, setShareDoc] = useState(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  /**
   * Single reload path, mirroring UniversityStudents.jsx. The server is the only
   * source of truth now: every mutation calls this rather than patching local
   * state, so a rejected write can never leave the list showing a phantom row.
   */
  const loadData = useCallback(async () => {
    setError('');
    try {
      const [docs, usageStats] = await Promise.all([fetchDocuments(), fetchDocumentUsage()]);
      setDocuments(Array.isArray(docs) ? docs : []);
      setUsage(usageStats || null);
    } catch (loadError) {
      setError(loadError.message || 'Could not load documents.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg) => {
    setToastMessage(msg);
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchCat = selectedCategory === 'ALL' || doc.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = q === '' ||
        (doc.originalFileName || '').toLowerCase().includes(q) ||
        (doc.category || '').toLowerCase().includes(q) ||
        (doc.uploadedBy || '').toLowerCase().includes(q) ||
        (doc.description || '').toLowerCase().includes(q) ||
        (doc.audience || '').toLowerCase().includes(q) ||
        (doc.version || '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [documents, selectedCategory, searchQuery]);

  const handleDeleteDocument = async (id) => {
    try {
      await deleteDocument(id);
      await loadData();
      showToast('Document removed from repository.');
    } catch (deleteError) {
      showToast(deleteError.message || 'Could not delete that document.');
    }
  };

  /**
   * The server counts the download, so the count shown afterwards comes from a
   * reload rather than an optimistic local increment.
   */
  const handleDownloadDocument = async (doc) => {
    const url = `${API_ROOT}/api/files/${doc.id}/download`;
    const opened = window.open(url, '_blank', 'noopener');
    if (!opened) {
      // Popup blocked: fall back to a same-tab navigation so the click still works.
      window.location.href = url;
    }
    try {
      await loadData();
    } catch {
      // The file already downloaded; a refresh failure here is not worth a toast.
    }
  };

  const handleShareDocument = (doc) => {
    setShareDoc(doc);
  };

  const handleToggleShare = async (doc, enabled) => {
    try {
      const result = await updateDocumentShare(doc.id, enabled);
      await loadData();
      setShareDoc((prev) => (prev ? {
        ...prev,
        shared: result.shared,
        shareToken: result.shareToken || null,
      } : prev));
      showToast(result.shared ? 'Share link created.' : 'Share link revoked.');
    } catch (shareError) {
      showToast(shareError.message || 'Could not update the share link.');
    }
  };

  const handleBulkDeleteConfirm = async () => {
    const ids = [...bulkDeleteIds];
    setBulkDeleteIds([]);
    try {
      // Sequential rather than parallel: a bulk delete is destructive and each
      // row must surface its own failure instead of racing.
      for (const id of ids) {
        await deleteDocument(id);
      }
      await loadData();
      showToast(`${ids.length} document(s) removed from repository.`);
    } catch (bulkError) {
      await loadData();
      showToast(bulkError.message || 'Some documents could not be removed.');
    }
  };

  return (
    <DashboardLayout title="File Management" subtitle="Shared documents for the internship programme">
      <div className="space-y-6 max-w-7xl mx-auto">
        <Toast message={toastMessage} onDone={() => setToastMessage(null)} />

        <div aria-live="polite" className="sr-only">
          {error && `Error: ${error}`}
          {isLoading && 'Loading documents.'}
          {!isLoading && !error && `${documents.length} documents available.`}
        </div>

        {error && (
          <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-900 text-sm">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
            >
              <RefreshCw className="w-3.5 h-3.5" /><span>Retry</span>
            </button>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3" aria-hidden="true">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        )}

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

        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start">
          <RepositorySidebar
            documents={documents}
            usage={usage}
            isDark={isDark}
            activeCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          <div className="space-y-6 min-w-0">
        <StorageAnalyticsCard
          documents={documents}
          usage={usage}
          isDark={isDark}
          onFilterByCategory={setSelectedCategory}
        />

        <DocumentListTable
          documents={filteredDocuments}
          activeCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onDownload={handleDownloadDocument}
          onPreview={setPreviewDoc}
          onDelete={handleDeleteDocument}
          onShare={handleShareDocument}
          onRequestBulkDelete={(ids) => setBulkDeleteIds(ids)}
          onResetFilters={() => { setSelectedCategory('ALL'); setSearchQuery(''); }}
          canUpload={canUpload}
          onUploadClick={() => setIsUploadOpen(true)}
        />
          </div>
        </div>

        {canUpload && (
          <Modal
            isOpen={isUploadOpen}
            onClose={() => setIsUploadOpen(false)}
            title="Upload Document"
            subtitle="Publish logbook templates, evaluation forms, or internship guidelines"
            maxWidth="max-w-2xl"
          >
            <UploadDocumentCard onAddDocument={loadData} />
          </Modal>
        )}

        <Modal
          isOpen={!!shareDoc}
          onClose={() => setShareDoc(null)}
          title="Share Document Link"
          subtitle={shareDoc ? `Public link for ${shareDoc.originalFileName}` : ''}
          maxWidth="max-w-md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setShareDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
              {shareDoc?.shared ? (
                <button
                  type="button"
                  onClick={() => handleToggleShare(shareDoc, false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white shadow-xs hover:bg-rose-700"
                >
                  Revoke Link
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => handleToggleShare(shareDoc, true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white shadow-xs"
              >
                {shareDoc?.shared ? 'Regenerate Link' : 'Create Share Link'}
              </button>
            </>
          }
        >
          <div className="space-y-3 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Anyone with the link can download this file without an IMS account. Revoking
              disables the current link immediately.
            </p>
            {shareDoc?.shared && shareDoc?.shareToken ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-600 dark:text-slate-300 select-all overflow-x-auto">
                <span>{`${API_ROOT}/api/files/share/${shareDoc.shareToken}`}</span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 font-mono text-[11px] text-amber-900 dark:text-amber-200">
                No active share link. Create one to get a public URL.
              </div>
            )}
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
