// Collection name rules, mirrored from the catalog (PDS §7 "Collections").

export const MAX_NAME_CHARS = 100;

/** Unicode scalar values, as the catalog counts them. */
export const nameLength = (name: string) => [...name.trim()].length;

/** A message for an invalid name, or null when it can be saved. */
export function nameError(name: string): string | null {
  const t = name.trim();
  if (t === "") return "Enter a name.";
  if (nameLength(t) > MAX_NAME_CHARS) return `Use ${MAX_NAME_CHARS} characters or fewer.`;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f-\u009f]/.test(t)) return "Remove control characters.";
  return null;
}

/** Query keys for collection data (SAD §57). */
export const collectionKeys = {
  all: ["collections"] as const,
  one: (id: string) => ["collections", id] as const,
  tracks: (id: string) => ["collections", id, "tracks"] as const,
};
