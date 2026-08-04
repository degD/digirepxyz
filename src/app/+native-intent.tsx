import { logChordProImport } from '@/utils/dataUtils';

/**
 * Keeps document-provider URIs out of Expo Router's route matcher.
 * The root layout reads the original URI through React Native Linking and imports it.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  if (path.startsWith('content://') || path.startsWith('file://')) {
    logChordProImport('Redirected document URI away from Expo Router', { path });
    return '/';
  }

  return path;
}
