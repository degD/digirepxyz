import { BACK_EXIT_WINDOW_MS, resolveAndroidBackAction } from '../backNavigation';

describe('backNavigation', () => {
  it('navigates to library from editor/settings', () => {
    expect(resolveAndroidBackAction({ currentScreen: 'editor', lastBackPressAt: 0, now: 1000 }))
      .toEqual({ type: 'navigate-library', nextLastBackPressAt: 0 });

    expect(resolveAndroidBackAction({ currentScreen: 'settings', lastBackPressAt: 0, now: 1000 }))
      .toEqual({ type: 'navigate-library', nextLastBackPressAt: 0 });
  });

  it('prompts first back press on library', () => {
    const result = resolveAndroidBackAction({ currentScreen: 'library', lastBackPressAt: 0, now: 1000 });
    expect(result).toEqual({ type: 'prompt-exit', nextLastBackPressAt: 1000 });
  });

  it('allows exit on second back press within window', () => {
    const now = 3000;
    const firstPressAt = now - (BACK_EXIT_WINDOW_MS - 200);
    const result = resolveAndroidBackAction({ currentScreen: 'library', lastBackPressAt: firstPressAt, now });
    expect(result).toEqual({ type: 'allow-exit', nextLastBackPressAt: 0 });
  });

  it('prompts again if second back press is outside window', () => {
    const now = 5000;
    const firstPressAt = now - (BACK_EXIT_WINDOW_MS + 200);
    const result = resolveAndroidBackAction({ currentScreen: 'library', lastBackPressAt: firstPressAt, now });
    expect(result).toEqual({ type: 'prompt-exit', nextLastBackPressAt: now });
  });
});
