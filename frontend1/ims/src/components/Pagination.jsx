import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, setCurrentPage, totalPages }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter((page) => {
          if (totalPages <= 5) return true;
          if (page === 1 || page === totalPages) return true;
          if (Math.abs(page - currentPage) <= 1) return true;
          return false;
        })
        .reduce((acc, page, i, arr) => {
          if (i > 0 && page - arr[i - 1] > 1) acc.push('...');
          acc.push(page);
          return acc;
        }, [])
        .map((page, i) =>
          page === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400">...</span>
          ) : (
            <button
              type="button"
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`min-w-[28px] h-7 rounded-lg text-xs font-semibold transition-colors ${
                currentPage === page
                  ? 'bg-primary text-white'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              {page}
            </button>
          )
        )}
      <button
        type="button"
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
