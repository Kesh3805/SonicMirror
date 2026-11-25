import type { CSSProperties } from "react";

interface SkeletonProps {
  /** CSS length; defaults to the full width of the container. */
  width?: CSSProperties["width"];
  height: CSSProperties["height"];
  className?: string;
}

/**
 * A static-geometry placeholder that matches the final layout exactly, so
 * nothing shifts when data arrives. The pulse stops under reduced motion.
 */
export function Skeleton({ width = "100%", height, className }: SkeletonProps) {
  return (
    <span
      className={["sm-skeleton", className].filter(Boolean).join(" ")}
      style={{ display: "block", width, height }}
      aria-hidden="true"
    />
  );
}

/** Rows of skeleton bars at a fixed row height, for tables and lists. */
export function SkeletonRows({ rows, rowHeight }: { rows: number; rowHeight: number }) {
  return (
    <div className="sm-skeleton-rows" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sm-skeleton-row" style={{ height: rowHeight }}>
          <Skeleton width={`${40 + ((i * 17) % 35)}%`} height={10} />
        </div>
      ))}
    </div>
  );
}
