import { useEffect, useMemo, useState } from "react";
import { DomainError, seedWorkspace } from "../domain";
import { LocalWorkspaceRepository, STORAGE_KEY } from "./localRepository";
export function useWorkspace() {
  const repository = useMemo(
    () =>
      new LocalWorkspaceRepository({
        getItem: (key) => window.localStorage.getItem(key),
        setItem: (key, value) => window.localStorage.setItem(key, value),
      }),
    [],
  );
  const [initial] = useState(() => {
    try {
      return { data: repository.load(), error: "" };
    } catch (e) {
      return { data: seedWorkspace(), error: (e as Error).message };
    }
  });
  const [workspace, setWorkspace] = useState(initial.data);
  const [storageError, setStorageError] = useState(initial.error);
  function refresh() {
    try {
      setWorkspace(repository.load());
      setStorageError("");
    } catch (e) {
      setStorageError((e as Error).message);
    }
  }
  useEffect(() => {
    const update = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) refresh();
    };
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, [repository]);
  function execute<T>(operation: () => T): T {
    try {
      const result = operation();
      setWorkspace(repository.load());
      setStorageError("");
      return result;
    } catch (e) {
      if (e instanceof DomainError && e.code.startsWith("STORAGE"))
        setStorageError(e.message);
      throw e;
    }
  }
  return { workspace, repository, storageError, execute, refresh };
}
