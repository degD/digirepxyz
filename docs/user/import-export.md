# Importing, Exporting, and Sharing

Back to [Documentation](../README.md).

## ChordPro Import

Open Settings and choose Import Song(s) under Data. Select a text or ChordPro file.

The importer recognizes:

- `{title: ...}` and `{t: ...}`
- `{artist: ...}` and `{a: ...}`
- `{key: ...}` and `{k: ...}`
- `{tags: tag-one, tag-two}`

Multiple songs can be stored in one file with a separator line containing exactly `---`:

```text
{title: First song}

[C]First song content
---
{title: Second song}

[G]Second song content
```

Imported metadata becomes song metadata and is removed from the editable content. Imports receive new internal IDs, so importing the same file again creates additional songs rather than updating existing titles.

The native picker accepts text-oriented files broadly. The web picker advertises `.cho`, `.chordpro`, and `.txt` files.

## Exporting One Song

Long-press a song in the Library and choose Export. The available options are:

- Save ChordPro
- Share ChordPro
- Save PDF
- Save Word

The filename is derived from the song title. Characters unsafe for filenames are replaced with underscores.

<!-- IMAGE PLACEHOLDER START -->
<div align="center">
  <br><br>
  <strong>Screenshot: Export options</strong><br>
  <code>docs/images/user/export-options.png</code><br>
  Capture the one-song export menu with ChordPro, PDF, Word, Share, and Cancel options.
  <br><br>
</div>
<!-- IMAGE PLACEHOLDER END -->

## Exporting the Library

Open Settings and choose Export Library under Data. The full library can be exported as:

- One combined ChordPro file
- One PDF document
- One Word document
- A shared ChordPro file

Combined ChordPro songs use the `---` separator. PDF and Word documents place songs on separate pages where supported by the generated document.

## Platform Behavior

On Android, Save actions use a native destination picker and Share actions use the Android share sheet.

On web, Save actions download files through the browser. ChordPro sharing uses the browser Share API when available and falls back to a download when it is unavailable.

## Open With

Native builds can receive ChordPro files from another app:

1. Choose a `.cho` or `.chordpro` file in the file manager or another app.
2. Choose Digirepxyz in the Open With list.
3. Wait for the import to finish.
4. Confirm the imported song in the Library.

Files with no visible extension can be accepted when their contents contain recognized ChordPro directives or bracketed chords. Explicit unsupported extensions and invalid text are rejected.

PDF and DOCX files are imported from Settings rather than Open With.

<!-- IMAGE PLACEHOLDER START -->
<div align="center">
  <br><br>
  <strong>Screenshot: Android Open With</strong><br>
  <code>docs/images/user/open-with.png</code><br>
  Capture the operating-system file action that offers Digirepxyz for a ChordPro file.
  <br><br>
</div>
<!-- IMAGE PLACEHOLDER END -->

## Limitations

- Native file pickers and share sheets are controlled by the operating system.
- PDF and Word output is not interactive and does not contain clickable chord diagrams.
- A failed one-song export may not show an in-app status message.
- Web downloads depend on browser permissions and behavior.
- Re-importing a song creates a new song instead of merging by title.
