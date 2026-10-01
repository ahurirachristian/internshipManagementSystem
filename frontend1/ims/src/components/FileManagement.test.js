/**
 * PC3c: the preview modal used to draw a fixed mock page for every document —
 * "Page 1 of 4", invented Section 1/2 boilerplate, "Integrity Verified" — so a
 * CSV and a scanned MoU rendered identically. These tests pin that preview now
 * reflects the actual file type and the actual stored bytes.
 */
import { render, screen } from '@testing-library/react';
import FileManagement from './FileManagement';
// The real layout pulls in the theme toolbar and sidebar, which need a router and
// a full theme context. Stub it: this suite is about FileManagement's own behavior.
jest.mock('./DashboardLayout', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { username: 'university', role: 'SUPERVISOR' } }),
}));

jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

const originalFetch = global.fetch;

function documentRow(overrides = {}) {
  return {
    id: 1,
    fileName: 'stored-uuid.txt',
    originalFileName: 'report.txt',
    contentType: 'text/plain',
    fileSize: 11,
    category: 'Weekly Reports',
    uploadedBy: 'university',
    uploadDate: '2026-01-15T10:00:00',
    description: 'Real description',
    audience: 'Students',
    version: '1.0',
    downloadCount: 0,
    shared: false,
    ...overrides,
  };
}

function mockApi({ documents = [documentRow()], body = 'hello world' } = {}) {
  global.fetch = jest.fn((url) => {
    const target = String(url);
    if (target.includes('/api/files/usage')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ documentCount: documents.length, totalBytes: 11, totalDownloads: 0 }),
      });
    }
    if (target.includes('/api/files/view/')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => 'text/plain' },
        text: async () => body,
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => documents,
    });
  });
}

async function openPreview(fileName = 'report.txt') {
  render(<FileManagement />);
  await screen.findByText(fileName);
  const previewButtons = await screen.findAllByTitle('Preview File');
  previewButtons[0].click();
}

describe('FileManagement preview', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('shows the fabricated mock page no more', async () => {
    mockApi();
    await openPreview();

    expect(screen.queryByText(/Page 1 of 4/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Section 1: General Requirements/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Integrity Verified/)).not.toBeInTheDocument();
  });

  it('renders the real bytes of a text document', async () => {
    mockApi({ body: 'line one\nline two' });
    await openPreview();

    await screen.findByText(/line one/);
    expect(screen.getByText(/line two/)).toBeInTheDocument();
  });

  it('says so plainly when a file type has no inline preview', async () => {
    mockApi({ documents: [documentRow({ originalFileName: 'archive.zip', fileName: 'u.zip' })] });
    await openPreview('archive.zip');

    await screen.findByText(/No inline preview for .zip files/);
  });

  it('does not invent a description when the uploader left one blank', async () => {
    mockApi({ documents: [documentRow({ description: null })] });
    await openPreview();

    expect(screen.queryByText(/Official institutional template provided by/)).not.toBeInTheDocument();
  });

  it('surfaces a preview load failure instead of rendering an empty page', async () => {
    mockApi();
    global.fetch = jest.fn((url) => {
      const target = String(url);
      if (target.includes('/api/files/usage')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => ({ documentCount: 1, totalBytes: 11, totalDownloads: 0 }),
        });
      }
      if (target.includes('/api/files/view/')) {
        return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found', headers: { get: () => 'text/plain' }, text: async () => '' });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => [documentRow()],
      });
    });
    await openPreview();

    await screen.findByText(/Preview unavailable \(404\)/);
  });
});

describe('FileManagement sidebar', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('reports real category counts, not invented ones', async () => {
    mockApi({
      documents: [
        documentRow({ id: 1, category: 'Weekly Reports' }),
        documentRow({ id: 2, category: 'Weekly Reports', originalFileName: 'b.txt' }),
      ],
    });
    render(<FileManagement />);

    // Two real rows in one category. Chris's placeholder folders and plan card
    // carried invented counts and a "100 GB" ceiling, so they must be absent.
    await screen.findByText('b.txt');
    expect(screen.getByText('Folder Sizes')).toBeInTheDocument();
    expect(screen.queryByText('Tivo admin')).not.toBeInTheDocument();
    expect(screen.queryByText('Trial Version')).not.toBeInTheDocument();
    expect(screen.queryByText('100 GB Space')).not.toBeInTheDocument();
  });

  it('shows a retry path when the list fails to load', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network down'));
    render(<FileManagement />);

    await screen.findByText('Network down');
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
