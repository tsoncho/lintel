import { editor, useEditor } from "./state/editor";
import { Modal } from "./ui/Modal";
import { StartScreen } from "./ui/StartScreen";
import { Workspace } from "./ui/Workspace";

export function App() {
  const state = useEditor();
  return (
    <>
      {state.screen === "start" ? <StartScreen /> : <Workspace />}
      {state.loadErrors && (
        <Modal title="This file was not opened" onClose={() => editor.clearLoadErrors()}>
          <p>Lintel did not change the file or replace the project you already have open.</p>
          <ul className="error-list">
            {state.loadErrors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </Modal>
      )}
    </>
  );
}
