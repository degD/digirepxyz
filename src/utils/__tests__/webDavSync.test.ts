import { getWebDavSyncUrl, uploadSnapshot } from '@/utils/webDavSync';

describe('webDavSync', () => {
  const config = { url: 'https://cloud.example.com/dav/digirep', username: 'person' };
  const secrets = { password: 'app-password' };

  beforeEach(() => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      value: jest.fn(),
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uses a fixed sync file inside the configured WebDAV folder', () => {
    expect(getWebDavSyncUrl(config.url)).toBe('https://cloud.example.com/dav/digirep/digirep-sync-v1.json');
    expect(() => getWebDavSyncUrl('http://cloud.example.com/dav/')).toThrow('HTTPS');
  });

  it('reports an ETag precondition failure as a retryable conflict', async () => {
    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValue({ status: 412, ok: false } as Response);
    const result = await uploadSnapshot(config, secrets, { version: 1, records: {} }, '"etag"');

    expect(result).toBe('conflict');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://cloud.example.com/dav/digirep/digirep-sync-v1.json',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({ 'If-Match': '"etag"' }),
      })
    );
  });

  it('uploads without a precondition for a confirmed incompatible server', async () => {
    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValue({ status: 201, ok: true } as Response);

    await uploadSnapshot(config, secrets, { version: 1, records: {} }, '"etag"', true);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://cloud.example.com/dav/digirep/digirep-sync-v1.json',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.not.objectContaining({ 'If-Match': expect.anything() }),
      })
    );
  });
});
