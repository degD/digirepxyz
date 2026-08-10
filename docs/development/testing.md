# Testing

Back to [Documentation](../README.md).

## Quality Checks

Run the standard checks after a change:

```bash
bun run lint
npx tsc --noEmit
bun run test
```

`bun run lint` uses Expo's ESLint configuration. TypeScript runs in strict mode. Jest uses the `jest-expo` preset.

## Unit and Component Tests

Run the complete Jest suite:

```bash
bun run test
```

Run one file:

```bash
bun run test src/utils/__tests__/transposer.test.ts
```

Run tests matching a name:

```bash
bun run test -- -t "transposes a chord"
```

Run deterministically in one process:

```bash
bun run test -- --runInBand
```

Run in watch mode:

```bash
bun run test -- --watch
```

Tests live next to their domain code in `__tests__` directories. Native storage, file pickers, SecureStore, sharing, printing, and network requests are mocked at the unit-test boundary.

## Maestro System Tests

Maestro is an external CLI and does not belong in `package.json` dependencies. Install it according to the [Maestro CLI documentation](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli).

System tests run against an installed Android application and require a connected Android emulator or device.

Run every flow:

```bash
bun run test:system
```

Run one flow:

```bash
bun run test:system:one .maestro/search-songs.yml
```

Each flow starts with cleared app state unless its steps explicitly relaunch without clearing state. This keeps flows independent and makes persistence checks intentional.

Current focused flows cover:

- Library launch and seeded data
- Search
- Filters
- Song creation and persistence
- Song editing and persistence
- Favorites and persistence
- Transposition
- Split view
- Deletion and persistence
- Settings persistence

The flows do not replace tests for OS-owned pickers, share sheets, print dialogs, Gemini services, or WebDAV servers. Those boundaries need separately provisioned test environments.

## Reports

The system-test scripts generate:

- `maestro-report.html`: detailed human-readable report
- `.maestro-results/`: screenshots, command metadata, UI hierarchies, and device logs

When a flow fails, inspect the failed command in the HTML report and then open its corresponding flow directory. `commands.json` records step order, status, duration, and error. Failed selector steps normally include a screenshot and screen hierarchy.

<!-- IMAGE PLACEHOLDER START -->
<div align="center">
  <br><br>
  <strong>Screenshot: Maestro failure report</strong><br>
  <code>docs/images/development/maestro-report.png</code><br>
  Add a report screenshot showing a failed command, screenshot artifact, and step details.
  <br><br>
</div>
<!-- IMAGE PLACEHOLDER END -->

## Test Design Rules

- Keep each flow focused on one capability.
- Prefer stable `testID` selectors over translated visible text.
- Wait for a meaningful hydrated UI element instead of using arbitrary sleeps.
- Reset state at the beginning of independent flows.
- Assert user-visible outcomes, not implementation details.
- Keep external services and OS-owned UI out of deterministic baseline flows.
