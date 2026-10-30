# Lintel

Lintel is a Windows architectural modeling studio for early building design. Draw a plan, inspect the same model in 3D, save it, and reopen it. An optional assistant can answer questions about the open project and propose a small set of confirmed edits.

The project file is JSON with the extension `.lintel`. Geometry is stored in millimeters. In plan, X increases to the east and Y increases to the north. Story elevation increases upward.

## What this version does

- Create, open, and save a project, with a recent-project list and a recovery copy of unsaved work
- Stories, gridlines, straight walls, slabs, doors, windows, and explicit rooms
- Selection, snap, move, reshape, properties, delete, undo, and redo
- A 2D plan and a 3D view of the same model
- Courtyard Studio, a two-storey sample, also stored at `samples/courtyard-studio.lintel`
- An assistant with a fixed set of tools: summarize, list, inspect, propose one edit, and undo the last assistant edit

## Requirements

- Node.js 20 or newer
- A current browser, for the interface alone
- For the desktop window: Rust (rustup), the Visual Studio C++ build tools, and the WebView2 runtime

WebView2 is already present on current Windows 11 installs.

## Run

```bash
npm install
npm test
npm run dev
```

The interface opens at <http://127.0.0.1:1420>. In the browser, Save keeps the project in this browser profile and Save As also downloads a `.lintel` file.

Desktop window:

```bash
npm run tauri:dev
```

The first Rust compile can take several minutes.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

## Package for Windows

```bash
npm run tauri:build
```

The unsigned installer is written to `src-tauri/target/release/bundle/nsis/`. This repository does not sign the installer, publish updates, or configure a deployment pipeline.

Opening a `.lintel` file from Explorer is registered by the installer as a file association. Double-click launch into an already-running window is not implemented; use Open inside Lintel.

## Assistant

Lintel starts without a model key. Drawing and files do not need one.

Open Help → Assistant settings:

- Cloud, OpenAI-compatible: base URL `https://api.openai.com/v1`, a model such as `gpt-4o-mini`, and an API key
- On this computer, for example Ollama: base URL `http://127.0.0.1:11434/v1`, the model name, and no key

The key is stored in the desktop user-config folder, or in the browser profile when you are not using the desktop shell. It is never written into a project file. Do not put a key in source control.

`Insert observed summary` does not call a model. It prints counts and room areas taken from the open project.

Edits the assistant suggests stay on a confirmation card until you press Apply. Applied edits are ordinary undo steps. Undo last assistant edit works only when that edit is still the latest change.

## Project file

`.lintel` files are JSON, schema version 1, format `lintel-project`. Lintel refuses a different schema version and does not modify the file. Unknown element types and extra fields are kept and written back. Invalid known elements reject the whole file.

See [docs/architecture.md](docs/architecture.md) for the coordinate system, modules, and how to add another assistant provider.

## Limits of this version

- Walls are straight segments with square ends. Corners overlap instead of using a cleaned join.
- Openings belong to one wall. Swing is drawn on the plan; 3D shows the opening and a simple leaf.
- Rooms and slabs are outlines you draw. Rooms are not detected from walls.
- Materials are names, not a library of assemblies.
- There are no stairs, roofs, sections, elevations, sheets, schedules, or IFC exchange.
- The 3D view orbits and selects. Modeling happens on the plan and in properties.
- Undo history lasts for the session only.
- The assistant cannot run commands, code, or arbitrary file operations, and it cannot change anything outside the four edit operations.
