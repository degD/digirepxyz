# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

# AGENTS.md - digirepxyz

This file is the operating guide for coding agents working in this repository (`digirepxyz`).
It captures the project conventions, architecture, and step-by-step porting strategy from `digirepx2`.

## STRICT RULES

These rules are **non-negotiable** and apply to every task, every time. Violations are not acceptable regardless of task size or urgency.

1. **Hand-by-Hand Porting Workflow.**
   Porting from `digirepx2` is executed collaboratively and incrementally with the user. Each phase (types, utils, components, contexts, screens/routes) must be validated before moving to the next.

2. **Adhere Strictly to Expo SDK v57.**
   Always consult and follow the Expo SDK v57 documentation (React 19, React Native 0.86, Expo Router v57).

3. **Develop Strictly by KISS Principles.**
   Keep implementations concise, simple, and specific. Do not lean on generic structures unless requested. Do not use advanced language features unless requested or strictly required.

4. **Explain thought process of every implementation.**
   Explain why, how and when did you implement every function, type, class, etc.

5. **Do not run excessive commands.**
   For example, do not run linting after implementation, git status to check changes, find commands to find files. This is very important. When you get stuck, ASK FOR HELP! Especially important for project package management. Never install packages (using `bun add`, for example) without me confirming. Ask me explicitly first.

---

## Project Overview & Target Stack

- **Project Name:** `digirepxyz`
- **Source Project:** `~/works/digirepx2` (JavaScript / RN / Expo v55)
- **Target Stack:** TypeScript + Expo SDK 57 + React 19 + Expo Router
- **Path Aliases:**
  - `@/*` -> `./src/*`
  - `@/assets/*` -> `./assets/*`

### Directory Structure Blueprint

```text
src/
├── app/                  # Expo Router file-based routing
│   ├── _layout.tsx       # Root & navigation layout
│   ├── index.tsx         # Home / Library screen route
│   ├── editor.tsx        # Song editor route
│   ├── settings.tsx      # Settings route
│   └── viewer.tsx        # Song viewer route
├── components/           # Reusable UI components
├── context/              # Context providers (e.g. SettingsContext)
├── db/                   # Database schema and models
├── i18n/                 # Localization & translations
├── types/                # TypeScript interface and type definitions
└── utils/                # Transposition, parsing, storage, and helper utilities
```

---

## TypeScript & Code Style Guidelines

1. **Strict Typing:**
   - Always define explicit TypeScript interfaces or types for all data structures (e.g., `Song`, `Chord`, `Settings`, `TranspositionResult`).
   - Avoid using `any`. Use `unknown` or generics when type precision is dynamic.

2. **Imports & Alias:**
   - Use `@/` path alias for internal imports (e.g., `import { Song } from '@/types/song'`).
   - Order imports:
     1. React & React Native
     2. Expo libraries & third-party packages
     3. `@/` aliased internal modules
     4. Relative imports

3. **Component Architecture:**
   - Functional components with typed props interface.
   - Use React hooks (`useMemo`, `useCallback`, `useState`, `useContext`) with proper generic types.

4. **Error Handling & Resiliency:**
   - Protect storage and platform calls with `try/catch`.
   - Provide safe fallback values for optional or migration fields.

---

## Commands & Scripts

- **Install dependencies:** `npm install` or `bun install`
- **Start dev server:** `npm start` / `npx expo start`
- **Run Android:** `npm run android`
- **Run iOS:** `npm run ios`
- **Run Web:** `npm run web`
- **Linting:** `npm run lint` / `npx expo lint`
- **Testing:** `npm test` (Jest / Expo testing suite)

---

## Porting Roadmap (Hand-by-Hand Plan)

1. **Phase 1: Core Definitions & Types** (`src/types/`)
   - Define interfaces for Songs, Chords, Settings, Transposition, and DB entities.
2. **Phase 2: Core Utilities & Logic** (`src/utils/`)
   - Port `transposer.js`, `chordProParser.js`, `fontScale.js`, `songStorage.js`, `dataUtils.js` to TypeScript.
   - Write/run unit tests to verify 100% parity.
3. **Phase 3: Context & Localization** (`src/context/`, `src/i18n/`)
   - Port `SettingsContext` and i18n translations.
4. **Phase 4: Database Layer** (`src/db/`)
   - Port schema and models for database persistence.
5. **Phase 5: Reusable UI Components** (`src/components/`)
   - Port `ChordDiagram`, `ChordPicker`, `ChordSheet`, `SongItem`, `SearchBar`, `FilterTabs`.
6. **Phase 6: Routes & Screens** (`src/app/`)
   - Implement Expo Router pages (`index.tsx`, `editor.tsx`, `settings.tsx`, `viewer.tsx`).
