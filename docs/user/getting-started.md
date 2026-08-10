# Getting Started

Back to [Documentation](../README.md).

## What the App Does

Digirepxyz is a song library for musicians. A song can contain:

- Title and artist metadata
- Lowercase tags
- An original key
- Raw ChordPro content
- Favorite state
- A saved editor font scale

The viewer turns ChordPro into a readable chord sheet. The editor keeps the source text available for precise changes.

## First Launch

On a new installation, the library starts with eight sample songs. These songs demonstrate search, favorites, tags, keys, ChordPro directives, and inline chords.

Songs and ordinary settings are stored locally by default. Optional WebDAV synchronization and AI imports send data to external services only when those features are configured and used.

<!-- IMAGE PLACEHOLDER START -->
<div align="center">
  <br><br>
  <strong>Screenshot: Main library</strong><br>
  <code>docs/images/user/library-overview.png</code><br>
  Capture the initial library with the search field, filter tabs, song rows, and bottom navigation visible.
  <br><br>
</div>
<!-- IMAGE PLACEHOLDER END -->

## Main Navigation

The bottom navigation contains:

- Library: search, filter, open, favorite, delete, export, or create songs.
- Settings: customize the app and use import, export, AI import, and WebDAV sync.

The editor and viewer open from the Library and do not have separate bottom-navigation tabs.

## Common Tasks

- Find a song: use [search and filters](library.md).
- Create or change a song: see [editing songs](editing-songs.md).
- Perform a song: see [viewing songs](viewing-songs.md).
- Move songs between apps: see [importing, exporting, and sharing](import-export.md).
- Convert a document or image: see [AI import](ai-import.md).
- Synchronize a library: see [WebDAV sync](cloud-sync.md).

## Important Behaviors

- Search checks title, artist, and original-key metadata. It does not search lyrics or tags.
- A new song needs non-empty content before it can be added to the library.
- Delete is immediate and has no confirmation or undo.
- Viewer transposition and viewer font changes are temporary.
- Editor font scale is saved with the song.
- AI import requires a Gemini API key and an internet connection.

For symptoms and fixes, see [Troubleshooting](troubleshooting.md).
