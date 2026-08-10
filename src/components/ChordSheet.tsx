import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { parseChordPro } from '@/utils/chordProParser';
import { transposeContent } from '@/utils/transposer';
import { useSettings, FONT_SIZES } from '@/context/SettingsContext';
import ChordDiagram, { getChordVoicings } from './ChordDiagram';
import { DEFAULT_FONT_SCALE, normalizeFontScale } from '@/utils/fontScale';
import { ChordSegment } from '@/types/song';

export interface ChordSheetProps {
  content: string;
  transpose?: number;
  fontScale?: number;
}

export default function ChordSheet({ content, transpose = 0, fontScale = DEFAULT_FONT_SCALE }: ChordSheetProps) {
  const { theme, chordColor, settings } = useSettings();
  const normalizedScale = normalizeFontScale(fontScale);
  const base = FONT_SIZES.Medium;
  const fontSizes = {
    chord: Math.round(base.chord * normalizedScale),
    lyric: Math.round(base.lyric * normalizedScale),
    title: Math.round(22 * normalizedScale),
    key: Math.round(14 * normalizedScale),
  };

  const effectiveContent = transpose !== 0 ? transposeContent(content, transpose) : content;
  const parsedLines = useMemo(() => parseChordPro(effectiveContent), [effectiveContent]);

  const uniqueChords = useMemo(() => {
    const chords = new Set<string>();
    parsedLines.forEach((segments: ChordSegment[]) => {
      segments.forEach((s: ChordSegment) => {
        if (s.chord) chords.add(s.chord);
      });
    });
    return Array.from(chords);
  }, [parsedLines]);

  const validDiagramChords = useMemo(() => {
    return uniqueChords.filter((chord) => getChordVoicings(chord) !== null);
  }, [uniqueChords]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {settings.showChordDiagrams && validDiagramChords.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.diagramScroll}
          contentContainerStyle={styles.diagramRow}
        >
          {validDiagramChords.map((chord) => (
            <ChordDiagram key={chord} chord={chord} fontScale={normalizedScale} />
          ))}
        </ScrollView>
      )}

      {parsedLines.map((segments: ChordSegment[], lineIndex: number) => {
        if (segments.length === 1 && segments[0].isDirective) {
          const directiveText = segments[0].text;
          const titleMatch = directiveText.match(/\{title:\s*(.+)\}/i);
          const keyMatch = directiveText.match(/\{key:\s*(.+)\}/i);

          if (titleMatch) {
            return (
              <Text key={lineIndex} style={[styles.directiveTitle, { color: theme.textPrimary, fontSize: fontSizes.title }]}>
                {titleMatch[1].trim()}
              </Text>
            );
          }
          if (keyMatch) {
            return (
              <Text key={lineIndex} style={[styles.directiveKey, { color: theme.textSecondary, fontSize: fontSizes.key }]}>
                {`Key: ${keyMatch[1].trim()}`}
              </Text>
            );
          }
          return null;
        }

        const hasChords = segments.some((s) => s.chord);

        return (
          <View key={lineIndex} style={styles.line}>
            {segments.map((segment: ChordSegment, segIndex: number) => (
              <View key={segIndex} style={styles.chordGroup}>
                {hasChords && (
                  <Text
                    testID={`chord-${lineIndex}-${segIndex}`}
                    style={[
                      styles.chord,
                      {
                        color: chordColor,
                        fontSize: fontSizes.chord,
                        lineHeight: Math.round(fontSizes.chord * 1.2),
                        height: Math.round(fontSizes.chord * 1.2),
                      },
                    ]}
                  >
                    {segment.chord || ' '}
                  </Text>
                )}
                <Text
                  style={[
                    styles.lyric,
                    {
                      color: theme.textPrimary,
                      fontSize: fontSizes.lyric,
                      lineHeight: Math.round(fontSizes.lyric * 1.5),
                    },
                  ]}
                >
                  {segment.text || (segment.chord ? ' ' : '')}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 40 },
  diagramScroll: { marginBottom: 16 },
  diagramRow: { flexDirection: 'row', paddingBottom: 8 },
  directiveTitle: { fontWeight: '800', marginBottom: 4 },
  directiveKey: { fontWeight: '600', marginBottom: 16 },
  line: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  chordGroup: { flexDirection: 'column', alignItems: 'flex-start' },
  chord: { fontWeight: '700' },
  lyric: {},
});
