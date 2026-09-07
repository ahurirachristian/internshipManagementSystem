import { useMemo, useState } from 'react';
import DashboardLayout from './DashboardLayout';

const STORAGE = { used: 25, total: 100 };
const PLAN = { name: 'Trial Version', tier: 'FREE', capacity: '100 GB Space' };

const QUICK_ACCESS = [
  { key: 'videos', label: 'Videos', icon: 'fa-video' },
  { key: 'apps', label: 'Apps', icon: 'fa-th-large' },
  { key: 'document', label: 'Document', icon: 'fa-file-lines' },
  { key: 'music', label: 'Music', icon: 'fa-music' },
  { key: 'download', label: 'Download', icon: 'fa-download' },
  { key: 'folder', label: 'Folder', icon: 'fa-folder' },
  { key: 'zip', label: 'Zip File', icon: 'fa-file-zipper' },
  { key: 'trash', label: 'Trash', icon: 'fa-trash' },
];

const FOLDERS = [
  { name: 'Tivo admin', files: 20, when: '2 Hour ago', icon: 'fa-folder', color: '#fbbf24' },
  { name: 'Viho admin', files: 14, when: '3 Hour ago', icon: 'fa-folder', color: '#6366f1' },
  { name: 'Unice admin', files: 15, when: '3 Day ago', icon: 'fa-folder', color: '#22c55e' },
  { name: 'Koho admin', files: 10, when: '1 Day ago', icon: 'fa-folder', color: '#ef4444' },
];

const FILES = [
  { name: 'Logo.psd', when: '7 Hour ago', size: '2.0 MB', icon: 'fa-file-image', color: '#a855f7' },
  { name: 'Backend.xls', when: '2 Day ago', size: '3.0 GB', icon: 'fa-file-excel', color: '#16a34a' },
  { name: 'Project.zip', when: '1 Day ago', size: '1.9 GB', icon: 'fa-file-zipper', color: '#f59e0b' },
  { name: 'Report.txt', when: '1 Day ago', size: '0.9 KB', icon: 'fa-file-lines', color: '#64748b' },
];

function formatRelative(when) {
  return when;
}

export default function FileManagement() {
  const [activeKey, setActiveKey] = useState('folder');
  const [query, setQuery] = useState('');

  const visibleFolders = useMemo(() => {
    if (!query) return FOLDERS;
    return FOLDERS.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));
  }, [query]);

  const visibleFiles = useMemo(() => {
    if (!query) return FILES;
    return FILES.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));
  }, [query]);

  const usedPct = Math.min((STORAGE.used / STORAGE.total) * 100, 100);

  return (
    <DashboardLayout title="File Management" subtitle="Organize and access your internship files">
      <div className="file-management">
        <aside className="file-management-sidebar card-panel">
          <div className="file-management-plan">
            <h3>{PLAN.name}</h3>
            <span className="plan-badge">{PLAN.tier}</span>
            <p>{PLAN.capacity}</p>
            <div className="storage-bar" aria-hidden="true">
              <div className="storage-bar-fill" style={{ width: `${usedPct}%` }}></div>
            </div>
            <small>
              {STORAGE.used} GB of {STORAGE.total} GB used
            </small>
          </div>

          <div className="file-management-search">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search files"
            />
          </div>

          <div className="file-management-section">
            <h4>Quick Access</h4>
            <ul className="file-management-quickaccess">
              {QUICK_ACCESS.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    className={`quickaccess-link${activeKey === item.key ? ' active' : ''}`}
                    onClick={() => setActiveKey(item.key)}
                  >
                    <i className={`fa-solid ${item.icon}`}></i>
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="file-management-section">
            <h4>Folders</h4>
            <ul className="file-management-folders">
              {visibleFolders.map((folder) => (
                <li key={folder.name} className="folder-row">
                  <span className="folder-icon" style={{ background: folder.color }}>
                    <i className={`fa-solid ${folder.icon}`}></i>
                  </span>
                  <div className="folder-info">
                    <p className="folder-name">{folder.name}</p>
                    <small>{folder.files} files • {formatRelative(folder.when)}</small>
                  </div>
                </li>
              ))}
              {visibleFolders.length === 0 && (
                <li className="folder-empty">No folders match "{query}".</li>
              )}
            </ul>
          </div>
        </aside>

        <section className="file-management-main card-panel">
          <div className="file-management-header">
            <div>
              <h2>Files</h2>
              <p>Recently updated files in your internship workspace.</p>
            </div>
            <span className="files-count">{visibleFiles.length} items</span>
          </div>

          <ul className="file-management-files">
            {visibleFiles.map((file) => (
              <li key={file.name} className="file-row">
                <span className="file-icon" style={{ background: file.color }}>
                  <i className={`fa-solid ${file.icon}`}></i>
                </span>
                <div className="file-info">
                  <p className="file-name">{file.name}</p>
                  <small>{formatRelative(file.when)} • {file.size}</small>
                </div>
                <div className="file-actions">
                  <button type="button" className="icon-button" title="Preview">
                    <i className="fa-regular fa-eye"></i>
                  </button>
                  <button type="button" className="icon-button" title="Download">
                    <i className="fa-solid fa-download"></i>
                  </button>
                  <button type="button" className="icon-button" title="More">
                    <i className="fa-solid fa-ellipsis-vertical"></i>
                  </button>
                </div>
              </li>
            ))}
            {visibleFiles.length === 0 && (
              <li className="folder-empty">No files match "{query}".</li>
            )}
          </ul>
        </section>
      </div>
    </DashboardLayout>
  );
}