# Import and Export Internals

Back to [Documentation](../README.md).

## ChordPro Parsing

`src/utils/chordProParser.ts` parses source content into lines and chord/lyric segments. `ChordSheet` uses those segments for viewer rendering.

The import parser in `src/utils/dataUtils.ts` extracts title, artist, key, and tags metadata. It splits combined files on a line containing `---` and gives imported songs new sync IDs.

## Native and Web File Input

The file-import boundary is platform-specific:

- Web creates a browser file input and reads the selected file as text.
- Native uses Expo Document Picker and Expo File System.
- Native Open With receives `file://` or `content://` URLs through Expo Linking.

Open With validates explicit file extensions. `.cho` and `.chordpro` are accepted. When a provider hides the extension, the content must contain recognized ChordPro directives or bracketed chords.

## ChordPro Export

Export serialization writes metadata directives followed by the song body. Library export joins songs with `---`.

Native ChordPro save writes a cache file and passes it to the document destination picker. Native sharing uses Expo Sharing. Web save creates a Blob download and web sharing uses `navigator.share` when available.

## PDF and Word Export

PDF export converts parsed ChordPro into HTML and uses `expo-print`. Word export builds a `docx` document with headings, metadata, chord lines, lyrics, and page breaks between songs.

The export functions start asynchronous work and return a status object immediately. Status callbacks are used where a screen needs progress or error feedback.

## Gemini Document Import

`src/utils/documentImport.ts` supports PDF, DOCX, and image documents. DOCX text is extracted locally with `fflate`; PDF and image bytes are sent inline to Gemini.

The request asks Gemini to return one structured song with title, artist, key, tags, ChordPro content, and warnings. The result is normalized through the same imported-song path used by ChordPro files.

The conversion constants are centralized in `documentImport.ts`:

- Model: `gemini-3.5-flash-lite`
- Maximum document size: 50 MB
- Request timeout: 60 seconds
- Default bulk concurrency: 3
- Maximum bulk concurrency: 10
- Maximum retries: 3

Bulk import applies bounded concurrency and a memory budget. It stages results and commits them as a batch. Foreground interruption aborts the operation.

## Adding a New Import or Export Format

Keep format-specific work at the utility boundary:

1. Add detection and validation in the relevant utility.
2. Return the existing `Song` shape or `ExportMethod` contract.
3. Keep storage changes in `SongsContext` and sync utilities.
4. Add platform-specific code only behind an explicit platform branch.
5. Add unit tests for valid, invalid, cancelled, and failure paths.
6. Add a system flow only when the operating-system boundary can be provisioned reliably.
