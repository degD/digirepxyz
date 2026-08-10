# Contributing

Back to [Documentation](../README.md).

## Make Focused Changes

Keep changes small, specific, and easy to verify. Prefer the simplest implementation that fits the existing architecture. Avoid adding generic abstractions before a concrete reuse case exists.

## TypeScript and Imports

- Keep strict TypeScript enabled.
- Define explicit types for domain data and component props.
- Avoid `any`; use a precise type, `unknown`, or a generic instead.
- Use `@/*` aliases for internal modules.
- Keep imports ordered by React/React Native, third-party modules, aliased project modules, and relative modules.

## React Native Components

Use functional components with typed props. Keep platform APIs behind small boundaries and protect storage, picker, filesystem, network, and secure-storage calls with appropriate error handling.

For user-facing controls:

- Add stable `testID` values when a control needs system-test interaction.
- Prefer accessible labels for icon-only actions.
- Keep translated visible text out of selectors when an identifier is practical.

## Changes to Existing Features

When changing a feature:

1. Read the related route, context, component, utility, and existing tests.
2. Update the smallest relevant layer.
3. Add or update unit tests for logic and failure paths.
4. Update a focused Maestro flow when the user-visible workflow changes.
5. Update the relevant user or development documentation.
6. Run lint, typecheck, and tests.

## Porting Work

When porting behavior from `digirepx2`, work in clear phases:

- Types
- Utilities
- Components
- Contexts
- Screens and routes

Validate each phase before building on it. Preserve behavior deliberately rather than copying source structure without checking the target Expo and React Native APIs.

## Native Changes

Put native configuration in `app.json` or an Expo config plugin. Generated native files should not be treated as the source of truth. Changes to intents, document types, SecureStore, pickers, sharing, or printing need device-level verification when possible.

## Commit Messages

Each feature commit should include:

- A concise title describing the change.
- A brief description explaining what changed and why.

Keep the title specific and use the description to mention important behavior, implementation boundaries, or validation when relevant.

## Validation Commands

```bash
bun run lint
npx tsc --noEmit
bun run test
```

For a user-facing Android workflow, also run the relevant flow:

```bash
bun run test:system:one .maestro/<flow-name>.yml
```

Inspect the final diff and status before submitting a change. Do not commit generated reports, local build output, credentials, or API keys.
