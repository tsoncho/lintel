import { createId } from "../domain/ids";
import {
  browserPath,
  browserProject,
  browserStorage,
  clearRecovery,
  fileNameForProject,
  rememberRecent,
  saveBrowserProject,
} from "../persistence/library";
import { editor } from "../state/editor";
import { downloadText, isDesktop, pickBrowserFile, pickOpenPath, pickSavePath, readTextFile, writeTextFile } from "./files";
import { chooseLeave } from "./leave";

export async function confirmLeave(): Promise<boolean> {
  const choice = await chooseLeave();
  if (choice === "cancel") return false;
  if (choice === "save") return saveProject(false);
  const store = browserStorage();
  if (store) clearRecovery(store);
  return true;
}

export async function goHome(): Promise<void> {
  if (!(await confirmLeave())) return;
  editor.closeToStart();
}

export async function createNamed(name: string): Promise<void> {
  if (!(await confirmLeave())) return;
  editor.newProject(name);
}

export async function openSampleProject(): Promise<void> {
  if (!(await confirmLeave())) return;
  editor.openSample();
}

export async function openProject(): Promise<void> {
  if (!(await confirmLeave())) return;
  if (isDesktop()) {
    const path = await pickOpenPath();
    if (!path) return;
    await readAndOpen(path);
    return;
  }
  const picked = await pickBrowserFile();
  if (!picked) return;
  const opened = editor.openText(picked.text, null);
  if (!opened || !editor.getState().project) return;
  const store = browserStorage();
  if (!store) return;
  const id = createId("browser");
  const path = browserPath(id);
  const project = editor.getState().project;
  if (!project) return;
  saveBrowserProject(store, {
    id,
    path,
    name: project.name,
    updatedAt: project.updatedAt,
    contents: picked.text,
  });
  editor.markSaved(path);
}

export async function openStored(path: string): Promise<void> {
  if (!(await confirmLeave())) return;
  if (path.startsWith("browser:")) {
    const store = browserStorage();
    const record = store ? browserProject(store, path) : null;
    if (!record) {
      editor.setStatus("That recent project is no longer stored in this browser.", "error");
      return;
    }
    editor.openText(record.contents, record.path);
    return;
  }
  await readAndOpen(path);
}

export async function restoreRecovery(contents: string, path: string | null): Promise<void> {
  const opened = editor.openText(contents, path);
  if (!opened) return;
  editor.markUnsaved();
  const store = browserStorage();
  if (store) clearRecovery(store);
}

export async function saveProject(saveAs: boolean): Promise<boolean> {
  const current = editor.getState();
  const text = editor.documentText();
  if (!text || !current.project) return false;
  try {
    if (isDesktop()) {
      let path = saveAs ? null : current.filePath;
      if (!path || path.startsWith("browser:")) {
        const picked = await pickSavePath(fileNameForProject(current.project.name));
        if (!picked) return false;
        path = picked;
      }
      await writeTextFile(path, text);
      editor.markSaved(path);
      const store = browserStorage();
      if (store) {
        clearRecovery(store);
        rememberRecent(store, { path, name: current.project.name, updatedAt: new Date().toISOString() });
      }
      return true;
    }
    const store = browserStorage();
    if (!store) {
      editor.setStatus("This browser cannot store the project.", "error");
      return false;
    }
    if (saveAs) downloadText(fileNameForProject(current.project.name), text);
    const existing = current.filePath?.startsWith("browser:") ? current.filePath.slice("browser:".length) : createId("browser");
    const path = browserPath(existing);
    saveBrowserProject(store, {
      id: existing,
      path,
      name: current.project.name,
      updatedAt: new Date().toISOString(),
      contents: text,
    });
    clearRecovery(store);
    editor.markSaved(path);
    if (saveAs) editor.setStatus("Downloaded a copy and saved it in this browser.", "ok");
    return true;
  } catch (error) {
    editor.setStatus(error instanceof Error ? error.message : "Save failed. The project is still open.", "error");
    return false;
  }
}

async function readAndOpen(path: string): Promise<void> {
  try {
    const text = await readTextFile(path);
    const opened = editor.openText(text, path);
    const project = editor.getState().project;
    const store = browserStorage();
    if (opened && project && store) {
      rememberRecent(store, { path, name: project.name, updatedAt: project.updatedAt });
    }
  } catch (error) {
    editor.setStatus(error instanceof Error ? error.message : "Could not read that file.", "error");
  }
}
