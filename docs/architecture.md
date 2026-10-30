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
- Wall joins use a 50 mm tolerance. See the join notes below.
- Comparisons use a 0.5 mm tolerance. Pointer edits are rounded to 0.1 mm.
- Coordinates must stay within ±100 km. Other numeric limits are in `src/domain/validate.ts`.

Stable string ids identify every element. Doors and windows reference a wall id. Walls, slabs, and rooms reference a story id. Deleting a story or wall also deletes the elements that depend on it, as one undo step.

## Wall joins, rooms, and sections

- An endpoint joins another wall when it is within 50 mm of that wall's centerline. The plan footprint is mitered at corners and trimmed to the host face at a T-junction. The centerline stays editable.
- A gap larger than 50 mm is left open. Collinear overlaps are not merged. Two walls that cross in their middles overlap; they are not split into separate arms.
- 3D uses the same trim for stems and adds a corner filler so the outside of a corner is solid. Openings stay on the host wall.
- `detectSpaces` proposes closed inner faces. The user chooses which ones become rooms. A derived room keeps its id and name while its wall ids still form that loop. If the loop breaks, `sync` becomes `detached` and the last outline is kept. Manual rooms are never rewritten.
- A section line has a facing side and a depth. The section view is generated from the current model on each draw. Walls that cross the line are cut; walls inside the depth are drawn in elevation, including their openings. Roofs, stairs, and preserved types are named as omitted.

## Files

```json
{
  "format": "lintel-project",
  "schemaVersion": 2,
  "app": "Lintel",
  "project": {}
}
```

`parseProjectFile` either returns the whole document or a list of errors. It does not return a partial model.

- Schema versions 1 and 2 open. Version 1 is kept in memory as version 2. Saving writes version 2; the file on disk is unchanged until that save.
- A schema version outside 1–2 is rejected. The file is not rewritten.
- Unknown top-level fields are kept in memory and written back beside the known fields.
- An element whose `type` is not one of story, gridline, wall, slab, door, window, room, or section is kept verbatim and shown as preserved. It is not drawn or cut in section.
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

## Course

`src/learn` holds the curriculum. Lesson ids, quiz answers, and glossary headwords are language-neutral. English and Bulgarian text live in `src/learn/copy`. `validateCourse` fails the test suite if a translation is missing, a quiz choice does not match the answer key, or a paragraph is in the wrong script.

Progress is schema version 1 under the local key `lintel.learn.progress`. It is not written into a `.lintel` file and it is not sent to an assistant. A newer progress schema is left untouched. Unknown lesson ids and extra fields are kept when a version-1 record is saved again. Switching language keeps the open lesson, answers, and notes.

The course can open Courtyard Studio or a new practice project through the existing save prompt. That prompt is still English. Cancel leaves the current project in place.

## Desktop shell

Rust commands read and write the project path the user picked, plus `settings.json` under the app config directory. Dialogs use the native Windows picker. The webview content-security policy is left unset so a user-chosen HTTPS or localhost model host can be called. The page itself is the Lintel origin.

## Not in this version

Sheets, schedules, roofs, stairs, columns, material assemblies, IFC, multi-user editing, and modeling directly in the 3D view. Crossing walls overlap rather than split into four arms. A derived room that loses its wall loop is kept, not deleted or reassigned to a different space.
