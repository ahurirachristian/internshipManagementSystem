/**
 * PC3b: the localStorage repository is gone, so the mapping between API rows and
 * what the UI renders is worth pinning. These tests guard the field renames that
 * silently blanked a column the last time the data source changed.
 */
import { API_ROOT } from '../services/api';

describe('document API helpers', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockFetch(payload, ok = true, status = 200) {
    const fetchMock = jest.fn().mockResolvedValue({
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      headers: { get: () => 'application/json' },
      json: async () => payload,
      text: async () => JSON.stringify(payload),
    });
    global.fetch = fetchMock;
    return fetchMock;
  }

  it('lists documents with credentials', async () => {
    const fetchMock = mockFetch([]);
    const { fetchDocuments } = require('../services/api');
    await fetchDocuments();
    expect(fetchMock).toHaveBeenCalledWith(`${API_ROOT}/api/files`, { credentials: 'include' });
  });

  it('requests real usage rather than a quota', async () => {
    const fetchMock = mockFetch({ documentCount: 2, totalBytes: 10, totalDownloads: 3 });
    const { fetchDocumentUsage } = require('../services/api');
    const usage = await fetchDocumentUsage();
    expect(fetchMock).toHaveBeenCalledWith(`${API_ROOT}/api/files/usage`, { credentials: 'include' });
    expect(usage.totalBytes).toBe(10);
  });

  it('deletes by id', async () => {
    const fetchMock = mockFetch(null);
    const { deleteDocument } = require('../services/api');
    await deleteDocument(7);
    expect(fetchMock).toHaveBeenCalledWith(`${API_ROOT}/api/files/7`, {
      method: 'DELETE',
      credentials: 'include',
    });
  });

  it('passes the share toggle as a query param', async () => {
    const fetchMock = mockFetch({ shared: false, shareToken: '' });
    const { updateDocumentShare } = require('../services/api');
    await updateDocumentShare(3, false);
    expect(fetchMock).toHaveBeenCalledWith(`${API_ROOT}/api/files/3/share?enabled=false`, {
      method: 'PATCH',
      credentials: 'include',
    });
  });

  it('surfaces the server error message on failure', async () => {
    mockFetch({ error: 'Not found' }, false, 404);
    const { deleteDocument } = require('../services/api');
    await expect(deleteDocument(99)).rejects.toThrow('Not found');
  });
});

describe('uploadDocument', () => {
  const originalXhr = global.XMLHttpRequest;

  afterEach(() => {
    global.XMLHttpRequest = originalXhr;
  });

  /** Minimal XHR double: records the request and lets the test drive the callbacks. */
  function stubXhr() {
    const instance = {
      upload: {},
      status: 201,
      responseText: JSON.stringify({ id: 11 }),
      withCredentials: false,
      open: jest.fn(),
      send: jest.fn(),
    };
    global.XMLHttpRequest = jest.fn(() => instance);
    return instance;
  }

  it('sends the file and metadata as multipart and resolves with the document', async () => {
    const xhr = stubXhr();
    const { uploadDocument } = require('../services/api');
    const file = new File(['hello'], 'report.txt', { type: 'text/plain' });

    const promise = uploadDocument(
      file,
      { category: 'Weekly Reports', audience: 'Students', version: '1.0', description: 'desc' },
      () => {}
    );
    xhr.send.mock.calls[0][0].forEach(() => {});
    xhr.onload();

    await expect(promise).resolves.toMatchObject({ id: 11 });
    expect(xhr.open).toHaveBeenCalledWith('POST', `${API_ROOT}/api/files`);

    const sent = xhr.send.mock.calls[0][0];
    expect(sent.get('category')).toBe('Weekly Reports');
    expect(sent.get('audience')).toBe('Students');
    expect(sent.get('version')).toBe('1.0');
    expect(sent.get('description')).toBe('desc');
    expect(sent.get('file')).toBe(file);
  });

  it('reports upload progress so the progress bar stays real', async () => {
    const xhr = stubXhr();
    const { uploadDocument } = require('../services/api');
    const seen = [];

    const promise = uploadDocument(new File(['x'], 'a.txt'), { category: 'Weekly Reports' }, (p) => seen.push(p));
    xhr.upload.onprogress({ lengthComputable: true, loaded: 50, total: 100 });
    xhr.onload();

    await promise;
    expect(seen).toEqual([50]);
  });

  it('rejects with the server message on a failed upload', async () => {
    const xhr = stubXhr();
    xhr.status = 413;
    xhr.responseText = JSON.stringify({ error: 'File too large' });
    const { uploadDocument } = require('../services/api');

    const promise = uploadDocument(new File(['x'], 'a.txt'), { category: 'Weekly Reports' });
    xhr.send.mock.calls[0][0].forEach(() => {});
    xhr.onload();

    await expect(promise).rejects.toThrow('File too large');
  });
});
