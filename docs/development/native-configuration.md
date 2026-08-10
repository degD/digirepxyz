# Native Configuration

Back to [Documentation](../README.md).

## Configuration Authority

Use `app.json` and Expo config plugins as the source of truth for native behavior. Generated Android and iOS files are build outputs and should not be edited directly for application configuration.

## App Identity

The configured app identity includes:

- Scheme: `digirepxyz`
- Android package: `com.anonymous.digirepxyz`
- Web output: static
- User-interface style: automatic

Changing an identity value affects deep links, native installation, system file handlers, and Maestro app IDs. Update dependent documentation and tests together.

## Plugins and Features

The Expo plugins configure:

- Expo Router
- Splash screen
- Sharing
- SecureStore
- ChordPro native intent logging

The custom intent plugin can add native logging behavior. Logging is disabled by default. Application logging must not expose file contents or credentials.

## File Intents

Android intent filters accept broad text and binary MIME types so providers can offer the app for ChordPro files. Runtime validation in the app rejects unsupported extensions and invalid contents.

iOS document declarations identify ChordPro file extensions and MIME types. PDF and DOCX are imported from Settings instead of being registered as Open With formats.

## Native Generation

When native configuration changes:

1. Update `app.json` or the relevant config plugin.
2. Regenerate the native project using the approved Expo workflow.
3. Build and install the application.
4. Verify the generated manifest or plist when the change affects system integration.
5. Run the relevant Jest and Maestro tests.

Do not make generated native output the only place where a behavior is defined.

## Native Modules

The app uses native boundaries for:

- AsyncStorage
- SecureStore
- Document Picker
- File System
- Print
- Sharing
- System UI
- Linking and incoming file intents

Unit tests mock these boundaries. Device-level tests are required for operating-system pickers, share sheets, Open With delivery, and print flows.
