import type { ReactNode } from "react";
import "./empty-state.css";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

/** PDS §4: centered, max 360px, 32px line icon, 24px heading, one action. */
export function EmptyState({ icon, title, children, action }: EmptyStateProps) {
  return (
    <section className="sm-empty" aria-label={title}>
      <span className="sm-empty-icon" aria-hidden="true">
        {icon}
      </span>
      <h2 className="sm-empty-title">{title}</h2>
      <p className="sm-empty-body">{children}</p>
      {action}
    </section>
  );
}
