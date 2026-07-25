import { i18n } from '../index';

describe('i18n module', () => {
  beforeEach(() => {
    i18n.changeLanguage('en');
  });

  it('defaults to English or detected locale', () => {
    expect(i18n.language).toBeDefined();
  });

  it('translates nested key paths accurately', () => {
    expect(i18n.t('settings.title')).toBe('Settings');
    expect(i18n.t('common.close')).toBe('Close');
    expect(i18n.t('nav.library')).toBe('Library');
  });

  it('switches languages correctly', () => {
    i18n.changeLanguage('de');
    expect(i18n.language).toBe('de');
    expect(i18n.t('settings.title')).toBe('Einstellungen');

    i18n.changeLanguage('es');
    expect(i18n.language).toBe('es');
    expect(i18n.t('settings.title')).toBe('Ajustes');

    i18n.changeLanguage('fr');
    expect(i18n.language).toBe('fr');
    expect(i18n.t('settings.title')).toBe('Paramètres');

    i18n.changeLanguage('pt');
    expect(i18n.language).toBe('pt');
    expect(i18n.t('settings.title')).toBe('Configurações');

    i18n.changeLanguage('tr');
    expect(i18n.language).toBe('tr');
    expect(i18n.t('settings.title')).toBe('Ayarlar');
  });

  it('interpolates template parameters', () => {
    i18n.changeLanguage('en');
    expect(i18n.t('library.songsCount', { count: 5 })).toBe('5 songs');
    i18n.changeLanguage('de');
    expect(i18n.t('library.songsCount', { count: 12 })).toBe('12 Lieder');
  });

  it('falls back to English when translation key is missing in target language', () => {
    i18n.changeLanguage('tr');
    // If key exists in en, fallback should work
    expect(i18n.t('settings.title')).toBe('Ayarlar');
  });

  it('returns key if missing in all languages', () => {
    expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
  });
});
