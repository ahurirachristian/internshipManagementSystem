import React, { useState } from 'react';

export function Avatar({
  src = null,
  name = 'User',
  size = 'md',
  showStatus = false,
  status = 'online',
  className = '',
}) {
  const [hasError, setHasError] = useState(false);

  const getInitials = (str) => {
    if (!str) return 'U';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return str.substring(0, 2).toUpperCase();
  };

  const sizeMap = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
    xl: 'w-14 h-14 text-base',
  };

  const statusSizeMap = {
    xs: 'w-1.5 h-1.5 bottom-0 right-0 border',
    sm: 'w-2 h-2 bottom-0 right-0 border',
    md: 'w-2.5 h-2.5 bottom-0 right-0 border-2',
    lg: 'w-3 h-3 bottom-0.5 right-0.5 border-2',
    xl: 'w-3.5 h-3.5 bottom-0.5 right-0.5 border-2',
  };

  const statusColor = status === 'online' ? 'bg-emerald-500' : 'bg-slate-400';

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src && !hasError ? (
        <img
          src={src}
          alt={name}
          onError={() => setHasError(true)}
          className={`${sizeMap[size] || sizeMap.md} rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10`}
          loading="lazy"
        />
      ) : (
        <div
          className={`${sizeMap[size] || sizeMap.md} rounded-full bg-primary/15 text-teal-800 dark:text-teal-300 font-semibold flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10`}
        >
          {getInitials(name)}
        </div>
      )}

      {showStatus && (
        <span
          className={`absolute rounded-full ${statusColor} border-white dark:border-slate-900 ${
            statusSizeMap[size] || statusSizeMap.md
          }`}
        />
      )}
    </div>
  );
}
