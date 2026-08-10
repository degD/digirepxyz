# WebDAV Cloud Synchronization

Back to [Documentation](../README.md).

WebDAV synchronization is optional. Without configuration, the library remains local to the device.

## Requirements

Use a WebDAV service that supports authenticated HTTPS GET and PUT requests. You need:

- An HTTPS WebDAV folder URL
- A username
- An app password or other server password

The app stores the sync file as `digirep-sync-v1.json` in the configured folder.

## Configure Sync

Open Settings and find WebDAV Sync:

1. Enter the HTTPS folder URL.
2. Enter the username.
3. Enter the password.
4. Tap Save and sync.

The URL must use HTTPS, and all three fields are required. The first synchronization downloads an existing snapshot when one is present, merges it with the local library, and uploads the result.

<!-- IMAGE PLACEHOLDER START -->
<div align="center">
  <br><br>
  <strong>Screenshot: WebDAV configuration</strong><br>
  <code>docs/images/user/webdav-settings.png</code><br>
  Capture the WebDAV URL, username, password, Save and sync, Sync now, and Disconnect controls.
  <br><br>
</div>
<!-- IMAGE PLACEHOLDER END -->

## Automatic and Manual Sync

After configuration:

- Local library changes schedule synchronization after a short delay.
- Returning the app to the foreground triggers synchronization.
- Sync now starts synchronization immediately.
- The Settings page reports idle, synchronizing, success, or error state.

Only song library records are synchronized. Appearance settings, language, Gemini keys, and WebDAV credentials are not part of the remote library snapshot.

## Conflicts

The merge system preserves concurrent changes instead of silently choosing one version. A conflicting copy can appear with `(Conflict)` appended to its title.

Deletes are represented by tombstones so a deletion can propagate between devices. A concurrent edit and delete can therefore also produce a conflict copy.

If the remote file changes during upload, the app downloads it again and retries once. Repeated remote changes produce a synchronization error.

## Disconnect

Disconnecting removes the WebDAV configuration and password from this device. It does not delete local songs and does not delete the remote sync file.

## Security

Use HTTPS. The remote JSON contains readable song records and synchronization metadata; WebDAV does not add application-level encryption. Native passwords use secure storage. Web passwords use session storage.

See [Privacy and data handling](privacy.md) for broader privacy information.
