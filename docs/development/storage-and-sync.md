# Storage and Synchronization

Back to [Documentation](../README.md).

## Active Library Model

The application uses `SyncLibrary` as the active library source of truth.

The main flow is:

1. `SongsProvider` calls `loadSyncLibrary` with the seed songs as a fallback.
2. `syncStorage` loads the current sync library or migrates legacy song data.
3. In-memory operations create a new immutable library value.
4. `SongsProvider` persists the updated library.
5. UI screens receive active records with tombstones filtered out.

The active storage key is `repertoire_sync_library`.

## Storage by Platform

| Data | Native | Web |
| --- | --- | --- |
| Song sync library | AsyncStorage | `localStorage` |
| Settings | AsyncStorage | `localStorage` |
| WebDAV URL and username | AsyncStorage | `localStorage` |
| Gemini API key | Expo SecureStore | `sessionStorage` |
| WebDAV password | Expo SecureStore | `sessionStorage` |

Storage adapters catch failures and provide fallback values so screens can still render. Callers should preserve this resilience when adding a new storage path.

## Records, Revisions, and Deletes

Library records contain synchronization metadata in addition to song data. Local changes advance the device revision. Deletes are retained as tombstones instead of removing all evidence of a record. This allows a delete to propagate to another device.

The UI uses active records only. Sync merge code works with both active records and tombstones.

## Legacy Database Abstraction

`src/db` contains schema conversion, validation, and a repository abstraction from the earlier storage design. It is covered by tests but is not the active persistence path used by the route and context layers.

When changing persistence behavior, update the sync-library path first. Touch the legacy database abstraction only when a migration or compatibility requirement calls for it.

## WebDAV Flow

The remote file name is fixed as `digirep-sync-v1.json`.

Synchronization performs these operations:

1. Validate the configured HTTPS URL.
2. Download the remote snapshot and its ETag when available.
3. Merge remote and local records using revision vectors.
4. Preserve concurrent edits as conflict copies.
5. Upload the merged snapshot with ETag protection.
6. Retry after a precondition conflict.
7. Persist the last successful sync time.

The context schedules sync after a local library change and when the app returns to the foreground. A sync guard prevents overlapping synchronization calls.

## Security Boundary

WebDAV uses authenticated HTTPS requests, but the remote JSON is not application-level encrypted. The configured WebDAV server can read song records and synchronization metadata.

Do not log passwords, API keys, or complete remote snapshots. Keep error messages useful without exposing secrets.
