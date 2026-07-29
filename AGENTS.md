
# AGENTS.md - digirepxyz

This file is the operating guide for coding agents working in this repository (`digirepxyz`).
This project is a fork of `digirepx2`.
This project is created/managed using `bun`.
Working branch is `roadmap` and the goal is to implement new features.

## Digirepxyz

A digital repertoire and chord management app for musicians. Manage the song library with tagging, 
favorites, ChordPro editing and viewing, transposition, guitar chord diagrams, and import/export. 
Built with Expo (React Native). 

## Current Features
- Song library with full-text search, tag filters, and favorites
- Raw ChordPro editor with undo/redo, auto-save, and assisted chord picker
- Song viewer with real-time transposition, per-song font scaling, and split-pane mode
- Offline guitar chord diagrams with multiple voicings per chord (source)
- Import and export songs as .cho files (full library)
- Share songs
- Accent chord color picker and dark mode

## STRICT RULES

These rules are **non-negotiable** and apply to every task, every time. Violations are not acceptable regardless of task size or urgency.

1. **Hand-by-Hand Porting Workflow.**
- Porting from `digirepx2` is executed collaboratively and incrementally with the user. 
- Each phase (types, utils, components, contexts, screens/routes) must be validated before moving to the next.
- After changes, confirm with `npx tsc --noEmit` as well.

2. **Adhere Strictly to Expo SDK v57.**
- Always consult and follow the Expo SDK v57 documentation (React 19, React Native 0.86, Expo Router v57).

3. **Develop Strictly by KISS Principles.**
- Keep implementations concise, simple, and specific. 
- Do not lean on generic structures unless requested. 
- Do not use advanced language features unless requested or strictly required.

4. **Explain thought process of every implementation.**
- Explain why, how and when did you implement every function, type, class, etc.

5. **Do not run excessive commands.**
- For example, do run linting (`npm run lint`) after implementation, git status to check changes, find commands to find files. This is very important. 
- When you get stuck, ASK FOR HELP! Especially important for project package management. 
- Ask me explicitly first, when you think you need to install a package. 
- Never attempt silent workarounds (e.g. refactoring code, rewriting tests, or changing behavior) when a package or dependency is missing. 
- If a test fails due to a missing package, STOP IMMEDIATELY and ask the user for confirmation to install it.

6. **When you get uncertain about a decision, ASK ME FOR CONFIRMATION!**
- That's a very important rule. Do not do anything I didn't asked you for. In case you need to go "off the road", ask me for confirmation first. 
- Do not do ANYTHING not explicitly requested. When encountering ANY error, missing file, test mismatch, or design decision: STOP and ASK FOR CONFIRMATION before taking action.

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

## Roadmap

Each item below represents a feature to be implemented.
Implemented fetures will be shown with a (+) symbol at the beginning.
For example, `n. (+) Feature XYZ` is a "completed" feature.
The feature to work on will be given by user.

1. (+) Single song easy import & export.
2. "Open with" on mobile by filetype to import.
3. Importing from PDF, single and bulk.
4. Importing from Word, single and bulk.
5. Exporting to PDF and Word.
6. Cloud sync.
7. Searching the web for songs.
8. (+) Easy "share song" button.
9. System tests.
