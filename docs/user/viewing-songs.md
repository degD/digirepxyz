# Viewing Songs

Back to [Documentation](../README.md).

## Viewer Layout

The viewer displays:

- Song title
- Artist
- Tags
- Inline chords above their lyrics
- Key and other supported displayed directives

Tap Back to return to the previous screen. Tap Edit to open the same song in the editor.

<!-- IMAGE PLACEHOLDER START -->
<div align="center">
  <br><br>
  <strong>Screenshot: Standard viewer</strong><br>
  <code>docs/images/user/song-viewer.png</code><br>
  Capture a song with title, metadata, rendered chords, and lyrics visible.
  <br><br>
</div>
<!-- IMAGE PLACEHOLDER END -->

## Transpose

Use:

- `-T` to transpose down one semitone
- `+T` to transpose up one semitone

Transposition changes bracketed chords while the song is displayed. Slash chords transpose both the main chord and the bass note. The original spelling generally determines whether the result uses sharps or flats.

Transposition does not change the stored song. It also does not change the original-key metadata or the text of a `{key: ...}` directive. There is no displayed transpose amount or reset button; leave and reopen the song to return to its stored state.

## Viewer Font Size

Use `-A` and `+A` to change the viewer font scale. The minimum is 50 percent.

Viewer font changes are temporary screen state. To save a per-song font scale, change it in the editor and save the song.

## Split View

Tap the split-view control to divide the song into two independently scrollable panes. The split point is the midpoint of the song's line count:

- The first half appears on the left.
- The remaining lines appear on the right.

The split point cannot be adjusted and does not follow musical sections. Split mode is temporary.

<!-- IMAGE PLACEHOLDER START -->
<div align="center">
  <br><br>
  <strong>Screenshot: Split view</strong><br>
  <code>docs/images/user/song-viewer-split.png</code><br>
  Capture both independently scrollable panes with chords and lyrics visible.
  <br><br>
</div>
<!-- IMAGE PLACEHOLDER END -->

## Guitar Chord Diagrams

Enable Chord Diagrams under Settings. The viewer then shows recognized unique chords in a horizontal diagram row.

- Unsupported chords are omitted.
- Tapping a diagram cycles through available voicings.
- A voicing counter indicates the selected shape when multiple shapes exist.
- Diagrams follow the currently displayed transposition.

<!-- IMAGE PLACEHOLDER START -->
<div align="center">
  <br><br>
  <strong>Screenshot: Chord diagrams</strong><br>
  <code>docs/images/user/chord-diagrams.png</code><br>
  Capture the diagram row and a chord with its voicing counter visible.
  <br><br>
</div>
<!-- IMAGE PLACEHOLDER END -->

## Missing Songs

If a viewer route refers to a missing or deleted song, it displays a Song not found message and provides navigation back to the library.
