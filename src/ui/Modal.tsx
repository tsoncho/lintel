import { useEffect, useRef, type ReactNode } from "react";

export function Modal({
  title,
  children,
  onClose,
  closeLabel = "Close dialog",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeLabel?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    node?.querySelector<HTMLElement>("input, button, select, textarea")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label={closeLabel}>
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
