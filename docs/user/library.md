# Song Library

Back to [Documentation](../README.md).

## Song Rows

Each row can show:

- Song title
- Artist, or `Unknown Artist` when the artist is empty
- Tags
- Favorite heart
- Original-key badge when a key is available

Tap a row to open the viewer. Tap the heart to change favorite state without opening the song.

## Search

Search is case-insensitive and updates while typing. It matches:

- Song title
- Artist
- Original key

Search does not currently match lyrics, ChordPro content, or tags. Search and the selected filter work together.

<!-- IMAGE PLACEHOLDER START -->
<div align="center">
  <br><br>
  <strong>Screenshot: Search and filters</strong><br>
  <code>docs/images/user/library-search-filters.png</code><br>
  Capture a search result with the filter bar and matching song rows visible.
  <br><br>
</div>
<!-- IMAGE PLACEHOLDER END -->

## Filters

The horizontal filter bar contains:

- All Songs
- Favorites
- One tab for each tag currently used in the library

Tag tabs are generated from the stored songs. Tags are normalized to lowercase, although their tab labels are displayed with an initial capital letter.

The song-count badge shows the number of songs currently displayed after search and filtering, not always the total library size.

## Favorites

Favorite state can be changed from:

- The heart on a library row
- The heart in the viewer header

Open the Favorites filter to see only favorite songs. Favorite state is saved locally and included in WebDAV library synchronization.

## Long-Press Actions

Long-press a song row to reveal its actions:

- Delete
- Export

Delete happens immediately. There is no confirmation dialog or undo action, so export a song first if a backup is needed.

<!-- IMAGE PLACEHOLDER START -->
<div align="center">
  <br><br>
  <strong>Screenshot: Long-press actions</strong><br>
  <code>docs/images/user/library-long-press.png</code><br>
  Capture a song row after long-pressing it so Delete and Export are visible.
  <br><br>
</div>
<!-- IMAGE PLACEHOLDER END -->

## Empty Results

When a search or tag filter has no matches, the library displays an empty state. The Favorites filter has a separate message explaining that no favorites have been selected.

## Create a Song

Tap the floating `+` button to open a blank editor. Continue with [Editing songs](editing-songs.md).
