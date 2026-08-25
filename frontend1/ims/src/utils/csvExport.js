const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export function exportToCSV(data, fileName) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(data) || data.length === 0) {
      return reject(new Error('No data to export'));
    }
    const headers = Object.keys(data[0]);
    const rows = data.map((item) => headers.map((header) => escapeCSV(item[header])).join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    resolve();
  });
}

export async function exportToCSVWithFallback(data, fileName, fallbackUrl) {
  if (fallbackUrl) {
    try {
      const response = await fetch(fallbackUrl, { method: 'GET', credentials: 'include' });
      if (!response.ok) throw new Error('Fallback export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    } catch (error) {
      console.warn('Fallback CSV export failed, falling back to client-side export:', error);
    }
  }
  return exportToCSV(data, fileName);
}
