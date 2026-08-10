# Development Getting Started

Back to [Documentation](../README.md).

## Stack

The project uses:

- Expo SDK 57
- React 19
- React Native 0.86
- Expo Router
- TypeScript in strict mode
- Bun for dependency management and scripts

The committed `bun.lock` file is the dependency lockfile. Use Bun commands for installation and scripts.

## Prerequisites

Install the tools needed for the target workflow:

- Bun
- Node.js, for Expo and native tooling used by the project
- Android Studio
- Android SDK and platform tools
- A JDK compatible with the installed Expo and Gradle toolchain
- An Android emulator or physical Android device for native development

For Maestro system tests, install the Maestro CLI separately. Maestro requires Java 17 or newer according to its installation documentation.

Expo SDK 57 documentation should be treated as the authority when updating Expo, React Native, or native build tooling.

## Install Dependencies

From the repository root:

```bash
bun install
```

Do not mix package managers or commit a second lockfile.

## Run the Android App

Start the native Android development build with:

```bash
bun run android
```

This runs `expo run:android`, which generates or updates the native Android project, builds the app, installs it on the selected device, and starts the development server as needed.

The general Expo development server can also be started with:

```bash
bun run start
```

The repository exposes iOS and web scripts for their respective code paths:

```bash
bun run ios
bun run web
```

Android is the primary supported target, so native Android behavior should be validated first.

## Useful Commands

```bash
bun run lint
npx tsc --noEmit
bun run test
bun run test:system
```

See [Testing](testing.md) for unit and system-test details.

## Native Project Rule

Expo configuration and config plugins are the source of truth for native behavior. Do not make a direct change to a generated native file when the behavior belongs in `app.json` or a config plugin.

The `reset-project` script comes from the Expo starter template and can move or remove application source directories. Do not use it as part of normal setup.
