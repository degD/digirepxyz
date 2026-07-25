import { exportLibrary, parseImportedContent, triggerFileImport } from '../dataUtils';
import { Song } from '@/types';

const mockWrite = jest.fn();
const mockFileInstance = { uri: 'file://test/mock.cho', write: mockWrite };

jest.mock('expo-file-system', () => {
  const MockFile = jest.fn(() => mockFileInstance);
  return {
    File: MockFile,
    Paths: {
      cache: { uri: 'file://cache/' },
      document: { uri: 'file://document/' },
    },
  };
}, { virtual: true });

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(),
}), { virtual: true });

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}), { virtual: true });

describe('dataUtils - exportLibrary', () => {
  const sampleSongs: Song[] = [
    { id: '1', title: 'Song 1', artist: 'Artist 1', originalKey: 'C', tags: ['rock'], content: '[C]Hello' },
  ];

  it('formats songs to ChordPro correctly', () => {
    const result = exportLibrary(sampleSongs);
    expect(result.success).toBe(true);
    expect(result.message).toContain('Preparing native export');
  });

  it('handles empty song list', () => {
    const result = exportLibrary([]);
    expect(result.success).toBe(true);
  });
});

describe('dataUtils - parseImportedContent', () => {
  it('parses valid ChordPro content with tags', () => {
    const input = `
{title: Test Song}
{artist: Test Artist}
{key: G}
{tags: pop, acoustic}

[G]Verse 1
---
{title: Second Song}

[C]Verse 2
    `.trim();

    const songs = parseImportedContent(input);
    expect(songs).toHaveLength(2);
    expect(songs[0].title).toBe('Test Song');
    expect(songs[0].artist).toBe('Test Artist');
    expect(songs[0].originalKey).toBe('G');
    expect(songs[0].tags).toEqual(['pop', 'acoustic']);
    expect(songs[0].content).toBe('[G]Verse 1');
    expect(songs[0].fontScale).toBe(1);

    expect(songs[1].title).toBe('Second Song');
    expect(songs[1].content).toBe('[C]Verse 2');
  });
});

describe('dataUtils - triggerFileImport', () => {
  it('calls onImport when document picker returns a valid file', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DocumentPicker = require('expo-document-picker');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { File } = require('expo-file-system');

    DocumentPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://cache/test.cho' }],
    });

    const mockText = jest.fn().mockResolvedValue(
      '{title: Imported Song}\n{artist: Test}\n\n[Am]Hello world'
    );
    File.mockImplementation(() => ({ text: mockText }));

    const onImport = jest.fn();
    const onStatus = jest.fn();

    triggerFileImport(onImport, onStatus);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(DocumentPicker.getDocumentAsync).toHaveBeenCalled();
    expect(onImport).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Imported Song', artist: 'Test' }),
      ])
    );
  });

  it('calls onStatus with error when picker is cancelled', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DocumentPicker = require('expo-document-picker');

    DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: true });

    const onImport = jest.fn();
    const onStatus = jest.fn();

    triggerFileImport(onImport, onStatus);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(onImport).not.toHaveBeenCalled();
    expect(onStatus).not.toHaveBeenCalled();
  });
});
