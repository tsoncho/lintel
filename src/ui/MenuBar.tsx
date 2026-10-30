import { useEffect, useRef, useState, type ReactNode } from "react";
import { Mark } from "./Mark";

export function MenuBar({
  projectName,
  dirty,
  onHome,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onUndo,
  onRedo,
  onDelete,
  onPlan,
  onModel,
  onFit,
  onGhost,
  onAddStory,
  onAddGrid,
  onShortcuts,
  onSettings,
  onAbout,
  onLearn,
}: {
  projectName: string;
  dirty: boolean;
  onHome: () => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onPlan: () => void;
  onModel: () => void;
  onFit: () => void;
  onGhost: () => void;
  onAddStory: () => void;
  onAddGrid: () => void;
  onShortcuts: () => void;
  onSettings: () => void;
  onAbout: () => void;
  onLearn: () => void;
}) {
  return (
    <header className="menu-bar">
      <button type="button" className="brand" onClick={onHome} aria-label="Back to start">
        <Mark size={18} />
        <span>Lintel</span>
      </button>
      <nav className="menus" aria-label="Application">
        <Menu label="File">
          <Item label="New project" onClick={onNew} />
          <Item label="Open…" onClick={onOpen} hint="Ctrl+O" />
          <Item label="Save" onClick={onSave} hint="Ctrl+S" />
          <Item label="Save as…" onClick={onSaveAs} hint="Ctrl+Shift+S" />
          <Item label="Start screen" onClick={onHome} />
        </Menu>
        <Menu label="Edit">
          <Item label="Undo" onClick={onUndo} hint="Ctrl+Z" />
          <Item label="Redo" onClick={onRedo} hint="Ctrl+Y" />
          <Item label="Delete" onClick={onDelete} hint="Del" />
        </Menu>
        <Menu label="View">
          <Item label="Plan" onClick={onPlan} hint="1" />
          <Item label="3D model" onClick={onModel} hint="2" />
          <Item label="Zoom to fit" onClick={onFit} hint="F" />
          <Item label="Fade other stories" onClick={onGhost} />
          <Item label="Shortcuts" onClick={onShortcuts} hint="?" />
        </Menu>
        <Menu label="Model">
          <Item label="Add story" onClick={onAddStory} />
          <Item label="Add gridline" onClick={onAddGrid} />
        </Menu>
        <Menu label="Help">
          <Item label="Learn / Учи" onClick={onLearn} />
          <Item label="Assistant settings" onClick={onSettings} />
          <Item label="About Lintel" onClick={onAbout} />
        </Menu>
      </nav>
      <p className="project-title" title={projectName}>
        {projectName}
        {dirty ? <span className="dirty-dot" aria-label="Unsaved changes" /> : null}
      </p>
    </header>
  );
}

function Menu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)}>
        {label}
      </button>
      {open && (
        <div className="menu-pop" role="menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

function Item({ label, hint, onClick }: { label: string; hint?: string; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" onClick={onClick}>
      <span>{label}</span>
      {hint ? <kbd>{hint}</kbd> : null}
    </button>
  );
}
