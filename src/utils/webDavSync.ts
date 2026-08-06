import { SyncSnapshot, WebDavSyncConfig, WebDavSyncSecrets } from '@/types';
import { isSyncSnapshot } from '@/utils/syncLibrary';

const SYNC_FILE_NAME = 'digirep-sync-v1.json';

export class WebDavSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebDavSyncError';
  }
}

function basicAuthorization(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `Basic ${btoa(binary)}`;
}

export function getWebDavSyncUrl(url: string): string {
  const folder = new URL(url.trim());
  if (folder.protocol !== 'https:') throw new WebDavSyncError('WebDAV URL must use HTTPS.');
  if (!folder.pathname.endsWith('/')) folder.pathname += '/';
  return new URL(SYNC_FILE_NAME, folder).toString();
}

function requestHeaders(config: WebDavSyncConfig, secrets: WebDavSyncSecrets): HeadersInit {
  return { Authorization: basicAuthorization(config.username, secrets.password) };
}

export interface DownloadResult {
  snapshot: SyncSnapshot | null;
  etag: string | null;
}

export async function downloadSnapshot(
  config: WebDavSyncConfig,
  secrets: WebDavSyncSecrets
): Promise<DownloadResult> {
  const response = await fetch(getWebDavSyncUrl(config.url), { headers: requestHeaders(config, secrets) });
  if (response.status === 404) return { snapshot: null, etag: null };
  if (response.status === 401 || response.status === 403) throw new WebDavSyncError('WebDAV authentication failed.');
  if (!response.ok) throw new WebDavSyncError(`WebDAV download failed (${response.status}).`);
  const parsed: unknown = await response.json();
  if (!isSyncSnapshot(parsed)) throw new WebDavSyncError('WebDAV file is not a Digirep sync library.');
  return { snapshot: parsed, etag: response.headers.get('etag') || response.headers.get('oc-etag') };
}

export async function uploadSnapshot(
  config: WebDavSyncConfig,
  secrets: WebDavSyncSecrets,
  snapshot: SyncSnapshot,
  etag: string | null,
  force = false
): Promise<'saved' | 'conflict'> {
  const headers: HeadersInit = {
    ...requestHeaders(config, secrets),
    'Content-Type': 'application/json',
    ...(!force && etag ? { 'If-Match': etag } : {}),
  };
  const response = await fetch(getWebDavSyncUrl(config.url), {
    method: 'PUT',
    headers,
    body: JSON.stringify(snapshot),
  });
  if (response.status === 412) return 'conflict';
  if (response.status === 401 || response.status === 403) throw new WebDavSyncError('WebDAV authentication failed.');
  if (!response.ok) throw new WebDavSyncError(`WebDAV upload failed (${response.status}).`);
  return 'saved';
}
