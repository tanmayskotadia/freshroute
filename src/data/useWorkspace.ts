import { useEffect, useMemo, useRef, useState } from "react";
import { DomainError, seedWorkspace } from "../domain";
import { LocalWorkspaceRepository, STORAGE_KEY } from "./localRepository";
import type { WorkspaceRepository } from "./localRepository";
import { useCloud } from "../cloud/CloudRuntime";
export function useWorkspace() {
  const runtime = useCloud();
  const repository: WorkspaceRepository = useMemo(
    () =>
      runtime.repository ||
      new LocalWorkspaceRepository({
        getItem: (key) => window.localStorage.getItem(key),
        setItem: (key, value) => window.localStorage.setItem(key, value),
      }),
    [runtime.repository],
  );
  const [initial] = useState(() => {
    try {
      return { data: repository.load(), error: "" };
    } catch (e) {
      return { data: seedWorkspace(), error: (e as Error).message };
    }
  });
  const [workspace, setWorkspace] = useState(initial.data),
    [storageError, setStorageError] = useState(initial.error),
    [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  async function refresh() {
    try {
      if (repository.refresh) await repository.refresh();
      setWorkspace(repository.load());
      setStorageError("");
    } catch (e) {
      setStorageError((e as Error).message);
    }
  }
  useEffect(() => {
    const update = (event: StorageEvent) => {
      if (
        !repository.cloud &&
        (event.key === STORAGE_KEY || event.key === null)
      )
        void refresh();
    };
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, [repository]);
  async function execute<T>(operation: () => T | Promise<T>): Promise<T> {
    if (inFlight.current)
      throw new DomainError(
        "BUSY",
        "A save is already in progress. Wait for its result.",
      );
    inFlight.current = true;
    setPending(true);
    try {
      const result = await operation();
      setWorkspace(repository.load());
      setStorageError("");
      return result;
    } catch (e) {
      if (
        e instanceof DomainError &&
        (e.code.startsWith("STORAGE") || ["AUTH", "NETWORK"].includes(e.code))
      )
        setStorageError(e.message);
      if (e instanceof DomainError && e.code === "CONFLICT" && repository.cloud)
        await refresh();
      throw e;
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return { workspace, repository, storageError, execute, refresh, pending };
}
