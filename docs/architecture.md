# Lintel architecture

Lintel is a Tauri 2 desktop shell around a TypeScript application. The browser build and the desktop window share one interface. Domain code does not import React, Three.js, or Tauri.

## Modules

| Path | Responsibility |
| --- | --- |
| `src/domain` | Elements, millimeters, validation, edits, undo history, the sample project |
| `src/persistence` | Versioned JSON, recovery, and the browser project list |
| `src/view` | Plan drawing, hit testing, and the 3D mesh description |
| `src/state/editor.ts` | The open document, selection, tools, and history |
| `src/ai` | Provider interface, tool schemas, and the confirmation gate |
| `src/platform` | Save and open, including the Rust file commands when running in Tauri |
| `src/ui` | Panels, menus, and the assistant transcript |
| `src-tauri` | Window, native file dialogs, and the settings file |

Rendering reads the project. It is not the source of truth. An edit clones the project, validates it, and commits it only if the whole model is still valid.

## Coordinates and units

- Stored lengths are millimeters. Display can switch between mm and m without scaling the model.
- Plan X is east. Plan Y is north. Screen Y is flipped so north is up.
- Story `elevation` is the finished-floor height. `height` is floor to floor.
- A wall's `baseOffset` and `height` are relative to its story.
- A slab's `elevationOffset` is the top of the slab relative to the story. Thickness extends downward.
- Door and window `offset` is the distance from the wall start to the opening center.
- Comparisons use a 0.5 mm tolerance. Pointer edits are rounded to 0.1 mm.
- Coordinates must stay within ±100 km. Other numeric limits are in `src/domain/validate.ts`.

Stable string ids identify every element. Doors and windows reference a wall id. Walls, slabs, and rooms reference a story id. Deleting a story or wall also deletes the elements that depend on it, as one undo step.

## Files

```json
{
  "format": "lintel-project",
  "schemaVersion": 1,
  "app": "Lintel",
  "project": {}
}
```

`parseProjectFile` either returns the whole document or a list of errors. It does not return a partial model.

- A schema version other than 1 is rejected. The file is not rewritten.
- Unknown top-level fields are kept in memory and written back beside the known fields.
- An element whose `type` is not one of story, gridline, wall, slab, door, window, or room is kept verbatim and shown as preserved. It is not drawn.
- Extra fields on a known element are kept and written back.
- A known element that fails validation fails the file.

Saves write a temporary file in the same folder and then rename it. Undo history is not stored in the file. A recovery copy of unsaved work is kept in the browser profile and offered on the start screen.

## Assistant

`ChatProvider` is the only model API the rest of the app sees. `createOpenAIProvider` posts to `{baseUrl}/chat/completions`, which covers OpenAI-compatible hosts and a local server such as Ollama.

To add a provider, implement `ChatProvider` in `src/ai` and pass it to `runAssistantTurn`. Do not import the provider from domain code. Keep credentials in assistant settings, not in the project.

Tools:

| Tool | Effect |
| --- | --- |
| `get_project_summary` | Observed counts, stories, bounds, and room areas |
| `list_elements` | Ids, with optional type and story filters |
| `get_element` | One element, or the current selection |
| `propose_model_edit` | Validates one edit and stops for confirmation |
| `undo_last_assistant_edit` | Asks to undo, only if that edit is still latest |

Allowed edits are `set_properties`, `delete_element`, `create_wall`, and `create_story`. Arguments are checked against an allow-list. Lengths in tool arguments are millimeters. `commitProposal` refuses to run unless the user confirmed. The desktop shell exposes no command for arbitrary files, shell, or SQL, and the assistant cannot call the file commands.

Room area and wall area reported by tools are calculated from stored geometry and labeled that way. They are not a cost estimate or a code check.

## Desktop shell

Rust commands read and write the project path the user picked, plus `settings.json` under the app config directory. Dialogs use the native Windows picker. The webview content-security policy is left unset so a user-chosen HTTPS or localhost model host can be called. The page itself is the Lintel origin.

## Not in this version

Sections, sheets, schedules, roofs, stairs, columns, cleaned wall joins, material assemblies, IFC, multi-user editing, and modeling directly in the 3D view. Those should be new domain types and file fields, with a schema version bump and an explicit migration, rather than extra drawing on the canvas.
