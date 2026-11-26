import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import "./dialog.css";

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Wider body for lists. */
  wide?: boolean;
}

/**
 * Modal dialog: a scrim, a labelled panel, Escape and the close button to
 * dismiss, and focus moved inside on open and returned on close.
 */
export function Dialog({ title, onClose, children, wide }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(
      "input, select, textarea, button:not([data-dialog-close])",
    );
    (first ?? panel)?.focus();
    return () => previous?.focus?.();
  }, []);

  return (
    <div className="sm-dialog-scrim" onMouseDown={onClose}>
      <div
        ref={panelRef}
        className="sm-dialog"
        data-wide={wide ? "" : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <div className="sm-dialog-head">
          <h2 id={titleId} className="sm-dialog-title">
            {title}
          </h2>
          <button
            type="button"
            className="sm-button sm-button-quiet"
            onClick={onClose}
            aria-label="Close"
            data-dialog-close=""
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
