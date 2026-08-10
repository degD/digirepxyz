# Privacy and Data Handling

Back to [Documentation](../README.md).

## Local-First Storage

Songs and ordinary settings are stored locally by default. The app does not require a cloud account for library editing, viewing, search, favorites, transposition, or chord diagrams.

Native builds use local application storage for the library and settings. Web builds use browser storage with different lifetime and permission behavior.

## Gemini AI Import

When AI import is used:

- PDF and image data is sent to Google Gemini.
- DOCX text is extracted locally and the extracted text is sent to Gemini.
- The Gemini API key is included in the request.
- The returned metadata and ChordPro content are saved into the local library.

Do not send confidential material unless the service, account, and applicable policies permit it. API usage may incur costs or quota limits according to Google's terms.

## WebDAV Sync

When WebDAV is configured:

- Song records and synchronization metadata are uploaded to `digirep-sync-v1.json`.
- The configured WebDAV server can read the JSON contents.
- HTTPS protects the connection in transit.
- The app does not encrypt the library at the application level.

Native WebDAV passwords use secure storage. Web passwords use session storage.

## API-Key and Password Storage

Native Gemini keys and WebDAV passwords use Expo SecureStore. On web, these secrets use session storage and may not survive a browser session ending.

## Exports and Sharing

Exported files are handed to the operating system or browser. Sharing sends the selected file or content to the target application chosen by the user. Treat exported and shared files according to the destination application's privacy policy.

## User Responsibility

Keep API keys and WebDAV passwords private. Use app passwords where a provider supports them, use HTTPS for WebDAV, and review imported content before relying on it.
