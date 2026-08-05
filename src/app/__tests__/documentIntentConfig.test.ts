import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('document intent configuration', () => {
  it('keeps only ChordPro-compatible Android Open With MIME types', () => {
    const appConfig = JSON.parse(readFileSync(join(process.cwd(), 'app.json'), 'utf8')) as {
      expo: { android: { intentFilters: { data: { mimeType: string } }[] } };
    };
    const mimeTypes = appConfig.expo.android.intentFilters.map((filter) => filter.data.mimeType);

    expect(mimeTypes).toEqual(['text/plain', 'application/octet-stream']);
  });

  it('does not register PDF or DOCX as iOS or Android Open With document types', () => {
    const appConfig = readFileSync(join(process.cwd(), 'app.json'), 'utf8');
    const androidManifest = readFileSync(join(process.cwd(), 'android/app/src/main/AndroidManifest.xml'), 'utf8');

    expect(appConfig).not.toContain('application/pdf');
    expect(appConfig).not.toContain('wordprocessingml.document');
    expect(androidManifest).not.toContain('application/pdf');
    expect(androidManifest).not.toContain('wordprocessingml.document');
    expect(androidManifest).toContain('application/octet-stream');
  });
});
