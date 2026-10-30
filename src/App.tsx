import { useState } from "react";
import { editor, useEditor } from "./state/editor";
import { LearnScreen } from "./ui/LearnScreen";
import { Modal } from "./ui/Modal";
import { StartScreen } from "./ui/StartScreen";
import { Workspace } from "./ui/Workspace";

export function App() {
  const state = useEditor();
  const [learning, setLearning] = useState(false);
  return (
    <>
      {state.screen === "start" ? <StartScreen onLearn={() => setLearning(true)} /> : <Workspace onLearn={() => setLearning(true)} />}
      {learning && <LearnScreen onClose={() => setLearning(false)} />}
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
