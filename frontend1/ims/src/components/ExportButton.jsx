import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { exportToCSVWithFallback } from '../utils/csvExport';

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
      await exportToCSVWithFallback(data, fileName, exportUrl);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="h-9 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
