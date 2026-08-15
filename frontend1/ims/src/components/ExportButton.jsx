import { useState } from 'react';
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
      className="secondary-button"
      onClick={handleClick}
      disabled={disabled || loading || !data || data.length === 0}
    >
      {loading ? (
        <>
          <i className="fa-solid fa-spinner fa-spin"></i> Exporting...
        </>
      ) : (
        <>
          <i className="fa-solid fa-download"></i> {label}
        </>
      )}
    </button>
  );
}
