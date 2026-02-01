import { makeWriteFile } from "./write-file";
import { makeEditFile } from "./edit-file";
import { makeSearchImage } from "./search-image";
import { makeCreateImage } from "./create-image";
import { twistOfFateTool } from "./twist-of-fate";

function assertGameId(gameId: string): void {
  if (!gameId) throw new Error("createTools requires a valid gameId");
}

export function createTools(gameId: string) {
  assertGameId(gameId);
  return {
    write_file: makeWriteFile(gameId),
    edit_file: makeEditFile(gameId),
    search_image: makeSearchImage(gameId),
    create_image: makeCreateImage(gameId),
    twist_of_fate: twistOfFateTool,
  };
}

export function createFactionTools(gameId: string) {
  assertGameId(gameId);
  return {
    write_file: makeWriteFile(gameId),
    edit_file: makeEditFile(gameId),
    search_image: makeSearchImage(gameId),
    create_image: makeCreateImage(gameId),
  };
}

export const createWorldAdvanceTools = createTools;

export function createArchivistTools(gameId: string) {
  assertGameId(gameId);
  return {
    write_file: makeWriteFile(gameId),
    edit_file: makeEditFile(gameId),
  };
}

export function createNarratorTools(gameId: string) {
  assertGameId(gameId);
  return {
    search_image: makeSearchImage(gameId),
    create_image: makeCreateImage(gameId),
    twist_of_fate: twistOfFateTool,
  };
}
