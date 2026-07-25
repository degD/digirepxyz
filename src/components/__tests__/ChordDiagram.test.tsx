import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SettingsProvider } from '@/context/SettingsContext';
import ChordDiagram, { getChordVoicing } from '../ChordDiagram';

describe('ChordDiagram', () => {
  it('renders chord name for a known chord', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <SettingsProvider>
          <ChordDiagram chord="C" />
        </SettingsProvider>
      );
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain('C');
  });

  it('renders chord name for an unknown chord', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <SettingsProvider>
          <ChordDiagram chord="Xaug13" />
        </SettingsProvider>
      );
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain('Xaug13');
    expect(str).toContain('?');
  });

  const commonChords = ['C', 'D', 'E', 'F', 'G', 'A', 'Am', 'Em', 'Dm', 'Bm', 'Cmaj7', 'F#m7b5'];

  it('has voicing data for common chords', () => {
    commonChords.forEach((chord) => {
      const voicing = getChordVoicing(chord);
      expect(voicing).toBeDefined();
      expect(voicing).toHaveLength(6);
    });
  });

  it('renders without crashing for common known voicings', () => {
    commonChords.forEach((chord) => {
      let tree: any;
      act(() => {
        tree = renderer.create(
          <SettingsProvider>
            <ChordDiagram chord={chord} />
          </SettingsProvider>
        );
      });
      expect(JSON.stringify(tree.toJSON())).toContain(chord);
    });
  });
});
