# Troubleshooting

Back to [Documentation](../README.md).

| Symptom | What to check |
| --- | --- |
| A new song does not appear | The song needs non-empty ChordPro content. A title alone is not enough. |
| Search cannot find a lyric or tag | Search currently checks title, artist, and original key only. |
| An edit disappeared after going back | If Auto Save was disabled, tap Save before leaving the editor. |
| The original-key badge is missing | The editor has no separate original-key metadata field. A `{key: ...}` line affects displayed content but does not set the badge. |
| Viewer font size reverted | Viewer font changes are temporary. Save the desired scale from the editor. |
| Transpose did not change the key label | Transposition changes bracketed chords, not original-key metadata or `{key: ...}` text. |
| No chord diagram appears | Enable Chord Diagrams and confirm the chord is recognized by the offline diagram database. |
| A song disappeared immediately | Delete has no confirmation or undo. Restore it by importing a backup or recreating it. |
| AI import stopped | Keep the app in the foreground and check the API key, network, file type, timeout, and 50 MB limit. |
| AI import rejects a file | Confirm that the file is PDF, DOCX, PNG, JPG, JPEG, WebP, HEIC, or HEIF. |
| Open With rejects a file | PDF and DOCX are imported from Settings. ChordPro files need a `.cho` or `.chordpro` extension, or valid ChordPro content when the extension is hidden. |
| The same song appears twice | Imports create new song IDs and do not merge by title. |
| A song has `(Conflict)` in its title | WebDAV preserved concurrent versions of the song. Review both copies. |
| WebDAV authentication fails | Check the HTTPS folder URL, username, and app password. |
| Sharing is unavailable | The operating system or browser may not provide a compatible share service. Use Save or the browser download fallback. |

## Import and Sync Safety

Keep a ChordPro export before destructive changes or large imports. Review AI-generated content and resolve WebDAV conflict copies manually.

For data-handling details, see [Privacy and data handling](privacy.md).
