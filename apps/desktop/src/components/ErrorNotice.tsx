import { CircleAlert } from "lucide-react";
import { isApplicationError } from "../ipc/client";
import "./notice.css";

interface ErrorNoticeProps {
  error: unknown;
  onRetry?: () => void;
}

/** PDS §4 inline notice: plain-language cause, recovery action, code on request. */
export function ErrorNotice({ error, onRetry }: ErrorNoticeProps) {
  const app = isApplicationError(error) ? error : null;
  const message = app?.message ?? "Something could not be loaded.";
  const recoverable = app?.recoverable ?? true;

  return (
    <div className="sm-notice" role="alert">
      <CircleAlert size={18} aria-hidden="true" className="sm-notice-icon" />
      <div className="sm-notice-body">
        <p>{message}</p>
        {app && (
          <details className="sm-notice-details">
            <summary>Details</summary>
            <code className="sm-data">{app.code}</code>
          </details>
        )}
      </div>
      {recoverable && onRetry && (
        <button type="button" className="sm-button sm-button-secondary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
