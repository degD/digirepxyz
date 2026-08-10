# DIGIREPXYZ

A digital repertoire and chord management app for musicians. Manage songs with tags and favorites, edit and view ChordPro, transpose chords, use offline guitar chord diagrams, and import or export songs. Built with [Expo SDK 57](https://expo.dev) and managed with [Bun](https://bun.sh).

The project is a rewrite and continuation of [digirepx2](https://github.com/degD/digirepx2). Android is the primary supported target; other platform code paths may have different behavior.

## Documentation

- [Documentation index](docs/README.md)
- [User documentation](docs/user/getting-started.md)
- [Development documentation](docs/development/getting-started.md)

## Features

- Local song library with search, tag filters, and favorites
- Raw ChordPro editor with undo/redo, Auto Save, and chord picker
- Viewer with transposition, font scaling, and split-pane mode
- Offline guitar chord diagrams with multiple voicings
- ChordPro import/export and sharing, plus PDF and Word export
- Android Open With support for ChordPro files and supported images
- Gemini-assisted PDF, DOCX, and image conversion
- Optional WebDAV synchronization
- Dark mode, accent color, and multilingual interface

<!-- IMAGE PLACEHOLDER START -->
<div align="center">
  <br><br>
  <strong>Screenshot: Digirepxyz overview</strong><br>
  <code>docs/images/user/app-overview.png</code><br>
  Add a representative Android screenshot showing the library and primary navigation.
  <br><br>
</div>
<!-- IMAGE PLACEHOLDER END -->

## Development

Install dependencies and run the Android development build:

```bash
bun install
bun run android
```

Run the standard checks:

```bash
bun run lint
npx tsc --noEmit
bun run test
```

Run all Android Maestro system tests, or one flow:

```bash
bun run test:system
bun run test:system:one .maestro/search-songs.yml
```

See the [development getting-started guide](docs/development/getting-started.md) for prerequisites and the [testing guide](docs/development/testing.md) for report details.

## Disclaimer

One purpose of this project was to gain experience in quick app development using LLMs. I tried to make sure that the suggested code was appropriate and not *sloppy*. However, there could be hidden bugs or unnecessary code bloat. Use at your own risk. But I appreciate any help, let it be bug reports, fixes, features, or refactors. 

## License

The project does not currently declare a license.
