interface DrawingHandlers {
  cancel: () => boolean;
  closeShape: () => boolean;
  undoPoint: () => boolean;
  panBy: (dx: number, dy: number) => void;
  zoomBy: (factor: number) => void;
}

let handlers: DrawingHandlers | null = null;

export const drawing = {
  bind(next: DrawingHandlers) {
    handlers = next;
    return () => {
      if (handlers === next) handlers = null;
    };
  },
  cancel: () => handlers?.cancel() ?? false,
  closeShape: () => handlers?.closeShape() ?? false,
  undoPoint: () => handlers?.undoPoint() ?? false,
  panBy: (dx: number, dy: number) => handlers?.panBy(dx, dy),
  zoomBy: (factor: number) => handlers?.zoomBy(factor),
};
