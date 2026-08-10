import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('document intent configuration', () => {
  it('registers ChordPro and supported image Android Open With MIME types', () => {
    const appConfig = JSON.parse(readFileSync(join(process.cwd(), 'app.json'), 'utf8')) as {
      expo: { android: { intentFilters: { data: { mimeType: string } }[] } };
    };
    const mimeTypes = appConfig.expo.android.intentFilters.map((filter) => filter.data.mimeType);

    expect(mimeTypes).toEqual([
      'text/plain',
      'application/octet-stream',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/heic',
      'image/heif',
    ]);
  });

  it('registers supported image iOS Open With document types without adding PDF or DOCX', () => {
    const appConfig = JSON.parse(readFileSync(join(process.cwd(), 'app.json'), 'utf8')) as {
      expo: {
        ios: {
          infoPlist: {
            CFBundleDocumentTypes: { CFBundleTypeName: string; LSItemContentTypes: string[] }[];
            UTImportedTypeDeclarations: { UTTypeIdentifier: string }[];
          };
        };
      };
    };
    const appConfigText = JSON.stringify(appConfig);
    const androidManifest = readFileSync(join(process.cwd(), 'android/app/src/main/AndroidManifest.xml'), 'utf8');
    const imageDocumentType = appConfig.expo.ios.infoPlist.CFBundleDocumentTypes.find(
      (documentType) => documentType.CFBundleTypeName === 'Song image'
    );

    expect(imageDocumentType?.LSItemContentTypes).toEqual([
      'public.png',
      'public.jpeg',
      'org.webmproject.webp',
      'public.heic',
      'public.heif',
    ]);
    expect(appConfig.expo.ios.infoPlist.UTImportedTypeDeclarations).toEqual([
      expect.objectContaining({ UTTypeIdentifier: 'org.chordpro.chordpro' }),
    ]);
    expect(appConfigText).not.toContain('application/pdf');
    expect(appConfigText).not.toContain('wordprocessingml.document');
    expect(androidManifest).not.toContain('application/pdf');
    expect(androidManifest).not.toContain('wordprocessingml.document');
    ['application/octet-stream', 'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'].forEach((mimeType) => {
      expect(androidManifest).toContain(`android:mimeType="${mimeType}"`);
    });
  });
});
