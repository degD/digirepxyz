export const BACK_EXIT_WINDOW_MS = 2000;

export interface BackActionParams {
  currentScreen: string;
  lastBackPressAt: number;
  now?: number;
}

export interface BackActionResult {
  type: 'navigate-library' | 'allow-exit' | 'prompt-exit' | 'unhandled';
  nextLastBackPressAt: number;
}

/**
 * Resolves back button behavior on Android devices.
 * Determines whether to navigate to library screen, prompt the user for double-tap exit, allow app exit, or leave unhandled.
 *
 * @param params - Object containing `currentScreen` name, `lastBackPressAt` timestamp, and current time `now`.
 * @returns `BackActionResult` object containing action `type` and updated timestamp `nextLastBackPressAt`.
 */
export function resolveAndroidBackAction({
  currentScreen,
  lastBackPressAt,
  now = Date.now(),
}: BackActionParams): BackActionResult {
  if (currentScreen === 'editor' || currentScreen === 'settings') {
    return { type: 'navigate-library', nextLastBackPressAt: 0 };
  }

  if (currentScreen === 'library') {
    if (lastBackPressAt && now - lastBackPressAt < BACK_EXIT_WINDOW_MS) {
      return { type: 'allow-exit', nextLastBackPressAt: 0 };
    }
    return { type: 'prompt-exit', nextLastBackPressAt: now };
  }

  return { type: 'unhandled', nextLastBackPressAt: lastBackPressAt || 0 };
}
