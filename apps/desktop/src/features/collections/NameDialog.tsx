import { useState } from "react";
import { Dialog } from "../../components/Dialog";
import { isApplicationError } from "../../ipc/client";
import { MAX_NAME_CHARS, nameError, nameLength } from "./names";

interface NameDialogProps {
  title: string;
  submitLabel: string;
  initialName?: string;
  /** Shown above the field, e.g. how many tracks will be added. */
  note?: string;
  pending: boolean;
  error: unknown;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

const errorMessage = (e: unknown) =>
  isApplicationError(e) ? e.message : "The collection could not be saved.";

/** Create or rename a collection, with inline validation (PDS §7). */
export function NameDialog({
  title,
  submitLabel,
  initialName = "",
  note,
  pending,
  error,
  onSubmit,
  onClose,
}: NameDialogProps) {
  const [name, setName] = useState(initialName);
  const [touched, setTouched] = useState(false);
  const problem = nameError(name);
  const shown = touched ? problem : null;

  return (
    <Dialog title={title} onClose={onClose}>
      <form
        className="sm-dialog-body"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!problem && !pending) onSubmit(name.trim());
        }}
      >
        {note && <p>{note}</p>}
        <label className="sm-dialog-field">
          <span>Name</span>
          <input
            className="sm-input"
            value={name}
            maxLength={MAX_NAME_CHARS * 2}
            aria-invalid={shown ? true : undefined}
            aria-describedby="collection-name-help"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
          />
        </label>
        <p id="collection-name-help" className={shown ? "sm-dialog-error" : undefined}>
          {shown ?? `${nameLength(name)} of ${MAX_NAME_CHARS} characters`}
        </p>
        {error !== null && error !== undefined && (
          <p className="sm-dialog-error" role="alert">
            {errorMessage(error)}
          </p>
        )}
        <div className="sm-dialog-actions">
          <button type="button" className="sm-button sm-button-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="sm-button sm-button-primary" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
