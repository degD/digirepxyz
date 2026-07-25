import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import rawChordDb from '@/data/chords.json';

interface ChordDbEntry {
  positions?: string[];
}

const CHORD_DB = rawChordDb as Record<string, ChordDbEntry[]>;

/**
 * Helper to get all numeric finger positions for voicings of a chord.
 * Returns array of position arrays (6 numbers for 6 strings, -1 for x, 0 for open), or null if not found.
 */
export function getChordVoicings(chordName: string): number[][] | null {
  const dbEntry = CHORD_DB[chordName];
  if (dbEntry && dbEntry.length > 0) {
    return dbEntry
      .filter((e) => e.positions)
      .map((entry) => {
        return entry.positions!.map((p) => {
          if (p.toLowerCase() === 'x') return -1;
          return parseInt(p, 10) || 0;
        });
      });
  }
  return null;
}

/**
 * Helper to get first voicing of a chord for backward compatibility with tests.
 */
export function getChordVoicing(chordName: string): number[] | null {
  const voicings = getChordVoicings(chordName);
  return voicings ? voicings[0] : null;
}

const NUM_FRETS = 4;
const NUM_STRINGS = 6;

const BASE = {
  containerMinWidth: 60,
  unknownContainerWidth: 60,
  unknownContainerHeight: 80,
  chordNameFontSize: 13,
  unknownTextSize: 20,
  fretLabelFontSize: 9,
  stringIndicatorFontSize: 9,
  fretRowHeight: 16,
  cellWidth: 10,
  dotSize: 10,
  paginationFontSize: 10,
};

export interface ChordDiagramProps {
  chord: string;
  fontScale?: number;
}

export default function ChordDiagram({ chord, fontScale = 1 }: ChordDiagramProps) {
  const { theme } = useSettings();
  const voicings = getChordVoicings(chord);
  const [voicingIndex, setVoicingIndex] = useState(0);

  const scale = typeof fontScale === 'number' && Number.isFinite(fontScale) ? Math.max(0.6, fontScale) : 1;
  const scaled = {
    containerMinWidth: Math.round(BASE.containerMinWidth * scale),
    unknownContainerWidth: Math.round(BASE.unknownContainerWidth * scale),
    unknownContainerHeight: Math.round(BASE.unknownContainerHeight * scale),
    chordNameFontSize: Math.round(BASE.chordNameFontSize * scale),
    unknownTextSize: Math.round(BASE.unknownTextSize * scale),
    fretLabelFontSize: Math.round(BASE.fretLabelFontSize * scale),
    stringIndicatorFontSize: Math.round(BASE.stringIndicatorFontSize * scale),
    fretRowHeight: Math.round(BASE.fretRowHeight * scale),
    cellWidth: Math.round(BASE.cellWidth * scale),
    dotSize: Math.round(BASE.dotSize * scale),
    paginationFontSize: Math.round(BASE.paginationFontSize * scale),
  };

  if (!voicings || voicings.length === 0) {
    return (
      <View
        style={[
          styles.container,
          styles.unknownContainer,
          { borderColor: theme.border, width: scaled.unknownContainerWidth, height: scaled.unknownContainerHeight },
        ]}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.chordName, { color: theme.primary, fontSize: scaled.chordNameFontSize, width: scaled.containerMinWidth }]}
        >
          {chord}
        </Text>
        <Text style={[styles.unknownText, { color: theme.textSecondary, fontSize: scaled.unknownTextSize }]}>?</Text>
      </View>
    );
  }

  const voicing = voicings[voicingIndex % voicings.length];

  const positiveFrets = voicing.filter((f) => f > 0);
  const minFret = positiveFrets.length > 0 ? Math.min(...positiveFrets) : 1;
  const maxFret = positiveFrets.length > 0 ? Math.max(...positiveFrets) : 1;
  const startFret = maxFret <= NUM_FRETS ? 1 : minFret;

  const handlePress = () => {
    if (voicings.length > 1) {
      setVoicingIndex((prev) => (prev + 1) % voicings.length);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={voicings.length > 1 ? 0.7 : 1}
      style={[styles.container, { minWidth: scaled.containerMinWidth, marginRight: Math.round(12 * scale) }]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.chordName, { color: theme.primary, fontSize: scaled.chordNameFontSize, width: scaled.containerMinWidth }]}
      >
        {chord}
      </Text>
      {startFret > 1 && (
        <Text
          style={[
            styles.fretLabel,
            { color: theme.textSecondary, fontSize: scaled.fretLabelFontSize, right: Math.round(-14 * scale), top: Math.round(30 * scale) },
          ]}
        >
          {startFret}fr
        </Text>
      )}
      <View style={[styles.grid, { borderColor: theme.border }]}>
        {startFret === 1 && (
          <View style={[styles.nut, { backgroundColor: theme.textPrimary, height: Math.max(2, Math.round(3 * scale)) }]} />
        )}

        <View style={[styles.stringIndicators, { paddingVertical: Math.max(1, Math.round(scale)) }]}>
          {voicing.map((fret, i) => (
            <Text
              key={i}
              style={[
                styles.stringIndicator,
                { color: theme.textSecondary, fontSize: scaled.stringIndicatorFontSize, width: Math.round(10 * scale) },
              ]}
            >
              {fret === -1 ? '×' : fret === 0 ? '○' : ' '}
            </Text>
          ))}
        </View>

        {Array.from({ length: NUM_FRETS }).map((_, fretIdx) => (
          <View
            key={fretIdx}
            style={[
              styles.fretRow,
              { borderBottomColor: theme.border, height: scaled.fretRowHeight, borderBottomWidth: Math.max(1, Math.round(1 * scale)) },
            ]}
          >
            {Array.from({ length: NUM_STRINGS }).map((_, strIdx) => {
              const fretNum = startFret + fretIdx;
              const isPressed = voicing[strIdx] === fretNum;
              return (
                <View
                  key={strIdx}
                  style={[
                    styles.cell,
                    { borderRightColor: theme.border + '66', width: scaled.cellWidth, borderRightWidth: Math.max(1, Math.round(1 * scale)) },
                  ]}
                >
                  {isPressed && (
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: theme.primary,
                          width: scaled.dotSize,
                          height: scaled.dotSize,
                          borderRadius: Math.round(scaled.dotSize / 2),
                        },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
      {voicings.length > 1 && (
        <View style={[styles.paginationContainer, { marginTop: Math.round(4 * scale) }]}>
          <Text style={[styles.paginationText, { color: theme.textSecondary, fontSize: scaled.paginationFontSize }]}>
            {(voicingIndex % voicings.length) + 1}/{voicings.length}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  unknownContainer: { justifyContent: 'center', borderWidth: 1, borderRadius: 8, borderStyle: 'dashed' },
  chordName: { fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  unknownText: { fontWeight: '300' },
  fretLabel: { fontWeight: '600', position: 'absolute' },
  grid: { borderWidth: 1, borderRadius: 2 },
  nut: { width: '100%', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  stringIndicators: { flexDirection: 'row', justifyContent: 'space-around' },
  stringIndicator: { fontWeight: '700', textAlign: 'center' },
  fretRow: { flexDirection: 'row' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  dot: {},
  paginationContainer: { flexDirection: 'row', justifyContent: 'center' },
  paginationText: { fontWeight: '600' },
});
