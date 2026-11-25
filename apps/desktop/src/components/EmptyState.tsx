import type { ReactNode } from "react";
import "./empty-state.css";

interface EmptyStateProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  /** `page` for a whole view, `section` inside a page region. */
  size?: "page" | "section";
}

/**
 * Typographic empty state (Redesign brief §4.7): left-aligned, a serif title,
 * one plain sentence and at most one action. No illustration, no icon, and no
 * zero-count tiles standing in for data.
 */
export function EmptyState({ title, children, action, size = "page" }: EmptyStateProps) {
  return (
    <section className="sm-empty" data-size={size} aria-label={title}>
      <h2 className="sm-empty-title">{title}</h2>
      <p className="sm-empty-body">{children}</p>
      {action && <div className="sm-empty-action">{action}</div>}
    </section>
  );
}
