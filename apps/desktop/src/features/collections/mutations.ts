import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ipc } from "../../ipc/client";
import { collectionKeys } from "./names";

/** Every collection mutation refreshes the list and the affected detail. */
function useInvalidate() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: collectionKeys.all });
}

export function useCreateCollection() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ name, trackIds }: { name: string; trackIds?: string[] }) =>
      ipc.createCollection(name, trackIds ?? []),
    onSuccess: invalidate,
  });
}

export function useRenameCollection(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (name: string) => ipc.renameCollection(id, name),
    onSuccess: invalidate,
  });
}

export function useDeleteCollection(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => ipc.deleteCollection(id),
    onSuccess: () => {
      client.removeQueries({ queryKey: collectionKeys.one(id) });
      return client.invalidateQueries({ queryKey: collectionKeys.all });
    },
  });
}

export function useAddToCollection() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, trackIds }: { id: string; trackIds: string[] }) =>
      ipc.addToCollection(id, trackIds),
    onSuccess: invalidate,
  });
}

export function useRemoveFromCollection(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (trackIds: string[]) => ipc.removeFromCollection(id, trackIds),
    onSuccess: invalidate,
  });
}
