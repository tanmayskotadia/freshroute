import { DomainError } from "../src/domain.ts";
import type { Workspace } from "../src/domain.ts";
import {
  LocalWorkspaceRepository,
  STORAGE_KEY,
} from "../src/data/localRepository.ts";
export type Command = {
  action: string;
  args: unknown[];
  expectedRevision: number;
};
export function applyCommand(
  workspace: Workspace,
  command: Command,
  administrator = false,
) {
  if (
    !command ||
    !Array.isArray(command.args) ||
    command.args.length > 5 ||
    !Number.isInteger(command.expectedRevision)
  )
    throw new DomainError("VALIDATION", "Invalid command envelope.");
  if (command.expectedRevision !== workspace.revision)
    throw new DomainError(
      "CONFLICT",
      "Your workspace changed. Reload it before saving again.",
    );
  const allowed = [
    "saveShipment",
    "saveDraft",
    "discardDraft",
    "saveAnalysis",
    "confirmAnalysis",
    "saveDestination",
  ];
  if (!allowed.includes(command.action))
    throw new DomainError(
      "FORBIDDEN",
      "This operation is unavailable in cloud mode.",
    );
  if (command.action === "saveDestination" && !administrator)
    throw new DomainError(
      "FORBIDDEN",
      "Receiving-rule changes require the administrators group.",
    );
  let raw = JSON.stringify(workspace);
  const repository = new LocalWorkspaceRepository({
    getItem: () => raw,
    setItem: (key, value) => {
      if (key !== STORAGE_KEY) throw Error("Invalid storage key");
      raw = value;
    },
  });
  const result = (
    repository[command.action as keyof LocalWorkspaceRepository] as (
      ...args: any[]
    ) => unknown
  ).apply(repository, command.args);
  return { result: result ?? null, workspace: repository.load() };
}
