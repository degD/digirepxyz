import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SettingsProvider } from '@/context/SettingsContext';
import SongItem from '../SongItem';
import SearchBar from '../SearchBar';
import FilterTabs from '../FilterTabs';
import ChordSheet from '../ChordSheet';
import { Song } from '@/types/song';

function renderWithProvider(ui: React.ReactElement) {
  let tree: renderer.ReactTestRenderer = null!;
  act(() => {
    tree = renderer.create(<SettingsProvider>{ui}</SettingsProvider>);
  });
  return tree;
}

describe('SongItem', () => {
  const mockSong: Song = {
    id: '1',
    title: 'Test Song',
    artist: 'Test Artist',
    originalKey: 'C Major',
    content: '[C]Test',
  };

  it('renders song title and artist', () => {
    const tree = renderWithProvider(<SongItem song={mockSong} onPress={() => {}} />);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Test Song');
    expect(json).toContain('Test Artist');
  });

  it('renders key badge', () => {
    const tree = renderWithProvider(<SongItem song={mockSong} onPress={() => {}} />);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('C Major');
  });

  it('calls onPress with song when tapped', () => {
    const onPress = jest.fn();
    const tree = renderWithProvider(<SongItem song={mockSong} onPress={onPress} />);
    const songItemComponent = tree.root.findByType(SongItem);
    act(() => {
      songItemComponent.props.onPress(mockSong);
    });
    expect(onPress).toHaveBeenCalledWith(mockSong);
  });
});

describe('SearchBar', () => {
  it('renders with placeholder', () => {
    const tree = renderWithProvider(<SearchBar value="" onChangeText={() => {}} />);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Search songs, artists, or keys');
  });

  it('calls onChangeText', () => {
    const onChangeText = jest.fn();
    const tree = renderWithProvider(<SearchBar value="" onChangeText={onChangeText} />);
    const input = tree.root.findByType('TextInput' as any);
    act(() => {
      input.props.onChangeText('test');
    });
    expect(onChangeText).toHaveBeenCalledWith('test');
  });
});

describe('FilterTabs', () => {
  it('renders all filter tabs passed via prop', () => {
    const tabs = ['All Songs', 'Setlists', 'Favorites', 'Jazz Standards'];
    const tree = renderWithProvider(<FilterTabs activeTab="All Songs" onTabPress={() => {}} tabs={tabs} />);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('All Songs');
    expect(json).toContain('Setlists');
    expect(json).toContain('Favorites');
    expect(json).toContain('Jazz Standards');
  });

  it('falls back to default tabs if none provided', () => {
    const tree = renderWithProvider(<FilterTabs activeTab="all" onTabPress={() => {}} />);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('All Songs');
    expect(json).toContain('Favorites');
  });

  it('calls onTabPress', () => {
    const onTabPress = jest.fn();
    const tabs = ['all', 'favorites'];
    const tree = renderWithProvider(<FilterTabs activeTab="all" onTabPress={onTabPress} tabs={tabs} />);
    const filterTabsComponent = tree.root.findByType(FilterTabs);
    act(() => {
      filterTabsComponent.props.onTabPress('favorites');
    });
    expect(onTabPress).toHaveBeenCalledWith('favorites');
  });
});

describe('ChordSheet', () => {
  it('renders chords and lyrics', () => {
    const tree = renderWithProvider(<ChordSheet content="[C]Hello [G]World" />);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('C');
    expect(json).toContain('G');
    expect(json).toContain('Hello ');
    expect(json).toContain('World');
  });

  it('renders multiline content', () => {
    const tree = renderWithProvider(<ChordSheet content="[Am]Line one\n[Dm]Line two" />);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Am');
    expect(json).toContain('Dm');
    expect(json).toContain('Line one');
    expect(json).toContain('Line two');
  });
});
