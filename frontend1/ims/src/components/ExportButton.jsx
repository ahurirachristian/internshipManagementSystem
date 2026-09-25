import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { exportToCSVWithFallback } from '../utils/csvExport';
import { API_ROOT } from '../services/api';

export default function ExportButton({
  data,
  fileName,
  exportUrl,
  label = 'Export CSV',
  disabled = false,
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading || disabled || !data || data.length === 0) return;
    setLoading(true);
    try {
      // Relative URLs previously hit the CRA dev server (which answers with
      // index.html), so the backend CSV was never fetched. Address the API host.
      const url =
        exportUrl && !/^https?:\/\//i.test(exportUrl) ? `${API_ROOT}${exportUrl}` : exportUrl;
      await exportToCSVWithFallback(data, fileName, url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="h-9 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={handleClick}
      disabled={disabled || loading || !data || data.length === 0}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" /> Exporting...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" /> {label}
        </>
      )}
    </button>
  );
}
